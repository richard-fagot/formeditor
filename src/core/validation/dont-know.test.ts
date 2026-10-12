import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import type { Question, Workspace } from '../model';
import { checkWorkspace, validateAnswer } from './index';

const env = { defaultLang: 'fr' };
const montant = { id: 'n1', key: 'montant', label: { fr: 'Montant' }, type: 'number', required: true, min: 10, dontKnow: {},
  constraints: [{ rule: 'montant < 100' }] } as Question;
const params = (q: Question, value: unknown, dontKnow?: boolean) =>
  validateAnswer(q, value, { montant: value }, env, undefined, '', undefined, dontKnow).map((e) => e.param);

describe('validateAnswer : « Ne sais pas » (EVO-006)', () => {
  it('satisfait une question obligatoire ; aucun contrôle (min, contraintes) ne s’applique', () => {
    expect(params(montant, null)).toEqual(['required']);
    expect(params(montant, null, true)).toEqual([]);
    expect(params(montant, 5)).toEqual(['min']);
  });
  it('sans l’option activée, le marqueur est ignoré', () => {
    expect(params({ ...montant, dontKnow: undefined } as Question, null, true)).toEqual(['required']);
  });
  it('choix multiple obligatoire avec minimum : liste vide acceptée', () => {
    const m = { id: 'n2', key: 'liens', label: { fr: 'L' }, type: 'multiple', required: true, minSelected: 1, options: [{ value: 'a', label: { fr: 'A' } }], dontKnow: {} } as Question;
    expect(params(m, [], true)).toEqual([]);
    expect(params(m, [])).toEqual(['required']);
  });
  it('champ de structure : marqueur lu dans l’occurrence', () => {
    const s = { id: 's', key: 'v', label: { fr: 'V' }, type: 'structure', repeat: {}, fields: [{ ...montant, id: 'f' }] } as Question;
    expect(validateAnswer(s, [{ montant: null, montant_nsp: true }], {}, env)).toEqual([]);
    expect(validateAnswer(s, [{ montant: null }], {}, env).map((e) => `${e.path}:${e.param}`)).toEqual(['v[0].montant:required']);
  });
});

describe('vérifications « Ne sais pas » (§4.6)', () => {
  const ws = exampleWorkspace();
  const codes = (w: Workspace) => checkWorkspace(w).map((i) => `${i.code}@${i.nodeId ?? i.edgeId ?? ''}${i.property ? `:${i.property}` : ''}${i.params.ref ? `:${i.params.ref}` : ''}`);
  const node = (w: Workspace, id: string) => w.questionnaires[0]!.nodes.find((n) => n.id === id) as unknown as Record<string, unknown>;
  const edge = (w: Workspace, id: string) => w.questionnaires[0]!.edges.find((e) => e.id === id)!;

  it('`.nsp` sur une question sans l’option : référence inconnue ; avec : rien', () => {
    const w = structuredClone(ws);
    edge(w, 'e_lien_victimes').when = 'type_sinistre.nsp';
    node(w, 'n_type').dontKnow = undefined;
    expect(codes(w)).toContain('unknownReference@e_lien_victimes:when:type_sinistre.nsp');
    node(w, 'n_type').dontKnow = {};
    expect(codes(w).filter((c) => c.includes('e_lien_victimes'))).toEqual([]);
  });
  it('traduction manquante du libellé « Ne sais pas »', () => {
    const w = structuredClone(ws);
    node(w, 'n_type').dontKnow = { label: { fr: 'Inconnu' } };
    expect(codes(w)).toContain('missingTranslation@n_type:dontKnow.label');
    node(w, 'n_type').dontKnow = { label: { fr: 'Inconnu', en: 'Unknown' } };
    expect(codes(w).filter((c) => c.startsWith('missingTranslation'))).toEqual([]);
  });
  it('code de groupe `NSP` réservé', () => {
    const w = structuredClone(ws);
    (node(w, 'n_qualite').options as Record<string, unknown>[])[0]!.code = 'NSP';
    expect(codes(w)).toContain('reservedGroupCode@n_qualite:options[0]');
  });
});
