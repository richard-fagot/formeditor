import { newId, OTHER_TYPES, type GraphNode, type Question } from '../../core/model';
import { commonQuestionFields } from '../../plugin-api';
import { DEFAULT_QUESTION_TYPE, nodeKind, QUESTION_TYPE_PLUGINS, questionType } from '../../registry';
import {
  activeGraphRef, connect, duplicateNodes, freshKey, getGraph, insertNode, removeEdge, removeNodes, scopeOf, updateNode, useStore,
  type GraphRef,
} from '../store';
import { makeTranslate } from '../i18n';
import type { Command } from './types';

const st = () => useStore.getState();
const t = () => makeTranslate(st().uiLang);
const ref = () => (st().activeTab.startsWith('q:') ? activeGraphRef(st()) : undefined);
const graph = () => {
  const r = ref();
  return r ? getGraph(st().ws, r) : undefined;
};
const selectedNode = () => {
  const id = st().selection.nodes.length === 1 ? st().selection.nodes[0] : undefined;
  return id ? graph()?.nodes.find((n) => n.id === id) : undefined;
};
const inDiagram = () => !!ref() && (st().view[ref()!.id] ?? 'diagram') === 'diagram';

function edit(r: GraphRef, recipe: Parameters<ReturnType<typeof st>['edit']>[1]) {
  st().edit(scopeOf(r), recipe);
}

/** Crée un nœud après la sélection ; une branche porte une condition à saisir. */
function createAfter(make: (id: string) => GraphNode, branch = false) {
  const r = ref();
  if (!r) return;
  const after = selectedNode()?.id;
  const node = make(newId('n'));
  edit(r, (ws) => {
    const g = getGraph(ws, r)!;
    const out = after ? g.edges.filter((e) => e.from === after) : [];
    // Création chaînée : insertion entre le nœud et son successeur unique.
    if (!branch && out.length === 1 && !out[0]!.when) {
      const next = out[0]!;
      insertNode(ws, r, node, after);
      g.edges = g.edges.filter((e) => e.id !== next.id);
      connect(ws, r, node.id, next.to);
    } else insertNode(ws, r, node, after, branch ? '' : undefined);
  });
  st().select({ graph: r, nodes: [node.id] });
  if (branch && after) {
    const edge = getGraph(st().ws, r)!.edges.find((e) => e.from === after && e.to === node.id);
    if (edge) {
      st().select({ graph: r, nodes: [], edge: edge.id });
      st().requestFocus('condition', edge.id);
      return;
    }
  }
  st().requestFocus('label', node.id);
}

function newQuestion(id: string): GraphNode {
  const label = t()('node.newLabel');
  const key = freshKey(st().ws, graph()!, label);
  const q = questionType(DEFAULT_QUESTION_TYPE)!.create({ id, key, label: { [st().contentLang]: label } });
  return { kind: 'question', ...q } as GraphNode;
}

/** Modifie la question locale sélectionnée. */
function updateQuestion(f: (q: Question) => Question) {
  const r = ref();
  const n = selectedNode();
  if (!r || !n || n.kind !== 'question' || 'ref' in n) return;
  edit(r, (ws) => updateNode(ws, r, n.id, (node) => ({ kind: 'question', ...f(node as unknown as Question) }) as GraphNode));
}

const isLocalQuestion = () => {
  const n = selectedNode();
  return !!n && n.kind === 'question' && !('ref' in n);
};

export function graphCommands(): Command[] {
  const typeCommands: Command[] = QUESTION_TYPE_PLUGINS.map((p) => ({
    id: `node.type.${p.type}`,
    label: (tt) => tt('node.type', { type: p.name[st().uiLang] ?? p.name.fr! }),
    keys: [p.shortcut],
    scope: 'graph',
    enabled: isLocalQuestion,
    run: () => updateQuestion((q) => (q.type === p.type ? q : p.create(commonQuestionFields(q), q))),
  }));
  const page = (kind: 'info' | 'summary' | 'end') => () => createAfter((id) => nodeKind(kind).create!(id));
  return [
    { id: 'node.newQuestion', label: 'node.newQuestion', keys: ['n'], scope: 'graph', enabled: inDiagram, run: () => createAfter(newQuestion) },
    { id: 'node.newBranch', label: 'node.newBranch', keys: ['Shift+N'], scope: 'graph', enabled: () => inDiagram() && !!selectedNode(), run: () => createAfter(newQuestion, true) },
    { id: 'node.newInfo', label: 'node.newInfo', keys: ['Alt+i'], scope: 'graph', enabled: inDiagram, run: page('info') },
    { id: 'node.newSummary', label: 'node.newSummary', keys: ['Alt+s'], scope: 'graph', enabled: inDiagram, run: page('summary') },
    { id: 'node.newEnd', label: 'node.newEnd', keys: ['Alt+f'], scope: 'graph', enabled: inDiagram, run: page('end') },
    ...typeCommands,
    {
      id: 'node.toggleRequired', label: 'node.toggleRequired', keys: ['o'], scope: 'graph', enabled: isLocalQuestion,
      run: () => updateQuestion((q) => ({ ...q, required: q.required ? undefined : true })),
    },
    {
      id: 'node.toggleOther', label: 'node.toggleOther', keys: ['a'], scope: 'graph',
      enabled: () => isLocalQuestion() && OTHER_TYPES.includes((selectedNode() as unknown as Question).type),
      run: () => updateQuestion((q) => ({ ...q, other: 'other' in q && q.other ? undefined : {} }) as Question),
    },
    {
      id: 'node.editLabel', label: 'node.editLabel', keys: ['Enter'], scope: 'graph', enabled: () => !!selectedNode(),
      run: () => st().requestFocus('label', selectedNode()!.id),
    },
    {
      id: 'edge.editCondition', label: 'edge.editCondition', keys: ['c'], scope: 'graph',
      enabled: () => !!st().selection.edge || !!(selectedNode() && graph()?.edges.some((e) => e.to === selectedNode()!.id)),
      run: () => {
        const r = ref()!;
        const id = st().selection.edge ?? graph()!.edges.find((e) => e.to === selectedNode()!.id)!.id;
        st().select({ graph: r, nodes: [], edge: id });
        st().requestFocus('condition', id);
      },
    },
    { id: 'node.connect', label: 'node.connect', keys: ['e'], scope: 'graph', enabled: () => !!selectedNode(), run: () => st().set((s) => void (s.palette = { open: true, mode: 'connect' })) },
    {
      id: 'node.setStart', label: 'node.setStart', keys: [], scope: 'graph', enabled: () => !!selectedNode(),
      run: () => {
        const r = ref()!;
        const id = selectedNode()!.id;
        edit(r, (ws) => void (getGraph(ws, r)!.start = id));
      },
    },
    {
      id: 'node.duplicate', label: 'node.duplicate', keys: ['$mod+d'], scope: 'graph', enabled: () => st().selection.nodes.length > 0,
      run: () => {
        const r = ref()!;
        let ids: string[] = [];
        edit(r, (ws) => void (ids = duplicateNodes(ws, r, st().selection.nodes)));
        st().select({ graph: r, nodes: ids });
      },
    },
    {
      id: 'node.delete', label: 'node.delete', keys: ['Delete', 'Backspace'], scope: 'graph',
      enabled: () => st().selection.nodes.length > 0 || !!st().selection.edge,
      run: () => {
        const r = ref()!;
        const { nodes, edge } = st().selection;
        edit(r, (ws) => void (nodes.length ? removeNodes(ws, r, nodes) : edge && removeEdge(ws, r, edge)));
        st().select({ graph: r, nodes: [] });
      },
    },
  ];
}

/** Connecte la sélection au nœud choisi dans la palette. */
export function connectSelectedTo(target: string): void {
  const r = ref();
  const from = selectedNode()?.id;
  if (!r || !from) return;
  edit(r, (ws) => void connect(ws, r, from, target));
  st().select({ graph: r, nodes: [target] });
}

