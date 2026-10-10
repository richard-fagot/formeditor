import { isValidKey, type LocalizedText, type Workspace } from '../../core/model';

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

/** Titre (multilingue) et description d'un questionnaire ; une description vide est retirée. */
export function patchQuestionnaire(ws: Workspace, id: string, patch: { title?: LocalizedText; description?: string }): void {
  const q = ws.questionnaires.find((x) => x.id === id);
  if (!q) return;
  if (patch.title) q.title = patch.title;
  if ('description' in patch) {
    if (patch.description) q.description = patch.description;
    else delete q.description;
  }
}
