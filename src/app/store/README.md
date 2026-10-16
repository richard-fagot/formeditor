# app/store

État applicatif (Zustand + immer) : projet (`ws`), onglets, sous-vue par questionnaire, sélection,
demande de focus, palette, langues, raccourcis personnalisés, historique, états de prévisualisation.
Dépend de `core`, `format`, `app/i18n`, `app/feedback`, `plugin-api` (utilitaires).

## API
- `useStore` ; actions : `edit(scope, recipe, key?)` (sans effet : aucun point ; si la modification touche d'autres portées — renommage propagé,
  regroupement — elle devient une transaction sur toutes les portées modifiées, `changedScopes`), `transact(scopes, recipe)` (points liés dans chaque portée modifiée :
  annuler / rétablir dans l'une le fait dans toutes celles où ce point est en tête), `undo(scope)` / `redo(scope)` (onglets synchronisés :
  questionnaire disparu → onglet fermé, réapparu → rouvert ; onglet `f:<id>` d'un fragment disparu fermé, sélection et `libraryItem` d'un fragment disparu vidées), `checkpoint(scope)`,
  `silent(recipe)` (sans historique), `set(recipe)` (état d'interface), `loadWorkspace`, `openTab`, `closeTab`,
  `deleteQuestionnaire(id)` (EVO-027, `delete-questionnaire.ts` : point lié `project` + `q:<id>` hors verrou de validation ; onglet précédent actif,
  Bibliothèque sans onglet ni questionnaire, vue côte à côte fermée ; `lastDeletion` : juste après — aucune autre modification, annulation ni
  rétablissement — `undo` / `redo` de toute portée annulent / refont la suppression, questionnaire, mise en page et onglet remis à leur rang),
  `select`, `requestFocus('label' | 'condition' | 'variable', id)`, `markExported`.
- Annuler / rétablir et transactions (`travel.ts` : `travel`, `changedScopes`, synchronisation des onglets).
- Portées d'historique (`history.ts`) : `q:<id>` (questionnaire, sa mise en page et son entrée dans le projet), `library`, `project` ;
  `scopeOf(graphRef)`. Les frappes successives d'un même champ (même `key`, < 1,5 s) forment une seule étape.
  L'annulation remet chaque mise en page à sa place (ordre conservé, disparues retirées, nouvelles en fin) : le bundle est identique après annulation.
- Édition pure du graphe (`graph.ts`, sur brouillon immer) : `insertNode`, `connect` (une arête conditionnée
  passe avant le « sinon »), `removeNodes`, `removeEdge`, `moveEdge`, `updateNode` (retire les `undefined`),
  `getGraph`, `layoutOf`, `usedKeys`, `freshKey`.
- Questionnaire (`questionnaire-edits.ts`) : `renameQuestionnaire` (clé + fichier `<clé>.json` du projet en mémoire ; à l’export en fichiers, le nom vient de `questionnaireFileName`),
  `canRenameQuestionnaire`, `questionnaireKeys`, `patchQuestionnaire` (titre, description, `version` EVO-022), `setValidation(ws, id, date?)` (EVO-015 : avec date, valide
  et relève `libraryVersions` (EVO-022, `versionSnapshot`) ; sans, retire `status`, `validatedAt` et `libraryVersions`).
- Versions des éléments de bibliothèque (EVO-022, `version-edits.ts`) : `setItemVersion(ws, item, version)` (refusé, `false`, sur un élément
  validé ; vide = retirée), `setItemValidation(ws, item, validé)`.
- Verrou des formulaires validés (EVO-015, `refused` dans `store.ts`) : après `edit`, `transact`, `silent`, `undo`, `redo`, si `lockedChanges` (core/model)
  signale un questionnaire validé modifié ou supprimé, l'état d'avant est remis (projet, historique, onglets, sélection) et `notice` l'explique (`refuse` d'`app/feedback`, branché par `bindFeedback` dans `store.ts`)
  (sauf `silent`). La duplication d'un questionnaire ne reprend pas son état de validation.
- Bibliothèque (`library-edits.ts`) : `addLibraryQuestion`, `addFragment`, `deleteLibraryItem`, `referenceNode(ws, ref, item, id)` (nœud
  référence ; alias libre pour un fragment ; refusé si `insertionCycle` : fragment dans lui-même ou cycle d'appels), `placeNode`, `moveToLibrary` / `canMoveToLibrary` (question
  locale → bibliothèque, même clé ; refus si la clé y est déjà prise), `copyToLibrary(ws, ref, nodeId, key?)` (EVO-009 : nouveau `Workspace` ; avec `key`,
  renommage propagé avant la copie et `rewritten` = expressions réécrites), `setFieldHidden` (masque / réaffiche un champ d'une instance de structure ;
  refus du dernier champ affiché ; liste vide → propriété retirée), `hiddenFieldUsages` (expressions du graphe qui lisent le champ ; dans un fragment, aussi `alias.cle.champ` chez ses appelants, imbriqués compris), `hiddenUsageCaller` (appelant d'où vient une de ces expressions : titre dans la langue du contenu, sinon clé), `setLibraryQuestionLabel`, `renameExit` (suit dans les arêtes des instances), type `LibraryItem`.
- Copier-coller (EVO-010, `clipboard.ts`) : `copyNodes(ws, ref, ids)` → `Clip` (instantané : nœuds, arêtes internes, positions, départ, id du projet) ;
  `pasteNodes(ws, ref, clip, at?)` : nouveaux ids, clés et alias pris suffixés hors des clés de la cible et de la sélection, références de la sélection réécrites
  (`renameKeysIn`), placés au point `at` (coin haut gauche) ou décalés de `PASTE_OFFSET` ; écartés (`PasteDrop`) : fin ou nœud Renvoi (EVO-024) dans un fragment, sortie dans un questionnaire,
  instance créant un cycle ; boutons de renvoi repointés vers la copie de leur cible nœud (`retargetButtons`, EVO-024) ; départ = rôle non collé (un questionnaire vide prend le départ collé ou le premier nœud). État `clipboard`.
  `duplicateNodes(ws, ref, ids)` (Ctrl+D) = `copyNodes` puis `pasteNodes` dans le même graphe.
- Suppression d'un questionnaire (EVO-027, `delete-questionnaire.ts`) : `deletionImpact(ws, id)` (validé, commentaires, boutons de renvoi d'autres questionnaires), `removeQuestionnaire`, `closeDeleted`, `reopenDeleted`, `deletionPlace`.
- Duplication (EVO-010, `duplicate.ts`) : `duplicateQuestionnaire(ws, id, copyName)` (juste après, clé et fichier uniques), `duplicateLibraryItem(ws, item, copyName)`
  (question ou fragment, juste après, clé unique) ; « Copie de » par langue (`CopyName`), nœuds et arêtes réidentifiés (cibles nœud des boutons de renvoi repointées, EVO-024), mise en page reprise, références conservées ; copie provisoire (sans `status` ni `libraryVersions`, EVO-022), version gardée.
- Commentaires de révision (EVO-011, `comment-edits.ts`) : rangés dans `layout.comments` de l'objet (`CommentHost` : questionnaire, fragment,
  question de bibliothèque ; `CommentRef` = objet + nœud ; `commentKey`, `hostScope`) : `commentOf`, `commentsOf`, `allComments` (questionnaires, fragments,
  questions), `addComment` (un par question, à droite de la question ; sans position pour une question de bibliothèque), `setCommentText`, `moveComment`,
  `addReply`, `setReply`, `deleteReply`, `deleteComment`, `removeComments` (mise en page d'une question vidée retirée), `moveCommentsTo` (extraction en fragment).
  `removeNodes` retire les commentaires des nœuds supprimés, `deleteLibraryItem` la mise en page de l'élément, la duplication n'en reprend pas.
  Historique `library` : mises en page des fragments **et** des questions de bibliothèque. État de session : `shownComments` (clés affichées, vidé au
  chargement), `centerRequest` (centrage demandé au logigramme), `focusRequest` de genre `comment` (`commentKey`, `#i` pour la réponse i), onglet `comments`.
- Caractère obligatoire (EVO-012, `required-edits.ts`) : `setRequiredOverride(ws, ref, nodeId, value, path?)` (sans `path` : référence de bibliothèque ;
  avec `path` : appel de fragment ; `undefined` = hérité, carte vide retirée), `resetRequired` (retire la surcharge ou toutes celles de l'appel), `hasRequiredOverride`.
- `groupIntoFragment(ws, ref, ids, title)` (`group.ts`) : extrait une sélection en fragment (`canExtract` : ni fin, ni sortie, ni nœud Renvoi) ; `entry` réglée si
  l'entrée n'est pas l'unique nœud sans arête entrante ; entrée unique = départ ou cible
  des arêtes entrantes (`groupEntries` ; plusieurs entrées → refus) ; une sortie par cible extérieure ; références de l'hôte préfixées par l'alias (`qualifyKeys`).
- État du système (`system-edits.ts`) : `addVariable`, `deleteVariable` (aussi dans les scénarios), `renameVariable`, `renameListField`
  (`renameKey` cible `system` ; nom invalide ou pris → inchangé), `setVariableType`, `addScenario` (nom rendu unique), `deleteScenario`,
  `valueError` (écart d'une valeur au type déclaré), `exampleSystemState`, `scenarioOf`, `systemStateOf` (état d'une prévisualisation).
- État d'interface : `copyRequest` (copie en bibliothèque en attente d'une autre clé, EVO-009), `previewPanels` (panneaux état du système / débogage / outline EVO-019, hors `initialState` : gardés par `loadWorkspace`, non sauvegardés ; `PreviewState.visited` : pages affichées depuis le début du parcours, que « Précédent » ne retire pas), `previewChecks` (contrôles de saisie de la prévisualisation, EVO-014 : hors `initialState`, gardé par `loadWorkspace`, non sauvegardé ; `PreviewState.unchecked` : pages quittées contrôles désactivés), `libraryItem` (élément affiché dans l'onglet Bibliothèque), `libraryPanel` (panneau latéral),
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
`store.test.ts` (historique par questionnaire, regroupement, renommage d'un questionnaire) ; verrou (EVO-015) : `app/commands/validation-commands.test.ts` ;
`system.test.ts` (dictionnaire, scénarios, contrôle des valeurs) ; `language.test.ts` (langues des contenus) ;
copier-coller et duplication : `app/commands/clipboard-commands.test.ts` ;
`library.test.ts` (éléments de bibliothèque, copie en bibliothèque et champs masqués (EVO-009), références, cycle d'appels refusé, extraction en fragment : structure, requalification, parcours inchangé, imbrication).
