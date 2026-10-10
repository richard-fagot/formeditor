import { deriveKey, newId, uniqueKey, type Edge, type ExitNode, type LocalizedText, type Workspace } from '../../core/model';
import { qualifyKeys, questionOfNode } from '../../core/references';
import { getGraph, layoutOf, NODE_SPACING, usedKeys, type GraphRef } from './graph';
import { addBlock } from './library-edits';

/** Nom de sortie proposé selon la cible, quand elle n'a pas de clé. */
const KIND_NAMES: Record<string, string> = { end: 'fin', info: 'information', summary: 'synthese' };

/**
 * Regroupe des nœuds d'un questionnaire dans un nouveau bloc de la bibliothèque (spec §4.3).
 * - Entrée du bloc : le départ du questionnaire s'il est sélectionné, sinon la cible de la première arête entrante.
 * - Une sortie nommée par cible extérieure (nommée d'après sa clé) ; l'hôte relie chaque sortie à sa cible.
 * - Les arêtes entrantes visent l'instance ; les références de l'hôte aux clés déplacées sont préfixées par l'alias.
 * Renvoie le nouveau projet, ou `undefined` si la sélection est vide ou contient une instance de bloc ou une sortie.
 */
export function groupIntoBlock(ws: Workspace, ref: GraphRef, ids: string[], title: LocalizedText) {
  const g = getGraph(ws, ref);
  if (!g || ref.kind !== 'questionnaire') return undefined;
  const moved = g.nodes.filter((n) => ids.includes(n.id));
  if (!moved.length || moved.some((n) => n.kind === 'block' || n.kind === 'exit')) return undefined;
  const inside = new Set(moved.map((n) => n.id));
  const movedKeys = moved.flatMap((n) => questionOfNode(ws, n)?.key ?? []);

  const blockId = addBlock(ws, title);
  const block = ws.library.blocks.find((b) => b.id === blockId)!;
  const firstIn = g.edges.find((e) => !inside.has(e.from) && inside.has(e.to));
  block.start = inside.has(g.start) ? g.start : (firstIn?.to ?? moved[0]!.id);
  block.nodes = moved;

  const remaining = g.nodes.filter((n) => !inside.has(n.id));
  const alias = uniqueKey(deriveKey(block.key) || 'bloc', usedKeys(ws, { ...g, nodes: remaining }));
  const instanceId = newId('n');

  // Une sortie par cible extérieure.
  const exits = new Map<string, ExitNode>();
  const exitFor = (target: string) => {
    let x = exits.get(target);
    if (!x) {
      const t = g.nodes.find((n) => n.id === target);
      const base = (t && questionOfNode(ws, t)?.key) ?? (t?.kind === 'block' ? t.alias : t && KIND_NAMES[t.kind]) ?? 'sortie';
      x = { kind: 'exit', id: newId('n'), name: uniqueKey(base, [...exits.values()].map((e) => e.name)) };
      exits.set(target, x);
    }
    return x;
  };

  const hostEdges: Edge[] = [];
  for (const e of g.edges) {
    const fromIn = inside.has(e.from);
    const toIn = inside.has(e.to);
    if (fromIn && toIn) block.edges.push(e);
    else if (fromIn) block.edges.push({ ...e, to: exitFor(e.to).id });
    else if (toIn) hostEdges.push({ ...e, to: instanceId });
    else hostEdges.push(e);
  }
  for (const [target, x] of exits) hostEdges.push({ id: newId('e'), from: instanceId, to: target, exit: x.name });
  block.nodes.push(...exits.values());
  g.nodes = [...remaining, { kind: 'block', id: instanceId, ref: blockId, alias }];
  g.edges = hostEdges;
  if (inside.has(g.start)) g.start = instanceId;

  // Mise en page : positions conservées dans le bloc, sorties en dessous ; l'instance prend la place de l'entrée.
  const hostLayout = layoutOf(ws, ref.id).nodes;
  const blockLayout = layoutOf(ws, blockId).nodes;
  for (const n of moved) blockLayout[n.id] = hostLayout[n.id] ?? { x: 0, y: 0 };
  const bottom = Math.max(...moved.map((n) => blockLayout[n.id]!.y)) + NODE_SPACING.y;
  const left = Math.min(...moved.map((n) => blockLayout[n.id]!.x));
  [...exits.values()].forEach((x, i) => (blockLayout[x.id] = { x: left + i * NODE_SPACING.x, y: bottom }));
  hostLayout[instanceId] = { ...(hostLayout[block.start] ?? { x: 0, y: 0 }) };
  for (const n of moved) delete hostLayout[n.id];

  return { ws: qualifyKeys(ws, { kind: 'questionnaire', id: ref.id }, movedKeys, alias), blockId, instanceId };
}
