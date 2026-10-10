import {
  deriveKey, FORMAT_VERSION, newId, uniqueKey, type Edge, type Graph, type GraphNode, type Layout, type Workspace,
} from '../../core/model';
import { questionOfNode } from '../../core/references';

/** Graphe édité : un questionnaire ou un bloc de la bibliothèque. */
export interface GraphRef {
  kind: 'questionnaire' | 'block';
  id: string;
}

export const NODE_SPACING = { x: 300, y: 150 };

export function getGraph(ws: Workspace, ref: GraphRef): Graph | undefined {
  return ref.kind === 'questionnaire' ? ws.questionnaires.find((q) => q.id === ref.id) : ws.library.blocks.find((b) => b.id === ref.id);
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
  return g.nodes.flatMap((n) => (n.kind === 'block' ? [n.alias] : [questionOfNode(ws, n)?.key ?? []].flat()));
}

export function freshKey(ws: Workspace, g: Graph, label: string): string {
  return uniqueKey(deriveKey(label), usedKeys(ws, g));
}

/** Ajoute un nœud, relié depuis `after` s'il est donné ; devient le départ si le graphe était vide. */
export function insertNode(ws: Workspace, ref: GraphRef, node: GraphNode, after?: string, when?: string): void {
  const g = getGraph(ws, ref);
  if (!g) return;
  g.nodes.push(node);
  if (!g.nodes.some((n) => n.id === g.start)) g.start = node.id;
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
  if (ids.includes(g.start)) g.start = g.nodes[0]?.id ?? '';
  const layout = layoutOf(ws, ref.id).nodes;
  ids.forEach((id) => delete layout[id]);
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

/** Duplique des nœuds (et les arêtes entre eux), décalés ; clés rendues uniques. Renvoie les nouveaux ids. */
export function duplicateNodes(ws: Workspace, ref: GraphRef, ids: string[]): string[] {
  const g = getGraph(ws, ref);
  if (!g) return [];
  const map = new Map<string, string>();
  const layout = layoutOf(ws, ref.id).nodes;
  for (const n of g.nodes.filter((x) => ids.includes(x.id))) {
    const copy = JSON.parse(JSON.stringify(n)) as GraphNode & { key?: string; alias?: string };
    copy.id = newId('n');
    if (copy.kind === 'question' && !('ref' in copy) && copy.key) copy.key = uniqueKey(copy.key, usedKeys(ws, g));
    if (copy.kind === 'block') copy.alias = uniqueKey(copy.alias!, usedKeys(ws, g));
    g.nodes.push(copy);
    map.set(n.id, copy.id);
    const p = layout[n.id] ?? { x: 0, y: 0 };
    layout[copy.id] = { x: p.x + 40, y: p.y + 40 };
  }
  for (const e of g.edges.filter((x) => map.has(x.from) && map.has(x.to))) {
    g.edges.push({ ...e, id: newId('e'), from: map.get(e.from)!, to: map.get(e.to)! });
  }
  return [...map.values()];
}
