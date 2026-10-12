// Annuler / rétablir (avec transactions) et synchronisation des onglets, sortis de `store.ts`.
import type { Workspace } from '../../core/model';
import { restoreSnapshot, takeSnapshot, type Scope, type ScopeHistory } from './history';
import type { GraphRef } from './graph';
import type { LibraryItem } from './library-edits';

/** Onglets : questionnaire `q:<id>`, fragment de la bibliothèque `f:<id>` (EVO-008), bibliothèque, état du système, paramètres. */
export type TabId = `q:${string}` | `f:${string}` | 'library' | 'system' | 'settings';

/** Partie de l'état applicatif touchée par annuler / rétablir. */
interface TravelState {
  ws: Workspace;
  history: Record<string, ScopeHistory>;
  tabs: TabId[];
  activeTab: TabId;
  selection: { graph?: GraphRef; nodes: string[]; edge?: string };
  libraryItem?: LibraryItem;
  dirty: boolean;
  compare?: string;
}

/** Portées dont le contenu diffère entre deux états du projet (références d'abord, contenu ensuite). */
export function changedScopes(a: Workspace, b: Workspace): Scope[] {
  if (a === b) return [];
  const ids = [...new Set([...a.questionnaires, ...b.questionnaires].map((q) => q.id))];
  const scopes: Scope[] = ['project', 'library', ...ids.map((id) => `q:${id}` as const)];
  return scopes.filter((sc) => {
    const x = takeSnapshot(a, sc) as unknown as Record<string, unknown>;
    const y = takeSnapshot(b, sc) as unknown as Record<string, unknown>;
    return Object.keys({ ...x, ...y }).some((k) => x[k] !== y[k] && JSON.stringify(x[k]) !== JSON.stringify(y[k]));
  });
}

/**
 * Annule (`from = 'past'`) ou rétablit (`'future'`) le dernier point de `scope` ; s'il appartient à une transaction,
 * fait de même dans chaque portée où un point de cette transaction est en tête.
 */
export function travel(s: TravelState, scope: Scope, from: 'past' | 'future'): void {
  const top = s.history[scope]?.[from].at(-1);
  if (!top) return;
  const ids = new Set(s.ws.questionnaires.map((q) => q.id));
  const scopes = top.tx === undefined
    ? [scope]
    : (Object.keys(s.history) as Scope[]).filter((sc) => s.history[sc]![from].at(-1)?.tx === top.tx);
  for (const sc of scopes) {
    const h = s.history[sc]!;
    const snap = h[from].at(-1)!;
    const current = { ...takeSnapshot(s.ws, sc), tx: snap.tx };
    restoreSnapshot(s.ws, snap);
    const to = from === 'past' ? 'future' : 'past';
    s.history[sc] = { ...h, [from]: h[from].slice(0, -1), [to]: [...h[to], current], lastKey: undefined } as ScopeHistory;
  }
  syncTabs(s, ids);
  s.dirty = true;
}

/**
 * Après annuler / rétablir : ferme les onglets des questionnaires disparus (création annulée), rouvre ceux
 * qui réapparaissent (création rétablie), ferme ceux des fragments disparus ; sélection, élément de la bibliothèque et vue côte à côte suivent.
 */
function syncTabs(s: TravelState, before: Set<string>): void {
  const now = new Set(s.ws.questionnaires.map((q) => q.id));
  const fragments = new Set(s.ws.library.fragments.map((f) => f.id));
  const gone = (tab: TabId) => (tab.startsWith('q:') && !now.has(tab.slice(2))) || (tab.startsWith('f:') && !fragments.has(tab.slice(2)));
  const i = s.tabs.indexOf(s.activeTab);
  s.tabs = s.tabs.filter((tab) => !gone(tab));
  for (const id of now) if (!before.has(id) && !s.tabs.includes(`q:${id}`)) s.tabs.push(`q:${id}`);
  if (!s.tabs.includes(s.activeTab)) s.activeTab = s.tabs[Math.max(0, Math.min(i, s.tabs.length) - 1)] ?? 'library';
  if (s.selection.graph?.kind === 'questionnaire' && !now.has(s.selection.graph.id)) s.selection = { nodes: [] };
  if (s.selection.graph?.kind === 'fragment' && !fragments.has(s.selection.graph.id)) s.selection = { nodes: [] };
  if (s.libraryItem?.kind === 'fragment' && !fragments.has(s.libraryItem.id)) s.libraryItem = undefined;
  if (s.compare && !now.has(s.compare)) s.compare = undefined;
}
