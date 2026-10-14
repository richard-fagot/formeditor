import { isValidKey, versionSnapshot, type LocalizedText, type Workspace } from '../../core/model';

/** Clés de questionnaire déjà prises (hors `exceptId`). */
export function questionnaireKeys(ws: Workspace, exceptId?: string): string[] {
  return ws.questionnaires.filter((q) => q.id !== exceptId).map((q) => q.key);
}

/** Une clé de questionnaire est valide si elle respecte le format des clés et n'est pas déjà prise. */
export function canRenameQuestionnaire(ws: Workspace, id: string, key: string): boolean {
  return isValidKey(key) && !questionnaireKeys(ws, id).includes(key);
}

/** Renomme la clé d'un questionnaire et le fichier correspondant (`<clé>.json`) dans le projet. */
export function renameQuestionnaire(ws: Workspace, id: string, key: string): void {
  const q = ws.questionnaires.find((x) => x.id === id);
  if (!q || q.key === key || !canRenameQuestionnaire(ws, id, key)) return;
  q.key = key;
  const entry = ws.project.questionnaires.find((e) => e.id === id);
  if (entry) entry.file = `${key}.json`;
}

/** Titre (multilingue), description et version (EVO-022, texte libre) d'un questionnaire ; une description ou une version vide est retirée. */
export function patchQuestionnaire(ws: Workspace, id: string, patch: { title?: LocalizedText; description?: string; version?: string }): void {
  const q = ws.questionnaires.find((x) => x.id === id);
  if (!q) return;
  if (patch.title) q.title = patch.title;
  if ('version' in patch) {
    if (patch.version) q.version = patch.version;
    else delete q.version;
  }
  if ('description' in patch) {
    if (patch.description) q.description = patch.description;
    else delete q.description;
  }
}

/**
 * Valide (`date` = AAAA-MM-JJ) ou dévalide un questionnaire (EVO-015). Valider relève les versions de référence des
 * éléments de bibliothèque utilisés (EVO-022, omises s'il n'en utilise aucun). Dévalider retire `status`, `validatedAt`
 * et `libraryVersions` : le questionnaire redevient identique à celui d'avant la validation.
 */
export function setValidation(ws: Workspace, id: string, date: string | undefined): void {
  const q = ws.questionnaires.find((x) => x.id === id);
  if (!q) return;
  if (date) {
    Object.assign(q, { status: 'validated', validatedAt: date });
    const refs = versionSnapshot(ws.library, q);
    if (Object.keys(refs).length) q.libraryVersions = refs;
    else delete q.libraryVersions;
  } else {
    delete q.status;
    delete q.validatedAt;
    delete q.libraryVersions;
  }
}
