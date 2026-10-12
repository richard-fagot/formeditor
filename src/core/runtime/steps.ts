import { isLibraryQuestion, type Fragment, type FragmentNode, type Graph, type GraphNode, type Question, type Workspace } from '../model';
import type { EvalEnv } from '../expressions';

/** Entrée du moteur : projet, questionnaire joué, état du système, environnement d'évaluation. */
export interface RuntimeInput {
  ws: Workspace;
  questionnaireId: string;
  sys: Record<string, unknown>;
  env?: EvalEnv;
}

/**
 * Étape du parcours. Id : `nodeId` dans le questionnaire, `instanceId/nodeId` dans un fragment,
 * `i1/i2/nodeId` dans un fragment appelé par un fragment (EVO-008).
 */
export interface Step {
  id: string;
  node: GraphNode;
  /** Graphe qui contient le nœud (questionnaire ou fragment). */
  graph: Graph;
  /** Nœuds fragment traversés pour atteindre le nœud, du plus externe au plus interne (vide hors fragment). */
  instances: FragmentNode[];
  /** Appel le plus interne (dernier de `instances`) et son fragment. */
  instance?: FragmentNode;
  fragment?: Fragment;
  /** Question effective (bibliothèque résolue, libellé surchargé). */
  question?: Question;
  /** Chemin de la réponse dans `answers` : `['cle']`, `['alias', 'cle']`, `['a', 'b', 'cle']`. */
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
  const parts = id.split('/');
  let graph: Graph = questionnaireOf(input);
  let fragment: Fragment | undefined;
  const instances: FragmentNode[] = [];
  for (const part of parts.slice(0, -1)) {
    const n = graph.nodes.find((x) => x.id === part);
    if (n?.kind !== 'fragment') return undefined;
    fragment = input.ws.library.fragments.find((f) => f.id === n.ref);
    if (!fragment) return undefined;
    instances.push(n);
    graph = fragment;
  }
  const node = graph.nodes.find((n) => n.id === parts.at(-1));
  if (!node) return undefined;
  return withQuestion(input, { id, node, graph, instances, ...(fragment ? { instance: instances.at(-1)!, fragment } : {}) });
}

function withQuestion(input: RuntimeInput, step: Step): Step {
  const question = effectiveQuestion(input.ws, step.node);
  if (!question) return step;
  return { ...step, question, answerPath: [...step.instances.map((i) => i.alias), question.key] };
}

/** Étape qui affiche une page (question, information, synthèse, fin). */
export function isPage(step: Step): boolean {
  return step.node.kind !== 'fragment' && step.node.kind !== 'exit';
}
