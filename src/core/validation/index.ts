// API publique du module core/validation : contraintes de champs et vérifications du §4.6.
export { validateAnswer, messageParams, type FieldError } from './field';
export { checkWorkspace } from './workspace-check';
export { checkGraph } from './graph';
export { guaranteedBefore } from './guarantee';
export { describeIssue, type Issue, type IssueCode } from './issue';
export { DEFAULT_MESSAGES, defaultMessage } from './messages';
