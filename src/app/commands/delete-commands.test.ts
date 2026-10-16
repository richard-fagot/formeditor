import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { itemUsers, type GraphNode, type Questionnaire, type RedirectNode, type Workspace } from '../../core/model';
import { checkWorkspace, describeIssue } from '../../core/validation';
import { exportBundle, exportFiles, newWorkspace } from '../../format';
import { allComments, useStore } from '../store';
import { command, runCommand } from './index';

const st = () => useStore.getState();
const q = (id: string, key: string): GraphNode => ({ kind: 'question', id, key, label: { fr: key }, type: 'text' }) as GraphNode;
const graph = (id: string, key: string, title: string, nodes: GraphNode[]): Questionnaire =>
  ({ formatVersion: 15, kind: 'questionnaire', id, key, title: { fr: title }, version: '1', start: nodes[0]?.id ?? '', nodes, edges: [] });
const redirect = (id: string, target: string): RedirectNode => ({
  kind: 'redirect', id, text: { fr: 'Renvoi' },
  buttons: [{ label: { fr: 'Aller' }, target: { questionnaire: target, prefill: false, replace: false } }],
});

/**
 * `qa` (deux Renvoi vers `qb`), `qb` (« Questionnaire sans titre », 2 commentaires, appelle le fragment `frg`,
 * utilise la question de bibliothèque `lq`), `qc` (un Renvoi vers `qb`).
 */
function workspace(): Workspace {
  const ws = newWorkspace('p', 'fr');
  ws.library.fragments.push({ id: 'frg', key: 'ident', title: { fr: 'Identification' }, nodes: [q('f1', 'nom')], edges: [] });
  ws.library.questions.push({ id: 'lq', key: 'date_effet', label: { fr: 'Date d’effet' }, type: 'date' });
  ws.questionnaires.push(
    graph('qa', 'rc', 'RC', [q('a1', 'avant'), redirect('a2', 'qb'), redirect('a3', 'qb')]),
    graph('qb', 'questionnaire', 'Questionnaire sans titre', [
      q('b1', 'motif'), q('b2', 'lieu'), { kind: 'fragment', id: 'b3', ref: 'frg', alias: 'id' }, { kind: 'question', id: 'b4', ref: 'lq' } as GraphNode,
    ]),
    graph('qc', 'dommage', 'Dommage', [redirect('c1', 'qb')]),
  );
  ws.project.questionnaires.push({ id: 'qa', file: 'rc.json' }, { id: 'qb', file: 'questionnaire.json' }, { id: 'qc', file: 'dommage.json' });
  ws.layouts.push({
    formatVersion: 15, kind: 'layout', graph: 'qb', nodes: { b1: { x: 0, y: 0 } },
    comments: [{ node: 'b1', x: 300, y: 0, text: 'à revoir', replies: [] }, { node: 'b2', x: 300, y: 150, text: 'lieu ?', replies: [] }],
  });
  return ws;
}

let asked: string[] = [];
const answer = (ok: boolean) => vi.stubGlobal('window', { confirm: (m: string) => (asked.push(m), ok) });
const ids = () => st().ws.questionnaires.map((x) => x.id);
const del = (id = 'qb') => runCommand('questionnaire.delete', id);

describe('supprimer un questionnaire (EVO-027)', () => {
  beforeEach(() => {
    st().loadWorkspace(workspace());
    asked = [];
    answer(true);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('EVO-027-003 — palette « Supprimer le questionnaire » : proposée quand un questionnaire est actif, vise celui-ci', () => {
    const cmd = command('questionnaire.delete')!;
    expect(cmd.hidden).toBeFalsy();
    runCommand('tab.show', 'library');
    expect(cmd.enabled!()).toBe(false);
    runCommand('tab.show', 'q:qc');
    expect(cmd.enabled!()).toBe(true);
    expect(runCommand('questionnaire.delete')).toBe(true);
    expect(ids()).toEqual(['qa', 'qb']);
  });

  it('EVO-027-005, EVO-027-006, EVO-027-007, EVO-027-008 — confirmation : titre, validé, commentaires, boutons de renvoi', () => {
    runCommand('questionnaire.validate', 'qb');
    del();
    expect(asked).toEqual([
      'Supprimer le questionnaire « Questionnaire sans titre » ?\nIl est validé.\n2 commentaires seront supprimés.\n3 boutons de renvoi le ciblent.',
    ]);
  });

  it('EVO-027-006, EVO-027-007, EVO-027-008 — lignes absentes quand le compte est nul, singulier pour un seul', () => {
    del('qa');
    expect(asked).toEqual(['Supprimer le questionnaire « RC » ?']);
    st().loadWorkspace(workspace());
    st().edit('q:qa', (ws) => void (ws.questionnaires[0]!.nodes = ws.questionnaires[0]!.nodes.slice(0, 2)));
    st().edit('q:qc', (ws) => void (ws.questionnaires[2]!.nodes = []));
    st().edit('q:qb', (ws) => void ws.layouts[0]!.comments!.pop());
    asked = [];
    del();
    expect(asked).toEqual(['Supprimer le questionnaire « Questionnaire sans titre » ?\n1 commentaire sera supprimé.\n1 bouton de renvoi le cible.']);
  });

  it('EVO-027-009 — confirmation refusée : projet inchangé', () => {
    answer(false);
    const before = st().ws;
    del();
    expect(st().ws).toBe(before);
    expect(st().tabs).toContain('q:qb');
    expect(st().dirty).toBe(false);
  });

  it('EVO-027-010 — retiré du projet : onglets, boutons de réouverture, palette, exports', () => {
    runCommand('tab.close', 'q:qc');
    del();
    expect(ids()).toEqual(['qa', 'qc']);
    expect(st().ws.project.questionnaires.map((e) => e.id)).toEqual(['qa', 'qc']);
    expect(st().tabs).not.toContain('q:qb');
    // Boutons de réouverture et palette « Rouvrir » : seuls les questionnaires fermés restants.
    expect(st().ws.questionnaires.filter((x) => !st().tabs.includes(`q:${x.id}`)).map((x) => x.id)).toEqual(['qc']);
    expect(command('questionnaire.delete')!.enabled!('qb')).toBe(false);
    expect(exportBundle(st().ws)).not.toContain('"id": "qb"');
    expect(exportFiles(st().ws).map((f) => f.name).filter((n) => n.startsWith('questionnaire'))).toEqual([]);
  });

  it('EVO-027-011 — commentaires de révision supprimés, absents de l’onglet Commentaires', () => {
    expect(allComments(st().ws)).toHaveLength(2);
    del();
    expect(allComments(st().ws)).toEqual([]);
    expect(st().ws.layouts.some((l) => l.graph === 'qb')).toBe(false);
  });

  it('EVO-027-012 — onglet actif supprimé : l’onglet précédent devient actif ; aucun onglet restant : Bibliothèque', () => {
    runCommand('tab.show', 'q:qb');
    del();
    expect(st().activeTab).toBe('q:qa');
    // Onglet non actif supprimé : l'onglet actif ne change pas.
    runCommand('tab.show', 'q:qc');
    del('qa');
    expect(st().activeTab).toBe('q:qc');
    st().loadWorkspace(workspace());
    runCommand('tab.close', 'q:qa');
    runCommand('tab.close', 'q:qc');
    del();
    expect(st().tabs).toEqual(['library']);
    expect(st().activeTab).toBe('library');
  });

  it('EVO-027-013 — questionnaire affiché dans la vue côte à côte : la vue se ferme', () => {
    runCommand('tab.show', 'q:qa');
    st().set((s) => void (s.compare = 'qb'));
    del();
    expect(st().compare).toBeUndefined();
  });

  it('EVO-027-014 — suppression confirmée : « Modifications non exportées »', () => {
    expect(st().dirty).toBe(false);
    del();
    expect(st().dirty).toBe(true);
  });

  it('EVO-027-015 — un questionnaire validé se supprime sans dévalidation', () => {
    expect(runCommand('questionnaire.validate', 'qb')).toBe(true);
    st().set((s) => void (s.notice = undefined));
    del();
    expect(ids()).toEqual(['qa', 'qc']);
    expect(st().notice).toBeUndefined();
  });

  it('EVO-027-016 — seul questionnaire du projet : supprimé, plus aucun questionnaire, onglet Bibliothèque affiché', () => {
    const ws = workspace();
    ws.questionnaires = ws.questionnaires.filter((x) => x.id === 'qb');
    ws.project.questionnaires = ws.project.questionnaires.filter((x) => x.id === 'qb');
    st().loadWorkspace(ws);
    runCommand('tab.show', 'system');
    del();
    expect(st().ws.questionnaires).toEqual([]);
    expect(st().activeTab).toBe('library');
    expect(st().tabs).toContain('library');
  });

  it('EVO-027-017 — bibliothèque inchangée ; « utilisée dans » ne cite plus le questionnaire', () => {
    const library = st().ws.library;
    expect(itemUsers(st().ws, { kind: 'question', id: 'lq' }).map((x) => x.key)).toEqual(['questionnaire']);
    del();
    expect(st().ws.library).toBe(library);
    expect(itemUsers(st().ws, { kind: 'question', id: 'lq' })).toEqual([]);
  });

  it('EVO-027-018 — bouton de renvoi d’un autre questionnaire vers le supprimé : cible introuvable signalée', () => {
    del();
    const issues = checkWorkspace(st().ws).filter((i) => i.code === 'buttonTargetMissing');
    expect(issues.map((i) => i.nodeId).sort()).toEqual(['a2', 'a3', 'c1']);
    expect(describeIssue(issues[0]!, 'fr')).toBe('La cible du bouton « Aller » est introuvable.');
  });

  it('EVO-027-019 — fragment appelé seulement par le supprimé : « Fragment inutilisé » signalé', () => {
    const unused = () => checkWorkspace(st().ws).filter((i) => i.code === 'unusedFragment');
    expect(unused()).toEqual([]);
    del();
    expect(unused().map((i) => describeIssue(i, 'fr'))).toEqual(['Fragment inutilisé']);
  });

  it('EVO-027-020 — Annuler juste après, depuis un autre onglet : questionnaire, commentaires et onglet restaurés ; Rétablir refait la suppression', () => {
    runCommand('tab.show', 'q:qb');
    st().edit('q:qb', (ws) => void (ws.questionnaires[1]!.description = 'note'));
    const ws = st().ws;
    const tabs = st().tabs;
    del();
    expect(st().activeTab).toBe('q:qa');
    runCommand('tab.show', 'library');
    expect(runCommand('edit.undo')).toBe(true);
    expect(st().ws.questionnaires).toEqual(ws.questionnaires);
    expect(allComments(st().ws)).toHaveLength(2);
    expect(st().tabs).toEqual([...tabs, 'library']);
    expect(st().activeTab).toBe('q:qb');
    // Rétablir correspondant, depuis tout onglet.
    runCommand('tab.show', 'q:qc');
    runCommand('edit.redo');
    expect(ids()).toEqual(['qa', 'qc']);
    expect(st().activeTab).toBe('q:qc');
    runCommand('edit.undo');
    expect(ids()).toEqual(['qa', 'qb', 'qc']);
    // L'historique propre du questionnaire restauré est conservé.
    runCommand('tab.show', 'q:qb');
    runCommand('edit.undo');
    expect(st().ws.questionnaires[1]!.description).toBeUndefined();
  });

  it('EVO-027-020 — validé : annuler et rétablir la suppression ne sont pas refusés par le verrou', () => {
    runCommand('questionnaire.validate', 'qb');
    del();
    runCommand('tab.show', 'q:qa');
    runCommand('edit.undo');
    expect(ids()).toEqual(['qa', 'qb', 'qc']);
    runCommand('edit.redo');
    expect(ids()).toEqual(['qa', 'qc']);
  });

  it('EVO-027-020 — après une autre modification, Annuler agit sur l’onglet affiché, pas sur la suppression', () => {
    del();
    runCommand('tab.show', 'q:qa');
    st().edit('q:qa', (ws) => void (ws.questionnaires[0]!.description = 'x'));
    runCommand('edit.undo');
    expect(st().ws.questionnaires[0]!.description).toBeUndefined();
    runCommand('edit.undo');
    expect(ids()).toEqual(['qa', 'qc']);
    // L'historique du projet garde la suppression : annulable depuis un onglet sans historique propre.
    runCommand('tab.show', 'system');
    runCommand('edit.undo');
    expect(ids().sort()).toEqual(['qa', 'qb', 'qc']);
  });

  it('EVO-027-021 — Fermer l’onglet ne supprime pas : questionnaire présenté parmi les fermés', () => {
    runCommand('tab.close', 'q:qb');
    expect(ids()).toEqual(['qa', 'qb', 'qc']);
    expect(st().tabs).not.toContain('q:qb');
    expect(asked).toEqual([]);
    expect(command('tab.open')!.enabled!()).toBe(true);
  });

  it('EVO-027-022 — Nouveau questionnaire et Dupliquer le questionnaire inchangés (annulables par le projet)', () => {
    runCommand('questionnaire.new');
    const created = st().activeTab;
    expect(st().ws.questionnaires.find((x) => `q:${x.id}` === created)!.title).toEqual({ fr: 'Questionnaire sans titre' });
    runCommand('questionnaire.duplicate', 'qa');
    const copy = st().ws.questionnaires[1]!;
    expect(copy.title).toEqual({ fr: 'Copie de RC' });
    expect(st().activeTab).toBe(`q:${copy.id}`);
    expect(asked).toEqual([]);
    st().undo('project');
    expect(st().ws.questionnaires.some((x) => x.id === copy.id)).toBe(false);
  });
});
