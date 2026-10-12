import { fragmentExits, graphStart, type Edge, type Graph, type Workspace } from '../model';
import { questionOfNode } from '../references';

/** Ensembles de clés garanties : clé nue ou `alias.cle` (`a.b.cle` imbriqué) pour une question de fragment. */
export type Guarantees = Map<string, Set<string>>;

const intersect = (sets: Set<string>[]) =>
  sets.length ? new Set([...sets[0]!].filter((k) => sets.every((s) => s.has(k)))) : new Set<string>();

/**
 * Clés posées en traversant `nodeId` par l'arête `edge`. Nœud fragment : clés garanties à toutes les sorties
 * qu'emprunte l'arête (sortie nommée `edge.exit`, sinon toutes), préfixées par l'alias. `seen` : garde contre un cycle d'appels.
 */
export function generated(ws: Workspace, g: Graph, nodeId: string, edge?: Edge, seen = new Set<string>()): Set<string> {
  const node = g.nodes.find((n) => n.id === nodeId);
  if (!node) return new Set();
  const q = questionOfNode(ws, node);
  if (q) return new Set([q.key]);
  if (node.kind !== 'fragment' || seen.has(node.ref)) return new Set();
  const f = ws.library.fragments.find((x) => x.id === node.ref);
  if (!f) return new Set();
  const inner = new Set([...seen, f.id]);
  const before = guaranteedBefore(ws, f, inner);
  const exits = fragmentExits(f).filter((n) => n.kind !== 'end' && (!edge?.exit || (n.kind === 'exit' && n.name === edge.exit)));
  const atExits = intersect(exits.map((x) => new Set([...(before.get(x.id) ?? []), ...generated(ws, f, x.id, undefined, inner)])));
  return new Set([...atExits].map((k) => `${node.alias}.${k}`));
}

/**
 * Analyse « doit avoir été posée » : pour chaque nœud atteignable, les clés posées sur **tous** les
 * chemins qui y mènent depuis le départ (l'entrée pour un fragment ; intersection sur les prédécesseurs, point fixe).
 */
export function guaranteedBefore(ws: Workspace, g: Graph, seen = new Set<string>()): Guarantees {
  const start = graphStart(g);
  const result: Guarantees = new Map([[start, new Set()]]);
  const gens = new Map(g.edges.map((e) => [e.id, generated(ws, g, e.from, e, seen)]));
  let changed = true;
  for (let guard = 0; changed && guard < 200; guard++) {
    changed = false;
    for (const n of g.nodes) {
      if (n.id === start) continue;
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
