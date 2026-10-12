import type { LocalizedText } from '../../core/model';

// Nom du fichier de l'image du logigramme (EVO-004, spec §6.4). Fonctions pures.

/** Caractères interdits dans un nom de fichier (Windows, macOS, Linux) et caractères de contrôle. */
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

/** Remplace les caractères interdits par `_`, réduit les espaces, retire espaces et points en fin de nom. */
export function safeFileName(s: string): string {
  return s.replace(FORBIDDEN, '_').replace(/\s+/g, ' ').trim().replace(/[ .]+$/, '');
}

/** Date locale `AAAAMMJJ`. */
export function stamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/** `<projet> - <questionnaire> - AAAAMMJJ.png` ; nom de projet vide → `projet`. */
export function imageFileName(project: string, title: string, date: Date): string {
  return `${safeFileName(project) || 'projet'} - ${safeFileName(title) || 'questionnaire'} - ${stamp(date)}.png`;
}

/** Titre du questionnaire dans la langue affichée, sinon la langue par défaut, sinon sa clé. */
export function imageTitle(q: { key: string; title: LocalizedText }, lang: string, defaultLang: string): string {
  return q.title[lang]?.trim() || q.title[defaultLang]?.trim() || q.key;
}
