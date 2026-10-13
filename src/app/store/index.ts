// API publique du module app/store : état applicatif, édition, annuler/rétablir par questionnaire.
export { useStore, scopeOf, blankWorkspace, type Store, type AppState, type TabId, type Selection, type PreviewState, type PaletteMode, type ImageOptions, type FocusKind } from './store';
export type { Scope } from './history';
export {
  getGraph, layoutOf, insertNode, connect, removeNodes, removeEdge, moveEdge, updateNode,
  usedKeys, freshKey, NODE_SPACING, type GraphRef,
} from './graph';
export { setQuestionLabel } from './question-edits';
export {
  commentKey, hostScope, commentOf, commentsOf, allComments, addComment, setCommentText, moveComment, setReply, deleteReply, addReply,
  deleteComment, removeComments, type CommentHost, type CommentRef,
} from './comment-edits';
export {
  addLibraryQuestion, addFragment, deleteLibraryItem, referenceNode, insertionCycle, placeNode, moveToLibrary, canMoveToLibrary, setLibraryQuestionLabel, renameExit,
  copyToLibrary, setFieldHidden, hiddenFieldUsages, type RewrittenExpression,
  type LibraryItem,
} from './library-edits';
export { setRequiredOverride, resetRequired, hasRequiredOverride } from './required-edits';
export { copyNodes, pasteNodes, duplicateNodes, PASTE_OFFSET, type Clip, type PasteDrop } from './clipboard';
export { duplicateQuestionnaire, duplicateLibraryItem, type CopyName } from './duplicate';
export { groupIntoFragment, groupEntries, canExtract } from './group';
export { questionnaireKeys, canRenameQuestionnaire, renameQuestionnaire, patchQuestionnaire } from './questionnaire-edits';
export {
  addVariable, deleteVariable, renameVariable, renameListField, setVariableType, addScenario, deleteScenario, valueError,
  exampleSystemState, scenarioOf, systemStateOf,
} from './system-edits';
export { useT, useEditorEnv, activeGraphRef, activeQuestionnaire } from './hooks';
export { isLanguageCode, addLanguage, removeLanguage, setDefaultLanguage } from './language-edits';
