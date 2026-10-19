# Existant — 7. EVO réalisées par zone

Partie de l'inventaire : index, état au commit et conventions dans `docs/EXISTANT.md`.


Les fiches EVO-001 à EVO-028 sont au statut « fait » ; EVO-029 est réalisée sur la branche `evo-029`. Une EVO peut apparaître dans plusieurs zones.

### 1. Coque, commandes et transverse

- **EVO-002** — Guide utilisateur : chaque commande du catalogue est balisée `[cmd: id]` dans `docs/GUIDE.md` ; index des
  raccourcis généré (`scripts/guide/`) ; « Ajouter une action » du README `app/commands` impose la balise.
- **EVO-004** — Export du logigramme en image : `image-commands.ts` (`view.exportImage` X, `view.exportImageRun`),
  `image-file.ts`, `ImageDialog.tsx`, `useImageExport.ts`, `image-state.ts`, `imageOptions` persistées, bouton « Image »
  de `QuestionnaireView`, `download` accepte un `Blob`.
- **EVO-008** — Fragments : onglets `f:<id>` (Tabs, App, persistance des onglets de fragments, `activeGraphRef`), commandes
  `library.newFragment`, `node.group`, `node.setEntry`, `node.newExit`, `node.openFragment`, migration 6 → 7.
- **EVO-009** — Copie en bibliothèque : `node.toLibrary`, `CopyDialog` de `ui/shell`.
- **EVO-010** — Copier-coller et duplication : `clipboard-commands.ts`, menu contextuel « Dupliquer » des onglets.
- **EVO-011** — Commentaires : `comment-commands.ts`, onglet/lien « Commentaires », bouton de la barre, `question_<clé>.layout.json`.
- **EVO-012** — `node.resetRequired`.
- **EVO-013** — `library.openRef` (lien rompu → notice).
- **EVO-014** — `preview.toggleChecks`. **EVO-019** — `preview.toggleOutline`.
- **EVO-015** — Validation d'un formulaire : `questionnaire.validate` / `unvalidate`, verrou `lockedChanges` dans `store.edit`,
  marqueurs « Validé » (onglet, bouton de réouverture, logigramme), migration 10 → 11.
- **EVO-018** — migration 12 → 13 (tri-state), jeu de libellés booléen seul (`labelSet.addBoolean`).
- **EVO-020** — Kit développeurs : hors code applicatif (script `scripts/kit-dev.mjs`) ; aucune trace dans la coque.
- **EVO-022** — Versionning : `core/model/versioning.ts`, `version-commands.ts`, `version-edits.ts`, `VersionAlert.tsx`,
  `ItemVersion.tsx`, version dans `QuestionnaireProperties`, `questionnaireFileName`, export `status`/`libraryVersions`,
  import d'un questionnaire provisoire, migration 13 → 14, exemple renommé (`declaration_sinistre - 1.0.5 - provisoire.json`, …).
- **EVO-023** — Version et statut dans l'image : `imageFileName(projet, titre, { version, status }, date)`, `imageHeading`,
  appel dans `useImageExport.ts:114-119`.
- **EVO-025** — Refactoring de la gestion des erreurs (sans changement visible) : modules `app/feedback` (`refuse`, `inform`,
  `fail`, `confirm`, `bindFeedback` branché par `store.ts:342`) et `app/issues` (`issuesOf`, `selectIssues`, `useIssues`) ;
  commandes, `refused()` du store, `useImageExport`, `HiddenFields` et sept vues migrés ; `single-path.test.ts` ; `docs/ERREURS.md`.
- **EVO-024** — Nœud de renvoi : commande `node.newRedirect` (Alt+R, questionnaire seulement), messages `node.newRedirect`,
  `group.redirect`, `paste.redirect`, `redirect.*`, `preview.backToRedirect` ; migration 14 → 15. Correction des écarts mineurs
  (commits `32bf773`, `50420d1`) : `targetMissing` (cible questionnaire en cours = introuvable), libellé « (non autorisée) » du panneau.
- **EVO-026** (fait) — Retrait de l'exemple de la barre de projet : commande `project.example`, libellé i18n
  `project.example`, icône étincelles de `TopBar` et `app/commands/example.ts` (exemple embarqué dans le build) supprimés ;
  l'exemple s'ouvre par `project.open` avec les fichiers de `examples/declaration-sinistre/` ; tests unitaires lisant
  l'exemple via `tests/reference/example.ts`, tests de fumée via `tests/smoke/support/example.ts`.
- **EVO-027** (fait) — Supprimer un questionnaire : commande `questionnaire.delete` (`delete-commands.ts`, `deletionQuestion`),
  `delete-questionnaire.ts` du store (`deletionImpact`, `removeQuestionnaire`, `closeDeleted`, `reopenDeleted`, `deletionPlace`),
  action `deleteQuestionnaire` et état `lastDeletion` (`undo` / `redo` redirigés juste après ; non refermé par un Annuler /
  Rétablir sans effet ou refusé), `placeReappeared` (`travel.ts`), « Supprimer » du menu contextuel
  des onglets, `confirm(question, ...lignes)` d'`app/feedback`, messages `questionnaire.confirmDelete` / `delete*`.
- (Format) **EVO-001, 003, 005, 006, 007, 016** : uniquement par leurs migrations dans `src/format/migrate.ts`.
- **EVO-029** (branche `evo-029`) — Export de l'inventaire RGPD en xlsx : `app/commands/inventory-commands.ts` (`questionnaire.exportInventory`), `inventory-file.ts` (nom, onglets « Données » et « À propos »), bouton `export-inventory` dans `QuestionnaireView`, textes `inventory.export` / `inventory.short` (`messages-settings.ts`), dépendance `write-excel-file` (`write-excel-file/browser`) ; données calculées par `core/model/inventory.ts` (`inventoryRows`, `traversalOrder`, `PERSONAL_TYPES`). Format JSON inchangé (version 15).

### 2. Édition : logigramme, propriétés, commentaires, bibliothèque

- **EVO-003 — Groupes d'options** : vérifications `duplicateGroup`, `reservedGroupCode` (`AUTRE`, `NSP`), `emptyGroup` (`groups-check.ts`) ; portée `cle.groupe` et parcours des libellés de groupes (`core/references`).
- **EVO-004 — Export image du logigramme** : `useImageExport.ts`, `ImageDialog.tsx`, attribut `data-edge-label` des pastilles.
- **EVO-005 — Libellés d'arêtes** : `caption` (pastille, troncature CSS, infobulle `edgeLabel.ts`, champ « Libellé » du panneau d'arête).
- **EVO-006 — « Ne sais pas »** : cmd `node.toggleDontKnow`, portée `cle.nsp`, parcours du libellé.
- **EVO-007 — Types contact** : portée `cle.pays`, libellés de civilité parcourus ; valeur par défaut texte brut pour `email`, `phone`, `address`, `civility`.
- **EVO-008 — Fragments** : onglet `FragmentView`, nœud fragment (poignées de sorties, « Ouvrir le fragment »), `FragmentCallProperties` (alias, sorties, clés attendues), entrée réglée, sorties nommées, extraction `groupIntoFragment`, insertion refusée sur cycle, vérifications `fragmentEntry`, `fragmentNoExit`, `endInFragment`, `implicitExitNotConnected`, `exitNotConnected`, `unknownExit`, `fragmentCycle`, `unusedFragment`, `expectedKeyMissing`.
- **EVO-009 — Copie en bibliothèque et champs masqués** : `copyToLibrary`, `CopyDialog`, `HiddenFields`, `setFieldHidden`, `hiddenFieldUsages`, badge « n / m champs », vérification `hiddenField`.
- **EVO-010 — Copier-coller et duplication** : `clipboard.ts`, `renameKeysIn`, `duplicate.ts`, menu contextuel `useDiagramMenu.tsx`, menus de la liste de bibliothèque et des onglets.
- **EVO-011 — Commentaires de révision** : `comment-edits.ts`, `comment-commands.ts`, `ui/comments`, nœuds `CommentNodeView` / `useCommentNodes`, page des commentaires, confirmation à la suppression.
- **EVO-012 — Surcharge du caractère obligatoire** : `RequiredOverride.tsx`, `required-edits.ts`, cmd `node.resetRequired`, badge « surch. ».
- **EVO-013 — Ouvrir l'objet lié depuis le badge** : `library-badge` (double-clic, `nopan`, infobulle), cmd `library.openRef` (message si lien rompu), défilement de la liste de la bibliothèque.
- **EVO-015 — Validation du formulaire** : `locked` dans le logigramme, `fieldset` désactivé du panneau, refus dans le store.
- **EVO-016 — Suggestions** : expression `suggestions` parcourue (vérifications, usages, renommage).
- **EVO-018 — Suppression du tri-state** : jeux de libellés booléens uniquement (`LabelSets.tsx`).
- **EVO-019 — Outline de prévisualisation** : mode `outline` de `Diagram`, `NodeView` (`data-outline`, nœud courant), badge « bib. » inerte.
- **EVO-021 — Astérisque après surcharge** : `isRequired` dans `core/validation/field.ts` (côté prévisualisation) ; dans le logigramme, le badge `*` lit la question effective (`instanceQuestion` applique la surcharge d'une référence).
- **EVO-022 — Versionning** : version et statut dans `QuestionnaireProperties`, `ItemVersion` (question et fragment), copies provisoires à la duplication.
- **EVO-023 — Version et statut dans l'export d'image** : titre `imageHeading` et nom de fichier (`useImageExport.ts`).
- **EVO-025 — Gestion des erreurs** : panneau des problèmes, `FragmentView`, `ComparePane` via `useIssues` ; confirmations de suppression et refus de la bibliothèque via `app/feedback` ; sans changement visible.
- **EVO-027 — Supprimer un questionnaire** : bouton « Supprimer » de `PropertiesPanel` hors du `fieldset` verrouillé ;
  vérifications `buttonTargetMissing` et `unusedFragment` inchangées, déclenchées par la suppression.
- **EVO-028** (fait) — Signaler les éléments de bibliothèque inutilisés : `core/model/usage.ts` (`unusedLibraryItems`, `unusedCount`),
  `ui/library/Unused.tsx` (`useUnused`, `UnusedMark`, `UnusedCount`, `UnusedTotal`), indicateurs dans `Library` et `LabelSets`,
  pastille sur l'onglet / le lien « Bibliothèque » (`ui/shell/Tabs.tsx`), textes `app/i18n/messages-unused.ts`. « Utilisée dans »,
  `unusedFragment` et le bandeau « aucun appelant » inchangés.
- **EVO-024 — Nœud de renvoi** : `graphId` transmis à la forme et aux propriétés (`NodeView`, `PropertiesPanel`) ; collage (Renvoi écarté dans un fragment, `retargetButtons`), duplication de questionnaire, refus d'extraction ; vérifications `redirect-check.ts` (sept codes) ; parcours du nœud dans `core/references/visit.ts`.

### 3. Types de questions et de nœuds

| EVO | Titre | Ce qui en est visible dans le code |
| --- | --- | --- |
| EVO-001 | Options dynamiques placées librement | Entrée `{from, label?, value?, when?}` dans `options` ; saisie `$référence` (quick-lines.ts:37) ; détail d'entrée dynamique (entry-detail.tsx:81-99) ; déploiement à la position (runtime/options.ts:53-62) ; commits `a55b3d5`, `7bcaf28`. |
| EVO-003 | Groupes d'options | `ChoiceGroup`, saisie `#` / puces / échappements, `GroupDetail` (code, condition), sections titrées, `<clé>_group`, `AUTRE` ; commits `09d2470`, `ccc5a95`. |
| EVO-005 | Libellés des arêtes et des variables système | Autocomplétion par libellé (completion.ts:28-47), survol `sys.…` (hover.ts) ; commits `f158826`, `a3d40c8`. |
| EVO-006 | Option « Ne sais pas » | `DontKnowEditor`, `dontKnowLabel`, `FieldProps.dontKnow/onDontKnow`, rendu dans chaque plugin, retrait sur structure ; commit `ac77bde`. |
| EVO-007 | Types mail, téléphone, adresse, civilité | Quatre plugins, module `core/contact`, `FieldProps.country`, raccourcis Shift+E/T/A/C ; commits `4cdcbac`, `baf30f2` (champ mail en texte), `e78926e`. |
| EVO-008 | Fragments de questionnaire | Plugins `fragment` (appel, alias, dépliage) et `exit` ; commit `a627f78`. |
| EVO-014 | Contrôles désactivables en prévisualisation | `RenderEnv.checks` ; messages de sortie de champ masqués dans mail, téléphone, adresse ; commit `ab5d8a5`. |
| EVO-015 | Formulaire validé (lecture seule) | `ExpressionEnv.readOnly` (context.tsx:10, ExpressionInput.tsx:69) ; commit `9991c3e`. |
| EVO-016 | Suggestions sur un champ texte | `suggestions`, `SuggestBox`, `suggestionList`, `referencedChoices` ; commits `cfac7f0`, `d635ca2`, `dc605f8`. |
| EVO-017 | « Autre » séparée des groupes | `separatedOther` (selection.ts:56-60), conteneur `choice-other-apart` ; commit `7f45678`. |
| EVO-018 | Suppression du tri-state | Plus de plugin ni de type `tristate` (registre, `QUESTION_TYPES`) ; jeux de libellés `kind: 'boolean'` seulement ; conversion dans `format/migrate.ts:93-110` ; commit `6c337ec`. |
| EVO-024 | Nœud de renvoi | Plugin `plugins/node-kinds/redirect` (forme, aperçu des boutons, propriétés), `core/model/redirect.ts` et types `RedirectNode` / `RedirectButton` / `RedirectTarget`, `ShapeProps.graphId` / `NodePropertiesProps.graphId`, registre ; commit `7dc3882`. |
| EVO-025 | Refactoring de la gestion des erreurs | `useBlurErrors`, `blurMessages`, `shownBlurErrors` (plugin-api/blur-errors.ts) et `FieldErrors` (ui-kit) utilisés par mail, téléphone, adresse ; sans changement visible ; commit `a28d093`. |

### 4. Parcours : prévisualisation, moteur, validation, état du système, expressions

- **EVO-001** — Options dynamiques placées librement : déploiement à leur position dans `choiceOptions` (`options.ts:43-73`) ; garde de fin `guardEnd` / `firstInvalidStep` (`path-check.ts`, commit `88ab4ff`).
- **EVO-003** — Groupes d'options : `groupId`, couple (groupe, valeur) dans `choiceOptions` et `validateAnswer`, `groupPath`, réécriture `.groupe` (`group-ref.ts`), affichage « Groupe — Option » dans la synthèse.
- **EVO-005** — Libellés d'arêtes et de variables : `caption` des variables et des champs de liste (`VariableCard.tsx:21-26, 50-52, 109-110`), libellé affiché dans `SystemValuesEditor` (`ValueInput.tsx:103`) ; l'arête n'intervient pas dans `chooseEdge`.
- **EVO-006** — « Ne sais pas » : `dontKnowAnswer`, `dontKnowPath`, `SummaryEntry.dontKnow`, case dans le wizard (`Preview.tsx:125-130`), aucune erreur dans `validateAnswer` (`field.ts:46`), réécriture `.nsp`.
- **EVO-007** — Mail, téléphone, adresse, civilité : `countryPath`, `contactErrors` et `formatErrors`, messages par défaut, réécriture `.pays`, `env.display` dans l'interpolation.
- **EVO-008** — Fragments : identifiants d'étape imbriqués, `enter` / `leave`, contexte par alias, `edgeTrace` avec les arêtes de l'appelant, bandeau du débogage.
- **EVO-009** — Champs masqués : `effectiveQuestion` → `instanceQuestion` (`steps.ts:38-46`).
- **EVO-012** — Surcharge du caractère obligatoire : `withQuestion` → `resolveRequired` (`steps.ts:66-74`).
- **EVO-014** — Contrôles de saisie activables : bascule, bandeau, `unchecked`, `env.checks` (`Preview.tsx:48, 53-55, 106-156`).
- **EVO-016** — Suggestions d'un champ texte : `suggestions.ts` (`suggestionList`, `referencedChoices`, `filterSuggestions`).
- **EVO-018** — Suppression du tri-state : visible seulement dans la migration et le modèle, hors de cette zone ; aucune trace spécifique dans le moteur.
- **EVO-019** — Outline : `outline.ts`, `Outline.tsx`, `visited`, mode `outline` de `Diagram`.
- **EVO-021** — Astérisque : `isRequired` partagé, `requiredAt` (`field.ts:25-27`, `path-check.ts:25-30`, `Preview.tsx:169`, commit `32dc34a`).
- **EVO-025** — Gestion des erreurs : `Outline` et compteur de traductions de `Preview` via `useIssues`, `TranslationsSection` et `SystemState` aussi ; sans changement visible.
- **EVO-024** — Nœud de renvoi : page `Redirect.tsx` (boutons visibles, messages, retour par `goTo` + `returnTo`), bouton « Terminer » (`preview-finish`), « Revenir au renvoi » ; validations `redirect-check.ts` ; aucun changement du moteur (`core/runtime`).
- **EVO-015** — Validation d'un formulaire : rien dans cette zone. La prévisualisation n'a aucun verrou : son état est dans `store.preview`, hors du projet, et `preview.saveScenario` modifie la portée `project`.
