import type { Expression, Label, LocalizedText } from './text';

export const QUESTION_TYPES = [
  'text', 'date', 'number', 'single', 'multiple', 'boolean', 'structure',
  'email', 'phone', 'address', 'civility',
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
 * Option « Ne sais pas » (EVO-006), sur toute question sauf structure. Réponse : valeur vide (`null`, `[]` en choix
 * multiple), marqueur `<cle>_nsp: true`, groupe `NSP` pour un choix ; référence `cle.nsp`.
 */
export interface DontKnowOption {
  label?: Label;
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
  /** Option « Ne sais pas » (EVO-006) : présente = activée. Jamais sur une structure. */
  dontKnow?: DontKnowOption;
}

export interface TextQuestion extends QuestionBase {
  type: 'text';
  multiline?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  /**
   * Suggestions (EVO-016) : expression qui renvoie une liste de textes proposés à la saisie (saisie libre conservée).
   * Présente (même vide) = option activée ; absente = désactivée.
   */
  suggestions?: Expression;
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

/** Mail (EVO-007) : RFC 5321 `Mailbox` ; réponse : domaine en minuscules, partie locale telle que saisie. */
export interface EmailQuestion extends QuestionBase {
  type: 'email';
}

/** Type de ligne exigé d'un téléphone. */
export type LineType = 'mobile' | 'fixed';

/** Téléphone (EVO-007) : réponse E.164 (`+33612345678`), pays (ISO 3166-1 alpha-2) sous `<clé>_pays`. */
export interface PhoneQuestion extends QuestionBase {
  type: 'phone';
  /** Pays proposé au départ. Défaut : `FR`. */
  defaultCountry?: string;
  /** Pays autorisés. Défaut : tous. */
  countries?: string[];
  /** Type de ligne exigé. Défaut : indifférent. */
  lineType?: LineType;
}

/** Adresse sur une ligne (EVO-007) : réponse = la ligne saisie, pays sous `<clé>_pays`. */
export interface AddressQuestion extends QuestionBase {
  type: 'address';
  defaultCountry?: string;
  countries?: string[];
  /** Bornes de longueur. Défaut : 5 et 200. */
  minLength?: number;
  maxLength?: number;
  /** Adresse à vérifier par un service de normalisation (BAN pour la France…) : indicateur exporté, non exécuté. */
  verify?: boolean;
}

/** Code d'une civilité : Madame, Monsieur, Ne se prononce pas. */
export type CivilityCode = 'MME' | 'M' | 'NP';

/** Civilité (EVO-007) : choix unique prédéfini, réponse = code fixe. */
export interface CivilityQuestion extends QuestionBase {
  type: 'civility';
  /** Libellés modifiés, par code (sinon libellés par défaut). */
  labels?: Partial<Record<CivilityCode, LocalizedText>>;
  /** Libellés courts (« Mme », « M. ») au lieu des longs. */
  short?: boolean;
  /** Option « Ne se prononce pas » (`NP`), en dernier. */
  undisclosed?: boolean;
}

/** Champ de structure : une question de tout type sauf structure, avec condition d'affichage. */
export type StructureField = Exclude<Question, StructureQuestion> & { when?: Expression };

export interface StructureQuestion extends QuestionBase {
  type: 'structure';
  /** Pas d'option « Ne sais pas » sur une structure (ses champs peuvent l'avoir). */
  dontKnow?: never;
  fields: StructureField[];
  /** Présent si la structure est répétable. */
  repeat?: { min?: number; max?: number; addLabel?: LocalizedText };
}

export type Question =
  | TextQuestion | DateQuestion | NumberQuestion | SingleChoiceQuestion
  | MultipleChoiceQuestion | BooleanQuestion | StructureQuestion
  | EmailQuestion | PhoneQuestion | AddressQuestion | CivilityQuestion;

/** Valeur réservée de l'option « Autre ». */
export const OTHER_VALUE = 'other';
/** Suffixe de la clé où est rangé le groupe de la sélection : `<clé>_group` (EVO-003). */
export const GROUP_SUFFIX = 'group';
/** Mot réservé des expressions : `ma_question.groupe` (groupe de la sélection). */
export const GROUP_REF = 'groupe';
/** Identifiant de groupe de l'option « Autre (préciser) ». */
export const OTHER_GROUP = 'AUTRE';
/** Suffixe du marqueur « Ne sais pas » : `<clé>_nsp` (EVO-006). */
export const DONT_KNOW_SUFFIX = 'nsp';
/** Mot réservé des expressions : `ma_question.nsp` (vrai si « Ne sais pas » est choisie). */
export const DONT_KNOW_REF = 'nsp';
/** Identifiant de groupe de l'option « Ne sais pas ». */
export const DONT_KNOW_GROUP = 'NSP';
/** Libellé par défaut de l'option « Ne sais pas » (destiné à l'utilisateur final). */
export const DONT_KNOW_LABEL = { fr: 'Ne sais pas', en: 'Don’t know' };
/** Vrai si « Ne sais pas » est activée sur la question (jamais sur une structure). */
export const hasDontKnow = (q: { type: string; dontKnow?: unknown }): boolean => q.type !== 'structure' && !!q.dontKnow;

/** Suffixe du pays d'un téléphone ou d'une adresse : `<clé>_pays` (EVO-007). */
export const COUNTRY_SUFFIX = 'pays';
/** Référence au pays : `ma_question.pays` (EVO-007). */
export const COUNTRY_REF = 'pays';
/** Pays par défaut d'un téléphone ou d'une adresse. */
export const DEFAULT_COUNTRY = 'FR';

/** Codes de civilité dans l'ordre d'affichage. */
export const CIVILITY_CODES: readonly CivilityCode[] = ['MME', 'M', 'NP'];
/** Libellés par défaut des civilités (destinés à l'utilisateur final) : longs et courts. */
export const CIVILITY_LABELS: Record<'long' | 'short', Record<CivilityCode, LocalizedText>> = {
  long: {
    MME: { fr: 'Madame', en: 'Madam' },
    M: { fr: 'Monsieur', en: 'Mister' },
    NP: { fr: 'Ne se prononce pas', en: 'Prefer not to say' },
  },
  short: {
    MME: { fr: 'Mme', en: 'Mrs' },
    M: { fr: 'M.', en: 'Mr' },
    NP: { fr: 'Ne se prononce pas', en: 'Prefer not to say' },
  },
};
/** Codes proposés par une question civilité (`NP` si activée, en dernier). */
export const civilityCodes = (q: CivilityQuestion): CivilityCode[] => CIVILITY_CODES.filter((c) => c !== 'NP' || !!q.undisclosed);
/** Libellé d'une civilité : libellé modifié, sinon libellé par défaut (court ou long). */
export const civilityLabel = (q: CivilityQuestion, code: CivilityCode): LocalizedText =>
  q.labels?.[code] ?? CIVILITY_LABELS[q.short ? 'short' : 'long'][code];
/** Types dont la réponse porte un pays (`<clé>_pays`). */
export const hasCountry = (q: { type: string }): boolean => q.type === 'phone' || q.type === 'address';

/** Types qui acceptent l'option « Autre (préciser) ». */
export const OTHER_TYPES: readonly QuestionType[] = ['single', 'multiple', 'boolean'];
