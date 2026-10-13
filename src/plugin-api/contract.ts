import type { FC, ReactNode } from 'react';
import type { GraphNode, Label, LangCode, LocalizedText, Question, QuestionType, Workspace } from '../core/model';

/** Environnement de l'éditeur, transmis aux plugins. */
export interface EditorEnv {
  ws: Workspace;
  /** Langue de l'interface de l'outil. */
  uiLang: LangCode;
  /** Langues du projet, et langue affichée dans l'éditeur. */
  languages: LangCode[];
  contentLang: LangCode;
  defaultLang: LangCode;
  /** Plugin d'un type de question (fourni par le registre ; sert aux champs d'une structure). */
  questionType(type: QuestionType): QuestionTypePlugin | undefined;
}

/** Option d'un choix résolue dans le contexte : libellé statique ou texte calculé (entrée dynamique). */
export interface ResolvedOption {
  value: string;
  label: Label | string;
  dynamic?: true;
  /** Groupe de l'option (EVO-003) : identifiant (code, sinon libellé dans la langue par défaut) et intitulé. */
  group?: { id: string; label: Label };
}

/** Environnement de rendu de la prévisualisation. */
export interface RenderEnv extends EditorEnv {
  /** Résout un libellé (variante, langue, interpolation) dans le contexte courant. */
  label(label: Label | undefined): string;
  /** Texte multilingue dans la langue du contenu. */
  text(t: LocalizedText | undefined): string;
  /** Évalue une expression dans le contexte courant. */
  evaluate(expr: string, extra?: Record<string, unknown>): unknown;
  /** Évalue une condition dans le contexte courant. */
  condition(expr: string, extra?: Record<string, unknown>): boolean;
  /** Options visibles d'un choix : entrées dont la condition est vraie, déployées dans l'ordre. */
  options(q: Question): ResolvedOption[];
  /** Environnement dont le contexte est enrichi (occurrence d'une structure : clés sœurs sans préfixe). */
  scoped(extra: Record<string, unknown>): RenderEnv;
  /** Contrôles de saisie de la prévisualisation (EVO-014) ; `false` : aucun message de contrôle affiché par le champ. */
  checks?: boolean;
}

/** Propriétés communes à toutes les questions, conservées lors d'un changement de type. */
export type QuestionBase = Pick<Question, 'id' | 'key' | 'label' | 'description' | 'help' | 'placeholder' | 'required' | 'messages' | 'constraints' | 'dontKnow'>;

export interface QuestionPropertiesProps<Q extends Question = Question> {
  question: Q;
  update(patch: Partial<Q>): void;
  env: EditorEnv;
  /** Renomme la clé d'un champ de structure en propageant le renommage aux expressions. */
  renameField?(fieldId: string, key: string): void;
}

export interface FieldProps<Q extends Question = Question> {
  question: Q;
  value: unknown;
  other?: string;
  /** Groupe de la sélection d'un choix (`<clé>_group`) : identifiant, ou liste parallèle aux valeurs. */
  group?: unknown;
  /** Pays d'un téléphone ou d'une adresse (`<clé>_pays`, code ISO 3166-1 alpha-2, EVO-007). */
  country?: string;
  /** `country` : pays à ranger à côté de la réponse (téléphone, adresse) ; absent : effacé. */
  onChange(value: unknown, other?: string, group?: unknown, country?: string): void;
  /** « Ne sais pas » choisie (`<clé>_nsp`, EVO-006). */
  dontKnow?: boolean;
  /**
   * Coche (`true`) ou décoche « Ne sais pas » : l'appelant range la réponse vide, le groupe `NSP` et le marqueur,
   * ou efface la réponse. Toute réponse passée par `onChange` efface le marqueur.
   */
  onDontKnow?(on: boolean): void;
  /** Messages d'erreur déjà résolus, par chemin (`''` pour la question). */
  errors: Record<string, string[]>;
  env: RenderEnv;
  /** Id DOM pour l'étiquette. */
  inputId: string;
}

export interface QuestionTypePlugin<Q extends Question = Question> {
  type: QuestionType;
  name: LocalizedText;
  /** Raccourci par défaut de la commande « Type : … » (spec §4.4). */
  shortcut: string;
  /** Crée une question de ce type à partir des propriétés communes (et de la précédente, pour garder les options). */
  create(base: QuestionBase, previous?: Question): Q;
  /** Aperçu du type dans le nœud du logigramme. */
  Preview: FC<{ question: Q; env: EditorEnv }>;
  /** Paramètres propres au type dans le panneau de propriétés. */
  Properties: FC<QuestionPropertiesProps<Q>>;
  /** Saisie dans la prévisualisation. */
  Field: FC<FieldProps<Q>>;
  /** Valeur affichée dans une synthèse (`group` : groupe de la sélection d'un choix). */
  formatAnswer(question: Q, value: unknown, env: RenderEnv, other?: string, group?: unknown): string;
  /** Badge « Autre » etc. */
  badges?(question: Q): string[];
}

export interface ShapeProps<N extends GraphNode = GraphNode> {
  node: N;
  env: EditorEnv;
  /** Question effective (bibliothèque résolue) pour un nœud question. */
  question?: Question;
  /** Plugin du type de la question, fourni par le registre. */
  typePlugin?: QuestionTypePlugin;
  /** Badges calculés par l'éditeur (obligatoire, bibliothèque, problème…). */
  badges: ReactNode;
}

export interface NodePropertiesProps<N extends GraphNode = GraphNode> {
  node: N;
  update(patch: Partial<N>): void;
  env: EditorEnv;
}

export interface PageProps<N extends GraphNode = GraphNode> {
  node: N;
  env: RenderEnv;
}

export interface NodeKindPlugin<N extends GraphNode = GraphNode> {
  kind: N['kind'];
  name: LocalizedText;
  /** Crée un nœud vierge (pages : information, synthèse, fin). */
  create?(id: string): N;
  /** Contenu du nœud dans le logigramme (le cadre et les poignées sont fournis par l'éditeur). */
  Shape: FC<ShapeProps<N>>;
  /** Classe CSS de la forme (couleur, bordure, arrondi). */
  shapeClass: string;
  /** Propriétés propres au type de nœud (les questions ont leur propre panneau). */
  Properties?: FC<NodePropertiesProps<N>>;
  /** Corps de la page dans la prévisualisation. */
  Page?: FC<PageProps<N>>;
}
