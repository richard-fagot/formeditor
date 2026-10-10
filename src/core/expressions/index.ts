// API publique du module core/expressions (adaptateur JSONata isolé ici).
export { compile, checkSyntax, evaluate, evaluateStrict, evaluateCondition } from './evaluate';
export type { EvalContext, EvalEnv, SyntaxError as ExpressionSyntaxError } from './evaluate';
export { extractReferences, renameReference, type RefPath } from './references';
export { parseTemplate, interpolate, formatValue, templateExpressions, templateReferences, renameInTemplate } from './template';
export { resolveLabel, pickText, type LangChoice } from './label';
export { todayIso, addDays, daysBetween, age } from './dates';
