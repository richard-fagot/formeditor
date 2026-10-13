import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphNode, Questionnaire, Workspace } from '../../core/model';
import { checkWorkspace } from '../../core/validation';
import { exportBundle, exportFiles, importFiles, newWorkspace } from '../../format';
import { allComments, commentOf, groupIntoFragment, setCommentText, setReply, useStore, type CommentRef } from '../store';
import { runCommand } from './index';

const st = () => useStore.getState();
const q = (id: string, key: string): GraphNode => ({ kind: 'question', id, key, label: { fr: key }, type: 'text' }) as GraphNode;
const graph = (id: string, key: string, nodes: GraphNode[], edges: Questionnaire['edges'] = []): Questionnaire =>
  ({ formatVersion: 9, kind: 'questionnaire', id, key, title: { fr: key }, start: nodes[0]?.id ?? '', nodes, edges });

function workspace(): Workspace {
  const ws = newWorkspace('p', 'fr');
  ws.questionnaires.push(graph('qa', 'declaration', [q('n1', 'date_sinistre'), q('n2', 'lieu'), { kind: 'end', id: 'n3', message: { fr: 'Fin' } }], [
    { id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n2', to: 'n3' },
  ]));
  ws.project.questionnaires.push({ id: 'qa', file: 'declaration.json' });
  ws.library.fragments.push({ id: 'frg', key: 'ident', title: { fr: 'Identification' }, nodes: [q('f1', 'nom')], edges: [] });
  ws.library.questions.push({ id: 'lq', key: 'date_effet', label: { fr: 'Date d’effet' }, type: 'date' });
  ws.layouts.push({ formatVersion: 9, kind: 'layout', graph: 'qa', nodes: { n1: { x: 0, y: 0 }, n2: { x: 0, y: 150 } } });
  return ws;
}
const A = { kind: 'questionnaire', id: 'qa' } as const;
const C1: CommentRef = { host: A, node: 'n1' };
const comment = (r: CommentRef = C1) => commentOf(st().ws, r);
const shown = (r: CommentRef = C1) => st().shownComments.includes(`${r.host.id}/${r.node}`);

function addOn(node: string) {
  runCommand('tab.show', 'q:qa');
  st().select({ graph: A, nodes: [node] });
  return runCommand('comment.add');
}

describe('commentaires de révision (EVO-011)', () => {
  beforeEach(() => st().loadWorkspace(workspace()));
  afterEach(() => vi.unstubAllGlobals());

  it('Commenter une question d’un formulaire : commentaire créé à droite, affiché, texte initial en saisie', () => {
    expect(addOn('n1')).toBe(true);
    expect(comment()).toEqual({ node: 'n1', x: 300, y: 0, text: '', replies: [] });
    expect(shown()).toBe(true);
    expect(st().focusRequest).toMatchObject({ kind: 'comment', id: 'qa/n1' });
    // Pas de commentaire sur un nœud qui n'est pas une question.
    st().select({ graph: A, nodes: ['n3'] });
    expect(runCommand('comment.add')).toBe(false);
  });

  it('Commenter une question d’un fragment et une question réutilisable', () => {
    runCommand('tab.show', 'f:frg');
    st().select({ graph: { kind: 'fragment', id: 'frg' }, nodes: ['f1'] });
    expect(runCommand('comment.add')).toBe(true);
    expect(commentOf(st().ws, { host: { kind: 'fragment', id: 'frg' }, node: 'f1' })).toBeDefined();
    const lq: CommentRef = { host: { kind: 'question', id: 'lq' }, node: 'lq' };
    runCommand('comment.add', lq);
    expect(commentOf(st().ws, lq)).toEqual({ node: 'lq', text: '', replies: [] });
    expect(st().activeTab).toBe('library');
    expect(st().libraryItem).toEqual({ kind: 'question', id: 'lq' });
  });

  it('Commenter une question déjà commentée affiche le commentaire existant, sans second commentaire', () => {
    addOn('n1');
    runCommand('comment.toggle', C1);
    expect(shown()).toBe(false);
    addOn('n1');
    expect(shown()).toBe(true);
    expect(st().ws.layouts[0]!.comments).toHaveLength(1);
  });

  it('trois réponses s’ajoutent en fin de fil dans l’ordre ; supprimer une réponse ne retire qu’elle', () => {
    addOn('n1');
    for (const text of ['un', 'deux', 'trois']) {
      runCommand('comment.reply', C1);
      const i = comment()!.replies.length - 1;
      expect(st().focusRequest).toMatchObject({ kind: 'comment', id: `qa/n1#${i}` });
      st().edit('q:qa', (ws) => setReply(ws, C1, i, text));
    }
    expect(comment()!.replies).toEqual(['un', 'deux', 'trois']);
    runCommand('comment.deleteReply', { ...C1, index: 1 });
    expect(comment()!.replies).toEqual(['un', 'trois']);
  });

  it('texte et réponses modifiés conservés après export et réimport (fichiers et bundle), position comprise', () => {
    addOn('n1');
    runCommand('comment.reply', C1);
    st().edit('q:qa', (ws) => { setCommentText(ws, C1, 'Borner ?\nÀ voir.'); setReply(ws, C1, 0, 'Oui.'); });
    for (const back of [importFiles(exportFiles(st().ws)), importFiles([{ name: 'p.bundle.json', text: exportBundle(st().ws) }])]) {
      expect(back.errors).toEqual([]);
      expect(commentOf(back.workspace!, C1)).toEqual({ node: 'n1', x: 300, y: 0, text: 'Borner ?\nÀ voir.', replies: ['Oui.'] });
    }
    // Absents du questionnaire destiné aux développeurs.
    expect(exportFiles(st().ws).find((f) => f.name === 'declaration.json')!.text).not.toContain('Borner');
  });

  it('supprimer le commentaire retire le texte et les réponses ; annulable', () => {
    addOn('n1');
    runCommand('comment.reply', C1);
    st().select({ graph: A, nodes: ['n1'] });
    expect(runCommand('comment.delete')).toBe(true);
    expect(comment()).toBeUndefined();
    expect(st().ws.layouts[0]!.comments).toBeUndefined();
    st().undo('q:qa');
    expect(comment()!.replies).toEqual(['']);
  });

  it('afficher / masquer : un commentaire, puis tous ceux de l’objet ouvert', () => {
    addOn('n1');
    addOn('n2');
    runCommand('comment.toggle', C1);
    expect(shown()).toBe(false);
    expect(shown({ host: A, node: 'n2' })).toBe(true);
    runCommand('comment.toggleAll');
    expect(shown() && shown({ host: A, node: 'n2' })).toBe(true);
    runCommand('comment.toggleAll');
    expect(shown() || shown({ host: A, node: 'n2' })).toBe(false);
    expect(st().ws.layouts[0]!.comments).toHaveLength(2);
  });

  it('supprimer une question commentée demande confirmation et supprime le commentaire', () => {
    addOn('n1');
    const confirm = vi.fn(() => false);
    vi.stubGlobal('window', { confirm });
    st().select({ graph: A, nodes: ['n1'] });
    runCommand('node.delete');
    expect(confirm).toHaveBeenCalledOnce();
    expect(comment()).toBeDefined();
    confirm.mockReturnValue(true);
    runCommand('node.delete');
    expect(st().ws.questionnaires[0]!.nodes.map((n) => n.id)).toEqual(['n2', 'n3']);
    expect(comment()).toBeUndefined();
    // Question sans commentaire : pas de confirmation.
    st().select({ graph: A, nodes: ['n2'] });
    runCommand('node.delete');
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('page des commentaires : tous les commentaires du projet ; ouverture de l’objet avec commentaires affichés et centrage', () => {
    addOn('n1');
    addOn('n2');
    runCommand('comment.toggleAll');
    runCommand('comment.add', { host: { kind: 'question', id: 'lq' }, node: 'lq' });
    expect(allComments(st().ws).map((c) => `${c.host.kind}:${c.node}`)).toEqual(['questionnaire:n1', 'questionnaire:n2', 'question:lq']);
    runCommand('tab.comments');
    expect(st().activeTab).toBe('comments');
    runCommand('comment.open', { host: A, node: 'n2' });
    expect(st().activeTab).toBe('q:qa');
    expect(shown() && shown({ host: A, node: 'n2' })).toBe(true);
    expect(st().centerRequest).toMatchObject({ graph: 'qa', node: 'n2' });
  });

  it('sans effet sur le questionnaire : vérifications identiques ; duplication sans commentaire ; extraction en fragment avec ses commentaires', () => {
    const before = checkWorkspace(st().ws);
    addOn('n1');
    expect(checkWorkspace(st().ws)).toEqual(before);
    runCommand('questionnaire.duplicate', 'qa');
    expect(st().ws.layouts.find((l) => l.graph !== 'qa' && st().ws.questionnaires.some((x) => x.id === l.graph))?.comments).toBeUndefined();
    const res = groupIntoFragment(JSON.parse(JSON.stringify(st().ws)) as Workspace, A, ['n1'], { fr: 'F' });
    expect(res && 'fragmentId' in res).toBe(true);
    const r = res as { ws: Workspace; fragmentId: string };
    expect(commentOf(r.ws, { host: { kind: 'fragment', id: r.fragmentId }, node: 'n1' })).toBeDefined();
    expect(commentOf(r.ws, C1)).toBeUndefined();
  });

  it('supprimer une question réutilisable supprime son commentaire', () => {
    const lq: CommentRef = { host: { kind: 'question', id: 'lq' }, node: 'lq' };
    runCommand('comment.add', lq);
    vi.stubGlobal('window', { confirm: () => true });
    runCommand('library.delete', { kind: 'question', id: 'lq' });
    expect(st().ws.layouts.some((l) => l.graph === 'lq')).toBe(false);
    st().undo('library');
    expect(commentOf(st().ws, lq)).toBeDefined();
  });

  it('supprimer un fragment dont une question est commentée demande confirmation', () => {
    const fq: CommentRef = { host: { kind: 'fragment', id: 'frg' }, node: 'f1' };
    runCommand('comment.add', fq);
    const confirm = vi.fn(() => false);
    vi.stubGlobal('window', { confirm });
    runCommand('library.delete', { kind: 'fragment', id: 'frg' });
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/ce fragment|this fragment/));
    expect(st().ws.library.fragments.some((f) => f.id === 'frg')).toBe(true);
    confirm.mockReturnValue(true);
    runCommand('library.delete', { kind: 'fragment', id: 'frg' });
    expect(st().ws.library.fragments.some((f) => f.id === 'frg')).toBe(false);
  });

  it('le guide décrit les commentaires de révision (EVO-011)', () => {
    const guide = readFileSync('docs/GUIDE.md', 'utf8');
    for (const id of ['comment.add', 'comment.toggle', 'comment.toggleAll', 'comment.reply', 'comment.deleteReply', 'comment.delete', 'comment.open', 'tab.comments']) {
      expect(guide).toContain(`[cmd: ${id}]`);
    }
    expect(Number(/jusqu'à EVO-(\d+)/.exec(guide)?.[1])).toBeGreaterThanOrEqual(11);
  });
});
