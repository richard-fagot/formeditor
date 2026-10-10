// API publique du module core/runtime : moteur de parcours (implémentation de référence).
export { resolveStep, effectiveQuestion, isPage, questionnaireOf, type RuntimeInput, type Step } from './steps';
export { buildContext, getAnswer, withAnswer, otherPath, type Answers } from './context';
export { chooseEdge, successor, firstStep } from './navigate';
export {
  start, next, back, goTo, setAnswer, currentStep, prune, projectedSteps, summaryEntries, progress,
  type Session, type SummaryEntry,
} from './session';
export { choiceOptions, type ResolvedOption } from './options';
