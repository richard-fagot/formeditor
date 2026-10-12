import {
  createsCycle, deriveKey, isValidKey, newId, OTHER_VALUE, uniqueKey, type GraphNode, type Label, type LocalizedText, type Question, type Workspace,
} from '../../core/model';
import { collectExpressions, findUsages, renameKey, type FoundExpression, type Owner } from '../../core/references';
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

/** Expression réécrite par la copie en bibliothèque sous une autre clé (rapport). */
export interface RewrittenExpression {
  loc: FoundExpression['loc'];
  before: string;
  after: string;
}

const ownerOf = (ref: GraphRef): Owner => ({ kind: ref.kind, id: ref.id });

/**
 * Copie une question locale dans la bibliothèque (EVO-009) ; le nœud devient une instance (même id, même place).
 * Sans `key` : même clé, expressions inchangées. Avec `key` (clé prise dans la bibliothèque) : la question est d'abord
 * renommée, références réécrites et rapportées. Refusé si la clé est invalide, prise dans la bibliothèque ou dans le graphe.
 */
export function copyToLibrary(ws: Workspace, ref: GraphRef, nodeId: string, key?: string):
  { ws: Workspace; id: string; rewritten: RewrittenExpression[] } | undefined {
  const g = getGraph(ws, ref);
  const node = g?.nodes.find((n) => n.id === nodeId);
  if (!g || !node || node.kind !== 'question' || 'ref' in node) return undefined;
  const target = key ?? node.key;
  const takenInGraph = target !== node.key && usedKeys(ws, g).includes(target);
  if (!isValidKey(target) || takenInGraph || ws.library.questions.some((q) => q.key === target)) return undefined;
  let next: Workspace = JSON.parse(JSON.stringify(ws));
  const rewritten: RewrittenExpression[] = [];
  if (target !== node.key) {
    next = renameKey(next, { kind: 'question', owner: ownerOf(ref), nodeId }, target);
    const before = collectExpressions(ws);
    collectExpressions(next).forEach((f, i) => {
      if (before[i] && before[i]!.text !== f.text) rewritten.push({ loc: f.loc, before: before[i]!.text, after: f.text });
    });
  }
  const id = moveToLibrary(next, ref, nodeId);
  return id ? { ws: next, id, rewritten } : undefined;
}

/** Instance de structure de bibliothèque désignée (nœud référence et définition). */
function structureInstance(ws: Workspace, ref: GraphRef, nodeId: string) {
  const node = getGraph(ws, ref)?.nodes.find((n) => n.id === nodeId);
  if (!node || node.kind !== 'question' || !('ref' in node)) return undefined;
  const q = ws.library.questions.find((x) => x.id === node.ref);
  return q?.type === 'structure' ? { node, q } : undefined;
}

/**
 * Masque ou réaffiche un champ d'une instance de structure (EVO-009). Refusé (false) si le champ est le dernier
 * affiché. La définition en bibliothèque n'est jamais modifiée.
 */
export function setFieldHidden(ws: Workspace, ref: GraphRef, nodeId: string, field: string, hidden: boolean): boolean {
  const inst = structureInstance(ws, ref, nodeId);
  if (!inst || !inst.q.fields.some((f) => f.key === field)) return false;
  const list = inst.node.hiddenFields ?? [];
  if (hidden) {
    if (list.includes(field)) return true;
    const shown = inst.q.fields.filter((f) => !list.includes(f.key));
    if (shown.length <= 1) return false;
    inst.node.hiddenFields = [...list, field];
  } else {
    const rest = list.filter((k) => k !== field);
    if (rest.length) inst.node.hiddenFields = rest;
    else delete inst.node.hiddenFields;
  }
  return true;
}

/** Expressions du graphe qui référencent ce champ de l'instance (`cle.champ…`, `cle.champ_other`) : avertissement au masquage. */
export function hiddenFieldUsages(ws: Workspace, ref: GraphRef, nodeId: string, field: string): FoundExpression[] {
  const inst = structureInstance(ws, ref, nodeId);
  if (!inst) return [];
  const mine = (f: FoundExpression) => f.loc.owner.kind === ref.kind && f.loc.owner.id === ref.id;
  return [...findUsages(ws, [inst.q.key, field]), ...findUsages(ws, [inst.q.key, `${field}_${OTHER_VALUE}`])].filter(mine);
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
