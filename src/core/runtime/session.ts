import { evaluate } from '../expressions';
import { buildContext, countryPath, dontKnowPath, getAnswer, groupPath, otherPath, withAnswer, type Answers } from './context';
import { firstStep, reachableSteps, successor } from './navigate';
import { resolveStep, type RuntimeInput, type Step } from './steps';

/** État d'un parcours : pages visitées (la dernière est la page courante) et réponses. */
export interface Session {
  history: string[];
  answers: Answers;
  /** Vrai si la dernière tentative d'avancer n'a trouvé aucune arête applicable. */
  blocked?: boolean;
}

export function start(input: RuntimeInput, answers: Answers = {}): Session {
  const first = firstStep(input, answers);
  if (!first) return { history: [], answers, blocked: true };
  return { history: [first], answers: withDefault(input, answers, first) };
}

export function currentStep(input: RuntimeInput, s: Session): Step {
  const id = s.history.at(-1);
  const step = id ? resolveStep(input, id) : undefined;
  if (!step) throw new Error('Parcours vide.');
  return step;
}

/**
 * Enregistre la réponse de la question courante, sa précision « Autre » et, pour un choix, le groupe de la
 * sélection (`<clé>_group` : identifiant, ou liste parallèle aux valeurs ; absent hors groupe) et le marqueur
 * « Ne sais pas » (`<clé>_nsp: true`, EVO-006 ; absent sinon : toute autre réponse l'efface) et le pays d'un
 * téléphone ou d'une adresse (`<clé>_pays`, EVO-007 ; absent sinon).
 */
export function setAnswer(
  input: RuntimeInput, s: Session, value: unknown, other?: string, group?: unknown, dontKnow?: boolean, country?: string,
): Session {
  const step = currentStep(input, s);
  if (!step.answerPath) return s;
  let answers = withAnswer(s.answers, step.answerPath, value);
  answers = withAnswer(answers, otherPath(step.answerPath), other || undefined);
  answers = withAnswer(answers, groupPath(step.answerPath), group ?? undefined);
  answers = withAnswer(answers, dontKnowPath(step.answerPath), dontKnow ? true : undefined);
  answers = withAnswer(answers, countryPath(step.answerPath), country || undefined);
  return { ...s, answers };
}

/** Avance d'une page. Une question sans réponse reçoit `null` (facultative laissée vide). */
export function next(input: RuntimeInput, s: Session): Session {
  const step = currentStep(input, s);
  let answers = s.answers;
  if (step.answerPath && getAnswer(answers, step.answerPath) === undefined) answers = withAnswer(answers, step.answerPath, null);
  const to = successor(input, answers, step.id);
  if (!to) return { ...s, answers, blocked: true };
  const history = [...s.history, to];
  return { history, answers: withDefault(input, prune(input, answers), to) };
}

export function back(s: Session): Session {
  return s.history.length > 1 ? { ...s, history: s.history.slice(0, -1), blocked: false } : s;
}

/** Retour à une page déjà visitée (depuis une synthèse) : empilée, pour pouvoir revenir. */
export function goTo(s: Session, stepId: string): Session {
  return { ...s, history: [...s.history, stepId], blocked: false };
}

/**
 * Après une modification depuis une synthèse : avance sur les pages déjà vues et répondues, jusqu'à
 * `target` (la synthèse), une page nouvelle sur le chemin, une question sans réponse, une fin, un blocage,
 * ou une page que `accept` refuse (revalidation de la réponse par l'appelant, `core/validation`).
 */
export function resume(input: RuntimeInput, s: Session, target: string, accept: (s: Session) => boolean = () => true): Session {
  let cur = s;
  for (let i = 0; i < 500; i++) {
    const n = next(input, cur);
    if (n.blocked) return n;
    cur = n;
    const step = currentStep(input, cur);
    if (step.id === target || step.node.kind === 'end') return cur;
    if (!s.history.includes(step.id)) return cur;
    if (step.answerPath && getAnswer(cur.answers, step.answerPath) === undefined) return cur;
    if (!accept(cur)) return cur;
  }
  return cur;
}

function withDefault(input: RuntimeInput, answers: Answers, stepId: string): Answers {
  const step = resolveStep(input, stepId);
  const q = step?.question;
  if (!q || !step.answerPath || getAnswer(answers, step.answerPath) !== undefined) return answers;
  const value = q.defaultExpr ? evaluate(q.defaultExpr, buildContext(input, answers, stepId), input.env) : q.default;
  return value === undefined ? answers : withAnswer(answers, step.answerPath, value);
}

/**
 * Chemin projeté depuis le départ avec les réponses connues. À la première question sans réponse,
 * on garde tout ce qui reste atteignable (sans repasser par le chemin déjà projeté).
 */
export function projectedSteps(input: RuntimeInput, answers: Answers): Set<string> {
  const path = new Set<string>();
  let id = firstStep(input, answers);
  while (id && !path.has(id)) {
    path.add(id);
    const step = resolveStep(input, id);
    if (step?.answerPath && getAnswer(answers, step.answerPath) === undefined) {
      reachableSteps(input, id, path).forEach((x) => path.add(x));
      break;
    }
    id = successor(input, answers, id);
  }
  return path;
}

/** Efface les réponses des questions qui ne sont plus sur le chemin projeté. */
export function prune(input: RuntimeInput, answers: Answers): Answers {
  const keep = projectedSteps(input, answers);
  let out = answers;
  const host = input.ws.questionnaires.find((q) => q.id === input.questionnaireId)!;
  const allSteps = host.nodes.flatMap((n) => {
    if (n.kind !== 'block') return [n.id];
    const b = input.ws.library.blocks.find((x) => x.id === n.ref);
    return b ? b.nodes.map((bn) => `${n.id}/${bn.id}`) : [];
  });
  const kept = new Set([...keep].map((id) => resolveStep(input, id)?.answerPath?.join('.')).filter(Boolean));
  for (const id of allSteps) {
    const path = resolveStep(input, id)?.answerPath;
    if (!path || kept.has(path.join('.'))) continue;
    for (const p of [path, otherPath(path), groupPath(path), dontKnowPath(path), countryPath(path)]) out = withAnswer(out, p, undefined);
  }
  return out;
}

export interface SummaryEntry {
  stepId: string;
  step: Step;
  value: unknown;
  other?: unknown;
  /** Groupe de la sélection d'un choix (`<clé>_group`). */
  group?: unknown;
  /** « Ne sais pas » choisie (`<clé>_nsp`, EVO-006). */
  dontKnow?: true;
}

/** Réponses du parcours effectif jusqu'à la page courante, dans l'ordre de première visite. */
export function summaryEntries(input: RuntimeInput, s: Session): SummaryEntry[] {
  const seen = new Set<string>();
  const out: SummaryEntry[] = [];
  for (const id of s.history.slice(0, -1)) {
    const step = resolveStep(input, id);
    if (!step?.answerPath || seen.has(id)) continue;
    seen.add(id);
    const value = getAnswer(s.answers, step.answerPath);
    if (value === undefined) continue;
    const group = getAnswer(s.answers, groupPath(step.answerPath));
    const dontKnow = getAnswer(s.answers, dontKnowPath(step.answerPath)) === true;
    out.push({
      stepId: id, step, value, other: getAnswer(s.answers, otherPath(step.answerPath)),
      ...(group === undefined ? {} : { group }), ...(dontKnow ? { dontKnow: true as const } : {}),
    });
  }
  return out;
}

/** Progression indicative : pages vues / (pages vues + pages restantes sur le chemin le plus probable). */
export function progress(input: RuntimeInput, s: Session): number {
  const step = currentStep(input, s);
  if (step.node.kind === 'end') return 1;
  let remaining = 0;
  const seen = new Set<string>();
  let id = successor(input, s.answers, step.id);
  while (id && !seen.has(id)) {
    seen.add(id);
    remaining++;
    id = successor(input, s.answers, id);
  }
  return s.history.length / (s.history.length + remaining);
}
