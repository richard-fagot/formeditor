import { evaluateCondition } from '../expressions';
import { fragmentEntry, type Edge } from '../model';
import { buildContext, type Answers } from './context';
import { questionnaireOf, resolveStep, type RuntimeInput, type Step } from './steps';

/** Règle des rangs : première arête conditionnée vraie dans l'ordre, sinon l'arête sans condition. */
export function chooseEdge(edges: Edge[], test: (when: string) => boolean): Edge | undefined {
  return edges.find((e) => e.when && test(e.when)) ?? edges.find((e) => !e.when);
}

/** Préfixe des étapes du graphe qui contient `stepId` (`i1/` pour `i1/n`, vide dans le questionnaire). */
const prefixOf = (stepId: string) => stepId.slice(0, stepId.lastIndexOf('/') + 1);
/** Étape du nœud fragment qui appelle le graphe contenant `stepId` (`i1` pour `i1/n`). */
const callerOf = (stepId: string) => stepId.slice(0, stepId.lastIndexOf('/'));
const outEdges = (step: Step) => step.graph.edges.filter((e) => e.from === step.node.id);

/** Entrée effective du fragment appelé par une étape nœud fragment. */
function entryOf(input: RuntimeInput, step: Step): string | undefined {
  const node = step.node;
  if (node.kind !== 'fragment') return undefined;
  const f = input.ws.library.fragments.find((x) => x.id === node.ref);
  return f && fragmentEntry(f);
}

/** Étape page atteinte en entrant dans `id` (descend dans un fragment par son entrée, sort par une sortie nommée). */
function enter(input: RuntimeInput, answers: Answers, id: string, guard = 0): string | undefined {
  const step = resolveStep(input, id);
  if (!step || guard > 50) return undefined;
  if (step.node.kind === 'fragment') {
    const entry = entryOf(input, step);
    return entry ? enter(input, answers, `${id}/${entry}`, guard + 1) : undefined;
  }
  if (step.node.kind === 'exit' && step.instances.length) return leave(input, answers, callerOf(id), step.node.name, guard + 1);
  return step.id;
}

/**
 * Sortie du fragment appelé par l'étape `callId` : arêtes sortantes du nœud fragment sans nom de sortie, ou
 * portant `exit` (sortie nommée), évaluées par rang dans le contexte de l'appelant. Un nœud fragment sans
 * arête sortante dans un fragment est lui-même une sortie implicite de ce fragment.
 */
function leave(input: RuntimeInput, answers: Answers, callId: string, exit: string | undefined, guard = 0): string | undefined {
  const call = resolveStep(input, callId);
  if (!call || guard > 50) return undefined;
  const all = outEdges(call);
  if (!all.length) return call.instances.length ? leave(input, answers, callerOf(callId), undefined, guard + 1) : undefined;
  const ctx = buildContext(input, answers, callId);
  const edge = chooseEdge(all.filter((e) => !e.exit || e.exit === exit), (w) => evaluateCondition(w, ctx, input.env));
  return edge ? enter(input, answers, prefixOf(callId) + edge.to, guard + 1) : undefined;
}

/** Étape suivante (`undefined` : fin ou aucune arête applicable). Un nœud sans arête sortante dans un fragment en sort. */
export function successor(input: RuntimeInput, answers: Answers, stepId: string): string | undefined {
  const step = resolveStep(input, stepId);
  if (!step || step.node.kind === 'end') return undefined;
  const edges = outEdges(step);
  if (!edges.length && step.instances.length) return leave(input, answers, callerOf(stepId), undefined);
  const ctx = buildContext(input, answers, stepId);
  const edge = chooseEdge(edges, (w) => evaluateCondition(w, ctx, input.env));
  return edge ? enter(input, answers, prefixOf(stepId) + edge.to) : undefined;
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
    const edges = outEdges(step);
    // Toutes les cibles possibles : on simule chaque arête comme si elle était choisie.
    if (!edges.length && step.instances.length && step.node.kind !== 'end') todo.push(...leaveAll(input, callerOf(id), undefined));
    for (const e of edges) todo.push(...expandAll(input, prefixOf(id) + e.to));
  }
  return seen;
}

/** Comme `enter`, mais en suivant toutes les arêtes possibles en sortie de fragment. */
function expandAll(input: RuntimeInput, id: string, guard = 0): string[] {
  const step = resolveStep(input, id);
  if (!step || guard > 50) return [];
  if (step.node.kind === 'fragment') {
    const entry = entryOf(input, step);
    return entry ? expandAll(input, `${id}/${entry}`, guard + 1) : [];
  }
  if (step.node.kind === 'exit' && step.instances.length) return leaveAll(input, callerOf(id), step.node.name, guard + 1);
  return [step.id];
}

/** Comme `leave`, toutes arêtes confondues. */
function leaveAll(input: RuntimeInput, callId: string, exit: string | undefined, guard = 0): string[] {
  const call = resolveStep(input, callId);
  if (!call || guard > 50) return [];
  const all = outEdges(call);
  if (!all.length) return call.instances.length ? leaveAll(input, callerOf(callId), undefined, guard + 1) : [];
  return all.filter((e) => !e.exit || e.exit === exit).flatMap((e) => expandAll(input, prefixOf(callId) + e.to, guard + 1));
}
