// API publique du module app/store : état applicatif, édition, annuler/rétablir par questionnaire.
export { useStore, scopeOf, blankWorkspace, type Store, type AppState, type TabId, type Selection, type PreviewState, type PaletteMode, type ImageOptions } from './store';
export type { Scope } from './history';
export {
  getGraph, layoutOf, insertNode, connect, removeNodes, removeEdge, moveEdge, updateNode, duplicateNodes,
  usedKeys, freshKey, NODE_SPACING, type GraphRef,
} from './graph';
export { setQuestionLabel } from './question-edits';
export {
  addLibraryQuestion, addFragment, deleteLibraryItem, referenceNode, insertionCycle, placeNode, moveToLibrary, canMoveToLibrary, setLibraryQuestionLabel, renameExit,
  type LibraryItem,
} from './library-edits';
export { groupIntoFragment, groupEntries, canExtract } from './group';
export { questionnaireKeys, canRenameQuestionnaire, renameQuestionnaire, patchQuestionnaire } from './questionnaire-edits';
export {
  addVariable, deleteVariable, renameVariable, renameListField, setVariableType, addScenario, deleteScenario, valueError,
  exampleSystemState, scenarioOf, systemStateOf,
} from './system-edits';
export { useT, useEditorEnv, activeGraphRef, activeQuestionnaire } from './hooks';
export { isLanguageCode, addLanguage, removeLanguage, setDefaultLanguage } from './language-edits';
