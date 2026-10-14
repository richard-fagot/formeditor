import { describe, expect, it } from 'vitest';
import type { Edge, Fragment, GraphNode, Questionnaire, Workspace } from '../model';
import { checkWorkspace, describeIssue, expectedKeys } from './index';

const q = (id: string, key = id, extra: Record<string, unknown> = {}): GraphNode =>
  ({ kind: 'question', id, key, label: { fr: key }, type: 'text', ...extra }) as GraphNode;
const e = (from: string, to: string, when?: string): Edge => ({ id: `${from}_${to}`, from, to, ...(when ? { when } : {}) });
const inst = (id: string, ref: string, alias = id): GraphNode => ({ kind: 'fragment', id, ref, alias });
const end: GraphNode = { kind: 'end', id: 'fin', message: { fr: 'Fin' } };
const frag = (id: string, nodes: GraphNode[], edges: Edge[] = [], extra: Partial<Fragment> = {}): Fragment =>
  ({ id, key: id, title: { fr: id }, nodes, edges, ...extra });
const quest = (id: string, nodes: GraphNode[], edges: Edge[]): Questionnaire =>
  ({ formatVersion: 7, kind: 'questionnaire', id, key: id, title: { fr: id }, start: nodes[0]!.id, nodes, edges });

/** Fragment `ident` : nom → majeur → (num_secu | representant) ; le libellé de `nom` cite `motif` (clé attendue). */
const ident = () => frag('f_ident', [q('nom', 'nom', { help: { fr: 'Motif : {motif}' } }), q('majeur'), q('num_secu'), q('representant')],
  [e('nom', 'majeur'), e('majeur', 'num_secu', 'majeur = "oui"'), e('majeur', 'representant')]);

function ws(fragments: Fragment[], questionnaires: Questionnaire[]): Workspace {
  return {
    project: { formatVersion: 7, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: { formatVersion: 7, kind: 'library', questions: [], fragments, labelSets: [] },
    questionnaires,
    layouts: [],
  };
}
const codes = (w: Workspace) => checkWorkspace(w).map((i) => `${i.code}@${i.owner.id}${i.nodeId ? `/${i.nodeId}` : ''}`);

/** Questionnaire « motif → ident → montant → fin ». */
const caller = (id = 'q1', withMotif = true) => quest(id,
  [...(withMotif ? [q('motif')] : [q('autre')]), inst('i', 'f_ident', 'ident'), q('montant'), end],
  [e(withMotif ? 'motif' : 'autre', 'i'), e('i', 'montant'), e('montant', 'fin')]);

describe('vérifications des fragments (EVO-008)', () => {
  it('fragment bien formé, utilisé, clés fournies : aucun problème ; ses sorties ne sont pas des impasses', () => {
    expect(codes(ws([ident()], [caller()]))).toEqual([]);
  });
  it('sans entrée unique : signalé (sans bloquer) ; une entrée explicite le règle', () => {
    const two = frag('f_ident', [q('nom', 'nom'), q('autre')], []);
    expect(codes(ws([two], [caller()]))).toContain('fragmentEntry@f_ident');
    const loop = frag('f_ident', [q('nom', 'nom'), q('b')], [e('nom', 'b'), e('b', 'nom', 'b = "x"')]);
    expect(codes(ws([loop], [caller()]))).toEqual(expect.arrayContaining(['fragmentEntry@f_ident', 'fragmentNoExit@f_ident']));
    expect(codes(ws([{ ...loop, entry: 'b' }], [caller()]))).not.toContain('fragmentEntry@f_ident');
  });
  it('cycle d’appels : signalé sur chaque fragment du cycle', () => {
    const a = frag('fa', [inst('ib', 'fb')]);
    const b = frag('fb', [inst('ia', 'fa')]);
    expect(codes(ws([a, b], [quest('q', [inst('x', 'fa'), end], [e('x', 'fin')])]))).toEqual(expect.arrayContaining(['fragmentCycle@fa', 'fragmentCycle@fb']));
  });
  it('question de bibliothèque utilisée seulement dans un fragment : références résolues dans ce fragment (écart EVO-008)', () => {
    const f = frag('f_ident', [q('nom'), { kind: 'question', id: 'r', ref: 'lq' } as GraphNode], [e('nom', 'r')]);
    const make = (help: string) => {
      const w = ws([f], [quest('q1', [inst('i', 'f_ident', 'ident'), end], [e('i', 'fin')])]);
      w.library.questions = [{ id: 'lq', key: 'detail', label: { fr: 'D' }, type: 'text', help: { fr: help } }];
      return codes(w).filter((c) => c.startsWith('unknownReference'));
    };
    expect(make('Nom : {nom}')).toEqual([]);
    expect(make('{inconnue}')).toEqual(['unknownReference@lq']);
  });
  it('question de bibliothèque utilisée seulement dans un fragment : réponse garantie avant usage (écart correctif CODE)', () => {
    const lib = { kind: 'question', id: 'r', ref: 'lq' } as GraphNode;
    const make = (nodes: GraphNode[], edges: Edge[], help: string) => {
      const w = ws([frag('f_ident', nodes, edges)], [quest('q1', [q('motif'), inst('i', 'f_ident', 'ident'), end], [e('motif', 'i'), e('i', 'fin')])]);
      w.library.questions = [{ id: 'lq', key: 'detail', label: { fr: 'D' }, type: 'text', help: { fr: help } }];
      return codes(w).filter((c) => c.startsWith('notGuaranteed'));
    };
    expect(make([lib, q('nom')], [e('r', 'nom')], 'Nom : {nom}')).toEqual(['notGuaranteed@f_ident/r']);
    expect(make([q('nom'), lib], [e('nom', 'r')], 'Nom : {nom}')).toEqual([]);
    expect(make([q('nom'), lib], [e('nom', 'r')], 'Motif : {motif}')).toEqual([]);
  });
  it('alias en double dans un questionnaire : clé en double', () => {
    const w = ws([ident()], [quest('q1', [q('motif'), inst('i', 'f_ident', 'ident'), inst('j', 'f_ident', 'ident'), end], [e('motif', 'i'), e('i', 'j'), e('j', 'fin')])]);
    expect(codes(w)).toContain('duplicateKey@q1/j');
  });
  it('clé attendue absente chez un appelant : signalée dans cet appelant, sur le nœud fragment', () => {
    const w = ws([ident()], [caller('q1'), caller('q2', false)]);
    const list = codes(w);
    expect(list).toContain('expectedKeyMissing@q2/i');
    expect(list).not.toContain('expectedKeyMissing@q1/i');
    expect(list.filter((c) => c.startsWith('unknownReference'))).toEqual([]);
    const issue = checkWorkspace(w).find((i) => i.code === 'expectedKeyMissing')!;
    expect(describeIssue(issue, 'fr')).toBe('Clé « motif » attendue par le fragment « f_ident » absente');
  });
  it('expectedKeys : références hors des clés du fragment et de l’état du système', () => {
    expect(expectedKeys(ws([ident()], [caller()]), 'f_ident')).toEqual(['motif']);
  });
  it('clé fournie par aucun appelant : aussi « référence inconnue » dans le fragment', () => {
    expect(codes(ws([ident()], [caller('q2', false)]))).toEqual(expect.arrayContaining(['expectedKeyMissing@q2/i', 'unknownReference@f_ident/nom']));
  });
  it('fragment inutilisé : signalé', () => {
    expect(codes(ws([ident(), frag('f_seul', [q('x')])], [caller()]))).toContain('unusedFragment@f_seul');
  });
  it('nœud fragment sans arête sortante : impasse dans un questionnaire, sortie implicite dans un fragment', () => {
    const inner = frag('f_out', [q('motif'), inst('i', 'f_ident', 'ident')], [e('motif', 'i')]);
    const w = ws([ident(), inner], [quest('q', [inst('o', 'f_out', 'o'), inst('k', 'f_ident', 'k')], [e('o', 'k')])]);
    const list = codes(w);
    expect(list).toContain('deadEnd@q/k');
    expect(list.filter((c) => c.includes('f_out'))).toEqual([]);
  });
  it('fin dans un fragment (bloc migré) : signalée', () => {
    const f = frag('f_ident', [q('nom', 'nom'), end], [e('nom', 'fin')]);
    expect(codes(ws([f], [caller()]))).toContain('endInFragment@f_ident/fin');
  });
  it('« posée sur tous les chemins » : clés garanties à la sortie du fragment', () => {
    const w = ws([ident()], [quest('q1', [q('motif'), inst('i', 'f_ident', 'ident'), q('a', 'a', { help: { fr: '{ident.nom} {ident.num_secu}' } }), end],
      [e('motif', 'i'), e('i', 'a'), e('a', 'fin')])]);
    const issues = checkWorkspace(w).filter((i) => i.code === 'notGuaranteed').map((i) => i.params.ref);
    expect(issues).toEqual(['ident.num_secu']);
  });
});
