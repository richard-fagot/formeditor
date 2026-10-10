import type { Workspace } from '../../core/model';

/** Code de langue accepté : `fr`, `en`, `pt-BR`… (même motif que `localizedText` dans le schéma). */
export const isLanguageCode = (code: string) => /^[a-z]{2,3}(-[A-Za-z0-9]+)?$/.test(code);

/** Déclare une langue de contenu (code valide, absente) ; renvoie `true` si elle est ajoutée. */
export function addLanguage(ws: Workspace, code: string): boolean {
  const c = code.trim();
  if (!isLanguageCode(c) || ws.project.languages.includes(c)) return false;
  ws.project.languages.push(c);
  return true;
}

/** Retire une langue déclarée (jamais la langue par défaut). Les textes déjà saisis dans cette langue restent. */
export function removeLanguage(ws: Workspace, code: string): boolean {
  if (code === ws.project.defaultLanguage || !ws.project.languages.includes(code)) return false;
  ws.project.languages = ws.project.languages.filter((l) => l !== code);
  return true;
}

export function setDefaultLanguage(ws: Workspace, code: string): boolean {
  if (!ws.project.languages.includes(code) || ws.project.defaultLanguage === code) return false;
  ws.project.defaultLanguage = code;
  return true;
}
