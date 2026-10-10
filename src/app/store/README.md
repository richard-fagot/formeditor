# app/store

État applicatif (Zustand + immer) : projet (`ws`), onglets, sous-vue par questionnaire, sélection,
demande de focus, palette, langues, raccourcis personnalisés, historique, états de prévisualisation.
Dépend de `core`, `format`, `app/i18n`, `plugin-api` (utilitaires), `registry` (`useEditorEnv`).

## API
- `useStore` ; actions : `edit(scope, recipe, key?)`, `undo(scope)`, `redo(scope)`, `checkpoint(scope)`,
  `silent(recipe)` (sans historique), `set(recipe)` (état d'interface), `loadWorkspace`, `openTab`, `closeTab`,
  `select`, `requestFocus('label' | 'condition', id)`, `markExported`.
- Portées d'historique (`history.ts`) : `q:<id>` (questionnaire, sa mise en page et son entrée dans le projet), `library`, `project` ;
  `scopeOf(graphRef)`. Les frappes successives d'un même champ (même `key`, < 1,5 s) forment une seule étape.
- Édition pure du graphe (`graph.ts`, sur brouillon immer) : `insertNode`, `connect` (une arête conditionnée
  passe avant le « sinon »), `removeNodes`, `removeEdge`, `moveEdge`, `updateNode` (retire les `undefined`),
  `duplicateNodes`, `getGraph`, `layoutOf`, `usedKeys`, `freshKey`.
- Questionnaire (`questionnaire-edits.ts`) : `renameQuestionnaire` (clé + fichier `<clé>.json` du projet),
  `canRenameQuestionnaire`, `questionnaireKeys`, `patchQuestionnaire` (titre, description).
- `setQuestionLabel` : change l'intitulé et, si la clé était dérivée de l'ancien, la redérive et propage.
- Hooks : `useT()`, `useEditorEnv()` (environnement des plugins, avec `questionType` du registre), `activeGraphRef`, `activeQuestionnaire`.

## Pièges
- Les sélecteurs `useStore(s => …)` doivent renvoyer une valeur stable (pas d'objet neuf) : sinon boucle de rendu.
- Les fonctions de `core` reçoivent parfois un brouillon immer : elles clonent en JSON, jamais avec `structuredClone`.

## Tests
`store.test.ts` (historique par questionnaire, regroupement, renommage d'un questionnaire).
