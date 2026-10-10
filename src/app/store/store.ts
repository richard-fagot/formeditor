import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { FORMAT_VERSION, newId, type Workspace } from '../../core/model';
import type { Session } from '../../core/runtime';
import { newWorkspace } from '../../format';
import { record, restoreSnapshot, takeSnapshot, type Scope, type ScopeHistory } from './history';
import type { GraphRef } from './graph';
import type { LibraryItem } from './library-edits';

enableMapSet();

export type TabId = `q:${string}` | 'library' | 'system';
export type PaletteMode = 'commands' | 'connect' | 'library';

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
  /** Synthèse d'où l'on est revenu modifier une réponse (bouton « Revenir à la synthèse »). */
  returnTo?: string;
  lang?: string;
}

export interface AppState {
  ws: Workspace;
  tabs: TabId[];
  activeTab: TabId;
  view: Record<string, 'diagram' | 'preview'>;
  selection: Selection;
  /** Champ à mettre en saisie dès l'affichage (intitulé d'un nœud, condition d'une arête). */
  focusRequest?: { kind: 'label' | 'condition' | 'variable'; id: string; n: number };
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
  /** Élément affiché dans l'onglet Bibliothèque (sans : jeux de libellés). */
  libraryItem?: LibraryItem;
  /** Panneau latéral de la bibliothèque à côté du logigramme (glisser-déposer). */
  libraryPanel: boolean;
  /** Panneaux repliables de la prévisualisation : état du système, débogage. */
  previewPanels: { system: boolean; debug: boolean };
}

export interface AppActions {
  /** Modifie le projet dans une portée d'historique. `key` regroupe les frappes successives. */
  edit(scope: Scope, recipe: (ws: Workspace) => Workspace | void, key?: string): void;
  /**
   * Modification qui touche plusieurs portées (renommage propagé) : un point d'historique dans chaque portée
   * modifiée, liés ; annuler ou rétablir dans l'une le fait dans toutes celles où ce point est en tête.
   */
  transact(scopes: Scope[], recipe: (ws: Workspace) => Workspace | void): void;
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
  requestFocus(kind: 'label' | 'condition' | 'variable', id: string): void;
  markExported(): void;
}

export type Store = AppState & AppActions;

function initialState(ws: Workspace): Pick<AppState, 'ws' | 'tabs' | 'activeTab' | 'view' | 'selection' | 'history' | 'preview' | 'contentLang' | 'dirty' | 'libraryItem'> {
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
    libraryItem: undefined,
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
    libraryPanel: true,
    previewPanels: { system: true, debug: false },

    edit(scope, recipe, key) {
      const before = takeSnapshot(get().ws, scope);
      set((s) => {
        const result = recipe(s.ws as Workspace);
        if (result) s.ws = result;
        s.history[scope] = record(s.history[scope] ?? { past: [], future: [] }, before, key);
        s.dirty = true;
      });
    },
    transact(scopes, recipe) {
      const before = scopes.map((sc) => takeSnapshot(get().ws, sc));
      const tx = ++txCounter;
      set((s) => {
        const result = recipe(s.ws as Workspace);
        if (result) s.ws = result;
        before.forEach((snap, i) => {
          const sc = scopes[i]!;
          if (JSON.stringify(snap) === JSON.stringify(takeSnapshot(s.ws as Workspace, sc))) return;
          s.history[sc] = record(s.history[sc] ?? { past: [], future: [] }, { ...snap, tx });
        });
        s.dirty = true;
      });
    },
    undo(scope) {
      set((s) => void travel(s as AppState, scope, 'past'));
    },
    redo(scope) {
      set((s) => void travel(s as AppState, scope, 'future'));
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

let txCounter = 0;

/**
 * Annule (`from = 'past'`) ou rétablit (`'future'`) le dernier point de `scope` ; s'il appartient à une transaction,
 * fait de même dans chaque portée où un point de cette transaction est en tête.
 */
function travel(s: AppState, scope: Scope, from: 'past' | 'future'): void {
  const top = s.history[scope]?.[from].at(-1);
  if (!top) return;
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
  s.dirty = true;
}

/** Portée d'historique d'un graphe édité. */
export function scopeOf(ref: GraphRef | undefined): Scope {
  if (!ref) return 'project';
  return ref.kind === 'questionnaire' ? `q:${ref.id}` : 'library';
}
