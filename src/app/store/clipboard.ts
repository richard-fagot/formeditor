import { newId, uniqueKey, type Edge, type GraphNode, type Workspace } from '../../core/model';
import { renameKeysIn } from '../../core/references';
import { getGraph, layoutOf, usedKeys, type GraphRef } from './graph';
import { insertionCycle } from './library-edits';

/** Presse-papiers interne (EVO-010) : instantané des nœuds copiés et des arêtes internes, lié au projet. */
export interface Clip {
  project: string;
  nodes: GraphNode[];
  edges: Edge[];
  positions: Record<string, { x: number; y: number }>;
  /** Nœud qui était le départ du questionnaire d'origine. */
  start?: string;
}

/** Nœud écarté au collage (message) : fin dans un fragment, sortie dans un questionnaire, fragment qui créerait un cycle ; départ conservé dans la cible. */
export interface PasteDrop {
  reason: 'end' | 'exit' | 'cycle' | 'start';
  nodeId: string;
}

export const PASTE_OFFSET = 40;

/** Copie les nœuds `ids` du graphe `ref` et les arêtes dont les deux extrémités sont copiées. */
export function copyNodes(ws: Workspace, ref: GraphRef, ids: string[]): Clip | undefined {
  const g = getGraph(ws, ref);
  const nodes = g?.nodes.filter((n) => ids.includes(n.id)) ?? [];
  if (!g || !nodes.length) return undefined;
  const layout = ws.layouts.find((l) => l.graph === ref.id)?.nodes ?? {};
  const kept = new Set(nodes.map((n) => n.id));
  const clip: Clip = {
    project: ws.project.id,
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(g.edges.filter((e) => kept.has(e.from) && kept.has(e.to)))),
    positions: Object.fromEntries(nodes.map((n) => [n.id, { x: layout[n.id]?.x ?? 0, y: layout[n.id]?.y ?? 0 }])),
  };
  if ('start' in g && kept.has(g.start as string)) clip.start = g.start as string;
  return clip;
}

const keyOf = (n: GraphNode) => (n.kind === 'fragment' ? n.alias : n.kind === 'question' && !('ref' in n) ? n.key : undefined);

/**
 * Colle `clip` dans le graphe `ref` (brouillon) : nouveaux ids, clés et alias pris suffixés (références de la sélection réécrites),
 * placés au point `at` (coin haut gauche de la sélection) ou décalés de l'original. Renvoie les ids créés et les nœuds écartés.
 */
export function pasteNodes(ws: Workspace, ref: GraphRef, clip: Clip, at?: { x: number; y: number }): { ids: string[]; dropped: PasteDrop[] } {
  const g = getGraph(ws, ref);
  if (!g) return { ids: [], dropped: [] };
  const dropped: PasteDrop[] = [];
  const nodes = clip.nodes.filter((n) => {
    const reason = n.kind === 'end' && ref.kind === 'fragment' ? 'end'
      : n.kind === 'exit' && ref.kind === 'questionnaire' ? 'exit'
        : n.kind === 'fragment' && insertionCycle(ws, ref, { kind: 'fragment', id: n.ref }) ? 'cycle' : undefined;
    if (reason) dropped.push({ reason, nodeId: n.id });
    return !reason;
  });
  // Nouvelles clés : hors des clés de la cible et des clés d'origine de la sélection.
  const taken = new Set([...usedKeys(ws, g), ...clip.nodes.flatMap((n) => keyOf(n) ?? [])]);
  const target = new Set(usedKeys(ws, g));
  const renames: Record<string, string> = {};
  for (const n of nodes) {
    const k = keyOf(n);
    if (!k || !target.has(k) || renames[k]) continue;
    renames[k] = uniqueKey(k, taken);
    taken.add(renames[k]!);
  }
  const ids = new Map(nodes.map((n) => [n.id, newId('n')]));
  const edges = clip.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  const part = renameKeysIn({ nodes, edges }, renames, { kind: ref.kind, id: ref.id });
  const hadStart = 'start' in g && g.nodes.some((n) => n.id === (g as { start: string }).start);
  const layout = layoutOf(ws, ref.id).nodes;
  const ps = nodes.map((n) => clip.positions[n.id] ?? { x: 0, y: 0 });
  const origin = { x: Math.min(...ps.map((p) => p.x)), y: Math.min(...ps.map((p) => p.y)) };
  const shift = at ? { x: at.x - origin.x, y: at.y - origin.y } : { x: PASTE_OFFSET, y: PASTE_OFFSET };
  part.nodes.forEach((n, i) => {
    const id = ids.get(n.id)!;
    const p = ps[i]!;
    layout[id] = { x: Math.round(p.x + shift.x), y: Math.round(p.y + shift.y) };
    g.nodes.push({ ...n, id } as GraphNode);
  });
  for (const e of part.edges) g.edges.push({ ...e, id: newId('e'), from: ids.get(e.from)!, to: ids.get(e.to)! });
  const copiedStart = clip.start && ids.has(clip.start) ? clip.start : undefined;
  // Départ : rôle, pas un nœud. Un questionnaire sans départ prend le départ collé (sinon le premier nœud) ; ailleurs il est conservé.
  if ('start' in g && !hadStart && ids.size) (g as { start: string }).start = ids.get(copiedStart ?? nodes[0]!.id)!;
  else if (copiedStart) dropped.push({ reason: 'start', nodeId: copiedStart });
  return { ids: [...ids.values()], dropped };
}

/** Duplique des nœuds dans leur graphe (Ctrl+D) : même mécanisme que copier puis coller (références de la sélection réécrites), décalés. */
export function duplicateNodes(ws: Workspace, ref: GraphRef, ids: string[]): string[] {
  const clip = copyNodes(ws, ref, ids);
  return clip ? pasteNodes(ws, ref, clip).ids : [];
}
