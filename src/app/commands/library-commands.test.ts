import { beforeEach, describe, expect, it } from 'vitest';
import { blankWorkspace, getGraph, insertNode, useStore } from '../store';
import type { GraphNode } from '../../core/model';
import { command, runCommand } from './index';

const node = (id: string): GraphNode => ({ kind: 'question', id, key: id, label: { fr: id }, type: 'text' });
const st = () => useStore.getState();

describe('bibliothèque et blocs par commandes', () => {
  let qid = '';
  const q = () => st().ws.questionnaires[0]!;
  beforeEach(() => {
    const ws = blankWorkspace();
    qid = ws.questionnaires[0]!.id;
    insertNode(ws, { kind: 'questionnaire', id: qid }, node('a'));
    insertNode(ws, { kind: 'questionnaire', id: qid }, node('b'), 'a');
    st().loadWorkspace(ws);
  });

  it('crée une question de bibliothèque, l’affiche, puis l’insère à la suite de la sélection', () => {
    expect(command('library.insert')!.enabled!()).toBe(false);
    runCommand('library.newQuestion');
    expect(st().activeTab).toBe('library');
    const lq = st().ws.library.questions[0]!;
    expect(st().libraryItem).toEqual({ kind: 'question', id: lq.id });
    runCommand('tab.show', `q:${qid}`);
    st().select({ graph: { kind: 'questionnaire', id: qid }, nodes: ['a'] });
    expect(command('library.insert')!.enabled!()).toBe(true);
    runCommand('library.insertItem', { kind: 'question', id: lq.id });
    const inserted = q().nodes.at(-1)!;
    expect(inserted).toMatchObject({ kind: 'question', ref: lq.id });
    // Inséré entre a et son successeur unique b.
    expect(q().edges.map((e) => `${e.from}>${e.to}`).sort()).toEqual([`${inserted.id}>b`, `a>${inserted.id}`].sort());
  });

  it('insère par dépôt à la position donnée', () => {
    runCommand('library.newBlock');
    const blk = st().ws.library.blocks[0]!;
    runCommand('tab.show', `q:${qid}`);
    runCommand('library.insertItem', { kind: 'block', id: blk.id, position: { x: 500, y: 40 } });
    const inst = q().nodes.at(-1)!;
    expect(inst).toMatchObject({ kind: 'block', ref: blk.id, alias: blk.key });
    expect(st().ws.layouts.find((l) => l.graph === qid)!.nodes[inst.id]).toEqual({ x: 500, y: 40 });
  });

  it('groupe la sélection en bloc (Ctrl+G), annulable dans le questionnaire et dans la bibliothèque', () => {
    st().select({ graph: { kind: 'questionnaire', id: qid }, nodes: ['a'] });
    expect(command('node.group')!.keys).toEqual(['$mod+g']);
    expect(runCommand('node.group')).toBe(true);
    expect(st().ws.library.blocks).toHaveLength(1);
    expect(q().nodes.map((n) => n.kind)).toEqual(['question', 'block']);
    st().undo(`q:${qid}`);
    expect(q().nodes.map((n) => n.id)).toEqual(['a', 'b']);
    st().undo('library');
    expect(st().ws.library.blocks).toHaveLength(0);
  });

  it('édite un bloc dans l’onglet Bibliothèque : question, sortie, graphe actif', () => {
    runCommand('library.newBlock');
    const blk = st().ws.library.blocks[0]!;
    expect(command('node.newExit')!.enabled!()).toBe(true);
    runCommand('node.newQuestion');
    runCommand('node.newExit');
    const g = getGraph(st().ws, { kind: 'block', id: blk.id })!;
    expect(g.nodes.map((n) => n.kind)).toEqual(['question', 'exit']);
    expect(g.edges).toHaveLength(1);
    expect(command('node.group')!.enabled!()).toBe(false);
    st().undo('library');
    expect(getGraph(st().ws, { kind: 'block', id: blk.id })!.nodes).toHaveLength(1);
  });

  it('relie une sortie nommée d’une instance de bloc (poignée de sortie)', () => {
    runCommand('library.newBlock');
    runCommand('node.newQuestion');
    runCommand('node.newExit');
    const blk = st().ws.library.blocks[0]!;
    const exit = blk.nodes.find((n) => n.kind === 'exit')! as { name: string };
    runCommand('tab.show', `q:${qid}`);
    runCommand('library.insertItem', { kind: 'block', id: blk.id, position: { x: 0, y: 300 } });
    const inst = q().nodes.at(-1)!;
    expect(inst.kind).toBe('block');
    const graph = { kind: 'questionnaire' as const, id: qid };
    runCommand('edge.create', { graph, from: inst.id, to: 'a', exit: exit.name });
    expect(q().edges.at(-1)).toMatchObject({ from: inst.id, to: 'a', exit: exit.name });
  });

  it('refuse de grouper une sélection à plusieurs entrées, avec un message', () => {
    const graph = { kind: 'questionnaire' as const, id: qid };
    st().edit(`q:${qid}`, (ws) => void insertNode(ws, graph, node('c'), 'a'));
    st().select({ graph, nodes: ['b', 'c'] });
    runCommand('node.group');
    expect(st().ws.library.blocks).toHaveLength(0);
    expect(st().notice?.lines[0]).toContain('plusieurs entrées');
  });

  it('place une question locale dans la bibliothèque et l’ouvre', () => {
    st().select({ graph: { kind: 'questionnaire', id: qid }, nodes: ['a'] });
    runCommand('node.toLibrary');
    expect(q().nodes[0]).toMatchObject({ id: 'a', ref: st().ws.library.questions[0]!.id });
    runCommand('node.openInLibrary');
    expect(st().libraryItem).toEqual({ kind: 'question', id: st().ws.library.questions[0]!.id });
  });
});
