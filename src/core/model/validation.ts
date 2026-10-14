import type { Layout, Questionnaire, Workspace } from './documents';

/** État de validation d'un questionnaire (EVO-015) ; absent = `draft`. */
export type QuestionnaireStatus = 'draft' | 'validated';

/** Questionnaire validé : en lecture seule tant qu'il n'est pas dévalidé. */
export const isValidated = (q: Questionnaire | undefined): boolean => q?.status === 'validated';

/** Contenu verrouillé d'un questionnaire : tout sauf son état de validation et ses versions de référence (EVO-022). */
function lockedQuestionnaire(q: Questionnaire): string {
  const { status: _status, validatedAt: _at, libraryVersions: _refs, ...rest } = q;
  return JSON.stringify(rest);
}

/**
 * Mise en page verrouillée : positions, sans les commentaires de révision (hors verrou). Une mise en page sans position
 * équivaut à son absence (créée par le premier commentaire d'un formulaire importé sans mise en page).
 */
function lockedLayout(l: Layout | undefined): string {
  if (!l || !Object.keys(l.nodes).length) return '';
  const { comments: _comments, ...rest } = l;
  return JSON.stringify(rest);
}

/**
 * Questionnaires validés dans `before` dont le contenu verrouillé diffère dans `after` (ou qui ont disparu) :
 * questionnaire hors état de validation, mise en page hors commentaires, entrée du projet. Vide = modification permise.
 */
export function lockedChanges(before: Workspace, after: Workspace): string[] {
  if (before === after) return [];
  return before.questionnaires.filter(isValidated).flatMap((q) => {
    const next = after.questionnaires.find((x) => x.id === q.id);
    if (!next) return [q.id];
    const layout = (ws: Workspace) => ws.layouts.find((l) => l.graph === q.id);
    const entry = (ws: Workspace) => JSON.stringify(ws.project.questionnaires.find((e) => e.id === q.id) ?? null);
    const same = (next === q || lockedQuestionnaire(next) === lockedQuestionnaire(q))
      && (layout(before) === layout(after) || lockedLayout(layout(before)) === lockedLayout(layout(after)))
      && entry(before) === entry(after);
    return same ? [] : [q.id];
  });
}
