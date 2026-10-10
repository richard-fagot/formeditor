import { evaluateStrict } from '../expressions';
import type { Edge } from '../model';
import { buildContext, type Answers } from './context';
import { resolveStep, type RuntimeInput } from './steps';

/** Arête sortante évaluée (débogage) : `else` pour l'arête sans condition, `error` si l'évaluation échoue. */
export interface EdgeTrace {
  edge: Edge;
  result: boolean | 'else' | 'error';
  /** Arête que `successor` suivrait. */
  chosen: boolean;
}

/** Conditions des arêtes sortantes d'une étape, dans l'ordre d'évaluation, avec les réponses données. */
export function edgeTrace(input: RuntimeInput, answers: Answers, stepId: string): EdgeTrace[] {
  const step = resolveStep(input, stepId);
  if (!step || step.node.kind === 'end') return [];
  const ctx = buildContext(input, answers, stepId);
  const edges = step.graph.edges.filter((e) => e.from === step.node.id);
  const results = new Map<Edge, EdgeTrace['result']>();
  for (const e of edges) {
    if (!e.when) results.set(e, 'else');
    else {
      try {
        results.set(e, evaluateStrict(e.when, ctx, input.env) === true);
      } catch {
        results.set(e, 'error');
      }
    }
  }
  // Même règle que `chooseEdge` : première condition vraie, sinon l'arête sans condition.
  const chosen = edges.find((e) => results.get(e) === true) ?? edges.find((e) => !e.when);
  return edges.map((edge) => ({ edge, result: results.get(edge)!, chosen: edge === chosen }));
}
