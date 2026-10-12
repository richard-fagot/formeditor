import type { Expression, Label, LocalizedText } from './text';

export const QUESTION_TYPES = [
  'text', 'date', 'number', 'single', 'multiple', 'boolean', 'tristate', 'structure',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/** Contrainte libre : `rule` doit être vraie pour que la réponse soit valide. */
export interface Constraint {
  rule: Expression;
  message?: LocalizedText;
}

/** Borne numérique : nombre littéral ou expression. */
export type NumberBound = number | Expression;
/** Borne de date : date ISO littérale (`2024-01-31`) ou expression (`$today()`, `date_sinistre`). */
export type DateBound = string;

/** Option statique d'un choix. */
export interface ChoiceOption {
  value: string;
  label: Label;
  /** Condition d'affichage de l'option. */
  when?: Expression;
}

/** Option « Autre (préciser) ». Valeur de réponse réservée : `other` ; précision : `<cle>_other`. */
export interface OtherOption {
  label?: Label;
  detailRequired?: boolean;
}

/**
 * Entrée dynamique d'un choix : zéro, une ou plusieurs options issues d'une référence (réponse
 * précédente, liste de l'état du système), déployées à sa position. Reconnue à la présence de `from`.
 */
export interface DynamicEntry {
  /** Liste source. */
  from: Expression;
  /** Libellé affiché, évalué sur chaque élément (`$` = l'élément). Défaut : l'élément. */
  label?: Expression;
  /** Valeur retenue, évaluée sur chaque élément. Défaut : l'élément. */
  value?: Expression;
  /** Condition d'affichage de l'entrée (évaluée dans le contexte de la page). */
  when?: Expression;
}

/** Élément d'un groupe d'options : option statique ou entrée dynamique. */
export type ChoiceItem = ChoiceOption | DynamicEntry;

/**
 * Groupe d'options (EVO-003) : intitulé (libellé comme celui d'une option), code facultatif, condition
 * d'affichage, options statiques et entrées dynamiques (pas de groupe imbriqué). Reconnu à la présence de `group`.
 */
export interface ChoiceGroup {
  group: Label;
  /** Identifiant du groupe dans les réponses ; défaut : libellé dans la langue par défaut. */
  code?: string;
  when?: Expression;
  options: ChoiceItem[];
}

/** Entrée de la liste ordonnée des options d'un choix : option statique, entrée dynamique ou groupe. */
export type ChoiceEntry = ChoiceItem | ChoiceGroup;

export const isDynamicEntry = (e: ChoiceEntry): e is DynamicEntry => 'from' in e;
export const isChoiceGroup = (e: ChoiceEntry): e is ChoiceGroup => 'group' in e;

interface QuestionBase {
  /** Id technique immuable. */
  id: string;
  /** Clé lisible, snake_case, unique dans le questionnaire (ou le bloc). */
  key: string;
  label: Label;
  description?: string;
  help?: Label;
  placeholder?: Label;
  /** `true`, `false` ou expression booléenne. Défaut : `false`. */
  required?: boolean | Expression;
  /** Valeur par défaut littérale. */
  default?: unknown;
  /** Valeur par défaut calculée (prioritaire sur `default`). */
  defaultExpr?: Expression;
  /** Messages d'erreur des contraintes intégrées, par nom de paramètre (`min`, `maxLength`, `required`…). */
  messages?: Record<string, LocalizedText>;
  constraints?: Constraint[];
}

export interface TextQuestion extends QuestionBase {
  type: 'text';
  multiline?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export interface DateQuestion extends QuestionBase {
  type: 'date';
  min?: DateBound;
  max?: DateBound;
}

export type NumberKind = 'real' | 'natural' | 'integer';
export interface NumberQuestion extends QuestionBase {
  type: 'number';
  numberKind?: NumberKind;
  min?: NumberBound;
  max?: NumberBound;
  decimals?: number;
  unit?: LocalizedText;
}

interface ChoiceBase extends QuestionBase {
  /** Entrées dans l'ordre d'affichage. */
  options: ChoiceEntry[];
  other?: OtherOption;
}
export interface SingleChoiceQuestion extends ChoiceBase {
  type: 'single';
}
export interface MultipleChoiceQuestion extends ChoiceBase {
  type: 'multiple';
  minSelected?: number;
  maxSelected?: number;
}

export interface BooleanQuestion extends QuestionBase {
  type: 'boolean';
  /** Id d'un jeu de libellés de la bibliothèque. Défaut : « Oui / Non ». */
  labelSet?: string;
  other?: OtherOption;
}
export interface TristateQuestion extends QuestionBase {
  type: 'tristate';
  labelSet?: string;
  other?: OtherOption;
}

/** Champ de structure : une question de tout type sauf structure, avec condition d'affichage. */
export type StructureField = Exclude<Question, StructureQuestion> & { when?: Expression };

export interface StructureQuestion extends QuestionBase {
  type: 'structure';
  fields: StructureField[];
  /** Présent si la structure est répétable. */
  repeat?: { min?: number; max?: number; addLabel?: LocalizedText };
}

export type Question =
  | TextQuestion | DateQuestion | NumberQuestion | SingleChoiceQuestion
  | MultipleChoiceQuestion | BooleanQuestion | TristateQuestion | StructureQuestion;

/** Valeur réservée de l'option « Autre ». */
export const OTHER_VALUE = 'other';
/** Suffixe de la clé où est rangé le groupe de la sélection : `<clé>_group` (EVO-003). */
export const GROUP_SUFFIX = 'group';
/** Mot réservé des expressions : `ma_question.groupe` (groupe de la sélection). */
export const GROUP_REF = 'groupe';
/** Identifiant de groupe de l'option « Autre (préciser) ». */
export const OTHER_GROUP = 'AUTRE';
/** Valeur « ne sait pas » d'un tri-state. */
export const UNKNOWN_VALUE = 'unknown';

/** Types qui acceptent l'option « Autre (préciser) ». */
export const OTHER_TYPES: readonly QuestionType[] = ['single', 'multiple', 'boolean', 'tristate'];
