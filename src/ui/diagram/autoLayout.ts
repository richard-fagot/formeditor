import ELK from 'elkjs/lib/elk.bundled.js';
import type { Graph } from '../../core/model';

export type Size = { width: number; height: number };
export type Positions = Record<string, { x: number; y: number }>;

const DEFAULT_SIZE: Size = { width: 240, height: 100 };
const elk = new ELK();

/**
 * Mise en page automatique (ELK, algorithme en couches, de haut en bas) : positions du coin supérieur gauche
 * de chaque nœud. Les cycles sont gérés par ELK ; le départ est placé en premier.
 */
export async function computeLayout(graph: Graph, sizes: Record<string, Size> = {}): Promise<Positions> {
  const ids = new Set(graph.nodes.map((n) => n.id));
  const ordered = [...graph.nodes].sort((a, b) => Number(b.id === graph.start) - Number(a.id === graph.start));
  const result = await elk.layout({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60',
      'elk.layered.cycleBreaking.strategy': 'DEPTH_FIRST',
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: ordered.map((n) => ({ id: n.id, ...(sizes[n.id] ?? DEFAULT_SIZE) })),
    edges: graph.edges
      .filter((e) => ids.has(e.from) && ids.has(e.to))
      .map((e) => ({ id: e.id, sources: [e.from], targets: [e.to] })),
  });
  const out: Positions = {};
  for (const c of result.children ?? []) out[c.id] = { x: Math.round(c.x ?? 0), y: Math.round(c.y ?? 0) };
  return out;
}
