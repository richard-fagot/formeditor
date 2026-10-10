import {
  deriveKey, newId, uniqueKey, type Graph, type GraphNode, type Label, type LocalizedText, type Question, type Workspace,
} from '../../core/model';
import { renameKey } from '../../core/references';
import { previewText } from '../../plugin-api';
import { getGraph, layoutOf, updateNode, usedKeys, type GraphRef } from './graph';

/** Élément de la bibliothèque affiché ou inséré. */
export interface LibraryItem {
  kind: 'question' | 'block';
  id: string;
}

const firstText = (t: LocalizedText) => Object.values(t).find((s) => s?.trim()) ?? '';

/** Ajoute une question texte à la bibliothèque ; clé dérivée de l'intitulé, unique dans la bibliothèque. */
export function addLibraryQuestion(ws: Workspace, label: LocalizedText): string {
  const id = newId('lq');
  const key = uniqueKey(deriveKey(firstText(label)) || 'question', ws.library.questions.map((q) => q.key));
  ws.library.questions.push({ id, key, label, type: 'text' });
  return id;
}

/** Ajoute un bloc vide à la bibliothèque. */
export function addBlock(ws: Workspace, title: LocalizedText): string {
  const id = newId('blk');
  const key = uniqueKey(deriveKey(firstText(title)) || 'bloc', ws.library.blocks.map((b) => b.key));
  ws.library.blocks.push({ id, key, title, start: '', nodes: [], edges: [] });
  return id;
}

/** Supprime un élément ; ses références éventuelles sont signalées par la vérification « introuvable ». */
export function deleteLibraryItem(ws: Workspace, item: LibraryItem): void {
  if (item.kind === 'question') ws.library.questions = ws.library.questions.filter((q) => q.id !== item.id);
  else {
    ws.library.blocks = ws.library.blocks.filter((b) => b.id !== item.id);
    ws.layouts = ws.layouts.filter((l) => l.graph !== item.id);
  }
}

/** Nœud qui référence un élément de bibliothèque (pas de bloc dans un bloc) ; alias libre pour un bloc. */
export function referenceNode(ws: Workspace, g: Graph, item: LibraryItem, id: string): GraphNode | undefined {
  if (item.kind === 'question') return ws.library.questions.some((q) => q.id === item.id) ? { kind: 'question', id, ref: item.id } : undefined;
  const block = ws.library.blocks.find((b) => b.id === item.id);
  if (!block || ws.library.blocks.some((b) => b === g)) return undefined;
  return { kind: 'block', id, ref: block.id, alias: uniqueKey(block.key, usedKeys(ws, g)) };
}

/** Position d'un nœud (dépôt par glisser). */
export function placeNode(ws: Workspace, graphId: string, nodeId: string, p: { x: number; y: number }): void {
  layoutOf(ws, graphId).nodes[nodeId] = { x: Math.round(p.x), y: Math.round(p.y) };
}

/** Une question locale peut-elle aller dans la bibliothèque (clé encore libre parmi ses questions) ? */
export function canMoveToLibrary(ws: Workspace, ref: GraphRef, nodeId: string): boolean {
  const node = getGraph(ws, ref)?.nodes.find((n) => n.id === nodeId);
  return !!node && node.kind === 'question' && !('ref' in node) && !ws.library.questions.some((q) => q.key === node.key);
}

/**
 * Déplace une question locale dans la bibliothèque ; le nœud devient une référence (même clé, donc expressions
 * inchangées). Refusé si la clé est déjà prise dans la bibliothèque (clés uniques dans la bibliothèque).
 */
export function moveToLibrary(ws: Workspace, ref: GraphRef, nodeId: string): string | undefined {
  const node = getGraph(ws, ref)?.nodes.find((n) => n.id === nodeId);
  if (!node || node.kind !== 'question' || 'ref' in node || !canMoveToLibrary(ws, ref, nodeId)) return undefined;
  const { kind: _kind, ...rest } = JSON.parse(JSON.stringify(node)) as typeof node;
  const id = newId('lq');
  ws.library.questions.push({ ...rest, id } as Question);
  updateNode(ws, ref, nodeId, () => ({ kind: 'question', id: nodeId, ref: id }));
  return id;
}

/**
 * Change l'intitulé d'une question de bibliothèque ; si la clé était dérivée de l'ancien intitulé, elle est
 * redérivée (unique dans la bibliothèque) et le renommage est propagé.
 */
export function setLibraryQuestionLabel(ws: Workspace, id: string, label: Label | undefined, lang: string): Workspace {
  const q = ws.library.questions.find((x) => x.id === id);
  if (!q) return ws;
  const env = { contentLang: lang, defaultLang: ws.project.defaultLanguage };
  const derived = new RegExp(`^${deriveKey(previewText(q.label, env))}(_\\d+)?$`).test(q.key);
  q.label = label ?? {};
  const text = previewText(label, env);
  if (!derived || !text.trim()) return ws;
  const key = uniqueKey(deriveKey(text), ws.library.questions.filter((x) => x.id !== id).map((x) => x.key));
  return key === q.key ? ws : renameKey(ws, { kind: 'question', owner: { kind: 'libraryQuestion', id }, nodeId: id }, key);
}

/** Renomme une sortie de bloc et les arêtes des instances qui la visent. */
export function renameExit(ws: Workspace, blockId: string, nodeId: string, name: string): void {
  const block = ws.library.blocks.find((b) => b.id === blockId);
  const exit = block?.nodes.find((n) => n.id === nodeId);
  if (!exit || exit.kind !== 'exit') return;
  const old = exit.name;
  exit.name = name;
  for (const q of ws.questionnaires) {
    const instances = new Set(q.nodes.filter((n) => n.kind === 'block' && n.ref === blockId).map((n) => n.id));
    for (const e of q.edges) if (instances.has(e.from) && e.exit === old) e.exit = name;
  }
}
