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
  /** Étape dont part l'arête : la page, ou le nœud fragment appelant quand on sort d'un fragment (EVO-008). */
  stepId: string;
}

const prefixOf = (stepId: string) => stepId.slice(0, stepId.lastIndexOf('/') + 1);
const callerOf = (stepId: string) => stepId.slice(0, stepId.lastIndexOf('/'));

/**
 * Conditions des arêtes sortantes d'une étape, dans l'ordre d'évaluation, avec les réponses données. Dans un fragment,
 * quand on en sort (page sans arête sortante, ou arête retenue vers une sortie nommée), les arêtes du nœud fragment
 * appelant suivent, évaluées dans le contexte de l'appelant (même règle que `successor`).
 */
export function edgeTrace(input: RuntimeInput, answers: Answers, stepId: string): EdgeTrace[] {
  const step = resolveStep(input, stepId);
  if (!step || step.node.kind === 'end') return [];
  return traceAt(input, answers, stepId, undefined, 0);
}

function traceAt(input: RuntimeInput, answers: Answers, id: string, exit: string | undefined, guard: number): EdgeTrace[] {
  const step = resolveStep(input, id);
  if (!step || guard > 50) return [];
  const all = step.graph.edges.filter((e) => e.from === step.node.id);
  // Nœud fragment appelant : arêtes sans nom de sortie ou portant celle empruntée.
  const edges = step.node.kind === 'fragment' ? all.filter((e) => !e.exit || e.exit === exit) : all;
  if (!all.length) return step.instances.length ? traceAt(input, answers, callerOf(id), undefined, guard + 1) : [];
  const ctx = buildContext(input, answers, id);
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
  const list = edges.map((edge) => ({ edge, result: results.get(edge)!, chosen: edge === chosen, stepId: id }));
  const target = chosen && resolveStep(input, prefixOf(id) + chosen.to);
  if (target?.node.kind === 'exit' && target.instances.length) {
    return [...list, ...traceAt(input, answers, callerOf(target.id), target.node.name, guard + 1)];
  }
  return list;
}
