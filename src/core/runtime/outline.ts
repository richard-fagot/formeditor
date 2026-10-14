import { firstStep, successor } from './navigate';
import type { Session } from './session';
import { resolveStep, type RuntimeInput } from './steps';

/**
 * Parcours recalculé avec les réponses actuelles (EVO-019), restreint aux pages déjà affichées : étapes depuis
 * le départ, jusqu'à la première page jamais affichée (exclue). `visited` : pages affichées depuis le début du
 * parcours, que l'historique du wizard ne garde pas (« Précédent » le tronque) ; l'historique y est ajouté.
 */
function passedPath(input: RuntimeInput, s: Session, visited: Iterable<string>): string[] {
  const seen = new Set([...visited, ...s.history]);
  const path: string[] = [];
  let id = firstStep(input, s.answers);
  while (id && seen.has(id) && !path.includes(id)) {
    path.push(id);
    id = successor(input, s.answers, id);
  }
  return path;
}

/** Questions déjà passées du parcours courant (question courante comprise) : celles que l'outline rend actives. */
export function passedQuestions(input: RuntimeInput, s: Session, visited: Iterable<string> = []): Set<string> {
  return new Set(passedPath(input, s, visited).filter((id) => resolveStep(input, id)?.question));
}

/** Saut vers une question passée : l'historique devient le parcours jusqu'à elle, réponses conservées ; sinon sans effet. */
export function jumpTo(input: RuntimeInput, s: Session, stepId: string, visited: Iterable<string> = []): Session {
  const path = passedPath(input, s, visited);
  if (!path.includes(stepId) || !resolveStep(input, stepId)?.question) return s;
  return { ...s, history: path.slice(0, path.indexOf(stepId) + 1), blocked: false };
}
