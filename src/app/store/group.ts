import { deriveKey, fragmentRoots, newId, uniqueKey, type Edge, type ExitNode, type LocalizedText, type Questionnaire, type Workspace } from '../../core/model';
import { qualifyKeys, questionOfNode } from '../../core/references';
import { getGraph, layoutOf, NODE_SPACING, usedKeys, type GraphRef } from './graph';
import { addFragment } from './library-edits';
import { moveCommentsTo } from './comment-edits';

/** Nom de sortie proposé selon la cible, quand elle n'a pas de clé. */
const KIND_NAMES: Record<string, string> = { end: 'fin', info: 'information', summary: 'synthese' };

/** Nœuds d'entrée d'une sélection : départ du graphe s'il est sélectionné, cibles des arêtes venues de l'extérieur. */
export function groupEntries(ws: Workspace, ref: GraphRef, ids: string[]): string[] {
  const g = getGraph(ws, ref) as Questionnaire | undefined;
  if (!g) return [];
  const inside = new Set(ids);
  const entries = g.edges.filter((e) => !inside.has(e.from) && inside.has(e.to)).map((e) => e.to);
  return [...new Set([...(inside.has(g.start) ? [g.start] : []), ...entries])];
}

/** Une sélection extractible en fragment ne contient ni fin ni sortie nommée (un fragment n'en a pas). */
export function canExtract(ws: Workspace, ref: GraphRef, ids: string[]): boolean {
  const g = getGraph(ws, ref);
  return !!g && !g.nodes.some((n) => ids.includes(n.id) && (n.kind === 'end' || n.kind === 'exit'));
}

/**
 * Extrait des nœuds d'un questionnaire dans un nouveau fragment de la bibliothèque (spec §4.3).
 * - Entrée unique (`groupEntries`) : le départ du questionnaire s'il est sélectionné, sinon la cible des arêtes
 *   entrantes. Une sélection à plusieurs entrées est refusée (le fragment n'a qu'une entrée : le parcours changerait).
 *   Si elle n'est pas l'unique nœud sans arête entrante du fragment, elle est réglée (`entry`).
 * - Une sortie nommée par cible extérieure (nommée d'après sa clé) ; l'appelant relie chaque sortie à sa cible.
 * - Les arêtes entrantes visent le nœud fragment ; les références de l'appelant aux clés et alias déplacés sont préfixées par l'alias.
 * Renvoie le nouveau projet, ou `undefined` si la sélection est vide, a plusieurs entrées, ou contient une fin ou une sortie.
 */
export function groupIntoFragment(ws: Workspace, ref: GraphRef, ids: string[], title: LocalizedText) {
  const g = getGraph(ws, ref) as Questionnaire | undefined;
  if (!g || ref.kind !== 'questionnaire') return undefined;
  const moved = g.nodes.filter((n) => ids.includes(n.id));
  if (!moved.length || !canExtract(ws, ref, ids)) return undefined;
  const inside = new Set(moved.map((n) => n.id));
  const entries = groupEntries(ws, ref, [...inside]);
  if (entries.length > 1) return undefined;
  const movedKeys = moved.flatMap((n) => (n.kind === 'fragment' ? [n.alias] : questionOfNode(ws, n)?.key ?? []));

  const fragmentId = addFragment(ws, title);
  const fragment = ws.library.fragments.find((f) => f.id === fragmentId)!;
  const entry = entries[0] ?? moved[0]!.id;
  fragment.nodes = moved;

  const remaining = g.nodes.filter((n) => !inside.has(n.id));
  const alias = uniqueKey(deriveKey(fragment.key) || 'fragment', usedKeys(ws, { ...g, nodes: remaining }));
  const instanceId = newId('n');

  // Une sortie par cible extérieure.
  const exits = new Map<string, ExitNode>();
  const exitFor = (target: string) => {
    let x = exits.get(target);
    if (!x) {
      const t = g.nodes.find((n) => n.id === target);
      const base = (t && questionOfNode(ws, t)?.key) ?? (t?.kind === 'fragment' ? t.alias : t && KIND_NAMES[t.kind]) ?? 'sortie';
      x = { kind: 'exit', id: newId('n'), name: uniqueKey(base, [...exits.values()].map((e) => e.name)) };
      exits.set(target, x);
    }
    return x;
  };

  const hostEdges: Edge[] = [];
  for (const e of g.edges) {
    const fromIn = inside.has(e.from);
    const toIn = inside.has(e.to);
    if (fromIn && toIn) fragment.edges.push(e);
    else if (fromIn) fragment.edges.push({ ...e, to: exitFor(e.to).id });
    else if (toIn) hostEdges.push({ ...e, to: instanceId });
    else hostEdges.push(e);
  }
  for (const [target, x] of exits) hostEdges.push({ id: newId('e'), from: instanceId, to: target, exit: x.name });
  fragment.nodes.push(...exits.values());
  if (fragmentRoots(fragment).join() !== entry) fragment.entry = entry;
  g.nodes = [...remaining, { kind: 'fragment', id: instanceId, ref: fragmentId, alias }];
  g.edges = hostEdges;
  if (inside.has(g.start)) g.start = instanceId;

  // Mise en page : positions conservées dans le fragment, sorties en dessous ; le nœud fragment prend la place de l'entrée.
  const hostLayout = layoutOf(ws, ref.id).nodes;
  const fragmentLayout = layoutOf(ws, fragmentId).nodes;
  for (const n of moved) fragmentLayout[n.id] = hostLayout[n.id] ?? { x: 0, y: 0 };
  const bottom = Math.max(...moved.map((n) => fragmentLayout[n.id]!.y)) + NODE_SPACING.y;
  const left = Math.min(...moved.map((n) => fragmentLayout[n.id]!.x));
  [...exits.values()].forEach((x, i) => (fragmentLayout[x.id] = { x: left + i * NODE_SPACING.x, y: bottom }));
  hostLayout[instanceId] = { ...(hostLayout[entry] ?? { x: 0, y: 0 }) };
  for (const n of moved) delete hostLayout[n.id];
  moveCommentsTo(ws, ref.id, fragmentId, moved.map((n) => n.id));

  return { ws: qualifyKeys(ws, { kind: 'questionnaire', id: ref.id }, movedKeys, alias), fragmentId, instanceId };
}
