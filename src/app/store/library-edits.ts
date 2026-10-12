import {
  createsCycle, deriveKey, newId, uniqueKey, type GraphNode, type Label, type LocalizedText, type Question, type Workspace,
} from '../../core/model';
import { renameKey } from '../../core/references';
import { previewText } from '../../plugin-api';
import { getGraph, layoutOf, updateNode, usedKeys, type GraphRef } from './graph';

/** Élément de la bibliothèque affiché ou inséré. */
export interface LibraryItem {
  kind: 'question' | 'fragment';
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

/** Ajoute un fragment vide à la bibliothèque. */
export function addFragment(ws: Workspace, title: LocalizedText): string {
  const id = newId('frg');
  const key = uniqueKey(deriveKey(firstText(title)) || 'fragment', ws.library.fragments.map((f) => f.key));
  ws.library.fragments.push({ id, key, title, nodes: [], edges: [] });
  return id;
}

/** Supprime un élément ; ses références éventuelles sont signalées par la vérification « introuvable ». */
export function deleteLibraryItem(ws: Workspace, item: LibraryItem): void {
  if (item.kind === 'question') ws.library.questions = ws.library.questions.filter((q) => q.id !== item.id);
  else {
    ws.library.fragments = ws.library.fragments.filter((f) => f.id !== item.id);
    ws.layouts = ws.layouts.filter((l) => l.graph !== item.id);
  }
}

/** Insérer le fragment `item` dans le graphe `ref` créerait-il un cycle d'appels (fragment dans lui-même, A → B → A) ? */
export function insertionCycle(ws: Workspace, ref: GraphRef, item: LibraryItem): boolean {
  return item.kind === 'fragment' && ref.kind === 'fragment' && createsCycle(ws, ref.id, item.id);
}

/** Nœud qui référence un élément de bibliothèque ; alias libre pour un fragment ; refusé si cycle d'appels. */
export function referenceNode(ws: Workspace, ref: GraphRef, item: LibraryItem, id: string): GraphNode | undefined {
  const g = getGraph(ws, ref);
  if (!g) return undefined;
  if (item.kind === 'question') return ws.library.questions.some((q) => q.id === item.id) ? { kind: 'question', id, ref: item.id } : undefined;
  const f = ws.library.fragments.find((x) => x.id === item.id);
  if (!f || insertionCycle(ws, ref, item)) return undefined;
  return { kind: 'fragment', id, ref: f.id, alias: uniqueKey(f.key, usedKeys(ws, g)) };
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

/** Renomme une sortie nommée d'un fragment et les arêtes des appels qui la visent (questionnaires et fragments). */
export function renameExit(ws: Workspace, fragmentId: string, nodeId: string, name: string): void {
  const fragment = ws.library.fragments.find((f) => f.id === fragmentId);
  const exit = fragment?.nodes.find((n) => n.id === nodeId);
  if (!exit || exit.kind !== 'exit') return;
  const old = exit.name;
  exit.name = name;
  for (const g of [...ws.questionnaires, ...ws.library.fragments]) {
    const calls = new Set(g.nodes.filter((n) => n.kind === 'fragment' && n.ref === fragmentId).map((n) => n.id));
    for (const e of g.edges) if (calls.has(e.from) && e.exit === old) e.exit = name;
  }
}
