// API publique du module core/references : portée des clés, usages, renommage propagé.
export { mapWorkspace, mapGraph, mapQuestion, collectExpressions } from './visit';
export type { Owner, ExprLocation, ExprMapper, FoundExpression } from './visit';
export {
  questionnaireScope, fragmentScope, structureScope, resolvePath, questionOfNode, hiddenFieldPaths,
  type Scope, type RefInfo, type RefKind, type Caller,
} from './scope';
export { renameKey, qualifyKeys, type RenameTarget } from './rename';
export { renameKeysIn } from './rename-local';
export { findUsages } from './usages';
