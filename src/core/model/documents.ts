import type { Graph } from './graph';
import type { LangCode, LocalizedText } from './text';
import type { Question } from './question';

export const FORMAT_VERSION = 12;

export interface Questionnaire extends Graph {
  formatVersion: number;
  kind: 'questionnaire';
  id: string;
  key: string;
  title: LocalizedText;
  description?: string;
  /** État de validation (EVO-015) : absent = `draft` (non validé) ; `validated` = en lecture seule. */
  status?: 'draft' | 'validated';
  /** Date de validation (`AAAA-MM-JJ`), présente seulement quand le questionnaire est validé. */
  validatedAt?: string;
  /** Nœud de départ (peut être un nœud fragment : le parcours commence sur l'entrée du fragment). */
  start: string;
}

/**
 * Fragment de questionnaire (EVO-008) : morceau de parcours sans départ ni fin, appelé par référence.
 * Entrée : `entry` si réglée, sinon le nœud sans arête entrante ; sorties : nœuds sans arête sortante.
 */
export interface Fragment extends Graph {
  id: string;
  key: string;
  title: LocalizedText;
  description?: string;
  /** Nœud d'entrée explicite (repli quand l'entrée implicite est absente ou ambiguë). */
  entry?: string;
}

export interface LabelSet {
  id: string;
  key: string;
  kind: 'boolean' | 'tristate';
  yes: LocalizedText;
  no: LocalizedText;
  /** Troisième valeur d'un tri-state. */
  unknown?: LocalizedText;
  description?: string;
}

export interface Library {
  formatVersion: number;
  kind: 'library';
  questions: Question[];
  fragments: Fragment[];
  labelSets: LabelSet[];
}

export type VariableType = 'text' | 'number' | 'date' | 'boolean' | 'enum' | 'list';
export interface SystemVariable {
  name: string;
  type: VariableType;
  /** Libellé de lecture (une ligne, une seule langue) ; jamais utilisé dans les expressions. */
  caption?: string;
  description?: string;
  /** Valeurs possibles d'une énumération. */
  values?: string[];
  /** Schéma des objets d'une liste. */
  fields?: SystemVariable[];
  example?: unknown;
}

export interface Scenario {
  id: string;
  name: string;
  description?: string;
  /** Valeurs de l'état du système, par nom de variable. */
  values: Record<string, unknown>;
}

export interface QuestionnaireEntry {
  id: string;
  file: string;
}

export interface Project {
  formatVersion: number;
  kind: 'project';
  id: string;
  name: string;
  description?: string;
  languages: LangCode[];
  defaultLanguage: LangCode;
  systemState: SystemVariable[];
  scenarios: Scenario[];
  questionnaires: QuestionnaireEntry[];
}

export interface NodeLayout {
  x: number;
  y: number;
  collapsed?: boolean;
}

/**
 * Commentaire de révision (EVO-011, outil seulement) : texte initial puis réponses, dans l'ordre de saisie.
 * Rattaché à un nœud question du graphe (ou, pour une question de bibliothèque, à la question elle-même).
 */
export interface ReviewComment {
  /** Nœud question commenté (id de la question de bibliothèque pour une question de bibliothèque). */
  node: string;
  /** Position du nœud commentaire dans le logigramme (absente pour une question de bibliothèque). */
  x?: number;
  y?: number;
  text: string;
  replies: string[];
}

/** Mise en page d'un graphe (outil seulement), et commentaires de révision de l'objet (EVO-011). */
export interface Layout {
  formatVersion: number;
  kind: 'layout';
  /** Id du questionnaire, du fragment ou de la question de bibliothèque (commentaires seulement). */
  graph: string;
  nodes: Record<string, NodeLayout>;
  /** Commentaires de révision : au plus un par question. */
  comments?: ReviewComment[];
}

/** Projet complet en mémoire, et contenu d'un bundle. */
export interface Workspace {
  project: Project;
  library: Library;
  questionnaires: Questionnaire[];
  layouts: Layout[];
}

export interface Bundle extends Workspace {
  formatVersion: number;
  kind: 'bundle';
}
