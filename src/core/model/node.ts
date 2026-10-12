import type { Label, LocalizedText } from './text';
import type { Question } from './question';

/** Question locale : la question est portée par le nœud (id du nœud = id de la question). */
export type LocalQuestionNode = { kind: 'question' } & Question;

/** Question de la bibliothèque, par référence ; seul le libellé est surchargeable. */
export interface LibraryQuestionNode {
  kind: 'question';
  id: string;
  /** Id de la question dans la bibliothèque. */
  ref: string;
  label?: Label;
  /** Structure (EVO-009) : clés des champs masqués dans cette instance ; absent = tous affichés. */
  hiddenFields?: string[];
  description?: string;
}

export type QuestionNode = LocalQuestionNode | LibraryQuestionNode;

/** Instance d'un fragment de la bibliothèque (EVO-008). */
export interface FragmentNode {
  kind: 'fragment';
  id: string;
  /** Id du fragment dans la bibliothèque. */
  ref: string;
  /** Préfixe des clés du fragment vues depuis l'appelant (`alias.cle`). */
  alias: string;
  description?: string;
}

export interface InfoNode {
  kind: 'info';
  id: string;
  title?: Label;
  text: Label;
  description?: string;
}

export interface SummaryNode {
  kind: 'summary';
  id: string;
  title?: Label;
  description?: string;
}

export interface EndNode {
  kind: 'end';
  id: string;
  title?: Label;
  message: Label;
  /** Issue métier libre (ex. `submitted`, `ineligible`). */
  outcome?: string;
  description?: string;
}

/** Sortie nommée d'un fragment (facultative, uniquement dans un fragment). */
export interface ExitNode {
  kind: 'exit';
  id: string;
  name: string;
  label?: LocalizedText;
  description?: string;
}

export type GraphNode = QuestionNode | FragmentNode | InfoNode | SummaryNode | EndNode | ExitNode;
export type NodeKind = GraphNode['kind'];

export function isLibraryQuestion(node: GraphNode): node is LibraryQuestionNode {
  return node.kind === 'question' && 'ref' in node;
}
export function isLocalQuestion(node: GraphNode): node is LocalQuestionNode {
  return node.kind === 'question' && !('ref' in node);
}
