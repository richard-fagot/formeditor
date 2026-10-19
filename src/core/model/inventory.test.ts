import { describe, expect, it } from 'vitest';
import type { Fragment, Questionnaire, Workspace } from './documents';
import type { Edge } from './graph';
import type { GraphNode } from './node';
import type { Question } from './question';
import { inventoryRows } from './inventory';

// EVO-029 : lignes de l'inventaire des données (amorce RGPD), noyau pur.

const q = (id: string, extra: Partial<Question> = {}): GraphNode => ({ kind: 'question', id, key: id, label: { fr: `Intitulé ${id}` }, type: 'text', ...extra }) as GraphNode;
const lib = (id: string, extra: Partial<Question> = {}): Question => ({ id, key: id, label: { fr: `Bib ${id}` }, type: 'text', ...extra }) as Question;
const ref = (id: string, to: string, extra: object = {}): GraphNode => ({ kind: 'question', id, ref: to, ...extra }) as GraphNode;
const call = (id: string, to: string, alias: string, extra: object = {}): GraphNode => ({ kind: 'fragment', id, ref: to, alias, ...extra }) as GraphNode;
const e = (from: string, to: string): Edge => ({ id: `${from}-${to}`, from, to });
const frg = (id: string, nodes: GraphNode[], edges: Edge[] = []): Fragment => ({ id, key: id, title: { fr: id }, nodes, edges });
const qn = (nodes: GraphNode[], edges: Edge[] = [], start = nodes[0]?.id ?? ''): Questionnaire => ({
  formatVersion: 15, kind: 'questionnaire', id: 'Q', key: 'decl', title: { fr: 'Déclaration' }, start, nodes, edges,
});
const ws = (questionnaire: Questionnaire, questions: Question[] = [], fragments: Fragment[] = []): Workspace => ({
  project: { formatVersion: 15, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [{ name: 'contrat', type: 'text' }] as never, scenarios: [], questionnaires: [] },
  library: { formatVersion: 15, kind: 'library', labelSets: [], questions, fragments },
  questionnaires: [questionnaire],
  layouts: [],
});
const paths = (w: Workspace) => inventoryRows(w, w.questionnaires[0]!).map((r) => r.path);
const structure = (fields: object[], extra: object = {}) => ({ type: 'structure', fields, ...extra }) as Partial<Question>;
const field = (key: string, extra: object = {}) => ({ id: `f_${key}`, key, label: { fr: `Champ ${key}` }, type: 'text', ...extra });

describe('inventaire des données (EVO-029)', () => {
  it('EVO-029-011 — question locale et référence de bibliothèque : chemin = clé', () => {
    const w = ws(qn([q('a'), ref('n2', 'b')], [e('a', 'n2')]), [lib('b')]);
    expect(paths(w)).toEqual(['a', 'b']);
  });

  it('EVO-029-012 / EVO-029-013 — questions de fragment préfixées par les alias successifs', () => {
    const w = ws(qn([call('n1', 'F', 'tiers')]), [lib('l')], [frg('F', [q('nom'), call('m2', 'G', 'adr')], [e('nom', 'm2')]), frg('G', [ref('m3', 'l')])]);
    expect(paths(w)).toEqual(['tiers.nom', 'tiers.adr.l']);
  });

  it('EVO-029-014 / EVO-029-042 — structure : une ligne par champ, aucune pour la structure', () => {
    const w = ws(qn([q('declarant', structure([field('nom'), field('prenom')]))]));
    expect(paths(w)).toEqual(['declarant.nom', 'declarant.prenom']);
  });

  it('EVO-029-015 — champ masqué d’une référence de bibliothèque : aucune ligne', () => {
    const w = ws(qn([ref('n1', 's', { hiddenFields: ['tel'] })]), [lib('s', structure([field('nom'), field('tel')]))]);
    expect(paths(w)).toEqual(['s.nom']);
  });

  it('EVO-029-016 / EVO-029-044 / EVO-029-049 — « Autre (préciser) » : ligne `<clé>_other`, texte, obligatoire selon la précision', () => {
    const w = ws(qn([q('c', { type: 'single', options: [], other: { detailRequired: true } } as Partial<Question>), q('d', { type: 'boolean', other: {} } as Partial<Question>)], [e('c', 'd')]));
    const rows = inventoryRows(w, w.questionnaires[0]!);
    expect(rows.map((r) => [r.path, r.type, r.required, r.other])).toEqual([
      ['c', 'single', undefined, false], ['c_other', 'text', true, true], ['d', 'boolean', undefined, false], ['d_other', 'text', false, true],
    ]);
  });

  it('EVO-029-017 — téléphone et adresse : aucune ligne pour le pays', () => {
    const w = ws(qn([q('tel', { type: 'phone' }), q('adr', { type: 'address' })], [e('tel', 'adr')]));
    expect(paths(w)).toEqual(['tel', 'adr']);
  });

  it('EVO-029-018 — information, synthèse, fin, sortie nommée et Renvoi : aucune ligne', () => {
    const nodes: GraphNode[] = [
      q('a'), { kind: 'info', id: 'i', text: { fr: 'x' } }, { kind: 'summary', id: 's' },
      { kind: 'redirect', id: 'r', text: { fr: 'x' }, buttons: [] }, { kind: 'end', id: 'f', message: { fr: 'x' } },
    ];
    const w = ws(qn(nodes, [e('a', 'i'), e('i', 's'), e('s', 'r'), e('s', 'f')]), [], []);
    w.library.fragments.push(frg('F', [q('b'), { kind: 'exit', id: 'x', name: 'stop' } as GraphNode], [e('b', 'x')]));
    w.questionnaires[0]!.nodes.push(call('c', 'F', 'al'));
    w.questionnaires[0]!.edges.push(e('a', 'c'));
    expect(paths(w)).toEqual(['a', 'al.b']);
  });

  it('EVO-029-019 / EVO-029-021 — ordre : profondeur d’abord par ordre des arêtes, boucles une fois, non atteignables à la fin', () => {
    const w = ws(qn([q('z'), q('a'), q('b'), q('c'), q('d'), q('orphan')], [e('a', 'c'), e('a', 'b'), e('c', 'd'), e('d', 'a'), e('b', 'd')], 'a'));
    expect(paths(w)).toEqual(['a', 'c', 'd', 'b', 'z', 'orphan']);
  });

  it('EVO-029-020 — variable système : ni ligne ni onglet', () => {
    const w = ws(qn([q('a', { required: 'sys.contrat = "x"' })]));
    expect(paths(w)).toEqual(['a']);
  });

  it('EVO-029-045 — champs et ligne `_other` à la suite, à la place de la question', () => {
    const w = ws(qn([q('a'), q('s', structure([field('x', { type: 'single', options: [], other: {} }), field('y')])), q('c', { type: 'multiple', options: [], other: {} } as Partial<Question>), q('d')],
      [e('a', 's'), e('s', 'c'), e('c', 'd')]));
    expect(paths(w)).toEqual(['a', 's.x', 's.x_other', 's.y', 'c', 'c_other', 'd']);
  });

  it('EVO-029-025 / EVO-029-028 — question effective : intitulé et obligatoire surchargés (nœud, appel de fragment)', () => {
    const w = ws(
      qn([ref('n1', 'b', { label: { fr: 'Surchargé' }, required: true }), call('n2', 'F', 'al', { requiredOverrides: { m1: false } })], [e('n1', 'n2')]),
      [lib('b', { required: 'x > 1' }), lib('c', { required: true })],
      [frg('F', [ref('m1', 'c'), q('m2', { required: 'y = 2' })], [e('m1', 'm2')])],
    );
    const rows = inventoryRows(w, w.questionnaires[0]!);
    expect(rows.map((r) => [r.path, r.label, r.required])).toEqual([
      ['b', { fr: 'Surchargé' }, true], ['al.c', { fr: 'Bib c' }, false], ['al.m2', { fr: 'Intitulé m2' }, 'y = 2'],
    ]);
  });

  it('EVO-029-029 — champ de structure répétable : répétable ; autres données : non', () => {
    const w = ws(qn([q('s', structure([field('x')], { repeat: {} })), q('t', structure([field('y')]))], [e('s', 't')]));
    expect(inventoryRows(w, w.questionnaires[0]!).map((r) => [r.path, r.repeatable])).toEqual([['s.x', true], ['t.y', false]]);
  });

  it('EVO-029-030 — donnée personnelle présumée pour mail, téléphone, adresse, civilité (champs compris)', () => {
    const types = ['email', 'phone', 'address', 'civility', 'text', 'date', 'number', 'boolean'];
    const nodes = types.map((t) => q(t, { type: t } as Partial<Question>));
    nodes.push(q('s', structure([field('m', { type: 'email' }), field('n')])));
    const w = ws(qn(nodes, nodes.slice(1).map((n, i) => e(nodes[i]!.id, n.id))));
    expect(inventoryRows(w, w.questionnaires[0]!).filter((r) => r.personal).map((r) => r.path)).toEqual(['email', 'phone', 'address', 'civility', 's.m']);
  });

  it('EVO-029-031 / EVO-029-050 — description : question locale, sinon nœud, sinon définition de bibliothèque', () => {
    const w = ws(qn([q('a', { description: 'loc' }), q('b'), ref('n3', 'c', { description: 'noeud' }), ref('n4', 'd')], [e('a', 'b'), e('b', 'n3'), e('n3', 'n4')]),
      [lib('c', { description: 'bib c' }), lib('d', { description: 'bib d' })]);
    expect(inventoryRows(w, w.questionnaires[0]!).map((r) => r.description)).toEqual(['loc', undefined, 'noeud', 'bib d']);
  });

  it('EVO-029-034 / EVO-029-035 — mêmes clés : mêmes chemins ; renommage d’une clé, d’un champ ou d’un alias : nouveau chemin', () => {
    const build = (key: string, fkey: string, alias: string) =>
      ws(qn([q('a', { key, ...structure([field(fkey)]) }), call('n2', 'F', alias)], [e('a', 'n2')]), [], [frg('F', [q('b')])]);
    expect(paths(build('s', 'x', 'al'))).toEqual(paths(build('s', 'x', 'al')));
    expect(paths(build('s2', 'x', 'al'))).toEqual(['s2.x', 'al.b']);
    expect(paths(build('s', 'x2', 'al'))).toEqual(['s.x2', 'al.b']);
    expect(paths(build('s', 'x', 'al2'))).toEqual(['s.x', 'al2.b']);
  });
});
