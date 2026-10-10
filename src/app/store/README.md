# app/store

État applicatif (Zustand + immer) : projet (`ws`), onglets, sous-vue par questionnaire, sélection,
demande de focus, palette, langues, raccourcis personnalisés, historique, états de prévisualisation.
Dépend de `core`, `format`, `app/i18n`, `plugin-api` (utilitaires).

## API
- `useStore` ; actions : `edit(scope, recipe, key?)`, `transact(scopes, recipe)` (points liés dans chaque portée modifiée :
  annuler / rétablir dans l'une le fait dans toutes celles où ce point est en tête), `undo(scope)`, `redo(scope)`, `checkpoint(scope)`,
  `silent(recipe)` (sans historique), `set(recipe)` (état d'interface), `loadWorkspace`, `openTab`, `closeTab`,
  `select`, `requestFocus('label' | 'condition' | 'variable', id)`, `markExported`.
- Portées d'historique (`history.ts`) : `q:<id>` (questionnaire, sa mise en page et son entrée dans le projet), `library`, `project` ;
  `scopeOf(graphRef)`. Les frappes successives d'un même champ (même `key`, < 1,5 s) forment une seule étape.
- Édition pure du graphe (`graph.ts`, sur brouillon immer) : `insertNode`, `connect` (une arête conditionnée
  passe avant le « sinon »), `removeNodes`, `removeEdge`, `moveEdge`, `updateNode` (retire les `undefined`),
  `duplicateNodes`, `getGraph`, `layoutOf`, `usedKeys`, `freshKey`.
- Questionnaire (`questionnaire-edits.ts`) : `renameQuestionnaire` (clé + fichier `<clé>.json` du projet),
  `canRenameQuestionnaire`, `questionnaireKeys`, `patchQuestionnaire` (titre, description).
- Bibliothèque (`library-edits.ts`) : `addLibraryQuestion`, `addBlock`, `deleteLibraryItem`, `referenceNode` (nœud
  référence ; alias libre pour un bloc ; pas de bloc dans un bloc), `placeNode`, `moveToLibrary` / `canMoveToLibrary` (question
  locale → bibliothèque, même clé ; refus si la clé y est déjà prise), `setLibraryQuestionLabel`, `renameExit` (suit dans les arêtes des instances), type `LibraryItem`.
- `groupIntoBlock(ws, ref, ids, title)` (`group.ts`) : regroupe une sélection en bloc ; entrée unique = départ ou cible
  des arêtes entrantes (`groupEntries` ; plusieurs entrées → refus) ; une sortie par cible extérieure ; références de l'hôte préfixées par l'alias (`qualifyKeys`).
- État du système (`system-edits.ts`) : `addVariable`, `deleteVariable` (aussi dans les scénarios), `renameVariable`, `renameListField`
  (`renameKey` cible `system` ; nom invalide ou pris → inchangé), `setVariableType`, `addScenario` (nom rendu unique), `deleteScenario`,
  `valueError` (écart d'une valeur au type déclaré), `exampleSystemState`, `scenarioOf`, `systemStateOf` (état d'une prévisualisation).
- État d'interface : `previewPanels` (panneaux état du système / débogage), `libraryItem` (élément affiché dans l'onglet Bibliothèque), `libraryPanel` (panneau latéral),
  palette en mode `commands` | `connect` | `library`. `activeGraphRef` : questionnaire actif, ou bloc affiché dans la bibliothèque.
- `setQuestionLabel` : change l'intitulé et, si la clé était dérivée de l'ancien, la redérive et propage.
- Hooks : `useT()`, `useEditorEnv()` (environnement de l'éditeur sans `questionType`, ajouté par `ui/*` via `usePluginEnv`), `activeGraphRef`, `activeQuestionnaire`.

## Pièges
- Les sélecteurs `useStore(s => …)` doivent renvoyer une valeur stable (pas d'objet neuf) : sinon boucle de rendu.
- Les fonctions de `core` reçoivent parfois un brouillon immer : elles clonent en JSON, jamais avec `structuredClone`.

## Tests
`store.test.ts` (historique par questionnaire, regroupement, renommage d'un questionnaire) ;
`system.test.ts` (dictionnaire, scénarios, contrôle des valeurs) ;
`library.test.ts` (éléments de bibliothèque, références, regroupement en bloc : structure, requalification, parcours inchangé).
