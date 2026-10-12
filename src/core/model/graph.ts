import type { Expression } from './text';
import type { GraphNode } from './node';

/**
 * Arête : les arêtes conditionnées sortant d'un nœud sont évaluées dans l'ordre du tableau
 * `edges` (rang) ; la première vraie est suivie. Une arête sans condition est le « sinon ».
 */
export interface Edge {
  id: string;
  from: string;
  to: string;
  when?: Expression;
  /** Pour une arête sortant d'une instance de bloc : nom de la sortie du bloc. */
  exit?: string;
  /** Libellé de lecture (une ligne, une seule langue), affiché à la place de la condition ; sans effet sur la navigation. */
  caption?: string;
  description?: string;
}

/** Graphe orienté : questionnaire ou bloc. */
export interface Graph {
  start: string;
  nodes: GraphNode[];
  edges: Edge[];
}
