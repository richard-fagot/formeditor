// API publique du module app/store : état applicatif, édition, annuler/rétablir par questionnaire.
export { useStore, scopeOf, blankWorkspace, type Store, type AppState, type TabId, type Selection, type PreviewState, type PaletteMode } from './store';
export type { Scope } from './history';
export {
  getGraph, layoutOf, insertNode, connect, removeNodes, removeEdge, moveEdge, updateNode, duplicateNodes,
  usedKeys, freshKey, NODE_SPACING, type GraphRef,
} from './graph';
export { setQuestionLabel } from './question-edits';
export { useT, useEditorEnv, activeGraphRef, activeQuestionnaire } from './hooks';
