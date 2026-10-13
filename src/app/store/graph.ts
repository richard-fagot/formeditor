import {
  deriveKey, FORMAT_VERSION, newId, uniqueKey, type Edge, type Graph, type GraphNode, type Layout, type Questionnaire, type Workspace,
} from '../../core/model';
import { questionOfNode } from '../../core/references';

/** Graphe édité : un questionnaire ou un fragment de la bibliothèque. */
export interface GraphRef {
  kind: 'questionnaire' | 'fragment';
  id: string;
}

export const NODE_SPACING = { x: 300, y: 150 };

export function getGraph(ws: Workspace, ref: GraphRef): Graph | undefined {
  return ref.kind === 'questionnaire' ? ws.questionnaires.find((q) => q.id === ref.id) : ws.library.fragments.find((f) => f.id === ref.id);
}

export function layoutOf(ws: Workspace, graphId: string): Layout {
  let l = ws.layouts.find((x) => x.graph === graphId);
  if (!l) {
    l = { formatVersion: FORMAT_VERSION, kind: 'layout', graph: graphId, nodes: {} };
    ws.layouts.push(l);
  }
  return l;
}

/** Clés déjà utilisées dans un graphe (questions et alias). */
export function usedKeys(ws: Workspace, g: Graph): string[] {
  return g.nodes.flatMap((n) => (n.kind === 'fragment' ? [n.alias] : [questionOfNode(ws, n)?.key ?? []].flat()));
}

/** Départ d'un questionnaire (un fragment n'en a pas : son entrée est implicite ou `entry`). */
const asQuestionnaire = (g: Graph) => ('start' in g ? (g as Questionnaire) : undefined);

export function freshKey(ws: Workspace, g: Graph, label: string): string {
  return uniqueKey(deriveKey(label), usedKeys(ws, g));
}

/** Ajoute un nœud, relié depuis `after` s'il est donné ; devient le départ d'un questionnaire vide. */
export function insertNode(ws: Workspace, ref: GraphRef, node: GraphNode, after?: string, when?: string): void {
  const g = getGraph(ws, ref);
  if (!g) return;
  g.nodes.push(node);
  const q = asQuestionnaire(g);
  if (q && !g.nodes.some((n) => n.id === q.start)) q.start = node.id;
  const layout = layoutOf(ws, ref.id).nodes;
  const from = after ? layout[after] : undefined;
  if (after && g.nodes.some((n) => n.id === after)) {
    const siblings = g.edges.filter((e) => e.from === after).length;
    layout[node.id] = { x: (from?.x ?? 0) + siblings * NODE_SPACING.x, y: (from?.y ?? 0) + NODE_SPACING.y };
    connect(ws, ref, after, node.id, when);
  } else {
    const maxY = Math.max(-NODE_SPACING.y, ...Object.values(layout).map((p) => p.y));
    layout[node.id] = { x: 0, y: maxY + NODE_SPACING.y };
  }
}

export function connect(ws: Workspace, ref: GraphRef, from: string, to: string, when?: string, exit?: string): string | undefined {
  const g = getGraph(ws, ref);
  if (!g || g.edges.some((e) => e.from === from && e.to === to && e.exit === exit)) return undefined;
  const edge: Edge = { id: newId('e'), from, to, ...(when !== undefined ? { when } : {}), ...(exit ? { exit } : {}) };
  // Une arête conditionnée est placée avant le « sinon » existant.
  const elseIndex = g.edges.findIndex((e) => e.from === from && !e.when && e.exit === exit);
  if (when !== undefined && elseIndex >= 0) g.edges.splice(elseIndex, 0, edge);
  else g.edges.push(edge);
  return edge.id;
}

export function removeNodes(ws: Workspace, ref: GraphRef, ids: string[]): void {
  const g = getGraph(ws, ref);
  if (!g) return;
  g.nodes = g.nodes.filter((n) => !ids.includes(n.id));
  g.edges = g.edges.filter((e) => !ids.includes(e.from) && !ids.includes(e.to));
  const q = asQuestionnaire(g);
  if (q && ids.includes(q.start)) q.start = g.nodes[0]?.id ?? '';
  if ('entry' in g && ids.includes(g.entry as string)) delete (g as { entry?: string }).entry;
  const l = layoutOf(ws, ref.id);
  ids.forEach((id) => delete l.nodes[id]);
  // Commentaires de révision des questions supprimées (EVO-011).
  if (l.comments?.some((c) => ids.includes(c.node))) {
    l.comments = l.comments.filter((c) => !ids.includes(c.node));
    if (!l.comments.length) delete l.comments;
  }
}

export function removeEdge(ws: Workspace, ref: GraphRef, edgeId: string): void {
  const g = getGraph(ws, ref);
  if (g) g.edges = g.edges.filter((e) => e.id !== edgeId);
}

/** Déplace une arête parmi celles qui sortent du même nœud (change son rang). */
export function moveEdge(ws: Workspace, ref: GraphRef, edgeId: string, delta: -1 | 1): void {
  const g = getGraph(ws, ref);
  if (!g) return;
  const i = g.edges.findIndex((e) => e.id === edgeId);
  const edge = g.edges[i];
  if (!edge) return;
  const siblings = g.edges.map((e, j) => [e, j] as const).filter(([e]) => e.from === edge.from);
  const pos = siblings.findIndex(([e]) => e.id === edgeId);
  const other = siblings[pos + delta];
  if (!other) return;
  g.edges[i] = other[0];
  g.edges[other[1]] = edge;
}

export function updateNode(ws: Workspace, ref: GraphRef, nodeId: string, patch: Partial<GraphNode> | ((n: GraphNode) => GraphNode)): void {
  const g = getGraph(ws, ref);
  const i = g?.nodes.findIndex((n) => n.id === nodeId) ?? -1;
  if (!g || i < 0) return;
  const current = g.nodes[i]!;
  const next = typeof patch === 'function' ? patch(current) : ({ ...current, ...patch } as GraphNode);
  // Une propriété mise à `undefined` est retirée (JSON propre).
  g.nodes[i] = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) as GraphNode;
}
