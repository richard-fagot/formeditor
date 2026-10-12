# Carte du code

À lire **avant toute modification**. Ensuite : le `README.md` des modules concernés, puis seulement leur code.
La section « Modules » est générée par `npm run map` ; le reste est rédigé et mis à jour en fin de phase.

## Organisation

- `src/core/*` : noyau métier pur (TypeScript, sans interface), testé en TDD.
- `src/format` : fichiers JSON, schémas, migrations, bundle.
- `src/plugins/question-types/<type>`, `src/plugins/node-kinds/<kind>` : un dossier autonome par type.
- `src/plugin-api` : contrat des plugins (types `QuestionTypePlugin`, `NodeKindPlugin`, environnements).
- `src/registry` : seule liste des plugins.
- `src/app/*` : état, commandes, raccourcis, persistance, i18n de l'outil.
- `src/ui-kit`, `src/ui/*` : interface React.
- `tests/reference` : tests de référence sur l'exemple ; `tests/smoke` : Playwright sur `dist/index.html`.
- `examples/` : projet d'exemple « déclaration de sinistre » et chemins attendus.
- `docs/GUIDE.md` : guide utilisateur (une entrée par action, balise `[cmd: id]` par commande du catalogue). `scripts/guide/` :
  `npm run guide` régénère son index des raccourcis depuis `app/commands` ; `npm run guide:check` (dans `npm run check`) et
  `scripts/guide/guide.test.ts` échouent si une commande n'est pas balisée, si une balise est inconnue ou si l'index est périmé.

## Modules

<!-- AUTO:DEBUT -->
<!-- Généré par `npm run map` : ne pas éditer à la main. -->

| Module | Responsabilité | API publique (`index.ts`) | Dépendances | Fichiers |
| --- | --- | --- | --- | --- |
| `app/commands` | Catalogue unique des actions utilisateur (spec §4.4). Palette, menus et raccourcis s'appuient tous dessus : | type Command, labelOf, download, imageFileName, imageTitle, commands, command, runCommand | app/i18n, app/store, core/model, format, plugin-api, registry | 20 |
| `app/i18n` | Textes de l'interface de l'outil (dictionnaire simple, `fr` par défaut, `en`). Les textes destinés à | MESSAGES, type MessageKey, UI_LANGUAGES, Translate, makeTranslate | — | 3 |
| `app/persistence` | Sauvegarde automatique du projet dans IndexedDB (idb-keyval), en continu (délai 500 ms après chaque | restoreSession, startAutosave | app/store, core/model, format, idb-keyval | 1 |
| `app/shortcuts` | Liaisons clavier (tinykeys) vers les commandes de `app/commands`. | bindShortcuts, isTyping, keysOf, formatKey, comboOf, normalizeKey | app/commands, app/store, tinykeys | 4 |
| `app/store` | État applicatif (Zustand + immer) : projet (`ws`), onglets, sous-vue par questionnaire, sélection, | useStore, scopeOf, blankWorkspace, type Store, type AppState, type TabId, type Selection, type PreviewState, type PaletteMode, type ImageOptions, Scope, getGraph, layoutOf, insertNode, connect, removeNodes, removeEdge, moveEdge, updateNode, duplicateNodes, usedKeys, freshKey, NODE_SPACING, type GraphRef, setQuestionLabel, addLibraryQuestion, addFragment, deleteLibraryItem, referenceNode, insertionCycle, placeNode, moveToLibrary, canMoveToLibrary, setLibraryQuestionLabel, renameExit, copyToLibrary, setFieldHidden, hiddenFieldUsages, type RewrittenExpression, type LibraryItem, groupIntoFragment, groupEntries, canExtract, questionnaireKeys, canRenameQuestionnaire, renameQuestionnaire, patchQuestionnaire, addVariable, deleteVariable, renameVariable, renameListField, setVariableType, addScenario, deleteScenario, valueError, exampleSystemState, scenarioOf, systemStateOf, useT, useEditorEnv, activeGraphRef, activeQuestionnaire, isLanguageCode, addLanguage, removeLanguage, setDefaultLanguage | app/i18n, core/model, core/references, core/runtime, format, immer, plugin-api, react, zustand | 17 |
| `core/contact` | Contrôles et normalisation des types mail, téléphone, adresse et civilité (EVO-007), noms de pays. Pur (pas d'interface). | isEmail, normalizeEmail, normalizePhone, phoneErrors, formatPhone, nationalPhone, type PhoneInput, addressErrors, ADDRESS_MIN, ADDRESS_MAX, COUNTRIES, callingCode, countryName, flagOf, countryChoices, contactErrors, displayFormatters, type DisplayFormatter | core/model, libphonenumber-js | 8 |
| `core/expressions` | Analyse, évaluation, extraction des références, interpolation des libellés. **Seul module qui importe | compile, checkSyntax, evaluate, evaluateStrict, evaluateCondition, EvalContext, EvalEnv, ExpressionSyntaxError, extractReferences, filterReferences, renameReference, type RefPath, parseTemplate, interpolate, formatValue, templateExpressions, templateReferences, renameInTemplate, resolveLabel, pickText, type LangChoice, todayIso, addDays, daysBetween, age | core/model, jsonata | 12 |
| `core/model` | Types du domaine (projet, questionnaire, nœud, arête, question, fragment, variable, scénario) et quelques | * (./text), * (./question), * (./node), * (./graph), * (./documents), * (./keys), * (./fragment), * (./instance) | — | 12 |
| `core/references` | Résolution des clés et espaces de noms, index des usages, renommage propagé. Dépend de `core/model`, `core/expressions`. | mapWorkspace, mapGraph, mapQuestion, collectExpressions, Owner, ExprLocation, ExprMapper, FoundExpression, questionnaireScope, fragmentScope, structureScope, resolvePath, questionOfNode, hiddenFieldPaths, type Scope, type RefInfo, type RefKind, type Caller, renameKey, qualifyKeys, type RenameTarget, findUsages | core/expressions, core/model | 10 |
| `core/runtime` | Moteur de parcours : implémentation de référence de la navigation (docs/FORMAT.md §11). Pur, immuable. | resolveStep, effectiveQuestion, isPage, questionnaireOf, type RuntimeInput, type Step, buildContext, getAnswer, withAnswer, otherPath, groupPath, dontKnowPath, countryPath, dontKnowAnswer, type Answers, chooseEdge, successor, firstStep, start, next, back, goTo, resume, setAnswer, currentStep, prune, projectedSteps, summaryEntries, progress, type Session, type SummaryEntry, choiceOptions, groupId, type ResolvedOption, type ResolvedGroup, edgeTrace, type EdgeTrace | core/expressions, core/model | 15 |
| `core/validation` | Contraintes de champs (validation d'une réponse) et vérifications non bloquantes du graphe (spec §4.6). | validateAnswer, messageParams, formatErrors, type FieldError, checkWorkspace, checkGraph, guaranteedBefore, describeIssue, type Issue, type IssueCode, DEFAULT_MESSAGES, defaultMessage, expectedKeys | core/contact, core/expressions, core/model, core/references, core/runtime | 16 |
| `format` | Fichiers JSON : schémas, validation (Ajv, JSON Schema 2020-12), migrations (`formatVersion`), | SCHEMAS, validateDocument, documentKind, type DocumentKind, migrate, MIGRATIONS, type Migrations, serialize, newWorkspace, emptyLibrary, toBundle, exportBundle, exportFiles, importFiles, PROJECT_FILE, LIBRARY_FILE, type FileContent, type ImportResult | ajv, core/model | 7 |
| `plugin-api` | Contrat entre l'éditeur et les plugins : `QuestionTypePlugin` (un par type de question) et | EditorEnv, RenderEnv, QuestionTypePlugin, NodeKindPlugin, FieldProps, PageProps, ShapeProps, QuestionPropertiesProps, NodePropertiesProps, QuestionBase, ResolvedOption, tr, commonQuestionFields, previewText, dontKnowLabel | core/model, react | 3 |
| `plugins/node-kinds/end` | Fin de parcours (`kind: "end"`) : `title?`, `message`, `outcome?`. Forme : pilule verte. Raccourci : Alt+F. | endKind | core/model, plugin-api, ui-kit, ui/expression-editor | 1 |
| `plugins/node-kinds/exit` | Sortie nommée d'un fragment (`kind: "exit"`, `name`, `label?`), facultative : utilisée seulement dans les fragments de la bibliothèque | exitKind | core/model, plugin-api, react, ui-kit | 1 |
| `plugins/node-kinds/fragment` | Appel d'un fragment de la bibliothèque (`kind: "fragment"`, `ref`, `alias`, EVO-008 ; ex-instance de bloc). | fragmentKind | core/model, core/references, plugin-api, react | 1 |
| `plugins/node-kinds/info` | Page d'information (`kind: "info"`) : `title?`, `text` (libellés interpolables, à variantes). Raccourci de création : Alt+I. | infoKind | core/model, plugin-api, ui-kit, ui/expression-editor | 1 |
| `plugins/node-kinds/question` | Nœud question (locale ou référence de bibliothèque). Forme : rectangle blanc. L'aperçu du type est | questionKind | core/model, plugin-api | 1 |
| `plugins/node-kinds/summary` | Page de synthèse (`kind: "summary"`) : `title?`. Le récapitulatif est construit par `ui/preview` (`summaryEntries` du moteur). Raccourci : Alt+S. | summaryKind | core/model, plugin-api, ui-kit, ui/expression-editor | 1 |
| `plugins/question-types/address` | Type « adresse » (`type: "address"`, EVO-007) : `defaultCountry` (défaut `FR`), `countries` (pays autorisés), `minLength` / | addressType | core/contact, core/model, core/validation, lucide-react, plugin-api, react, ui-kit, ui/expression-editor | 1 |
| `plugins/question-types/boolean` | Type « booléen » (`type: "boolean"`) : réponse `true` / `false` (ou `"other"` avec l'option « Autre »). | booleanType | core/model, plugin-api, ui-kit, ui/expression-editor | 1 |
| `plugins/question-types/choice` | Types « choix unique » (`single`, raccourci U) et « choix multiple » (`multiple`, raccourci M), dans un | singleType, multipleType | core/model, core/references, lucide-react, plugin-api, react, ui-kit, ui/expression-editor | 12 |
| `plugins/question-types/civility` | Type « civilité » (`type: "civility"`, EVO-007) : choix unique prédéfini, codes fixes `MME`, `M` et `NP` (« Ne se prononce pas », | civilityType | core/model, lucide-react, plugin-api, ui-kit, ui/expression-editor | 1 |
| `plugins/question-types/date` | Type « date » (`type: "date"`) : réponse `AAAA-MM-JJ`, bornes `min` / `max` littérales (date ISO) ou | dateType | core/model, plugin-api, ui-kit, ui/expression-editor | 1 |
| `plugins/question-types/email` | Type « mail » (`type: "email"`, EVO-007) : aucun paramètre propre. Raccourci par défaut : Shift+E. Aperçu : icône et `<mail>`. | emailType | core/contact, core/model, core/validation, lucide-react, plugin-api, react, ui-kit, ui/expression-editor | 1 |
| `plugins/question-types/number` | Type « nombre » (`type: "number"`) : `numberKind` (`real`, `natural`, `integer`), `min` / `max` (nombre | numberType | core/model, plugin-api, react, ui-kit, ui/expression-editor | 1 |
| `plugins/question-types/phone` | Type « téléphone » (`type: "phone"`, EVO-007) : `defaultCountry` (défaut `FR`), `countries` (pays autorisés, défaut : tous), | phoneType | core/contact, core/model, core/validation, lucide-react, plugin-api, react, ui-kit, ui/expression-editor | 2 |
| `plugins/question-types/structure` | Type « structure » (`type: "structure"`) : groupe de champs (questions de tout type sauf structure, avec | structureType | core/model, core/references, core/runtime, core/validation, lucide-react, plugin-api, react, ui-kit, ui/expression-editor | 3 |
| `plugins/question-types/text` | Type « texte » (`type: "text"`) : `multiline`, `minLength`, `maxLength`, `pattern`. | textType | core/model, plugin-api, ui-kit, ui/expression-editor | 1 |
| `plugins/question-types/tristate` | Type « tri-state » (`type: "tristate"`) : réponse `true` / `false` / `"unknown"` (ou `"other"` avec | tristateType | core/model, plugin-api, ui-kit, ui/expression-editor | 1 |
| `registry` | Seul module qui connaît la liste des plugins (`src/plugins/**`). Ajouter un type = une ligne d'import et | QUESTION_TYPE_PLUGINS, NODE_KIND_PLUGINS, questionType, nodeKind, DEFAULT_QUESTION_TYPE | core/model, plugin-api, plugins/node-kinds/end, plugins/node-kinds/exit, plugins/node-kinds/fragment, plugins/node-kinds/info, plugins/node-kinds/question, plugins/node-kinds/summary, plugins/question-types/address, plugins/question-types/boolean, plugins/question-types/choice, plugins/question-types/civility, plugins/question-types/date, plugins/question-types/email, plugins/question-types/number, plugins/question-types/phone, plugins/question-types/structure, plugins/question-types/text, plugins/question-types/tristate | 2 |
| `ui-kit` | Composants graphiques génériques, sans logique métier ni import d'autres modules : `Button`, `Input`, | cn, Button, Input, Textarea, Select, Checkbox, Field, Section, Badge, Kbd, LocalizedTextInput, Dialog | @radix-ui/react-dialog, clsx, react, tailwind-merge | 5 |
| `ui/diagram` | Logigramme d'un graphe (questionnaire, ou fragment de la bibliothèque) avec React Flow (@xyflow/react). | Diagram, LIBRARY_MIME, ProblemsPanel | @xyflow/react, app/commands, app/shortcuts, app/store, core/model, core/references, core/validation, elkjs, html-to-image, lucide-react, plugin-api, react, registry, ui-kit, ui/properties | 15 |
| `ui/expression-editor` | Saisie d'expressions JSONata et de libellés multilingues. Dépend de `core/expressions`, `core/references`, `ui-kit`. | ExpressionInput, LabelEditor, ExpressionEnvProvider, useExpressionEnv, type ExpressionEnv, ConstraintsEditor, type ConstraintsValue, DontKnowEditor | @codemirror/autocomplete, @codemirror/commands, @codemirror/language, @codemirror/lint, @codemirror/state, @codemirror/view, @lezer/highlight, core/expressions, core/model, core/references, lucide-react, react, ui-kit | 10 |
| `ui/library` | Onglet Bibliothèque et panneau latéral de glisser-déposer. Dépend de `app/commands`, `app/store`, `core`, | Library, LibraryPanel, FragmentView | app/commands, app/store, core/model, core/references, core/validation, lucide-react, plugin-api, react, ui-kit, ui/diagram, ui/expression-editor, ui/properties | 7 |
| `ui/preview` | Prévisualisation en wizard, exécutée par le moteur de parcours (`core/runtime`) : une page par question, | Preview | app/commands, app/store, core/contact, core/expressions, core/model, core/runtime, core/validation, lucide-react, plugin-api, react, registry, ui-kit, ui/system-state | 8 |
| `ui/properties` | Cadre du panneau de propriétés de l'objet sélectionné (nœud ou arête ; sans sélection, le questionnaire). Le contenu propre à chaque type | PropertiesPanel, QuestionEditor, type QuestionTarget, usePluginEnv, KeyInput | app/commands, app/store, core/model, core/references, core/validation, lucide-react, plugin-api, react, registry, ui-kit, ui/expression-editor | 11 |
| `ui/settings` | Onglet « Paramètres » (spec §3.9, §4.1, §4.4). Dépend de `app/commands`, `app/shortcuts`, `app/store`, `core/validation`, | Settings | app/commands, app/shortcuts, app/store, core/references, core/validation, lucide-react, react, ui-kit | 5 |
| `ui/shell` | Cadre de l'application. Dépend de `app/*`, `ui/*`, `ui-kit`. | App | app/commands, app/i18n, app/persistence, app/shortcuts, app/store, cmdk, core/model, core/references, core/validation, lucide-react, plugin-api, react, ui-kit, ui/diagram, ui/library, ui/preview, ui/properties, ui/settings, ui/system-state | 8 |
| `ui/system-state` | Onglet « État du système » (spec §4.5) : dictionnaire des variables du projet et scénarios nommés. | SystemState, ValueInput, SystemValuesEditor | app/commands, app/store, core/model, core/references, core/validation, lucide-react, react, ui-kit, ui/properties | 5 |

<!-- AUTO:FIN -->

## Matrice fonctionnalité → modules

| Évolution | Modules à lire / modifier |
| --- | --- |
| Ajouter un type de question | `plugin-api` (contrat), `plugins/question-types/<nouveau>`, `registry`, `core/model` + `format` (schéma) si nouveau type, `core/validation` (contraintes), `docs/FORMAT.md` |
| Ajouter un type de nœud | `plugins/node-kinds/<nouveau>`, `registry`, `core/model`, `core/runtime`, `format` |
| Modifier la navigation | `core/runtime`, `tests/reference` (chemins attendus), `docs/FORMAT.md` |
| Modifier la grammaire des expressions | `core/expressions`, `core/references`, `ui/expression-editor`, `docs/FORMAT.md` |
| Ajouter une vérification (§4.6) | `core/validation` |
| Changer un raccourci ou ajouter une action | `app/commands`, `app/shortcuts` (écran de paramétrage : `ui/settings`), puis `npm run guide` et l'entrée balisée de `docs/GUIDE.md` |
| Ajouter, modifier ou supprimer une action (tout comportement visible) | mettre à jour `docs/GUIDE.md` dans le même commit (entrée, libellés exacts ; `npm run guide` si une commande change) |
| Langues des contenus, traductions manquantes | `app/store` (`language-edits.ts`), `app/commands` (`settings-commands.ts`), `ui/settings`, `core/validation` (`missingTranslation`) |
| Export du logigramme en image (EVO-004) | `ui/diagram` (`useImageExport.ts`, `ImageDialog.tsx`, `data-edge-label` dans `EdgeView`), `app/commands` (`image-commands.ts`, `image-file.ts`, `download`), `app/store` (`imageOptions`, `imageRequest`), `app/persistence`, `ui/shell` (bouton), `tests/smoke/evo-004.spec.ts` |
| Mise en page automatique, vue côte à côte | `ui/diagram` (`autoLayout.ts`, `useAutoLayout.ts`, `readOnly`), `ui/shell` (`ComparePane`), `app/commands` (`view.layout`, `view.compare`) |
| Option « Ne sais pas » (EVO-006) | `core/model` (`dontKnow`, `DONT_KNOW_*`), `core/expressions` (`dont-know-ref.ts`), `core/references` (`scope.ts`, `visit.ts`), `core/runtime` (`context.ts`, `session.ts`), `core/validation` (`field.ts`, `groups-check.ts`), `plugin-api`, `ui/expression-editor` (`DontKnowEditor`), plugins de types (aperçu, propriétés, saisie), `ui/preview`, `format`, `tests/smoke/evo-006.spec.ts` |
| Faire évoluer le format | `core/model`, `format` (schéma + migration), `docs/FORMAT.md`, `examples/` |
| Persistance navigateur | `app/persistence` |
| Texte de l'interface | `app/i18n` |
| Prévisualisation (wizard, synthèse et retour, panneaux état du système / débogage) | `ui/preview`, `core/runtime` (`resume`, `edgeTrace`), rendu des champs dans `plugins/question-types/*` (`Field`), pages dans `plugins/node-kinds/*` (`Page`) |
| Dictionnaire de l'état du système, scénarios | `ui/system-state`, `app/store` (`system-edits.ts`), `app/commands` (`system-commands.ts`), `core/references` (portée `sys.`, renommage) |
| Logigramme (rendu, sélection, glisser, problèmes) | `ui/diagram`, forme des nœuds dans `plugins/node-kinds/*` (`Shape`) |
| Panneau de propriétés | `ui/properties`, paramètres de type dans les plugins (`Properties`) |
| Annuler / rétablir, état | `app/store` (`history.ts` ; `transact` pour une modification sur plusieurs portées) |
| Barre, onglets, palette | `ui/shell` |
| Jeux de libellés, onglet Bibliothèque | `ui/library`, `app/commands` (`library-commands.ts`) |
| Questions et fragments de bibliothèque, insertion, extraction en fragment | `app/store` (`library-edits.ts`, `group.ts`), `app/commands` (`library-item-commands.ts`), `ui/library` (`FragmentView`), `ui/properties` (`ReferenceProperties`), `ui/diagram` (poignées de sortie, dépôt), `core/references` (`qualifyKeys`) |
| Fragments (EVO-008) : entrée, sorties implicites, imbrication, clés attendues, onglet `f:<id>` | `core/model` (`fragment.ts`), `core/runtime` (`steps.ts`, `navigate.ts`, `context.ts`), `core/references` (`scope.ts` : `fragmentScope`, `rename.ts`), `core/validation` (`graph.ts`, `refs-check.ts`, `expected.ts`, `guarantee.ts`), `format` (migration 6 → 7), `app/store` (`travel.ts`, `hooks.ts`), `plugins/node-kinds/fragment`, `ui/library` (`FragmentView`), `ui/shell` (`Tabs`, `App`), `ui/preview` (`DebugPanel`), `tests/smoke/evo-008.spec.ts` |
| Options d'un choix (entrées ordonnées : statiques, dynamiques, conditions) | `core/model` (`ChoiceEntry`), `core/runtime` (`choiceOptions`), `core/references` (`visit.ts`), `plugins/question-types/choice` (`entries.ts`, `entry-detail.tsx`), `format` (schéma `choiceEntry`) |
| Groupes d'options, réponse `<clé>_group`, référence `cle.groupe` (EVO-003) | `core/model` (`ChoiceGroup`, `GROUP_*`), `core/expressions` (`group-ref.ts`), `core/references` (`scope.ts` : genre `group`, `visit.ts` : `mapEntry`), `core/runtime` (`options.ts`, `setAnswer`, `groupPath`), `core/validation` (`field.ts`, `groups-check.ts`), `plugins/question-types/choice` (`quick-lines.ts`, `entries.ts`, `group-detail.tsx`, `choice-field.tsx`), `plugins/question-types/structure` (`occurrences.tsx`), `plugin-api` (`FieldProps.group`), `ui/preview`, `format` (schéma `choiceGroup`, migration 2 → 3) |
| Types mail, téléphone, adresse, civilité ; `<clé>_pays`, `cle.pays` (EVO-007) | `core/contact` (contrôles, normalisation, pays, `displayFormatters`), `core/model` (types, `COUNTRY_*`, `CIVILITY_*`), `core/expressions` (`country-ref.ts`, `display` dans `template.ts`), `core/references` (`scope.ts` : genre `country` ; `visit.ts` : libellés de civilité), `core/runtime` (`countryPath`, `setAnswer`, `prune`), `core/validation` (`field.ts` : `formatErrors`, `messages.ts`), `plugin-api` (`FieldProps.country`), `plugins/question-types/{email,phone,address,civility}`, `plugins/question-types/structure` (`occurrences.tsx`), `ui/preview` (`Preview.tsx`, `usePreview.ts`), `format` (schéma, migration 5 → 6), `tests/smoke/evo-007.spec.ts` |
| Copie en bibliothèque, champs masqués d'une structure (EVO-009) | `core/model` (`instance.ts`, `hiddenFields`), `core/references` (`questionOfNode`, `hiddenFieldPaths`, `rename.ts`), `core/runtime` (`effectiveQuestion`), `core/validation` (`refs-check.ts` : `hiddenField`), `format` (migration 7 → 8), `app/store` (`library-edits.ts`, `copyRequest`), `app/commands` (`node.toLibrary`), `ui/properties` (`HiddenFields`, bouton de copie), `ui/shell` (`CopyDialog`), `ui/diagram` (`NodeView`), `tests/smoke/evo-009.spec.ts` |
| Fin de parcours bloquée par une réponse invalide | `ui/preview` (`path-check.ts`, `Preview.tsx`), `core/validation` (`validateAnswer`), `core/runtime` (`projectedSteps`, `goTo`) |

## Invariants

- `core` n'importe ni `app`, ni `ui`, ni `plugins`, ni librairie d'interface. Un plugin n'importe jamais un autre plugin.
- Import d'un autre module uniquement par son `index.ts` (dependency-cruiser).
- Changement du format JSON → schéma + migration (`formatVersion`) + `docs/FORMAT.md` + exemple.
- Toute action utilisateur passe par `app/commands` (palette, raccourcis).
- Toute action ajoutée, modifiée ou supprimée met à jour `docs/GUIDE.md` (contrôlé par `npm run guide:check` pour les commandes).
- Tout texte destiné à l'utilisateur final est multilingue (`LocalizedText`).
- Un changement de comportement voulu met à jour les fichiers attendus de `tests/reference`, jamais l'inverse en silence.
