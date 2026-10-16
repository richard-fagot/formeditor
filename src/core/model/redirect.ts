import type { Questionnaire, Workspace } from './documents';
import { fragmentEntry, fragmentExits } from './fragment';
import type { Graph } from './graph';
import type { GraphNode, RedirectButton, RedirectNode, RedirectTarget } from './node';
import { fragmentQuestions } from './required';
import { isVariantLabel, type Label, type LocalizedText } from './text';

/** Libellé par défaut du bouton Terminer d'un nœud Renvoi (EVO-024-021). */
export const FINISH_LABEL: LocalizedText = { fr: 'Terminer', en: 'Finish' };

/** Cible proposée pour un bouton de renvoi : `value` = `q:<id>` ou `n:<chemin>`, nom affiché. */
export interface TargetChoice {
  value: string;
  kind: 'questionnaire' | 'node';
  name: string;
}

/** Erreur d'un bouton (EVO-024-031 à 033) : le bouton est « en erreur ». */
export type ButtonError = 'noLabel' | 'noTarget' | 'targetMissing';

const textOf = (l: Label | undefined, lang: string): string => {
  if (!l) return '';
  const t = isVariantLabel(l) ? l.otherwise : l;
  return (t[lang] ?? '').trim() || Object.values(t).find((s) => s.trim())?.trim() || '';
};

/** Libellé d'un bouton dans une langue (repli : première langue renseignée). */
export const buttonLabel = (b: RedirectButton, lang: string): string => textOf(b.label, lang);

/** Valeur de sélection d'une cible (`q:<id>`, `n:<chemin>`), `''` sans cible. */
export const targetValue = (t: RedirectTarget | undefined): string => (!t ? '' : 'questionnaire' in t ? `q:${t.questionnaire}` : `n:${t.node}`);

/** Cible correspondant à une valeur de sélection ; une cible questionnaire neuve a ses deux toggles désactivés. */
export function targetFromValue(value: string): RedirectTarget | undefined {
  if (value.startsWith('q:')) return { questionnaire: value.slice(2), prefill: false, replace: false };
  if (value.startsWith('n:')) return { node: value.slice(2) };
  return undefined;
}

/** Nœud juste avant une fin : au moins une arête sortante, toutes vers un nœud fin. */
export function isJustBeforeEnd(g: Graph, nodeId: string): boolean {
  const out = g.edges.filter((e) => e.from === nodeId);
  return out.length > 0 && out.every((e) => g.nodes.find((n) => n.id === e.to)?.kind === 'end');
}

/** Nœuds en amont de `nodeId` : au moins un chemin en mène (le nœud lui-même exclu). */
export function upstreamNodes(g: Graph, nodeId: string): Set<string> {
  const seen = new Set<string>();
  const todo = [nodeId];
  while (todo.length) {
    const id = todo.pop()!;
    for (const e of g.edges) {
      if (e.to !== id || seen.has(e.from)) continue;
      seen.add(e.from);
      todo.push(e.from);
    }
  }
  seen.delete(nodeId);
  return seen;
}

/** `to` atteignable depuis `from` sans passer par `without`. */
function reaches(g: Graph, from: string, to: Set<string>, without: string): boolean {
  if (from === without) return false;
  const seen = new Set([from]);
  const todo = [from];
  while (todo.length) {
    const id = todo.pop()!;
    if (to.has(id)) return true;
    for (const e of g.edges) {
      if (e.from !== id || e.to === without || seen.has(e.to)) continue;
      seen.add(e.to);
      todo.push(e.to);
    }
  }
  return false;
}

/** Le nœud `id` est-il traversé sur tous les chemins de `start` à l'un des nœuds `to` (dominance) ? */
const dominates = (g: Graph, start: string, id: string, to: Set<string>) => start === id || !reaches(g, start, to, id);

/**
 * Cible nœud parcourue sur tous les chemins menant au nœud Renvoi (EVO-024-036). Question de fragment
 * (`appel/nœud`) : l'appel domine le Renvoi et, dans le fragment, la question domine toutes ses sorties.
 */
export function alwaysBefore(ws: Workspace, q: Questionnaire, redirectId: string, path: string): boolean {
  const [head, ...rest] = path.split('/');
  if (!dominates(q, q.start, head!, new Set([redirectId])) || !upstreamNodes(q, redirectId).has(head!)) return false;
  let graph: Graph = q;
  let callId = head!;
  for (const part of rest) {
    const call = graph.nodes.find((n) => n.id === callId);
    const f = call?.kind === 'fragment' ? ws.library.fragments.find((x) => x.id === call.ref) : undefined;
    const entry = f && fragmentEntry(f);
    if (!f || !entry) return false;
    const exits = new Set(fragmentExits(f).map((n) => n.id));
    if (!dominates(f, entry, part, exits)) return false;
    graph = f;
    callId = part;
  }
  return true;
}

/** Nœud désigné par un chemin d'identifiants dans un questionnaire (traverse les appels de fragments). */
export function nodeAtPath(ws: Workspace, q: Questionnaire, path: string): GraphNode | undefined {
  let graph: Graph = q;
  const parts = path.split('/');
  for (const part of parts.slice(0, -1)) {
    const call = graph.nodes.find((n) => n.id === part);
    const f = call?.kind === 'fragment' ? ws.library.fragments.find((x) => x.id === call.ref) : undefined;
    if (!f) return undefined;
    graph = f;
  }
  return graph.nodes.find((n) => n.id === parts.at(-1));
}

/** Clé d'une question (locale ou de bibliothèque). */
function questionKey(ws: Workspace, n: GraphNode): string | undefined {
  if (n.kind !== 'question') return undefined;
  if ('ref' in n) return ws.library.questions.find((q) => q.id === n.ref)?.key;
  return n.key;
}

/** Nom d'un nœud cible : clé (`alias.cle` dans un fragment), sinon titre d'une page, sinon son id. */
function nodeName(ws: Workspace, q: Questionnaire, path: string, lang: string): string | undefined {
  const node = nodeAtPath(ws, q, path);
  if (!node) return undefined;
  const key = questionKey(ws, node);
  if (key) {
    const aliases = path.split('/').slice(0, -1).reduce<{ g: Graph; names: string[] }>((acc, id) => {
      const call = acc.g.nodes.find((n) => n.id === id);
      const f = call?.kind === 'fragment' ? ws.library.fragments.find((x) => x.id === call.ref) : undefined;
      return { g: f ?? acc.g, names: call?.kind === 'fragment' ? [...acc.names, call.alias] : acc.names };
    }, { g: q, names: [] }).names;
    return [...aliases, key].join('.');
  }
  const title = 'title' in node ? textOf(node.title, lang) : '';
  return title || (node.kind === 'info' ? textOf(node.text, lang) : '') || node.id;
}

/** Nom affiché d'une cible (`undefined` : introuvable). */
export function targetName(ws: Workspace, questionnaireId: string, t: RedirectTarget, lang: string): string | undefined {
  if ('questionnaire' in t) {
    const target = ws.questionnaires.find((x) => x.id === t.questionnaire);
    return target ? textOf(target.title, lang) || target.key : undefined;
  }
  const q = ws.questionnaires.find((x) => x.id === questionnaireId);
  return q && nodeName(ws, q, t.node, lang);
}

/**
 * Cibles autorisées d'un bouton du nœud Renvoi `redirectId` (EVO-024-007 à 010) : autres questionnaires du
 * projet, puis questions, informations et synthèses en amont, puis questions des fragments appelés en amont.
 */
export function redirectTargets(ws: Workspace, questionnaireId: string, redirectId: string, lang: string): TargetChoice[] {
  const q = ws.questionnaires.find((x) => x.id === questionnaireId);
  if (!q) return [];
  const others = ws.questionnaires.filter((x) => x.id !== questionnaireId)
    .map((x): TargetChoice => ({ value: `q:${x.id}`, kind: 'questionnaire', name: textOf(x.title, lang) || x.key }));
  const up = upstreamNodes(q, redirectId);
  const nodes = q.nodes.filter((n) => up.has(n.id)).flatMap((n): string[] => {
    if (n.kind === 'question' || n.kind === 'info' || n.kind === 'summary') return [n.id];
    if (n.kind === 'fragment') return fragmentQuestions(ws, n.ref).map((x) => `${n.id}/${x.path}`);
    return [];
  });
  return [...others, ...nodes.map((path): TargetChoice => ({ value: `n:${path}`, kind: 'node', name: nodeName(ws, q, path, lang) ?? path }))];
}

/** Erreur d'un bouton : libellé vide, cible vide, cible introuvable (questionnaire du projet, nœud du questionnaire). */
export function redirectButtonError(ws: Workspace, questionnaireId: string, b: RedirectButton): ButtonError | undefined {
  if (!textOf(b.label, '')) return 'noLabel';
  if (!b.target) return 'noTarget';
  if ('questionnaire' in b.target) return ws.questionnaires.some((x) => x.id === (b.target as { questionnaire: string }).questionnaire) ? undefined : 'targetMissing';
  const q = ws.questionnaires.find((x) => x.id === questionnaireId);
  return q && nodeAtPath(ws, q, b.target.node) ? undefined : 'targetMissing';
}

/** Repointe les cibles nœud des boutons d'un nœud copié dont le premier nœud du chemin a été copié (EVO-024-053, 055). */
export function retargetButtons<N extends GraphNode>(node: N, ids: Map<string, string>): N {
  if (node.kind !== 'redirect') return node;
  const r = node as RedirectNode;
  const buttons = r.buttons.map((b) => {
    if (!b.target || !('node' in b.target)) return b;
    const [head, ...rest] = b.target.node.split('/');
    const id = ids.get(head!);
    return id ? { ...b, target: { node: [id, ...rest].join('/') } } : b;
  });
  return { ...r, buttons } as N;
}
