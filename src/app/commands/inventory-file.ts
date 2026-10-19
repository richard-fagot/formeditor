import type { Sheet, Cell, Row } from 'write-excel-file/browser';
import { FORMAT_VERSION, inventoryRows, isVariantLabel, type InventoryRow, type Label, type QuestionType, type Workspace, type Questionnaire } from '../../core/model';
import { questionnaireFileName } from '../../format';

// Inventaire des données en xlsx (EVO-029, spec §6.5) : nom du fichier et contenu des onglets. Fonctions pures.
// Noms d'onglets, en-têtes et textes fixes en français quelle que soit la langue de l'interface (EVO-029-033).

/** Colonnes pré-remplies par l'éditeur (EVO-029-022). */
export const FILLED_COLUMNS = ['Identifiant', 'Chemin', 'Intitulé', 'Type', 'Obligatoire', 'Répétable', 'Donnée personnelle présumée', 'Description'];
/** Colonnes RGPD laissées vides, à compléter (EVO-029-023). */
export const TODO_COLUMNS = ['Catégorie de donnée', 'Donnée sensible (art. 9 / 10)', 'Finalité', 'Justification (minimisation)', 'Base légale', 'Durée de conservation', 'Destinataires', 'Observations'];
export const DATA_SHEET = 'Données';
export const ABOUT_SHEET = 'À propos';
export const NOTICE = 'Document d’amorce généré par l’éditeur : les colonnes RGPD sont à compléter et à valider par le DPO.';
/** Fond des en-têtes : pré-remplis (bleu) et à compléter (jaune), EVO-029-047. */
export const FILLED_COLOR = '#D9E1F2';
export const TODO_COLOR = '#FFF2CC';

/** `<clé> - <version> - <final|provisoire> - inventaire.xlsx` : nom du JSON exporté (EVO-022), « .json » remplacé. */
export function inventoryFileName(q: Pick<Questionnaire, 'key' | 'version' | 'status'>): string {
  return questionnaireFileName(q).replace(/\.json$/, ' - inventaire.xlsx');
}

/** Texte français d'un libellé, non interpolé (variantes : texte « sinon ») ; vide sans traduction française. */
export function frenchText(label: Label | undefined): string {
  if (!label) return '';
  return (isVariantLabel(label) ? label.otherwise.fr : label.fr) ?? '';
}

/** « Oui », « Non » ou « Si : <expression> » (EVO-029-028). */
export function requiredText(required: InventoryRow['required']): string {
  if (typeof required === 'string') return required.trim() ? `Si : ${required}` : 'Non';
  return required ? 'Oui' : 'Non';
}

/** Date locale `AAAA-MM-JJ`. */
function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const text = (s: string | undefined): Cell => (s ? s : null);
const header = (name: string, color: string): Cell => ({ value: name, fontWeight: 'bold', backgroundColor: color, wrap: true });

/** Ligne de l'onglet « Données » ; `typeName` : nom français du type tel qu'affiché dans l'éditeur. */
function dataRow(qKey: string, r: InventoryRow, typeName: (t: QuestionType) => string): Row {
  const label = frenchText(r.label);
  return [
    `${qKey}/${r.path}`, r.path, text(r.other && label ? `${label} — Autre (préciser)` : label), text(typeName(r.type)),
    requiredText(r.required), text(r.repeatable ? 'Oui' : ''), text(r.personal ? 'Oui' : ''), text(r.description),
    ...TODO_COLUMNS.map(() => null),
  ];
}

/** Onglets « Données » et « À propos » de l'inventaire d'un questionnaire (EVO-029). */
export function inventorySheets(ws: Workspace, q: Questionnaire, date: Date, typeName: (t: QuestionType) => string): Sheet<never>[] {
  const data: Row[] = [
    [...FILLED_COLUMNS.map((c) => header(c, FILLED_COLOR)), ...TODO_COLUMNS.map((c) => header(c, TODO_COLOR))],
    ...inventoryRows(ws, q).map((r) => dataRow(q.key, r, typeName)),
  ];
  const title = q.title.fr?.trim() || q.title[ws.project.defaultLanguage]?.trim() || '';
  const about: Row[] = [
    ['Projet', ws.project.name], ['Clé du questionnaire', q.key], ['Titre du questionnaire', text(title)],
    ['Version', text(q.version?.trim())], ['Statut', q.status === 'validated' ? 'final' : 'provisoire'],
    ['Date d’export', isoDate(date)], ['Version du format JSON', String(FORMAT_VERSION)], [NOTICE],
  ].map((row, i) => (i < 7 ? [{ value: row[0] as string, fontWeight: 'bold' }, row[1] ?? null] : row));
  return [
    { sheet: DATA_SHEET, data, stickyRowsCount: 1, columns: [...FILLED_COLUMNS, ...TODO_COLUMNS].map((_, i) => ({ width: i < 2 ? 32 : 22 })) },
    { sheet: ABOUT_SHEET, data: about, columns: [{ width: 26 }, { width: 60 }] },
  ];
}
