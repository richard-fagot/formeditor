import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { FORMAT_VERSION, newId, type Workspace } from '../../core/model';
import type { Session } from '../../core/runtime';
import { newWorkspace } from '../../format';
import { record, restoreSnapshot, takeSnapshot, type Scope, type ScopeHistory } from './history';
import type { GraphRef } from './graph';

enableMapSet();

export type TabId = `q:${string}` | 'library' | 'system';
export type PaletteMode = 'commands' | 'connect';

export interface Selection {
  graph?: GraphRef;
  nodes: string[];
  edge?: string;
}

export interface PreviewState {
  session?: Session;
  scenarioId?: string;
  /** Valeurs courantes de l'état du système (scénario éventuellement modifié). */
  sys?: Record<string, unknown>;
  /** Erreurs affichées après une tentative d'avancer. */
  attempted?: boolean;
  lang?: string;
}

export interface AppState {
  ws: Workspace;
  tabs: TabId[];
  activeTab: TabId;
  view: Record<string, 'diagram' | 'preview'>;
  selection: Selection;
  /** Champ à mettre en saisie dès l'affichage (intitulé d'un nœud, condition d'une arête). */
  focusRequest?: { kind: 'label' | 'condition'; id: string; n: number };
  palette: { open: boolean; mode: PaletteMode };
  dirty: boolean;
  uiLang: string;
  contentLang: string;
  /** Raccourcis personnalisés : id de commande → combinaisons tinykeys. */
  keymap: Record<string, string[]>;
  history: Record<string, ScopeHistory>;
  preview: Record<string, PreviewState>;
  problemsOpen: boolean;
  notice?: { title: string; lines: string[] };
  /** Demande d'ajustement de la vue du logigramme (compteur). */
  fitRequest: number;
}

export interface AppActions {
  /** Modifie le projet dans une portée d'historique. `key` regroupe les frappes successives. */
  edit(scope: Scope, recipe: (ws: Workspace) => Workspace | void, key?: string): void;
  undo(scope: Scope): void;
  redo(scope: Scope): void;
  /** Point d'historique sans modification (avant un glisser de nœuds). */
  checkpoint(scope: Scope): void;
  /** Modification sans historique (positions pendant un glisser). */
  silent(recipe: (ws: Workspace) => void): void;
  set(recipe: (s: AppState) => void): void;
  loadWorkspace(ws: Workspace): void;
  openTab(tab: TabId): void;
  closeTab(tab: TabId): void;
  select(sel: Selection): void;
  requestFocus(kind: 'label' | 'condition', id: string): void;
  markExported(): void;
}

export type Store = AppState & AppActions;

function initialState(ws: Workspace): Pick<AppState, 'ws' | 'tabs' | 'activeTab' | 'view' | 'selection' | 'history' | 'preview' | 'contentLang' | 'dirty'> {
  const tabs: TabId[] = ws.questionnaires.map((q) => `q:${q.id}` as const);
  return {
    ws,
    tabs,
    activeTab: tabs[0] ?? 'library',
    view: {},
    selection: { nodes: [] },
    history: {},
    preview: {},
    contentLang: ws.project.defaultLanguage,
    dirty: false,
  };
}

/** Projet vierge avec un questionnaire vide. */
export function blankWorkspace(name = 'Nouveau projet', title = 'Questionnaire'): Workspace {
  const ws = newWorkspace(name, 'fr');
  const id = newId('q');
  ws.questionnaires.push({ formatVersion: FORMAT_VERSION, kind: 'questionnaire', id, key: 'questionnaire', title: { fr: title }, start: '', nodes: [], edges: [] });
  ws.project.questionnaires.push({ id, file: 'questionnaire.json' });
  return ws;
}

export const useStore = create<Store>()(
  immer((set, get) => ({
    ...initialState(blankWorkspace()),
    palette: { open: false, mode: 'commands' },
    uiLang: 'fr',
    keymap: {},
    problemsOpen: true,
    fitRequest: 0,

    edit(scope, recipe, key) {
      const before = takeSnapshot(get().ws, scope);
      set((s) => {
        const result = recipe(s.ws as Workspace);
        if (result) s.ws = result;
        s.history[scope] = record(s.history[scope] ?? { past: [], future: [] }, before, key);
        s.dirty = true;
      });
    },
    undo(scope) {
      const h = get().history[scope];
      const prev = h?.past.at(-1);
      if (!h || !prev) return;
      const current = takeSnapshot(get().ws, scope);
      set((s) => {
        restoreSnapshot(s.ws as Workspace, prev);
        s.history[scope] = { past: h.past.slice(0, -1), future: [...h.future, current] };
        s.dirty = true;
      });
    },
    redo(scope) {
      const h = get().history[scope];
      const nextSnap = h?.future.at(-1);
      if (!h || !nextSnap) return;
      const current = takeSnapshot(get().ws, scope);
      set((s) => {
        restoreSnapshot(s.ws as Workspace, nextSnap);
        s.history[scope] = { past: [...h.past, current], future: h.future.slice(0, -1) };
        s.dirty = true;
      });
    },
    checkpoint(scope) {
      const before = takeSnapshot(get().ws, scope);
      set((s) => {
        s.history[scope] = record(s.history[scope] ?? { past: [], future: [] }, before);
      });
    },
    silent(recipe) {
      set((s) => {
        recipe(s.ws as Workspace);
        s.dirty = true;
      });
    },
    set(recipe) {
      set((s) => {
        recipe(s as AppState);
      });
    },
    loadWorkspace(ws) {
      set((s) => {
        Object.assign(s, initialState(ws));
        s.notice = undefined;
      });
    },
    openTab(tab) {
      set((s) => {
        if (!s.tabs.includes(tab)) s.tabs.push(tab);
        s.activeTab = tab;
        s.selection = { nodes: [] };
      });
    },
    closeTab(tab) {
      set((s) => {
        const i = s.tabs.indexOf(tab);
        s.tabs = s.tabs.filter((t) => t !== tab);
        if (s.activeTab === tab) s.activeTab = s.tabs[Math.max(0, i - 1)] ?? 'library';
      });
    },
    select(sel) {
      set((s) => {
        s.selection = sel;
      });
    },
    requestFocus(kind, id) {
      set((s) => {
        s.focusRequest = { kind, id, n: (s.focusRequest?.n ?? 0) + 1 };
      });
    },
    markExported() {
      set((s) => {
        s.dirty = false;
      });
    },
  })),
);

/** Portée d'historique d'un graphe édité. */
export function scopeOf(ref: GraphRef | undefined): Scope {
  if (!ref) return 'project';
  return ref.kind === 'questionnaire' ? `q:${ref.id}` : 'library';
}
