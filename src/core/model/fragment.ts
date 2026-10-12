import type { Fragment, Questionnaire, Workspace } from './documents';
import type { Graph } from './graph';
import type { GraphNode } from './node';

/** Nœuds sans arête entrante (candidats à l'entrée d'un fragment), dans l'ordre des nœuds. */
export function fragmentRoots(g: Graph): string[] {
  const targets = new Set(g.edges.map((e) => e.to));
  return g.nodes.filter((n) => !targets.has(n.id)).map((n) => n.id);
}

/**
 * Entrée effective d'un fragment : `entry` si elle désigne un nœud, sinon le premier nœud sans arête
 * entrante (l'unique, normalement), sinon le premier nœud ; `undefined` pour un fragment vide.
 */
export function fragmentEntry(f: Fragment): string | undefined {
  if (f.entry && f.nodes.some((n) => n.id === f.entry)) return f.entry;
  return fragmentRoots(f)[0] ?? f.nodes[0]?.id;
}

/** Sorties d'un fragment : nœuds sans arête sortante (sortie nommée comprise). */
export function fragmentExits(g: Graph): GraphNode[] {
  const sources = new Set(g.edges.map((e) => e.from));
  return g.nodes.filter((n) => !sources.has(n.id));
}

/** Départ d'un graphe : celui d'un questionnaire, l'entrée effective d'un fragment (`''` si vide). */
export function graphStart(g: Questionnaire | Fragment | Graph): string {
  if ('start' in g) return (g as Questionnaire).start;
  return 'id' in g ? (fragmentEntry(g as Fragment) ?? '') : '';
}

/** Fragments appelés par le fragment `id`, directement ou non (sans lui-même, sauf cycle). */
export function calledFragments(ws: Workspace, id: string): Set<string> {
  const out = new Set<string>();
  const todo = [id];
  while (todo.length) {
    const current = todo.pop();
    const f = ws.library.fragments.find((x) => x.id === current);
    for (const n of f?.nodes ?? []) {
      if (n.kind === 'fragment' && !out.has(n.ref)) {
        out.add(n.ref);
        todo.push(n.ref);
      }
    }
  }
  return out;
}

/** Placer le fragment `target` dans le fragment `host` créerait-il un cycle d'appels ? */
export function createsCycle(ws: Workspace, host: string, target: string): boolean {
  return host === target || calledFragments(ws, target).has(host);
}

/** Graphes qui instancient directement le fragment : questionnaires puis fragments. */
export function fragmentCallers(ws: Workspace, id: string): { kind: 'questionnaire' | 'fragment'; id: string }[] {
  const uses = (g: Graph) => g.nodes.some((n) => n.kind === 'fragment' && n.ref === id);
  return [
    ...ws.questionnaires.filter(uses).map((q) => ({ kind: 'questionnaire' as const, id: q.id })),
    ...ws.library.fragments.filter(uses).map((f) => ({ kind: 'fragment' as const, id: f.id })),
  ];
}
