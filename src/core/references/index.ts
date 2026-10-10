// API publique du module core/references : portée des clés, usages, renommage propagé.
export { mapWorkspace, mapGraph, mapQuestion, collectExpressions } from './visit';
export type { Owner, ExprLocation, ExprMapper, FoundExpression } from './visit';
export {
  questionnaireScope, blockScope, blockHosts, structureScope, resolvePath, questionOfNode,
  type Scope, type RefInfo, type RefKind,
} from './scope';
export { renameKey, type RenameTarget } from './rename';
export { findUsages } from './usages';
