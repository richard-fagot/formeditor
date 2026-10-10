import { evaluateCondition } from '../expressions';
import type { Edge } from '../model';
import { buildContext, type Answers } from './context';
import { questionnaireOf, resolveStep, type RuntimeInput } from './steps';

/** Règle des rangs : première arête conditionnée vraie dans l'ordre, sinon l'arête sans condition. */
export function chooseEdge(edges: Edge[], test: (when: string) => boolean): Edge | undefined {
  return edges.find((e) => e.when && test(e.when)) ?? edges.find((e) => !e.when);
}

/** Étape page atteinte en entrant dans `nodeId` (descend dans un bloc, sort par une sortie). */
function enter(input: RuntimeInput, answers: Answers, id: string, guard = 0): string | undefined {
  const step = resolveStep(input, id);
  if (!step || guard > 50) return undefined;
  const node = step.node;
  if (node.kind === 'block' && !step.instance) {
    const block = input.ws.library.blocks.find((b) => b.id === node.ref);
    return block ? enter(input, answers, `${step.id}/${block.start}`, guard + 1) : undefined;
  }
  if (step.node.kind === 'exit' && step.instance) {
    const host = questionnaireOf(input);
    const exitName = step.node.name;
    const edges = host.edges.filter((e) => e.from === step.instance!.id && (!e.exit || e.exit === exitName));
    const ctx = buildContext(input, answers);
    const edge = chooseEdge(edges, (w) => evaluateCondition(w, ctx, input.env));
    return edge ? enter(input, answers, edge.to, guard + 1) : undefined;
  }
  return step.id;
}

/** Étape suivante (`undefined` : fin ou aucune arête applicable). */
export function successor(input: RuntimeInput, answers: Answers, stepId: string): string | undefined {
  const step = resolveStep(input, stepId);
  if (!step || step.node.kind === 'end') return undefined;
  const ctx = buildContext(input, answers, stepId);
  const edges = step.graph.edges.filter((e) => e.from === step.node.id);
  const edge = chooseEdge(edges, (w) => evaluateCondition(w, ctx, input.env));
  if (!edge) return undefined;
  const target = step.instance ? `${step.instance.id}/${edge.to}` : edge.to;
  return enter(input, answers, target);
}

export function firstStep(input: RuntimeInput, answers: Answers = {}): string | undefined {
  return enter(input, answers, questionnaireOf(input).start);
}

/** Étapes atteignables depuis `stepId` sans tenir compte des conditions, sans repasser par `exclude`. */
export function reachableSteps(input: RuntimeInput, stepId: string, exclude: Set<string>): Set<string> {
  const seen = new Set<string>();
  const todo = [stepId];
  while (todo.length) {
    const id = todo.pop()!;
    if (seen.has(id) || (exclude.has(id) && id !== stepId)) continue;
    seen.add(id);
    const step = resolveStep(input, id);
    if (!step) continue;
    for (const e of step.graph.edges.filter((x) => x.from === step.node.id)) {
      // Toutes les cibles possibles : on simule chaque arête comme si elle était choisie.
      const target = step.instance ? `${step.instance.id}/${e.to}` : e.to;
      for (const t of expandAll(input, target)) todo.push(t);
    }
  }
  return seen;
}

/** Comme `enter`, mais en suivant toutes les arêtes possibles en sortie de bloc. */
function expandAll(input: RuntimeInput, id: string, guard = 0): string[] {
  const step = resolveStep(input, id);
  if (!step || guard > 50) return [];
  const node = step.node;
  if (node.kind === 'block' && !step.instance) {
    const block = input.ws.library.blocks.find((b) => b.id === node.ref);
    return block ? expandAll(input, `${step.id}/${block.start}`, guard + 1) : [];
  }
  if (step.node.kind === 'exit' && step.instance) {
    const name = step.node.name;
    return questionnaireOf(input)
      .edges.filter((e) => e.from === step.instance!.id && (!e.exit || e.exit === name))
      .flatMap((e) => expandAll(input, e.to, guard + 1));
  }
  return [step.id];
}
