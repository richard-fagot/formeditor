import { describe, expect, it } from 'vitest';
import type { Fragment, GraphNode, Questionnaire, Workspace } from '../model';
import { fragmentScope, questionnaireScope, renameKey } from './index';

const q = (id: string, key = id, extra: Record<string, unknown> = {}): GraphNode =>
  ({ kind: 'question', id, key, label: { fr: key }, type: 'text', ...extra }) as GraphNode;
const inst = (id: string, ref: string, alias: string): GraphNode => ({ kind: 'fragment', id, ref, alias });
const questionnaire = (id: string, nodes: GraphNode[], when?: string): Questionnaire => ({
  formatVersion: 7, kind: 'questionnaire', id, key: id, title: { fr: id }, start: nodes[0]!.id, nodes,
  edges: when ? [{ id: `${id}_e`, from: nodes[0]!.id, to: nodes[1]!.id, when }] : [],
});

/** `ident` (nom, majeur, adresse → fragment `adr` : ville) appelé par deux questionnaires. */
function ws(): Workspace {
  const adr: Fragment = { id: 'f_adr', key: 'adresse', title: { fr: 'Adresse' }, nodes: [q('v', 'ville', { help: { fr: 'Ville de {nom}' } })], edges: [] };
  const ident: Fragment = {
    id: 'f_ident', key: 'ident', title: { fr: 'Identification' },
    nodes: [q('n', 'nom'), q('m', 'majeur', { help: { fr: '{motif}' } }), inst('ia', 'f_adr', 'adr')],
    edges: [{ id: 'fe', from: 'n', to: 'm', when: 'nom != ""' }, { id: 'fe2', from: 'm', to: 'ia', when: 'adr.ville = "x"' }],
  };
  return {
    project: { formatVersion: 7, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: { formatVersion: 7, kind: 'library', questions: [], fragments: [ident, adr], labelSets: [] },
    questionnaires: [
      questionnaire('q1', [q('motif'), inst('i1', 'f_ident', 'ident'), q('montant')], 'ident.nom = "a" and ident.adr.ville = "b"'),
      questionnaire('q2', [inst('i2', 'f_ident', 'assure'), inst('i3', 'f_ident', 'conjoint')], 'assure.nom = conjoint.nom'),
    ],
    layouts: [],
  };
}

describe('portée des fragments (EVO-008)', () => {
  it('appelant : `alias.cle`, imbrication `alias.sous_alias.cle`', () => {
    const s = questionnaireScope(ws(), 'q1');
    for (const p of ['ident', 'ident.nom', 'ident.majeur', 'ident.adr', 'ident.adr.ville', 'motif']) expect(s.has(p), p).toBe(true);
    expect(s.get('ident.adr.ville')?.alias).toBe('ident.adr');
    expect(s.has('nom')).toBe(false);
  });
  it('deux usages du même fragment : clés distinctes', () => {
    const s = questionnaireScope(ws(), 'q2');
    expect(s.has('assure.nom') && s.has('conjoint.nom')).toBe(true);
  });
  it('dans un fragment : ses clés sans préfixe, celles des appelants, et l’imbrication', () => {
    const s = fragmentScope(ws(), 'f_ident');
    for (const p of ['nom', 'majeur', 'adr.ville', 'motif', 'ident.nom', 'assure.nom']) expect(s.has(p), p).toBe(true);
    const nested = fragmentScope(ws(), 'f_adr');
    for (const p of ['ville', 'nom', 'motif']) expect(nested.has(p), p).toBe(true);
  });
  it('portée limitée à un appelant donné', () => {
    const s = fragmentScope(ws(), 'f_ident', [{ kind: 'questionnaire', id: 'q2' }]);
    expect(s.has('motif')).toBe(false);
    expect(s.has('nom')).toBe(true);
  });
});

describe('renommage propagé (EVO-008)', () => {
  it('clé d’une question de fragment : dans le fragment et chez tous les appelants, imbrication comprise', () => {
    const next = renameKey(ws(), { kind: 'question', owner: { kind: 'fragment', id: 'f_adr' }, nodeId: 'v' }, 'commune');
    expect(next.questionnaires[0]!.edges[0]!.when).toBe('ident.nom = "a" and ident.adr.commune = "b"');
    expect(next.library.fragments[0]!.edges[1]!.when).toBe('adr.commune = "x"');
  });
  it('alias d’un appel dans un fragment : réécrit dans le fragment et chez ses appelants', () => {
    const next = renameKey(ws(), { kind: 'alias', owner: { kind: 'fragment', id: 'f_ident' }, nodeId: 'ia' }, 'domicile');
    expect(next.library.fragments[0]!.edges[1]!.when).toBe('domicile.ville = "x"');
    expect(next.questionnaires[0]!.edges[0]!.when).toBe('ident.nom = "a" and ident.domicile.ville = "b"');
  });
  it('alias dans un questionnaire', () => {
    const next = renameKey(ws(), { kind: 'alias', owner: { kind: 'questionnaire', id: 'q2' }, nodeId: 'i3' }, 'epoux');
    expect(next.questionnaires[1]!.edges[0]!.when).toBe('assure.nom = epoux.nom');
  });
});
