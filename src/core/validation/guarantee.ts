import type { Edge, Graph, Workspace } from '../model';
import { questionOfNode } from '../references';

/** Ensembles de clés garanties : clé nue ou `alias.cle` pour une question de bloc. */
export type Guarantees = Map<string, Set<string>>;

const intersect = (sets: Set<string>[]) =>
  sets.length ? new Set([...sets[0]!].filter((k) => sets.every((s) => s.has(k)))) : new Set<string>();

/** Clés posées en traversant `nodeId` par l'arête `edge`. */
export function generated(ws: Workspace, g: Graph, nodeId: string, edge?: Edge): Set<string> {
  const node = g.nodes.find((n) => n.id === nodeId);
  if (!node) return new Set();
  const q = questionOfNode(ws, node);
  if (q) return new Set([q.key]);
  if (node.kind !== 'block') return new Set();
  const block = ws.library.blocks.find((b) => b.id === node.ref);
  if (!block) return new Set();
  const inner = guaranteedBefore(ws, block);
  const exits = block.nodes.filter((n) => n.kind === 'exit' && (!edge?.exit || n.name === edge.exit));
  const atExits = intersect(exits.map((x) => inner.get(x.id) ?? new Set()));
  return new Set([...atExits].map((k) => `${node.alias}.${k}`));
}

/**
 * Analyse « doit avoir été posée » : pour chaque nœud atteignable, les clés posées sur **tous** les
 * chemins qui y mènent depuis le départ (intersection sur les prédécesseurs, point fixe).
 */
export function guaranteedBefore(ws: Workspace, g: Graph): Guarantees {
  const result: Guarantees = new Map([[g.start, new Set()]]);
  const gens = new Map(g.edges.map((e) => [e.id, generated(ws, g, e.from, e)]));
  let changed = true;
  for (let guard = 0; changed && guard < 200; guard++) {
    changed = false;
    for (const n of g.nodes) {
      if (n.id === g.start) continue;
      const incoming = g.edges.filter((e) => e.to === n.id && result.has(e.from));
      if (!incoming.length) continue;
      const next = intersect(incoming.map((e) => new Set([...result.get(e.from)!, ...gens.get(e.id)!])));
      const prev = result.get(n.id);
      if (!prev || prev.size !== next.size || [...next].some((k) => !prev.has(k))) {
        result.set(n.id, next);
        changed = true;
      }
    }
  }
  return result;
}
