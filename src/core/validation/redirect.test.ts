import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import type { GraphNode, Questionnaire, RedirectNode, Workspace } from '../model';
import { questionnaireScope, renameKey } from '../references';
import { checkWorkspace, describeIssue, type Issue } from './index';

const q = (id: string, key: string): GraphNode => ({ kind: 'question', id, key, label: { fr: key, en: key }, type: 'boolean' }) as GraphNode;
const end = (id: string): GraphNode => ({ kind: 'end', id, message: { fr: 'Fin', en: 'End' } });
const qn = (id: string, key: string, start: string, nodes: GraphNode[], edges: Questionnaire['edges']): Questionnaire =>
  ({ formatVersion: 15, kind: 'questionnaire', id, key, title: { fr: key, en: key }, start, nodes, edges });

/** q1 : n0 (proprio) ─si→ n1 (info) → n2 (Renvoi) ; n0 → n2 ; n2 → n3 (fin). q2 : autre questionnaire. */
function workspace(buttons: RedirectNode['buttons'], beforeEnd = true): Workspace {
  const redirect: RedirectNode = { kind: 'redirect', id: 'n2', text: { fr: 'Texte', en: 'Text' }, buttons };
  const q1 = qn('q1', 'rc', 'n0', [q('n0', 'proprio'), { kind: 'info', id: 'n1', text: { fr: 'i', en: 'i' } }, redirect, end('n3'), q('n4', 'suite')], [
    { id: 'e0', from: 'n0', to: 'n1', when: 'proprio = true' }, { id: 'e1', from: 'n0', to: 'n2' }, { id: 'e2', from: 'n1', to: 'n2' },
    beforeEnd ? { id: 'e3', from: 'n2', to: 'n3' } : { id: 'e3', from: 'n2', to: 'n4' }, { id: 'e4', from: 'n4', to: 'n3' },
  ]);
  if (beforeEnd) q1.edges.push({ id: 'e5', from: 'n0', to: 'n4', when: 'false' });
  return {
    project: { formatVersion: 15, kind: 'project', id: 'p', name: 'p', languages: ['fr', 'en'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: { formatVersion: 15, kind: 'library', questions: [], fragments: [], labelSets: [] },
    questionnaires: [q1, qn('q2', 'dommage', 'm0', [end('m0')], [])],
    layouts: [],
  };
}
const ok = (label: string, extra: object = {}) => ({ label: { fr: label, en: label }, ...extra });
const toQ2 = (replace = true, prefill = false) => ({ target: { questionnaire: 'q2', prefill, replace } });
const redirectIssues = (ws: Workspace): Issue[] => checkWorkspace(ws).filter((i) => i.nodeId === 'n2');
const texts = (ws: Workspace) => redirectIssues(ws).filter((i) => i.code !== 'missingTranslation').map((i) => `${i.severity}:${i.property ?? ''}:${describeIssue(i, 'fr')}`);

describe('nœud Renvoi : problèmes signalés (EVO-024)', () => {
  it('EVO-024-059 — sans problème : boutons complets, cibles valides, aucun signalement', () => {
    expect(texts(workspace([ok('Déclarer', toQ2()), ok('Rectifier', { target: { node: 'n0' } })]))).toEqual([]);
  });

  it('EVO-024-068 — nœud Renvoi sans bouton : erreur', () => {
    expect(texts(workspace([]))).toEqual(['error::Le nœud Renvoi n\'a aucun bouton.']);
  });

  it('EVO-024-031, EVO-024-032, EVO-024-005, EVO-024-006 — libellé et cible obligatoires : libellé vide, cible vide, erreurs sur le bouton', () => {
    const ws = workspace([{ label: { fr: '', en: ' ' }, target: { node: 'n0' } }, ok('Sans cible')]);
    expect(texts(ws)).toEqual(['error:buttons[0]:Le bouton n\'a pas de libellé.', 'error:buttons[1]:Le bouton n\'a pas de cible.']);
  });

  it('EVO-024-033, EVO-024-034 — cible supprimée : le bouton est conservé, erreur « introuvable »', () => {
    const ws = workspace([ok('Déclarer', toQ2()), ok('Rectifier', { target: { node: 'n1' } })]);
    ws.questionnaires.splice(1, 1);
    const q1 = ws.questionnaires[0]!;
    q1.nodes = q1.nodes.filter((n) => n.id !== 'n1');
    q1.edges = q1.edges.filter((e) => e.from !== 'n1' && e.to !== 'n1');
    expect((q1.nodes.find((n) => n.id === 'n2') as RedirectNode).buttons).toHaveLength(2);
    expect(texts(ws)).toEqual([
      'error:buttons[0]:La cible du bouton « Déclarer » est introuvable.',
      'error:buttons[1]:La cible du bouton « Rectifier » est introuvable.',
    ]);
  });

  it('EVO-024-017 — deux boutons visent la même cible : avertissement', () => {
    const ws = workspace([ok('A', toQ2()), ok('B', toQ2(true, true))]);
    expect(texts(ws)).toEqual(['warning:buttons[1]:Plusieurs boutons de ce nœud visent la cible « dommage ».']);
  });

  it('EVO-024-035 — déclaration liée hors fin : avertissement si et seulement si cible questionnaire, annule et remplace désactivé, nœud pas juste avant une fin', () => {
    const msg = 'warning:buttons[0]:Une déclaration liée doit précéder une fin : activez annule et remplace ou déplacez le nœud.';
    expect(texts(workspace([ok('A', toQ2(false))], false))).toEqual([msg]);
    expect(texts(workspace([ok('A', toQ2(true))], false))).toEqual([]);
    expect(texts(workspace([ok('A', toQ2(false))], true))).toEqual([]);
    expect(texts(workspace([ok('A', { target: { node: 'n0' } })], false))).toEqual([]);
  });

  it('EVO-024-036 — cible nœud pas parcourue sur tous les chemins : avertissement', () => {
    const ws = workspace([ok('Corriger', { target: { node: 'n1' } }), ok('Revoir', { target: { node: 'n0' } })]);
    expect(texts(ws)).toEqual(['warning:buttons[0]:La cible du bouton « Corriger » n\'est pas toujours parcourue avant ce nœud.']);
  });

  it('EVO-024-072, EVO-024-070 — condition d’affichage d’un bouton : expression invalide, référence inconnue, non garantie signalées', () => {
    const ws = workspace([
      ok('A', { ...toQ2(), when: 'proprio = ' }), ok('B', { target: { node: 'n0' }, when: 'inconnue = 1' }), ok('C', { target: { node: 'n0' }, when: 'suite = true' }),
      ok('D', { target: { node: 'n0' }, when: 'proprio = true' }),
    ]);
    const issues = redirectIssues(ws).map((i) => `${i.code}:${i.property}`);
    expect(issues).toEqual(expect.arrayContaining(['invalidExpression:buttons[0].when', 'unknownReference:buttons[1].when', 'notGuaranteed:buttons[2].when']));
    expect(issues.filter((i) => i.endsWith('buttons[3].when'))).toEqual([]);
  });

  it('EVO-024-063, EVO-024-021 — traduction manquante : titre, texte, libellé d’un bouton, libellé de Terminer', () => {
    const ws = workspace([{ label: { fr: 'Déclarer' }, ...toQ2() }]);
    const r = ws.questionnaires[0]!.nodes.find((n) => n.id === 'n2') as RedirectNode;
    r.title = { fr: 'Titre' };
    r.text = { fr: 'Texte' };
    r.finishLabel = { fr: 'Fermer' };
    const missing = redirectIssues(ws).filter((i) => i.code === 'missingTranslation').map((i) => `${i.params.lang}:${i.property}`);
    expect(missing).toEqual(['en:title', 'en:text', 'en:buttons[0].label', 'en:finishLabel']);
  });

  it('EVO-024-019 — aucun bouton de renvoi ne figure parmi les références d’une expression', () => {
    const ws = workspace([ok('Déclarer', toQ2())]);
    const names = [...questionnaireScope(ws, 'q1').keys()];
    expect(names.filter((n) => !n.startsWith('sys'))).toEqual(['proprio', 'proprio.nsp', 'suite', 'suite.nsp'].filter((n) => names.includes(n)));
    expect(names.some((n) => /n2|bouton|button|declarer/i.test(n))).toBe(false);
  });

  it('EVO-024-011 — renommer la question visée garde la même cible ; la condition du bouton suit le renommage', () => {
    const ws = workspace([ok('Rectifier', { target: { node: 'n0' }, when: 'proprio = true' })]);
    const next = renameKey(ws, { kind: 'question', owner: { kind: 'questionnaire', id: 'q1' }, nodeId: 'n0' }, 'proprietaire');
    const b = (next.questionnaires[0]!.nodes.find((n) => n.id === 'n2') as RedirectNode).buttons[0]!;
    expect(b.target).toEqual({ node: 'n0' });
    expect(b.when).toBe('proprietaire = true');
  });

  it('EVO-024-059 — l’exemple (qui contient un nœud Renvoi) ne produit toujours aucun problème', () => {
    const ws = exampleWorkspace();
    expect(ws.questionnaires.flatMap((x) => x.nodes).some((n) => n.kind === 'redirect')).toBe(true);
    expect(checkWorkspace(ws)).toEqual([]);
  });
});
