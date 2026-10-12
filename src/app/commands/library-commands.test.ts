import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { blankWorkspace, getGraph, insertNode, useStore } from '../store';
import type { GraphNode } from '../../core/model';
import { command, runCommand } from './index';

const node = (id: string): GraphNode => ({ kind: 'question', id, key: id, label: { fr: id }, type: 'text' });
const st = () => useStore.getState();

describe('bibliothèque et fragments par commandes', () => {
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
    runCommand('library.newFragment');
    const frg = st().ws.library.fragments[0]!;
    runCommand('tab.show', `q:${qid}`);
    runCommand('library.insertItem', { kind: 'fragment', id: frg.id, position: { x: 500, y: 40 } });
    const inst = q().nodes.at(-1)!;
    expect(inst).toMatchObject({ kind: 'fragment', ref: frg.id, alias: frg.key });
    expect(st().ws.layouts.find((l) => l.graph === qid)!.nodes[inst.id]).toEqual({ x: 500, y: 40 });
  });

  it('extrait la sélection en fragment (Ctrl+G) ; un seul Ctrl+Z, du questionnaire ou de la bibliothèque, annule tout', () => {
    st().select({ graph: { kind: 'questionnaire', id: qid }, nodes: ['a'] });
    expect(command('node.group')!.keys).toEqual(['$mod+g']);
    expect(runCommand('node.group')).toBe(true);
    expect(st().ws.library.fragments).toHaveLength(1);
    expect(q().nodes.map((n) => n.kind)).toEqual(['question', 'fragment']);
    st().undo(`q:${qid}`);
    expect(q().nodes.map((n) => n.id)).toEqual(['a', 'b']);
    expect(st().ws.library.fragments).toHaveLength(0);
    st().redo('library');
    expect(st().ws.library.fragments).toHaveLength(1);
    expect(q().nodes.map((n) => n.kind)).toEqual(['question', 'fragment']);
  });

  it('crée un fragment : il s’ouvre dans un onglet et s’édite comme un questionnaire, sans départ ni fin', () => {
    runCommand('library.newFragment');
    const frg = st().ws.library.fragments[0]!;
    expect(st().activeTab).toBe(`f:${frg.id}`);
    expect(st().tabs).toContain(`f:${frg.id}`);
    expect(command('node.newQuestion')!.enabled!()).toBe(true);
    expect(command('node.newExit')!.enabled!()).toBe(true);
    expect(command('node.newEnd')!.enabled!()).toBe(false);
    runCommand('node.newQuestion');
    runCommand('node.newExit');
    const g = getGraph(st().ws, { kind: 'fragment', id: frg.id })!;
    expect(g.nodes.map((n) => n.kind)).toEqual(['question', 'exit']);
    expect(g.edges).toHaveLength(1);
    expect(g).not.toHaveProperty('start');
    expect(command('node.setStart')!.enabled!()).toBe(false);
    expect(command('node.group')!.enabled!()).toBe(false);
    st().undo('library');
    expect(getGraph(st().ws, { kind: 'fragment', id: frg.id })!.nodes).toHaveLength(1);
  });

  it('règle puis retire l’entrée explicite d’un fragment', () => {
    runCommand('library.newFragment');
    const id = st().ws.library.fragments[0]!.id;
    runCommand('node.newQuestion');
    runCommand('node.newQuestion');
    const second = st().selection.nodes[0]!;
    expect(command('node.setEntry')!.enabled!()).toBe(true);
    runCommand('node.setEntry');
    expect(st().ws.library.fragments[0]!.entry).toBe(second);
    runCommand('node.setEntry');
    expect(st().ws.library.fragments[0]).not.toHaveProperty('entry');
    runCommand('tab.show', `q:${qid}`);
    st().select({ graph: { kind: 'questionnaire', id: qid }, nodes: ['a'] });
    expect(command('node.setEntry')!.enabled!()).toBe(false);
    expect(id).toBeTruthy();
  });

  it('refuse l’insertion qui créerait un cycle d’appels, avec un message', () => {
    runCommand('library.newFragment');
    const a = st().ws.library.fragments[0]!.id;
    runCommand('library.newFragment');
    const b = st().ws.library.fragments[1]!.id;
    runCommand('library.insertItem', { kind: 'fragment', id: a });
    expect(st().ws.library.fragments[1]!.nodes).toHaveLength(1);
    runCommand('tab.show', `f:${a}`);
    runCommand('library.insertItem', { kind: 'fragment', id: b });
    expect(st().ws.library.fragments[0]!.nodes).toHaveLength(0);
    expect(st().notice?.lines[0]).toContain('cycle');
  });

  it('ouvre le fragment d’un nœud fragment sélectionné', () => {
    runCommand('library.newFragment');
    const frg = st().ws.library.fragments[0]!;
    runCommand('tab.show', `q:${qid}`);
    runCommand('library.insertItem', { kind: 'fragment', id: frg.id, position: { x: 0, y: 300 } });
    const inst = q().nodes.at(-1)!;
    st().select({ graph: { kind: 'questionnaire', id: qid }, nodes: [inst.id] });
    expect(command('node.openInLibrary')!.enabled!()).toBe(false);
    runCommand('node.openFragment');
    expect(st().activeTab).toBe(`f:${frg.id}`);
  });

  it('relie une sortie nommée d’un nœud fragment (poignée de sortie)', () => {
    runCommand('library.newFragment');
    runCommand('node.newQuestion');
    runCommand('node.newExit');
    const frg = st().ws.library.fragments[0]!;
    const exit = frg.nodes.find((n) => n.kind === 'exit')! as { name: string };
    runCommand('tab.show', `q:${qid}`);
    runCommand('library.insertItem', { kind: 'fragment', id: frg.id, position: { x: 0, y: 300 } });
    const inst = q().nodes.at(-1)!;
    expect(inst.kind).toBe('fragment');
    const graph = { kind: 'questionnaire' as const, id: qid };
    runCommand('edge.create', { graph, from: inst.id, to: 'a', exit: exit.name });
    expect(q().edges.at(-1)).toMatchObject({ from: inst.id, to: 'a', exit: exit.name });
  });

  it('refuse d’extraire une sélection à plusieurs entrées, avec un message', () => {
    const graph = { kind: 'questionnaire' as const, id: qid };
    st().edit(`q:${qid}`, (ws) => void insertNode(ws, graph, node('c'), 'a'));
    st().select({ graph, nodes: ['b', 'c'] });
    runCommand('node.group');
    expect(st().ws.library.fragments).toHaveLength(0);
    expect(st().notice?.lines[0]).toContain('plusieurs entrées');
  });

  it('place une question locale dans la bibliothèque et l’ouvre', () => {
    st().select({ graph: { kind: 'questionnaire', id: qid }, nodes: ['a'] });
    runCommand('node.toLibrary');
    expect(q().nodes[0]).toMatchObject({ id: 'a', ref: st().ws.library.questions[0]!.id });
    st().undo('library');
    expect(q().nodes[0]).toMatchObject({ id: 'a', key: 'a' });
    expect(st().ws.library.questions).toHaveLength(0);
    st().redo(`q:${qid}`);
    runCommand('node.openInLibrary');
    expect(st().libraryItem).toEqual({ kind: 'question', id: st().ws.library.questions[0]!.id });
  });
});

describe('guide (EVO-008)', () => {
  it('décrit la création d’un fragment, son insertion, le départ sur un fragment, `alias.cle` et la différence avec un bloc', () => {
    const guide = readFileSync('docs/GUIDE.md', 'utf8');
    expect(guide).toMatch(/\*\*Créer un fragment\*\* —[^\n]*\n(.*\n)*?.*\[cmd: library\.newFragment\]/);
    expect(guide).toMatch(/\*\*Insérer un fragment ou une question de la bibliothèque\*\*/);
    expect(guide).toMatch(/\*\*Commencer un questionnaire par un fragment\*\*/);
    expect(guide).toContain('`ident.date_naissance`');
    expect(guide).toMatch(/\*\*Fragment ou bloc \?\*\*/);
    for (const id of ['node.setEntry', 'node.openFragment', 'node.group']) expect(guide).toContain(`[cmd: ${id}]`);
    expect(Number(/jusqu'à EVO-(\d+)/.exec(guide)?.[1])).toBeGreaterThanOrEqual(8);
  });
});
