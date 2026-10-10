import { OTHER_VALUE } from '../model';
import type { EvalContext } from '../expressions';
import { resolveStep, type RuntimeInput } from './steps';

/** Réponses : par clé ; les réponses d'un bloc sont rangées sous son alias. */
export type Answers = Record<string, unknown>;

/** Contexte d'évaluation à une étape : réponses, `sys`, et dans un bloc ses propres clés sans préfixe (prioritaires). */
export function buildContext(input: RuntimeInput, answers: Answers, stepId?: string): EvalContext {
  const step = stepId ? resolveStep(input, stepId) : undefined;
  const own = step?.instance ? (answers[step.instance.alias] as Answers | undefined) : undefined;
  return { ...answers, ...(own ?? {}), sys: input.sys };
}

export function getAnswer(answers: Answers, path: string[]): unknown {
  let cur: unknown = answers;
  for (const p of path) cur = cur && typeof cur === 'object' ? (cur as Answers)[p] : undefined;
  return cur;
}

/** Copie de `answers` avec `path` modifié (`undefined` supprime). */
export function withAnswer(answers: Answers, path: string[], value: unknown): Answers {
  const [head, ...rest] = path as [string, ...string[]];
  const next = { ...answers };
  const v = rest.length ? withAnswer((answers[head] as Answers) ?? {}, rest, value) : value;
  if (v === undefined) delete next[head];
  else next[head] = v;
  return next;
}

export const otherPath = (path: string[]) => [...path.slice(0, -1), `${path.at(-1)}_${OTHER_VALUE}`];
