# Carte du code

À lire **avant toute modification**. Ensuite : le `README.md` des modules concernés, puis seulement leur code.
La section « Modules » est générée par `npm run map` ; le reste est rédigé et mis à jour en fin de phase.

## Organisation

- `src/core/*` : noyau métier pur (TypeScript, sans interface), testé en TDD.
- `src/format` : fichiers JSON, schémas, migrations, bundle.
- `src/plugins/question-types/<type>`, `src/plugins/node-kinds/<kind>` : un dossier autonome par type.
- `src/registry` : seule liste des plugins.
- `src/app/*` : état, commandes, raccourcis, persistance, i18n de l'outil.
- `src/ui-kit`, `src/ui/*` : interface React.
- `tests/reference` : tests de référence sur l'exemple ; `tests/smoke` : Playwright sur `dist/index.html`.
- `examples/` : projet d'exemple « déclaration de sinistre » et chemins attendus.

## Modules

<!-- AUTO:DEBUT -->
<!-- Généré par `npm run map` : ne pas éditer à la main. -->

| Module | Responsabilité | API publique (`index.ts`) | Dépendances | Fichiers |
| --- | --- | --- | --- | --- |
| `app/commands` | Catalogue unique des actions (id, libellé, gestionnaire). | — | — | 1 |
| `app/i18n` | Langues des contenus et de l'interface (dictionnaires simples). | — | — | 1 |
| `app/persistence` | Sauvegarde automatique IndexedDB. | — | — | 1 |
| `app/shortcuts` | Liaisons clavier configurables vers les commandes. | — | — | 1 |
| `app/store` | État applicatif : projet, onglets, sélection, annuler/rétablir. | — | — | 1 |
| `core/expressions` | Analyse, évaluation, extraction des références, interpolation des libellés. Adaptateur JSONata isolé ici. | — | — | 1 |
| `core/model` | Types du domaine (projet, questionnaire, nœud, arête, question, bloc, variable, scénario) et quelques | * (./text), * (./question), * (./node), * (./graph), * (./documents), * (./keys) | — | 8 |
| `core/references` | Résolution des clés et espaces de noms, index des usages, renommage propagé. | — | — | 1 |
| `core/runtime` | Moteur de parcours : arêtes, boucles, répétitions, historique, retour arrière. | — | — | 1 |
| `core/validation` | Contraintes de champs et vérifications de graphe (spec §4.6). | — | — | 1 |
| `format` | Fichiers JSON : schémas, validation (Ajv, JSON Schema 2020-12), migrations (`formatVersion`), | SCHEMAS, validateDocument, documentKind, type DocumentKind, migrate, MIGRATIONS, type Migrations, serialize, newWorkspace, emptyLibrary, toBundle, exportBundle, exportFiles, importFiles, PROJECT_FILE, LIBRARY_FILE, type FileContent, type ImportResult | ajv, core/model | 7 |
| `registry` | Enregistrement des plugins ; seul point de connaissance de la liste des types. | — | — | 1 |
| `ui-kit` | Composants graphiques génériques (Tailwind + Radix). | — | — | 1 |
| `ui/diagram` | Intégration de React Flow, mise en page auto. Délègue le rendu des nœuds au registre. | — | — | 1 |
| `ui/expression-editor` | Saisie d'expression avec autocomplétion (CodeMirror 6). | — | — | 1 |
| `ui/library` | Bibliothèque, blocs, jeux de libellés. | — | — | 1 |
| `ui/preview` | Wizard, panneau d'état du système, débogage. Délègue le rendu des champs au registre. | — | — | 1 |
| `ui/properties` | Cadre du panneau de propriétés ; le contenu vient des plugins. | — | — | 1 |
| `ui/shell` | Barre de projet, onglets, import/export, paramètres. | App | — | 2 |
| `ui/system-state` | Dictionnaire des variables et scénarios. | — | — | 1 |

<!-- AUTO:FIN -->

## Matrice fonctionnalité → modules

| Évolution | Modules à lire / modifier |
| --- | --- |
| Ajouter un type de question | `plugins/question-types/<nouveau>`, `registry`, `format` (schéma), `docs/FORMAT.md` |
| Ajouter un type de nœud | `plugins/node-kinds/<nouveau>`, `registry`, `core/model`, `core/runtime`, `format` |
| Modifier la navigation | `core/runtime`, `tests/reference` (chemins attendus), `docs/FORMAT.md` |
| Modifier la grammaire des expressions | `core/expressions`, `core/references`, `ui/expression-editor`, `docs/FORMAT.md` |
| Ajouter une vérification (§4.6) | `core/validation` |
| Changer un raccourci ou ajouter une action | `app/commands`, `app/shortcuts` |
| Faire évoluer le format | `core/model`, `format` (schéma + migration), `docs/FORMAT.md`, `examples/` |
| Persistance navigateur | `app/persistence` |
| Texte de l'interface | `app/i18n` |
| Prévisualisation | `ui/preview`, `core/runtime` |

## Invariants

- `core` n'importe ni `app`, ni `ui`, ni `plugins`, ni librairie d'interface. Un plugin n'importe jamais un autre plugin.
- Import d'un autre module uniquement par son `index.ts` (dependency-cruiser).
- Changement du format JSON → schéma + migration (`formatVersion`) + `docs/FORMAT.md` + exemple.
- Toute action utilisateur passe par `app/commands` (palette, raccourcis).
- Tout texte destiné à l'utilisateur final est multilingue (`LocalizedText`).
- Un changement de comportement voulu met à jour les fichiers attendus de `tests/reference`, jamais l'inverse en silence.
