import type { ItemStatus, LocalizedText } from '../../core/model';
import { questionnaireFileName } from '../../format';

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

/** Version et statut du questionnaire exporté (EVO-023). */
export interface ImageVersion {
  version?: string;
  status?: ItemStatus;
}

/**
 * `<projet> - <questionnaire> - <version> - <final|provisoire> - AAAAMMJJ.png` (EVO-023) ; version vide → segment omis ;
 * nom de projet vide → `projet`. Segments version et statut repris de `questionnaireFileName` (EVO-022).
 */
export function imageFileName(project: string, title: string, q: ImageVersion, date: Date): string {
  const name = questionnaireFileName({ key: safeFileName(title) || 'questionnaire', version: q.version, status: q.status });
  return `${safeFileName(project) || 'projet'} - ${name.replace(/\.json$/, '')} - ${stamp(date)}.png`;
}

/** Titre dessiné (EVO-023) : `<titre> — <version> — <statut>`, version vide omise ; `statusLabel` dans la langue de l'interface. */
export function imageHeading(title: string, version: string | undefined, statusLabel: string): string {
  return [title, version?.trim(), statusLabel].filter(Boolean).join(' — ');
}

/** Titre du questionnaire dans la langue affichée, sinon la langue par défaut, sinon sa clé. */
export function imageTitle(q: { key: string; title: LocalizedText }, lang: string, defaultLang: string): string {
  return q.title[lang]?.trim() || q.title[defaultLang]?.trim() || q.key;
}
