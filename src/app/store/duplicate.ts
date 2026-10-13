import { isVariantLabel, newId, uniqueKey, type Edge, type Graph, type GraphNode, type Label, type LocalizedText, type Workspace } from '../../core/model';
import type { LibraryItem } from './library-edits';

/** Nom d'une copie dans une langue : `n` = 1 pour « Copie de X », 2 pour « Copie 2 de X »… */
export type CopyName = (lang: string, name: string, n: number) => string;

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** « Copie de <nom> » dans chaque langue ; le premier rang dont le nom n'est pas déjà pris (`taken`, toutes langues). */
function copyTitle(text: LocalizedText, taken: LocalizedText[], name: CopyName): LocalizedText {
  const used = new Set(taken.flatMap((t) => Object.values(t)));
  for (let n = 1; ; n++) {
    const out = Object.fromEntries(Object.entries(text).map(([l, s]) => [l, name(l, s, n)]));
    if (!Object.values(out).some((s) => used.has(s))) return out;
  }
}
const otherwise = (l: Label): LocalizedText => (isVariantLabel(l) ? l.otherwise : l);

/** Copie des nœuds et arêtes d'un graphe avec de nouveaux ids ; mise en page reprise. Renvoie la table des ids. */
function cloneGraph(ws: Workspace, g: Graph & { id: string }, newGraphId: string): { nodes: GraphNode[]; edges: Edge[]; ids: Map<string, string> } {
  const ids = new Map(g.nodes.map((n) => [n.id, newId('n')]));
  const nodes = g.nodes.map((n) => ({ ...clone(n), id: ids.get(n.id)! }) as GraphNode);
  const edges = g.edges.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e) => ({ ...clone(e), id: newId('e'), from: ids.get(e.from)!, to: ids.get(e.to)! }));
  const layout = ws.layouts.find((l) => l.graph === g.id);
  if (layout) {
    const pos = Object.fromEntries(Object.entries(layout.nodes).flatMap(([id, p]) => (ids.has(id) ? [[ids.get(id)!, clone(p)]] : [])));
    ws.layouts.push({ ...clone(layout), graph: newGraphId, nodes: pos });
  }
  return { nodes, edges, ids };
}

/** Duplique un questionnaire juste après l'original (EVO-010) : nouvel id, clé et fichier uniques, aucun lien. Renvoie l'id. */
export function duplicateQuestionnaire(ws: Workspace, id: string, name: CopyName): string | undefined {
  const i = ws.questionnaires.findIndex((q) => q.id === id);
  const q = ws.questionnaires[i];
  if (!q) return undefined;
  const copyId = newId('q');
  const key = uniqueKey(q.key, ws.questionnaires.map((x) => x.key));
  const { nodes, edges, ids } = cloneGraph(ws, q, copyId);
  const title = copyTitle(q.title, ws.questionnaires.map((x) => x.title), name);
  ws.questionnaires.splice(i + 1, 0, { ...clone(q), id: copyId, key, title, nodes, edges, start: ids.get(q.start) ?? '' });
  const entries = ws.project.questionnaires;
  const at = entries.findIndex((e) => e.id === id);
  entries.splice(at < 0 ? entries.length : at + 1, 0, { id: copyId, file: `${key}.json` });
  return copyId;
}

/** Duplique une question ou un fragment de la bibliothèque juste après l'original ; les références contenues restent des références. */
export function duplicateLibraryItem(ws: Workspace, item: LibraryItem, name: CopyName): string | undefined {
  const lib = ws.library;
  if (item.kind === 'question') {
    const i = lib.questions.findIndex((q) => q.id === item.id);
    const q = lib.questions[i];
    if (!q) return undefined;
    const copy = clone(q);
    copy.id = newId('lq');
    copy.key = uniqueKey(q.key, lib.questions.map((x) => x.key));
    const title = copyTitle(otherwise(q.label), lib.questions.map((x) => otherwise(x.label)), name);
    copy.label = isVariantLabel(copy.label) ? { ...copy.label, otherwise: title } : title;
    lib.questions.splice(i + 1, 0, copy);
    return copy.id;
  }
  const i = lib.fragments.findIndex((f) => f.id === item.id);
  const f = lib.fragments[i];
  if (!f) return undefined;
  const copyId = newId('frg');
  const { nodes, edges, ids } = cloneGraph(ws, f, copyId);
  const copy = { ...clone(f), id: copyId, key: uniqueKey(f.key, lib.fragments.map((x) => x.key)), title: copyTitle(f.title, lib.fragments.map((x) => x.title), name), nodes, edges };
  if (f.entry) copy.entry = ids.get(f.entry);
  lib.fragments.splice(i + 1, 0, copy);
  return copyId;
}
