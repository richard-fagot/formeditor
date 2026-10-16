# Existant — 8. Écarts code ↔ fiches EVO

Partie de l'inventaire : index, état au commit et conventions dans `docs/EXISTANT.md`.


« Respecté différemment » désigne un critère dont la lettre n'est pas suivie, le plus souvent conformément à l'analyse de la fiche. Les écarts déjà suivis dans `docs/ECARTS.md` sont rappelés quand ils concernent le code.

### 1. Coque, commandes et transverse

Fiches lues : EVO-002, EVO-004, EVO-015 (commandes et coque), EVO-022, EVO-023, EVO-024, EVO-025, EVO-026, EVO-027.

- **EVO-022, « Le JSON contient `version` et `statut` (`final` | `provisoire`) »** : respecté différemment — le fichier porte
  `status` avec les valeurs `draft` / `validated` (pas de champ `statut`, pas de valeurs `final`/`provisoire`) ; seuls les
  noms de fichiers emploient `final`/`provisoire`. Choix documenté dans l'Analyse §3 de la fiche. Preuve :
  `src/format/files.ts:48`, `src/format/files.ts:27`.
- **EVO-022, « Quand je modifie la version d'un élément de bibliothèque, alors la liste des questionnaires qui l'utilisent
  est affichée »** : respecté différemment — la liste est affichée en permanence sous le champ, pas en réaction à la
  modification. Preuve : `src/ui/library/ItemVersion.tsx:33-35`.
- **EVO-022, « champ grisé avec infobulle » (questionnaire)** : l'infobulle est portée par le conteneur du champ et le
  grisage par le `fieldset` désactivé de tout le panneau (pas par le champ lui-même) ; comportement observable conforme.
  Preuve : `src/ui/properties/QuestionnaireProperties.tsx:20-24`, `src/ui/properties/PropertiesPanel.tsx:35`.
- **EVO-004, « la fenêtre d'options s'ouvre avec mes derniers choix »** : le périmètre « sélection » mémorisé est ramené à
  « entier » s'il n'y a pas de sélection (choix de l'Analyse). Preuve : `src/ui/diagram/ImageDialog.tsx:16-19`.
- **EVO-004, « Formats : SVG si … »** : PNG seul, conformément à la conclusion de l'Analyse. Aucun écart.
- **EVO-023** : critères respectés dans le code (`image-file.ts:30-38`, `useImageExport.ts:114-119`) ; le test de fumée ne
  vérifie que la présence d'un titre (déjà noté dans `docs/ECARTS.md`, 2026-10-14).
- **EVO-002, anomalies relevées** (non des critères) toujours présentes dans le code : n° 1 (pas de suppression de
  questionnaire), 5 (500 étapes, pas de persistance), 6 (Ctrl+Tab), 7 (libellés partagés), 11 (Ctrl+Z selon l'onglet),
  12 (premier raccourci seul dans la palette), 14 (actions sans raccourci), 15 (libellés dynamiques). N° 3 (copier-coller)
  résolue par EVO-010 ; n° 1 résolue par EVO-027 (`delete-commands.ts:23-34`).
- **EVO-025, « Plus aucune écriture `s.notice =` hors de `app/feedback` (la fermeture de la boîte dans `ui/shell` exceptée) »** :
  respecté différemment — une seconde remise à zéro reste dans `app/store` au chargement d'un projet (`store.ts:304`), admise
  par le contrôle automatique (`single-path.test.ts:26-27`, décision notée dans DECISIONS.md). Autres critères vérifiés :
  tests de caractérisation commités seuls (`036411a`) avant tout changement de `src/`, valeurs attendues inchangées ensuite
  (seuls les appels internes remplacés) ; `window.confirm` et `checkWorkspace(` n'apparaissent hors tests que dans
  `feedback.ts:60` et `issues.ts:22` ; tests par fonction (`feedback.test.ts`, `issues.test.ts`, `blur-errors.test.ts`) ;
  tests de fumée (`tests/`) non modifiés.
- **EVO-024** : aucun écart constaté dans la zone (commande `node.newRedirect` Alt+R, indisponible dans un fragment,
  `graph-commands.ts:101` ; refus d'extraction `library-item-commands.ts:138-142`).
- **EVO-027**, autres exigences : aucun écart constaté (menu `Tabs.tsx:80-83`, palette et confirmation `delete-commands.ts:9-34`,
  bouton `PropertiesPanel.tsx:41-46`, retrait `delete-questionnaire.ts:29-33`, annulation `store.ts:225-264`).
- **EVO-026** : aucun écart constaté (barre `TopBar.tsx:29-32` ; aucune commande `project.example` dans
  `project-commands.ts:32-36` ni libellé dans `messages.ts` ; EVO-026-005 couvert par le comportement existant de
  `persistence/index.ts:34` et `bind.ts:48`, sans code ajouté ; EVO-026-006 par l'import ordinaire).
- **EVO-015** : aucun écart constaté dans la zone (boutons selon l'état `QuestionnaireView.tsx:69-81`, confirmation
  `edit-commands.ts:97-99`, marqueurs `Tabs.tsx:29-34`, `QuestionnaireView.tsx:96-101`).

### 2. Édition : logigramme, propriétés, commentaires, bibliothèque

- **EVO-003** : aucun constaté dans cette zone.
- **EVO-005** : aucun constaté.
- **EVO-008** :
  - « alias en double » : pas de code dédié, signalé par le code générique `duplicateKey` (`src/core/validation/workspace-check.ts:10-14,21`) — respecté différemment.
- **EVO-009** :
  - Titre de la fenêtre d'avertissement assemblé en dur `« … : cle.champ »` (`src/ui/properties/HiddenFields.tsx:30`) — écart I18N déjà noté dans `docs/ECARTS.md`, toujours présent.
  - « une référence à un champ masqué est signalée » : non signalée lorsqu'elle provient de la définition d'une question de bibliothèque (champ frère, décision d'analyse) ; si elle provient d'une autre question de bibliothèque utilisée dans le même graphe, elle devient un `unknownReference` de propriétaire `libraryQuestion`, affiché dans aucun panneau (`src/core/validation/refs-check.ts:91-92`, voir limites).
- **EVO-010** :
  - Critère « colle une sélection contenant un départ et une fin dans un fragment → ces deux nœuds sont écartés » : la fin est écartée, mais le nœud qui était le départ est **collé** comme nœud ordinaire (seul le rôle est écarté, message `paste.startFragment`) (`src/app/store/clipboard.ts:83-86`) — conforme à la décision de l'analyse EVO-010 (« Départ »), différent de la lettre du critère.
  - « Une seule fin par questionnaire » (comportement attendu) : une fin collée dans un questionnaire est collée sans contrôle (`clipboard.ts:51-57`) — décision de l'analyse (la spec §3.2 autorise plusieurs fins).
- **EVO-011** :
  - « Export développeurs sans commentaires » : les commentaires sont dans les documents de mise en page (`layout.comments`) ; il n'existe pas d'export développeurs distinct de la sauvegarde (décision d'analyse ; le kit `npm run kit-dev` exclut les `*.layout.json`).
  - « Clic droit sur une question → menu propose Commenter » : si la question fait partie d'une sélection multiple, l'entrée est affichée mais grisée (`src/ui/diagram/useDiagramMenu.tsx:20,33`, `src/app/commands/comment-commands.ts:21`).
- **EVO-012** : aucun constaté.
- **EVO-013** :
  - Badge d'un fragment : le fragment s'ouvre dans son propre onglet `f:<id>`, pas dans l'onglet Bibliothèque (`src/app/commands/library-item-commands.ts:27-30`) — décision d'analyse.
  - « Panneau de propriétés : idem si le badge y est affiché » : le panneau n'affiche pas de badge « bib. » (texte « question de bibliothèque » et bouton « Ouvrir dans la bibliothèque » à la place, `src/ui/properties/ReferenceProperties.tsx:27,38`) — sans objet selon l'analyse.
- **EVO-017** : aucun constaté (rendu de prévisualisation, hors de cette zone).
- **EVO-021** : aucun constaté (« Logigramme / panneau : sans objet »).
- **EVO-024** :
  - EVO-024-008 / 009 : la restriction aux nœuds en amont ne vaut qu'au choix de la cible ; une cible nœud devenue hors amont (arêtes modifiées) ou visant le Renvoi lui-même (import) n'est pas une erreur, seulement l'avertissement `buttonTargetNotGuaranteed` (`src/core/validation/redirect-check.ts:26-28`, `src/core/model/redirect.ts:86-88`) — respecté différemment.
  - Autres exigences : aucun écart constaté (création, toggles, aperçu, copier-coller, duplication, verrou, traductions).
- **EVO-028** :
  - EVO-028-007 : respecté différemment — l'indicateur d'un jeu de libellés est sur sa carte dans la vue des jeux
    (`src/ui/library/LabelSets.tsx:44`) ; l'entrée unique « Jeux de libellés » de la liste de gauche n'a pas d'indicateur
    (`src/ui/library/Library.tsx:54`) — choix de l'analyse.
  - Autres exigences : aucun écart constaté (`src/core/model/usage.ts:28-46`, `src/ui/library/Unused.tsx:7-39`, `src/ui/shell/Tabs.tsx:59,78`).

### 3. Types de questions et de nœuds

- **EVO-001** : « elle peut être déplacée (glisser-déposer, raccourcis) » respecté différemment : boutons Monter / Descendre /
  Dupliquer / Supprimer et réordonnancement de la saisie rapide (entry-detail.tsx:59-62, options-editor.tsx:39-44). Écart
  accepté dans la fiche (« Écart accepté à la réalisation »). Critère « booléen ou tri-state » abandonné (arbitrage A). Autres
  critères : aucun écart constaté.
- **EVO-003** : aucun constaté.
- **EVO-006** : critère « table de décision » sans objet (aucune table dans l'outil, noté dans la fiche). Autres critères :
  aucun écart constaté.
- **EVO-007** : aucun constaté dans la zone. Rappel ECARTS.md (2026-10-13, EVO-014, TEST) : le silence des messages de format
  mail / téléphone / adresse, contrôles désactivés, n'est pas testé en fumée (code : `plugin-api/blur-errors.ts:19-21`, appelé par
  email/index.tsx:23, phone-field.tsx:25, address/index.tsx:39) ; la règle pure est testée en unitaire depuis EVO-025
  (`blur-errors.test.ts:13`, `blur-errors-caracterisation.test.ts`).
- **EVO-016** : aucun constaté dans la zone. Rappel ECARTS.md (TEST) : « valeur unique » et « doublons » couverts seulement en
  unitaire. Le critère « référence à une question située après le champ » relève des vérifications de `core/validation`
  (hors zone) ; `ExpressionInput` ne signale que les références absentes de la portée.
- **EVO-017** : aucun constaté. Rappel ECARTS.md (TEST) : le test « projet antérieur » réécrit les options avant de prévisualiser.
- **EVO-018** : respecté différemment, selon l'arbitrage du 2026-10-13 : la 3e réponse affichée est « Ne sais pas »
  (`DONT_KNOW_LABEL`, core/model/question.ts:227), et non « Ne sait pas » comme dans l'exemple de la fiche ; la valeur par
  défaut « ne sait pas » et l'équivalence des expressions sont abandonnées (critères barrés dans la fiche). Rappel ECARTS.md
  (TEST) : cas d'un tri-state ayant déjà « Ne sais pas » non testé (format/migrate.ts:109).

### 4. Parcours : prévisualisation, moteur, validation, état du système, expressions

- **EVO-001** : aucun constaté dans cette zone. Une option dynamique disparue bloque la fin avec les contrôles activés. Avec les contrôles désactivés (EVO-014), ce blocage est volontairement levé (`Preview.tsx:110, 149`).
- **EVO-005** : aucun constaté dans cette zone. Le libellé d'arête n'a pas d'effet sur la navigation et n'apparaît pas dans le wizard. Le libellé de la variable s'affiche dans le dictionnaire et dans les scénarios. L'autocomplétion et le survol relèvent de `ui/expression-editor`, hors zone, non vérifiés ici.
- **EVO-006** : aucun constaté. Obligatoire satisfait et contrôles levés (`field.ts:46`), `.nsp` toujours vrai ou faux (`dont-know-ref.ts`), `.groupe` = `NSP` pour un choix (`context.ts:63-64`). L'ordre d'affichage (après « Autre », hors groupes) relève du plugin `choice`, hors zone.
- **EVO-012** : aucun constaté. La valeur effective s'applique à l'astérisque et au blocage (`steps.ts:70-72`), et seulement sur les questions présentées (validation par page, garde sur le chemin projeté). ECARTS.md note déjà l'absence de test direct pour « surchargée obligatoire mais non présentée ».
- **EVO-014** : critères respectés. Un point est traité autrement que dans la fiche (déjà dans ECARTS.md comme SPEC) : une page quittée contrôles désactivés reste exclue de la garde de fin jusqu'à « Recommencer », même revisitée contrôles activés. Seul « Recommencer » vide `unchecked` (`Preview.tsx:43, 153`, `path-check.ts:35`). La référence de ECARTS.md, `Preview.tsx:375`, est périmée (le fichier compte 196 lignes) ; l'endroit réel est `Preview.tsx:153`, et `path-check.ts:33-38` pour l'exclusion.
- **EVO-015** : aucun constaté. La prévisualisation reste utilisable sur un formulaire validé, sans verrou dans `ui/preview`.
- **EVO-016** : aucun constaté sur le moteur. Valeur unique, vide, conversion en texte, doublons et ordre suivent `suggestionList` ; le filtre « contient » ignore la casse ; le recalcul a lieu à chaque rendu de l'étape. Un détail diffère de l'analyse de la fiche, qui annonçait la conversion par `formatValue` : le code utilise `asText` (`String()`), avec le même résultat pour les nombres, booléens et dates ISO. `suggestionList` aplatit aussi d'un niveau les listes imbriquées (`suggestions.ts:20`), ce que la fiche ne dit pas.
- **EVO-019** : critères respectés dans le code. Le recentrage suit `focusKey` (longueur de l'historique, étape, clics), l'outline est en lecture seule, les questions hors parcours sont grisées et inactives, les réponses sont conservées lors d'un saut. Une précision n'est pas dans la fiche : sur une page interne à un fragment, c'est le nœud fragment qui est mis en évidence, et il n'est pas cliquable (`Outline.tsx:20, 24`). Ce choix est noté dans l'analyse de la fiche.
- **EVO-024** : aucun constaté dans cette zone (boutons visibles selon `when`, boutons en erreur affichés et inactifs, messages par `inform`, retour par `goTo` + `returnTo`, « Terminer » selon `isJustBeforeEnd` : `src/ui/preview/Redirect.tsx:21-35, 41`, `Preview.tsx:142, 196-197`).
- **EVO-021** : aucun constaté pour les questions (même fonction `isRequired` pour l'astérisque et le blocage, même contexte). Limite déjà assumée dans l'analyse de la fiche : les champs de structure gardent un astérisque `required === true` (`occurrences.tsx:74`).
- Croisement avec ECARTS.md : les autres lignes qui touchent la zone sont des écarts de test (EVO-014 messages de format des plugins, EVO-016 unitaire seulement, EVO-019 rendu sans outline), sans écart de comportement visible dans le code.

### 5. Format JSON (schémas, sérialisation ↔ `docs/FORMAT.md` et fiches)

Contrôle automatique : les 101 noms de propriétés déclarés dans les schémas apparaissent tous dans `docs/FORMAT.md` ; l'exemple est valide pour les schémas en version 15 (`tests/reference`) ; la table §16 de FORMAT.md (l.977-992) correspond aux étapes de `MIGRATIONS` ; `formatVersion` 15 partout (FORMAT.md l.1, 38, 975 ; `documents.ts:5` ; exemple). Écarts relevés :

1. **Nom de fichier dans le schéma projet** : `project.schema.json:143` décrit `file` comme « `<clé>.json` », alors que l'export écrit `<clé> - <version> - <final|provisoire>.json` (`files.ts:26-29`, FORMAT.md l.132, l.174). Ce schéma est livré tel quel dans le kit.
2. **`file` dans le bundle** : FORMAT.md l.132 annonce le nommage EVO-022 pour `questionnaires[].file`, mais seul `exportFiles` le réécrit (`files.ts:74`) ; en mémoire et donc dans le bundle, la valeur reste celle de la création (`<clé>.json`, `project-commands.ts:63`, `duplicate.ts:48` ; `questionnaire.json`, `store.ts:139`) ou du dernier import.
3. **Statut `"draft"` dans un bundle** : FORMAT.md l.180-181 (« `status` et `libraryVersions` n'y figurent que pour un questionnaire validé ») est vrai pour l'édition (`questionnaire-edits.ts:51-54` supprime les propriétés) mais un bundle importé contenant `status: "draft"` le conserve (`files.ts:131-134`, aucun `importedQuestionnaire` sur le bundle) et le réexporte.
4. **Règles annoncées non portées par les schémas** (FORMAT.md les présente comme règles, le schéma ne les vérifie pas) : `validatedAt` « présente seulement si `status` vaut `validated` » (FORMAT.md l.165 ; `questionnaire.schema.json:46` sans dépendance) ; `defaultLanguage` « présente dans `languages` » (FORMAT.md l.129 ; `project.schema.json:93`, simple description) ; mots réservés interdits comme clé (FORMAT.md l.109-110 ; `key` = pattern seul, `common.schema.json:71`) ; `exit` « dans un fragment uniquement » (FORMAT.md l.239 le dit lui-même : « règle non vérifiée ») ; `redirect` « questionnaire uniquement » (FORMAT.md l.238, l.857 ; la définition `node` est partagée par `library.schema.json:65`). FORMAT.md l.863-864 précise que ces vérifications sont celles de l'éditeur, non bloquantes.
5. **`formatVersion`** : FORMAT.md l.38 « entier, actuellement 15 » ; le schéma accepte tout entier ≥ 1 (`common.schema.json:623-626`) : un document validé seul (hors `importFiles`) n'est pas contraint à la version 15.
6. **Nom du layout d'un questionnaire** : FORMAT.md l.35 « `<nom du questionnaire>.layout.json` » ; le code produit `<clé> - <version> - <final|provisoire>.layout.json` (`files.ts:15, 82`) ; EVO-011 l.159 et EVO-008 l.185 parlent encore de `<clé>.layout.json` (antérieurs à EVO-022). Formulation imprécise plutôt que contradiction.
7. **EVO-022 vs migration** : la section « Impacts » d'EVO-022 (l.108-109) prévoit une migration qui initialise les versions de référence et mentionne un champ `statut` ; la migration 13 → 14 ne change que le numéro (`migrate.ts:89`) et il n'y a pas de champ `statut`. L'analyse de la même fiche (l.147-153) justifie ces deux choix ; FORMAT.md l.991 est conforme au code.
8. **EVO-020** (l.12, l.22) cite la version 13 : antérieur à EVO-022, sans effet sur le code.
9. Schémas : aucune mention obsolète (`tristate`, `block`) ; les mentions de version (`common.schema.json:322, 330, 363`) sont exactes.

EVO-024 : schéma, migration 14 → 15 (numéro seul), FORMAT.md §6.2 et §16 (l.992) et exemple conformes à la fiche (EVO-024-056, 057).

Aucun autre écart constaté sur EVO-003, 005, 006, 007, 009, 012, 015, 016, 017 (sans effet sur le format, EVO-017 l.80) et 018 : propriétés, enums et migrations conformes au schéma et à FORMAT.md.
