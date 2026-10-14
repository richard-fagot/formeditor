import { buildContext, currentStep, dontKnowPath, getAnswer, goTo, groupPath, otherPath, projectedSteps, resolveStep, type Answers, type RuntimeInput, type Session } from '../../core/runtime';
import { isRequired, validateAnswer } from '../../core/validation';

/** Erreurs de validation de la réponse à une page question, dans le contexte de cette page. */
export function answerErrors(input: RuntimeInput, answers: Answers, stepId: string) {
  const step = resolveStep(input, stepId);
  const q = step?.question;
  if (!q || !step.answerPath) return [];
  const value = getAnswer(answers, step.answerPath);
  const other = getAnswer(answers, otherPath(step.answerPath)) as string | undefined;
  const group = getAnswer(answers, groupPath(step.answerPath));
  const dontKnow = getAnswer(answers, dontKnowPath(step.answerPath));
  return validateAnswer(q, value, pageContext(input, answers, stepId, q.key, value), input.env, other, '', group, dontKnow);
}

/** Contexte de validation d'une page : celui de la page, réponse courante comprise (sous sa clé). */
function pageContext(input: RuntimeInput, answers: Answers, stepId: string, key: string, value: unknown) {
  return { ...buildContext(input, answers, stepId), ...(value === null || value === undefined ? {} : { [key]: value }) };
}

/**
 * Astérisque d'une page question (EVO-021) : caractère obligatoire effectif (surcharges appliquées par le moteur,
 * « obligatoire si » évalué), même résolution et même contexte que le contrôle de `answerErrors`.
 */
export function requiredAt(input: RuntimeInput, answers: Answers, stepId: string): boolean {
  const step = resolveStep(input, stepId);
  const q = step?.question;
  if (!q || !step.answerPath) return false;
  return isRequired(q, pageContext(input, answers, stepId, q.key, getAnswer(answers, step.answerPath)), input.env);
}

/** Première page du chemin effectif dont la réponse (connue) est devenue invalide (spec §5) ; `skip` : pages non revérifiées (EVO-014). */
export function firstInvalidStep(input: RuntimeInput, answers: Answers, skip: readonly string[] = []): string | undefined {
  for (const id of projectedSteps(input, answers)) {
    if (skip.includes(id)) continue;
    const path = resolveStep(input, id)?.answerPath;
    if (path && getAnswer(answers, path) !== undefined && answerErrors(input, answers, id).length) return id;
  }
  return undefined;
}

/**
 * Une fin ne s'affiche que si toutes les réponses du chemin sont valides : sinon, session ramenée à la
 * première question concernée (réponse conservée). Renvoie `undefined` si rien n'est à corriger.
 */
export function guardEnd(input: RuntimeInput, s: Session, skip: readonly string[] = []): Session | undefined {
  if (!s.history.length || currentStep(input, s).node.kind !== 'end') return undefined;
  const bad = firstInvalidStep(input, s.answers, skip);
  return bad ? goTo(s, bad) : undefined;
}
