import { buildContext, currentStep, getAnswer, goTo, groupPath, otherPath, projectedSteps, resolveStep, type Answers, type RuntimeInput, type Session } from '../../core/runtime';
import { validateAnswer } from '../../core/validation';

/** Erreurs de validation de la réponse à une page question, dans le contexte de cette page. */
export function answerErrors(input: RuntimeInput, answers: Answers, stepId: string) {
  const step = resolveStep(input, stepId);
  const q = step?.question;
  if (!q || !step.answerPath) return [];
  const value = getAnswer(answers, step.answerPath);
  const other = getAnswer(answers, otherPath(step.answerPath)) as string | undefined;
  const group = getAnswer(answers, groupPath(step.answerPath));
  const ctx = buildContext(input, answers, stepId);
  return validateAnswer(q, value, { ...ctx, ...(value === null || value === undefined ? {} : { [q.key]: value }) }, input.env, other, '', group);
}

/** Première page du chemin effectif dont la réponse (connue) est devenue invalide (spec §5). */
export function firstInvalidStep(input: RuntimeInput, answers: Answers): string | undefined {
  for (const id of projectedSteps(input, answers)) {
    const path = resolveStep(input, id)?.answerPath;
    if (path && getAnswer(answers, path) !== undefined && answerErrors(input, answers, id).length) return id;
  }
  return undefined;
}

/**
 * Une fin ne s'affiche que si toutes les réponses du chemin sont valides : sinon, session ramenée à la
 * première question concernée (réponse conservée). Renvoie `undefined` si rien n'est à corriger.
 */
export function guardEnd(input: RuntimeInput, s: Session): Session | undefined {
  if (!s.history.length || currentStep(input, s).node.kind !== 'end') return undefined;
  const bad = firstInvalidStep(input, s.answers);
  return bad ? goTo(s, bad) : undefined;
}
