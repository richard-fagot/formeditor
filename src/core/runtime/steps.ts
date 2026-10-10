import { isLibraryQuestion, type Block, type BlockNode, type Graph, type GraphNode, type Question, type Workspace } from '../model';
import type { EvalEnv } from '../expressions';

/** Entrée du moteur : projet, questionnaire joué, état du système, environnement d'évaluation. */
export interface RuntimeInput {
  ws: Workspace;
  questionnaireId: string;
  sys: Record<string, unknown>;
  env?: EvalEnv;
}

/**
 * Étape du parcours. Id : `nodeId` dans le questionnaire, `instanceId/nodeId` dans un bloc.
 */
export interface Step {
  id: string;
  node: GraphNode;
  /** Graphe qui contient le nœud (questionnaire ou bloc). */
  graph: Graph;
  instance?: BlockNode;
  block?: Block;
  /** Question effective (bibliothèque résolue, libellé surchargé). */
  question?: Question;
  /** Chemin de la réponse dans `answers` : `['cle']` ou `['alias', 'cle']`. */
  answerPath?: string[];
}

export function questionnaireOf(input: RuntimeInput) {
  const q = input.ws.questionnaires.find((x) => x.id === input.questionnaireId);
  if (!q) throw new Error(`Questionnaire ${input.questionnaireId} introuvable.`);
  return q;
}

export function effectiveQuestion(ws: Workspace, node: GraphNode): Question | undefined {
  if (node.kind !== 'question') return undefined;
  if (!isLibraryQuestion(node)) {
    const { kind: _k, ...q } = node;
    return q as Question;
  }
  const q = ws.library.questions.find((x) => x.id === node.ref);
  return q && node.label ? { ...q, label: node.label } : q;
}

export function resolveStep(input: RuntimeInput, id: string): Step | undefined {
  const host = questionnaireOf(input);
  const [first, inner] = id.split('/') as [string, string | undefined];
  const hostNode = host.nodes.find((n) => n.id === first);
  if (!hostNode) return undefined;
  if (inner === undefined) return withQuestion(input, { id, node: hostNode, graph: host });
  if (hostNode.kind !== 'block') return undefined;
  const block = input.ws.library.blocks.find((b) => b.id === hostNode.ref);
  const node = block?.nodes.find((n) => n.id === inner);
  if (!block || !node) return undefined;
  return withQuestion(input, { id, node, graph: block, instance: hostNode, block }, hostNode.alias);
}

function withQuestion(input: RuntimeInput, step: Step, alias?: string): Step {
  const question = effectiveQuestion(input.ws, step.node);
  if (!question) return step;
  return { ...step, question, answerPath: alias ? [alias, question.key] : [question.key] };
}

/** Étape qui affiche une page (question, information, synthèse, fin). */
export function isPage(step: Step): boolean {
  return step.node.kind !== 'block' && step.node.kind !== 'exit';
}
