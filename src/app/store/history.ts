import type { Layout, Library, Project, Questionnaire, QuestionnaireEntry, Workspace } from '../../core/model';

/**
 * Historique annuler/rétablir par portée : un par questionnaire (`q:<id>`), un pour la bibliothèque,
 * un pour le projet. Un instantané ne contient que la partie du projet propre à la portée.
 */
export type Scope = `q:${string}` | 'library' | 'project';

export type Snapshot =
  | { scope: `q:${string}`; questionnaire?: Questionnaire; layout?: Layout; entry?: QuestionnaireEntry }
  | { scope: 'library'; library: Library; layouts: Layout[] }
  | { scope: 'project'; project: Project };

export interface ScopeHistory {
  past: Snapshot[];
  future: Snapshot[];
  /** Clé de regroupement de la dernière modification (frappe continue dans un champ). */
  lastKey?: string;
  lastTime?: number;
}

export const COALESCE_MS = 1500;
const MAX_ENTRIES = 500;

export function takeSnapshot(ws: Workspace, scope: Scope): Snapshot {
  if (scope === 'library') {
    const ids = new Set(ws.library.blocks.map((b) => b.id));
    return { scope, library: ws.library, layouts: ws.layouts.filter((l) => ids.has(l.graph)) };
  }
  if (scope === 'project') return { scope, project: ws.project };
  const id = scope.slice(2);
  return {
    scope,
    questionnaire: ws.questionnaires.find((q) => q.id === id),
    layout: ws.layouts.find((l) => l.graph === id),
    // Entrée du projet (nom de fichier, dérivé de la clé) : suit le questionnaire dans son historique.
    entry: ws.project.questionnaires.find((e) => e.id === id),
  };
}

/** Remet en place un instantané dans `ws` (brouillon immer). */
export function restoreSnapshot(ws: Workspace, s: Snapshot): void {
  if (s.scope === 'library') {
    const ids = new Set([...ws.library.blocks.map((b) => b.id), ...s.library.blocks.map((b) => b.id)]);
    ws.library = s.library;
    ws.layouts = [...ws.layouts.filter((l) => !ids.has(l.graph)), ...s.layouts];
    return;
  }
  if (s.scope === 'project') {
    ws.project = s.project;
    return;
  }
  const id = s.scope.slice(2);
  const i = ws.questionnaires.findIndex((q) => q.id === id);
  if (s.questionnaire) {
    if (i >= 0) ws.questionnaires[i] = s.questionnaire;
    else ws.questionnaires.push(s.questionnaire);
  } else if (i >= 0) ws.questionnaires.splice(i, 1);
  ws.layouts = ws.layouts.filter((l) => l.graph !== id);
  if (s.layout) ws.layouts.push(s.layout);
  const e = ws.project.questionnaires.findIndex((x) => x.id === id);
  if (s.entry && e >= 0) ws.project.questionnaires[e] = s.entry;
}

/** Enregistre `before` dans l'historique, sauf s'il prolonge la modification précédente (même clé, rapprochée). */
export function record(h: ScopeHistory, before: Snapshot, key?: string, now = Date.now()): ScopeHistory {
  const coalesce = key !== undefined && h.lastKey === key && now - (h.lastTime ?? 0) < COALESCE_MS;
  return {
    past: coalesce ? h.past : [...h.past, before].slice(-MAX_ENTRIES),
    future: [],
    lastKey: key,
    lastTime: now,
  };
}
