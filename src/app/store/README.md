# app/store

État applicatif (Zustand + immer) : projet (`ws`), onglets, sous-vue par questionnaire, sélection,
demande de focus, palette, langues, raccourcis personnalisés, historique, états de prévisualisation.
Dépend de `core`, `format`, `app/i18n`, `plugin-api` (utilitaires).

## API
- `useStore` ; actions : `edit(scope, recipe, key?)` (sans effet : aucun point ; si la modification touche d'autres portées — renommage propagé,
  regroupement — elle devient une transaction sur toutes les portées modifiées, `changedScopes`), `transact(scopes, recipe)` (points liés dans chaque portée modifiée :
  annuler / rétablir dans l'une le fait dans toutes celles où ce point est en tête), `undo(scope)` / `redo(scope)` (onglets synchronisés :
  questionnaire disparu → onglet fermé, réapparu → rouvert ; onglet `f:<id>` d'un fragment disparu fermé, sélection et `libraryItem` d'un fragment disparu vidées), `checkpoint(scope)`,
  `silent(recipe)` (sans historique), `set(recipe)` (état d'interface), `loadWorkspace`, `openTab`, `closeTab`,
  `select`, `requestFocus('label' | 'condition' | 'variable', id)`, `markExported`.
- Annuler / rétablir et transactions (`travel.ts` : `travel`, `changedScopes`, synchronisation des onglets).
- Portées d'historique (`history.ts`) : `q:<id>` (questionnaire, sa mise en page et son entrée dans le projet), `library`, `project` ;
  `scopeOf(graphRef)`. Les frappes successives d'un même champ (même `key`, < 1,5 s) forment une seule étape.
  L'annulation remet chaque mise en page à sa place (ordre conservé, disparues retirées, nouvelles en fin) : le bundle est identique après annulation.
- Édition pure du graphe (`graph.ts`, sur brouillon immer) : `insertNode`, `connect` (une arête conditionnée
  passe avant le « sinon »), `removeNodes`, `removeEdge`, `moveEdge`, `updateNode` (retire les `undefined`),
  `duplicateNodes`, `getGraph`, `layoutOf`, `usedKeys`, `freshKey`.
- Questionnaire (`questionnaire-edits.ts`) : `renameQuestionnaire` (clé + fichier `<clé>.json` du projet),
  `canRenameQuestionnaire`, `questionnaireKeys`, `patchQuestionnaire` (titre, description).
- Bibliothèque (`library-edits.ts`) : `addLibraryQuestion`, `addFragment`, `deleteLibraryItem`, `referenceNode(ws, ref, item, id)` (nœud
  référence ; alias libre pour un fragment ; refusé si `insertionCycle` : fragment dans lui-même ou cycle d'appels), `placeNode`, `moveToLibrary` / `canMoveToLibrary` (question
  locale → bibliothèque, même clé ; refus si la clé y est déjà prise), `setLibraryQuestionLabel`, `renameExit` (suit dans les arêtes des instances), type `LibraryItem`.
- `groupIntoFragment(ws, ref, ids, title)` (`group.ts`) : extrait une sélection en fragment (`canExtract` : ni fin ni sortie) ; `entry` réglée si
  l'entrée n'est pas l'unique nœud sans arête entrante ; entrée unique = départ ou cible
  des arêtes entrantes (`groupEntries` ; plusieurs entrées → refus) ; une sortie par cible extérieure ; références de l'hôte préfixées par l'alias (`qualifyKeys`).
- État du système (`system-edits.ts`) : `addVariable`, `deleteVariable` (aussi dans les scénarios), `renameVariable`, `renameListField`
  (`renameKey` cible `system` ; nom invalide ou pris → inchangé), `setVariableType`, `addScenario` (nom rendu unique), `deleteScenario`,
  `valueError` (écart d'une valeur au type déclaré), `exampleSystemState`, `scenarioOf`, `systemStateOf` (état d'une prévisualisation).
- État d'interface : `previewPanels` (panneaux état du système / débogage), `libraryItem` (élément affiché dans l'onglet Bibliothèque), `libraryPanel` (panneau latéral),
  palette en mode `commands` | `connect` | `library`. `activeGraphRef` : questionnaire actif, ou fragment de l'onglet `f:<id>`
  (EVO-008 ; historique `library`). Un fragment n'a pas de `start` : `insertNode` ne le pose que sur un questionnaire, `removeNodes` retire `entry` si son nœud disparaît.
- Langues des contenus (`language-edits.ts`) : `isLanguageCode`, `addLanguage`, `removeLanguage` (jamais la langue par défaut ;
  les textes saisis restent), `setDefaultLanguage`.
- Affichage : `layoutRequest` (compteur : mise en page automatique demandée au logigramme affiché), `compare` (vue côte à côte :
  questionnaire affiché en lecture seule à droite), onglet `settings`.
- Image du logigramme (EVO-004, `image-state.ts`, état initial `initialImageState`) : `imageOptions` (`ImageOptions` : `scope` `all` | `selection`, `title` ; sauvegardées avec la session),
  `imageDialog` (dialogue d'options ouvert), `imageRequest` (compteur : export demandé à `ui/diagram`), `imageBusy` (export en cours).
- `setQuestionLabel` : change l'intitulé et, si la clé était dérivée de l'ancien, la redérive et propage.
- Hooks : `useT()`, `useEditorEnv()` (environnement de l'éditeur sans `questionType`, ajouté par `ui/*` via `usePluginEnv`), `activeGraphRef`, `activeQuestionnaire`.

## Pièges
- Les sélecteurs `useStore(s => …)` doivent renvoyer une valeur stable (pas d'objet neuf) : sinon boucle de rendu.
- Les fonctions de `core` reçoivent parfois un brouillon immer : elles clonent en JSON, jamais avec `structuredClone`.

## Tests
`store.test.ts` (historique par questionnaire, regroupement, renommage d'un questionnaire) ;
`system.test.ts` (dictionnaire, scénarios, contrôle des valeurs) ; `language.test.ts` (langues des contenus) ;
`library.test.ts` (éléments de bibliothèque, références, cycle d'appels refusé, extraction en fragment : structure, requalification, parcours inchangé, imbrication).
