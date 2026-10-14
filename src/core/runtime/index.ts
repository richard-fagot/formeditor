// API publique du module core/runtime : moteur de parcours (implémentation de référence).
export { resolveStep, effectiveQuestion, isPage, questionnaireOf, type RuntimeInput, type Step } from './steps';
export { buildContext, getAnswer, withAnswer, otherPath, groupPath, dontKnowPath, countryPath, dontKnowAnswer, type Answers } from './context';
export { chooseEdge, successor, firstStep } from './navigate';
export {
  start, next, back, goTo, resume, setAnswer, currentStep, prune, projectedSteps, summaryEntries, progress,
  type Session, type SummaryEntry,
} from './session';
export { choiceOptions, groupId, type ResolvedOption, type ResolvedGroup } from './options';
export { suggestionList, filterSuggestions, referencedChoices } from './suggestions';
export { edgeTrace, type EdgeTrace } from './trace';
export { passedQuestions, jumpTo } from './outline';
