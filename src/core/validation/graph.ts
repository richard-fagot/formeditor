import { fragmentExits, fragmentRoots, graphStart, type Edge, type Fragment, type Graph, type GraphNode, type Workspace } from '../model';
import type { Owner } from '../references';
import { issue, type Issue } from './issue';

export const outEdges = (g: Graph, id: string) => g.edges.filter((e) => e.from === id);

/** Vérifie une famille d'arêtes concurrentes : vide, sans « sinon », plusieurs « sinon ». */
function checkFamily(edges: Edge[], owner: Owner, nodeId: string, out: Issue[]) {
  const uncond = edges.filter((e) => !e.when).length;
  if (edges.length > 1 && uncond === 0) out.push(issue('noElse', owner, { nodeId }));
  if (uncond > 1) out.push(issue('multipleElse', owner, { nodeId }));
}

/**
 * Vérifications structurelles d'un graphe (§4.6) : accessibilité, sorties, « sinon », boucles fermées.
 * Questionnaire : départ, impasses. Fragment (EVO-008) : entrée unique, au moins une sortie, pas de fin ;
 * un nœud sans arête sortante y est une sortie, pas une impasse.
 */
export function checkGraph(ws: Workspace, g: Graph, owner: Owner): Issue[] {
  const out: Issue[] = [];
  const inFragment = owner.kind === 'fragment';
  const ids = new Set(g.nodes.map((n) => n.id));
  const start = graphStart(g);
  // Un graphe vide (questionnaire neuf) est un état intermédiaire normal : rien à signaler.
  if (ids.size && !inFragment && !ids.has(start)) out.push(issue('missingStart', owner));
  if (ids.size && inFragment) checkFragmentShape(g as Fragment, owner, out);
  const reached = new Set<string>();
  const todo = [start];
  while (todo.length) {
    const id = todo.pop()!;
    if (reached.has(id) || !ids.has(id)) continue;
    reached.add(id);
    outEdges(g, id).forEach((e) => todo.push(e.to));
  }
  for (const n of g.nodes) {
    if (!reached.has(n.id)) out.push(issue('unreachable', owner, { nodeId: n.id }));
    if (n.kind === 'end' && inFragment) out.push(issue('endInFragment', owner, { nodeId: n.id }));
    if (n.kind === 'end' || n.kind === 'exit') continue;
    const edges = outEdges(g, n.id);
    if (n.kind === 'fragment') {
      checkCall(ws, n, edges, owner, out);
      continue;
    }
    if (!edges.length) {
      if (!inFragment) out.push(issue('deadEnd', owner, { nodeId: n.id }));
    } else checkFamily(edges, owner, n.id, out);
  }
  for (const scc of closedLoops(g)) out.push(issue('loopWithoutExit', owner, { nodeId: scc }));
  return out;
}

/** Fragment : entrée unique (sauf `entry` réglée), au moins une sortie. */
function checkFragmentShape(f: Fragment, owner: Owner, out: Issue[]) {
  const roots = fragmentRoots(f);
  const explicit = !!f.entry && f.nodes.some((n) => n.id === f.entry);
  if (!explicit && roots.length !== 1) out.push(issue('fragmentEntry', owner, {}, { count: String(roots.length) }));
  if (!fragmentExits(f).length) out.push(issue('fragmentNoExit', owner));
}

/**
 * Arêtes sortantes d'un nœud fragment : chaque sortie nommée doit être raccordée (arête `exit` ou sans nom),
 * les sorties implicites par une arête sans nom. Sans arête : impasse dans un questionnaire, sortie implicite
 * (remontée à l'appelant) dans un fragment.
 */
function checkCall(ws: Workspace, n: Extract<GraphNode, { kind: 'fragment' }>, edges: Edge[], owner: Owner, out: Issue[]) {
  const f = ws.library.fragments.find((x) => x.id === n.ref);
  if (!f) return;
  const exits = [...new Set(f.nodes.flatMap((x) => (x.kind === 'exit' ? [x.name] : [])))];
  const implicit = fragmentExits(f).some((x) => x.kind !== 'exit' && x.kind !== 'end');
  for (const e of edges) if (e.exit && !exits.includes(e.exit)) out.push(issue('unknownExit', owner, { edgeId: e.id }, { exit: e.exit }));
  if (!edges.length) {
    if (owner.kind === 'fragment') return;
    if (!exits.length) out.push(issue('deadEnd', owner, { nodeId: n.id }));
  }
  for (const x of exits) {
    const family = edges.filter((e) => !e.exit || e.exit === x);
    if (!family.length) out.push(issue('exitNotConnected', owner, { nodeId: n.id }, { exit: x }));
    else checkFamily(family, owner, n.id, out);
  }
  if (implicit && edges.length) {
    const family = edges.filter((e) => !e.exit);
    if (!family.length) out.push(issue('implicitExitNotConnected', owner, { nodeId: n.id }));
    else if (!exits.length) checkFamily(family, owner, n.id, out);
  }
}

/** Composantes fortement connexes (Tarjan) bouclées sans aucune arête sortante : id du premier nœud de chacune. */
function closedLoops(g: Graph): string[] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const comps: string[][] = [];
  let i = 0;
  const visit = (v: string) => {
    index.set(v, i);
    low.set(v, i++);
    stack.push(v);
    onStack.add(v);
    for (const e of outEdges(g, v)) {
      if (!index.has(e.to)) {
        if (!g.nodes.some((n) => n.id === e.to)) continue;
        visit(e.to);
        low.set(v, Math.min(low.get(v)!, low.get(e.to)!));
      } else if (onStack.has(e.to)) low.set(v, Math.min(low.get(v)!, index.get(e.to)!));
    }
    if (low.get(v) === index.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        comp.push(w);
      } while (w !== v);
      comps.push(comp);
    }
  };
  g.nodes.forEach((n) => index.has(n.id) || visit(n.id));
  const order = g.nodes.map((n) => n.id);
  return comps
    .filter((c) => c.length > 1 || outEdges(g, c[0]!).some((e) => e.to === c[0]))
    .filter((c) => !c.some((id) => outEdges(g, id).some((e) => !c.includes(e.to))))
    .map((c) => c.sort((a, b) => order.indexOf(a) - order.indexOf(b))[0]!);
}
