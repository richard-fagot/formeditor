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
}

/** Propriétés communes à toutes les questions, conservées lors d'un changement de type. */
export type QuestionBase = Pick<Question, 'id' | 'key' | 'label' | 'description' | 'help' | 'placeholder' | 'required' | 'messages' | 'constraints'>;

export interface QuestionPropertiesProps<Q extends Question = Question> {
  question: Q;
  update(patch: Partial<Q>): void;
  env: EditorEnv;
}

export interface FieldProps<Q extends Question = Question> {
  question: Q;
  value: unknown;
  other?: string;
  onChange(value: unknown, other?: string): void;
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
  /** Valeur affichée dans une synthèse. */
  formatAnswer(question: Q, value: unknown, env: RenderEnv, other?: string): string;
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
