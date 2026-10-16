# Existant — 5. Format JSON d'export (schéma réel)

Partie de l'inventaire : index, état au commit et conventions dans `docs/EXISTANT.md`.


Version courante : **`FORMAT_VERSION = 15`** (`src/core/model/documents.ts:5`). Les 7 fichiers JSON de `examples/declaration-sinistre/` sont valides pour les schémas du dépôt (Ajv 2020, `strict: false`, comme `src/format/validate.ts`).

### Fichiers produits

Deux commandes d'export (`src/app/commands/project-commands.ts:38-51`), et une sauvegarde automatique.

| Export | Fonction | Fichier(s) | Contenu |
| --- | --- | --- | --- |
| Bundle (`project.export`, `Mod+S`) | `exportBundle` (`files.ts:64`) | `<slug(nom du projet)>.bundle.json` (`project-commands.ts:41`, slug = minuscules sans accents, non-alphanumériques → `_`, défaut `projet`) | `{ formatVersion, kind: "bundle", project, library, questionnaires[], layouts[] }` : image exacte de l'espace de travail en mémoire (`toBundle`, `workspace.ts:27`). Contient les mises en page et commentaires. |
| Fichiers unitaires (`project.exportFiles`) | `exportFiles` (`files.ts:72-96`) | un téléchargement par fichier, espacés de 250 ms | voir ci-dessous |
| Sauvegarde navigateur | `exportBundle` dans `src/app/persistence/index.ts:53`, relue par `importFiles` sous le nom `session.bundle.json` (l.27) | stockage local | même bundle, donc migré à la relecture |

Fichiers unitaires, dans cet ordre :

1. `projet.json` (`PROJECT_FILE`) : le projet, avec `questionnaires[].file` **réécrit** au nom exporté de chaque questionnaire (`files.ts:74`).
2. `bibliotheque.json` (`LIBRARY_FILE`) : la bibliothèque ; pour chaque question et fragment, clés réordonnées `id, key, version, status` en tête (`deliveredLibrary`, `files.ts:58-61`). Le `status` absent n'est **pas** ajouté.
3. Pour chaque questionnaire (ordre du projet) : `<clé> - <version> - <final|provisoire>.json` (`questionnaireFileName`, `files.ts:26-29` : version vide → segment omis ; caractères `\ / : * ? " < > |` et de contrôle → `_` ; `final` si `status === "validated"`). Contenu (`deliveredQuestionnaire`, `files.ts:47-51`) :
   - clés en tête dans l'ordre `formatVersion, kind, id, key, title, description, version, status, validatedAt, libraryVersions` (`QUESTIONNAIRE_HEAD`, l.40), puis les autres dans leur ordre ;
   - `status` toujours écrit (`"draft"` si absent en mémoire) ;
   - `libraryVersions` : si validé, valeurs mémorisées à la validation ; sinon instantané courant `versionSnapshot` (`versioning.ts:46-50` : `{ version: item.version ?? "", status: "validated" | "draft" }` pour chaque question de bibliothèque ou fragment utilisé, récursivement à travers les fragments) ; omis si vide.
   - suivi, s'il existe, de sa mise en page `<même nom sans .json>.layout.json` (`layoutFileFor`, l.15).
4. `fragment_<clé>.layout.json` pour chaque fragment ayant une mise en page (l.86-89).
5. `question_<clé>.layout.json` pour chaque question de bibliothèque ayant un document layout (commentaires, EVO-011, l.91-94).

Séparation / exclusion :
- Les mises en page et commentaires de révision ne sont **que** dans les documents `layout` (fichiers `*.layout.json` ou `layouts[]` du bundle). Les fichiers unitaires les **incluent** ; c'est le kit développeurs qui les exclut (`kit-dev.mjs:48`), et `LISEZMOI.md` demande de ne pas les joindre.
- Le bundle n'applique ni le renommage des fichiers, ni l'écriture forcée de `status`/`libraryVersions`, ni le réordonnancement des clés.
- Pas de fichier par élément de bibliothèque (EVO-022, analyse §4).

Sérialisation (`serialize.ts:2-4`) : `JSON.stringify(doc, null, 2) + "\n"` : indentation 2 espaces, ordre d'insertion des clés conservé (pas de tri), saut de ligne final, UTF-8 (navigateur). La stabilité repose sur l'ordre en mémoire, plus les deux réordonnancements ci-dessus. L'aller-retour de l'exemple est testé identique à l'octet près (`tests/reference/format.test.ts:10` unitaire, `:49` bundle).

Import (`importFiles`, `files.ts:115-155`) : chaque fichier est parsé, **migré** puis **validé** ; une seule erreur → rien n'est chargé (`{ errors }`). Un bundle remplace tout. Sinon : avec `projet.json`, nouvel espace ; sans, fusion dans l'espace courant (ou un nouveau projet « Nouveau projet »). Questionnaire : remplacé par id ou ajouté (son nom de fichier devient l'entrée `file` s'il est absent du projet) ; `status` et `libraryVersions` **retirés** s'il n'est pas validé (`importedQuestionnaire`, l.54-57). Layout : remplacé par `graph`. Questionnaires triés selon l'ordre de `project.questionnaires`.

### Schéma JSON réel

JSON Schema 2020-12, validé par Ajv (`validate.ts:16`, `allErrors: true, strict: false`). Choix du schéma par `kind` (`documentKind`, l.31-34 : `questionnaire | library | project | layout | bundle` ; sinon erreur « Type de document inconnu (propriété "kind") »). Tous les objets sont fermés (`additionalProperties: false`, ou `unevaluatedProperties: false` pour les questions composées par `allOf`).

#### Définitions communes (`common.schema.json`)

| Définition | Type | Contraintes |
| --- | --- | --- |
| `formatVersion` (l.623) | integer | `minimum: 1` (pas de `const 15`) |
| `id` (l.10) | string | `minLength 1`, `pattern ^[^/]+$` — utilisé pour id de nœud, arête, question, champ de structure |
| `key` (l.71) | string | `^[a-z][a-z0-9_]*$` (mots réservés non contrôlés par le schéma) |
| `langCode` (l.16) | string | `^[a-z]{2,3}(-[A-Za-z0-9]+)?$` |
| `localizedText` (l.21) | object | `propertyNames` = `langCode`, valeurs string |
| `label` (l.31) | oneOf | `localizedText` \| `{ variants: [{ when: expression, text: localizedText }], otherwise: localizedText }` (fermé, `variants`/`otherwise` requis) |
| `expression` (l.6) | string | aucune contrainte syntaxique |
| `caption` (l.617) | string | `minLength 1`, `^[^\r\n]*$` |
| `numberBound` | oneOf | number \| expression |
| `dateBound` (l.86) | string | pas de pattern (date ISO ou expression) |
| `version` (l.627) | string | libre |
| `itemStatus` (l.631) | enum | `draft`, `validated` |
| `versionRef` (l.638) | object fermé | `version` (string) et `status` (`itemStatus`) requis |
| `countryCode` (l.655) | string | `^[A-Z]{2}$` |

**Options de choix**

| Définition | Propriétés (obligatoires en gras) | Notes |
| --- | --- | --- |
| `option` (l.90) | **`value`** string (`not const "other"`), **`label`** label, `when` expression | fermé |
| `dynamicEntry` (l.113) | **`from`**, `label`, `value`, `when` (expressions) | fermé |
| `choiceGroup` (l.148) | **`group`** label, `code` string `minLength 1`, `when`, **`options`** [choiceItem] | pas de groupe imbriqué |
| `choiceItem` / `choiceEntry` | oneOf option \| dynamicEntry (\| choiceGroup pour `choiceEntry`) | |
| `otherOption` (l.190) | `label` label, `detailRequired` boolean | fermé |
| `dontKnowOption` (l.202) | `label` label | fermé ; `{}` = activée |

**Question** : `questionCore` (l.915) + paramètres du type (branches `if type = … then params_<type>`, 11 branches) ; fermeture par `unevaluatedProperties: false` sur `question` (l.212-242, bibliothèque), `structureField` (l.244-270) et la question locale d'un nœud (l.272-294).

| Propriété (`questionCore`) | Type | Obligatoire |
| --- | --- | --- |
| `id` | `id` | oui |
| `key` | `key` | oui |
| `label` | label | oui |
| `type` | enum (voir ci-dessous) | oui |
| `description` | string | non |
| `help`, `placeholder` | label | non |
| `required` | boolean \| expression | non |
| `default` | quelconque | non |
| `defaultExpr` | expression | non |
| `messages` | objet : clé libre → localizedText | non |
| `constraints` | `[{ rule: expression (requis), message?: localizedText }]` fermé | non |
| `dontKnow` | `dontKnowOption` | non (interdit sur `structure` : `not required dontKnow`, l.808) |

Spécifique selon le contexte : `question` (bibliothèque) ajoute `version`, `status` (`itemStatus`) et `type` ∈ 11 types ; `structureField` ajoute `when` et `type` ∈ 10 types (sans `structure`) ; la question locale d'un nœud ajoute `kind: "question"` et interdit `ref` (l.289).

| `type` | Paramètres (`params_<type>`) | Obligatoire |
| --- | --- | --- |
| `text` | `multiline` bool, `minLength`/`maxLength` int ≥ 0, `pattern` string, `suggestions` expression | — |
| `date` | `min`, `max` : dateBound | — |
| `number` | `numberKind` enum `real\|natural\|integer`, `min`/`max` numberBound, `decimals` int ≥ 0, `unit` localizedText | — |
| `single` | `options` [choiceEntry], `other` | `options` |
| `multiple` | `options`, `other`, `minSelected`/`maxSelected` int ≥ 0 | `options` |
| `boolean` | `labelSet` string (id), `other` | — |
| `structure` | `fields` [structureField], `repeat` `{ min int ≥ 0, max int ≥ 1, addLabel localizedText }` fermé | `fields` |
| `email` | aucun (déclare `type: const email` pour le piège Ajv, README format) | — |
| `phone` | `defaultCountry`, `countries` (uniques), `lineType` enum `mobile\|fixed` | — |
| `address` | `defaultCountry`, `countries` (uniques), `minLength` int ≥ 0, `maxLength` int ≥ 1, `verify` bool | — |
| `civility` | `labels` `{ MME?, M?, NP? }` localizedText fermé, `short` bool, `undisclosed` bool | — |

**Nœuds** (`node`, l.272, `oneOf` à 8 branches ; `kind` obligatoire partout ; même définition pour les nœuds d'un questionnaire et d'un fragment)

| Branche | Propriétés (obligatoires en gras) |
| --- | --- |
| question locale (l.272-294) | `kind: "question"` + question complète (`questionCore` + paramètres), sans `ref` |
| question de bibliothèque (l.296-) | **`kind`** `question`, **`id`**, **`ref`** string, `label` label, `hiddenFields` [key] `uniqueItems` (l.326), `required` boolean, `description` |
| fragment (l.353) | **`kind`** `fragment`, **`id`**, **`ref`**, **`alias`** key, `requiredOverrides` objet (clés `^[^/]+(/[^/]+)*$` → boolean), `description` |
| info (l.390) | **`kind`**, **`id`**, **`text`** label, `title` label, `description` |
| summary (l.416) | **`kind`**, **`id`**, `title` label, `description` |
| end (l.440) | **`kind`**, **`id`**, **`message`** label, `title` label, `outcome` string, `description` |
| redirect (l.471, version 15) | **`kind`**, **`id`**, **`text`** label, **`buttons`** [`redirectButton`], `title` label, `finishLabel` label, `description` |
| exit (l.509) | **`kind`**, **`id`**, **`name`** key, `label` localizedText, `description` |

**Bouton de renvoi** (`redirectButton`, l.521) : **`label`** label, `target` = `oneOf` { **`questionnaire`** string, **`prefill`** boolean, **`replace`** boolean } fermé | { **`node`** string `^[^/]+(/[^/]+)*$` } fermé (un toggle sur une cible nœud ou une cible `{}` est refusé), `when` expression ; fermé. Aucune contrainte d'intégrité (questionnaire ou nœud existant, cible en amont).

**Arête** (`edge`, l.580) : **`id`** (`id`), **`from`**, **`to`** (string), `when` expression, `exit` string, `caption`, `description` ; fermée.

#### Projet (`project.schema.json`)

| Propriété | Type | Obligatoire | Contraintes |
| --- | --- | --- | --- |
| `formatVersion` | formatVersion | oui | |
| `kind` | `const "project"` | oui | |
| `id`, `name` | string | oui | `id` non contraint |
| `description` | string | non | |
| `languages` | [langCode] | oui | `minItems 1`, `uniqueItems` |
| `defaultLanguage` | langCode | oui | appartenance à `languages` non contrôlée |
| `systemState` | [`variable`] | oui | |
| `scenarios` | [`{ id, name, values }` + `description?`] | oui | fermé ; `values` objet libre |
| `questionnaires` | [`{ id, file }`] | oui | fermé |

`variable` (`$defs`, l.20-64) : **`name`** key, **`type`** enum `text|number|date|boolean|enum|list`, `caption`, `description`, `values` [string], `fields` [variable] (récursif), `example` (quelconque) ; fermé.

#### Questionnaire (`questionnaire.schema.json`)

Requis : `formatVersion, kind ("questionnaire"), id, key, title (localizedText), start (string), nodes [node], edges [edge]`.
Facultatifs : `description` string, `version`, `status` enum `draft|validated` (l.39), `validatedAt` string `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` (l.46), `libraryVersions` objet id → `versionRef`. Fermé.

#### Bibliothèque (`library.schema.json`)

Requis : `formatVersion, kind ("library"), questions [question], fragments [...], labelSets [...]`. Fermé.
- Fragment : **`id`**, **`key`**, **`title`** localizedText, **`nodes`**, **`edges`**, `version`, `status` (itemStatus), `description`, `entry` string ; fermé ; pas de `start`.
- Jeu de libellés : **`id`**, **`key`**, **`kind`** enum `["boolean"]` (seul), **`yes`**, **`no`** localizedText, `description` ; fermé.

#### Layout (`layout.schema.json`, « outil seulement »)

Requis : `formatVersion, kind ("layout"), graph (string), nodes` ; `nodes` = objet id → `{ x, y (number, requis), collapsed? bool }` fermé ; `comments?` = [`{ node, text, replies[string] }` requis, `x?`, `y?` number] fermé.

#### Bundle (`bundle.schema.json`)

Requis : `formatVersion, kind ("bundle"), project, library, questionnaires[], layouts[]` ; chaque partie est validée par le schéma de son document (`$ref`), donc porte elle-même `formatVersion` et `kind`. Fermé.

#### Extraits (tirés de `examples/declaration-sinistre/`, abrégés)

`demande_remboursement - 1.0.4 - final.json` :

```json
{
  "formatVersion": 15,
  "kind": "questionnaire",
  "id": "q_remboursement",
  "key": "demande_remboursement",
  "title": { "fr": "Demande de remboursement", "en": "Refund request" },
  "description": "Commence par le fragment « identification_assure » (départ sur le nœud fragment).",
  "version": "1.0.4",
  "status": "validated",
  "validatedAt": "2026-10-13",
  "libraryVersions": {
    "frg_identification_assure": { "version": "1.2.0", "status": "validated" },
    "lq_identite": { "version": "2.1.0", "status": "validated" }
  },
  "start": "n_ident",
  "nodes": [
    { "kind": "fragment", "id": "n_ident", "ref": "frg_identification_assure", "alias": "ident",
      "requiredOverrides": { "fn_num_secu": false } },
    { "kind": "info", "id": "n_mineur", "title": { "fr": "Assuré mineur", "en": "Minor policyholder" }, "text": { "…": "…" } }
  ],
  "edges": [
    { "id": "e_ident_mineur", "from": "n_ident", "to": "n_mineur", "when": "ident.majeur = false", "caption": "Assuré mineur" },
    { "id": "e_ident_montant", "from": "n_ident", "to": "n_montant_demande" }
  ]
}
```

`bibliotheque.json` (question) :

```json
{ "id": "lq_date_sinistre", "key": "date_sinistre", "version": "1.0.0", "status": "validated",
  "label": { "fr": "Date du sinistre", "en": "Date of the claim" }, "type": "date", "required": true,
  "min": "sys.date_effet_contrat", "max": "$today()",
  "messages": { "min": { "fr": "Le sinistre est antérieur à la date d'effet du contrat.", "en": "…" } },
  "defaultExpr": "$today()" }
```

`declaration_sinistre - 1.0.5 - provisoire.json`, nœud Renvoi (abrégé) :

```json
{ "kind": "redirect", "id": "n_renvoi",
  "title": { "fr": "Ce n'est pas la bonne déclaration", "en": "…" }, "text": { "…": "…" },
  "buttons": [
    { "label": { "fr": "Faire plutôt une demande de remboursement", "en": "…" },
      "target": { "questionnaire": "q_remboursement", "prefill": true, "replace": true } },
    { "label": { "fr": "Rectifier le type de sinistre", "en": "…" }, "target": { "node": "n_type" } } ],
  "finishLabel": { "fr": "Abandonner", "en": "Give up" } }
```

`declaration_sinistre - 1.0.5 - provisoire.layout.json` (abrégé) :

```json
{ "formatVersion": 15, "kind": "layout", "graph": "q_declaration",
  "nodes": { "n_intro": { "x": 0, "y": 0 } },
  "comments": [ { "node": "n_date", "x": -320, "y": 300, "text": "Faut-il borner à la date du jour ?",
                  "replies": ["Oui, pas de date future.", "Et pas avant la date d'effet du contrat."] } ] }
```

Composition de l'exemple : `projet.json` (2 langues fr/en, 6 variables système dont `enum` et `list`, scénarios, 2 questionnaires) ; `bibliotheque.json` (4 questions : `date_sinistre` date 1.0.0 validée, `telephone` text 1.0.0 validée, `souscripteur` structure 0.1.0 **sans status**, `identite` structure 2.1.0 validée ; 2 fragments `identite_tiers` 1.1.0 et `identification_assure` 1.2.0 validés, sans `entry` ; 2 jeux booléens) ; un questionnaire provisoire (`status: "draft"`, `libraryVersions` courant ; nœud Renvoi `n_renvoi` atteint par l'arête `e_type_renvoi` si `type_sinistre = 'bris_materiel'`, suivi de la fin `n_fin_renvoi`, branche qu'aucun chemin attendu n'emprunte) et un validé ; 3 layouts ; `chemins/` (7 parcours attendus, propriétés `description, questionnaire, scenario, today, answers[{step, value, group, other, dontKnow}], path, outcome`).

### Migrations

`migrate(doc, MIGRATIONS, FORMAT_VERSION)` (`migrate.ts:156-170`), appliquée à chaque fichier **avant** validation (`files.ts:121`). Les étapes sont indexées par la version de départ ; pour un bundle, chaque étape met aussi à jour `formatVersion` de `project`, `library`, `questionnaires[]`, `layouts[]` (`bump`, l.144-153).

| N → N+1 | EVO | Transformation (`src/format/migrate.ts`) |
| --- | --- | --- |
| 1 → 2 | 001 | `source` d'un choix (question, champ de structure, questions et `blocks` de bibliothèque) ajouté en dernière entrée de `options` puis supprimé (l.9-22, 27-46) |
| 2 → 3 | 003 | numéro seul (l.48) |
| 3 → 4 | 005 | numéro seul (l.50) |
| 4 → 5 | 006 | numéro seul (l.52) |
| 5 → 6 | 007 | numéro seul (l.54) |
| 6 → 7 | 008 | nœuds `kind: "block"` → `"fragment"` ; `library.blocks` → `library.fragments` (placé après `questions`, fusionné avec un `fragments` existant) ; `start` d'un bloc → `entry` seulement s'il n'est pas l'unique nœud sans arête entrante et désigne un nœud existant (l.56-71, 117-140) |
| 7 → 8 | 009 | numéro seul (l.73) |
| 8 → 9 | 011 | numéro seul (l.75) |
| 9 → 10 | 012 | numéro seul (l.77) |
| 10 → 11 | 015 | numéro seul (l.79) |
| 11 → 12 | 016 | numéro seul (l.81) |
| 12 → 13 | 018 | parcours récursif de tout le document : tout objet `type: "tristate"` → `"boolean"`, `default: "unknown"` retiré, `dontKnow ??= {}` ; tout objet `kind: "tristate"` ayant `yes` → `"boolean"` sans `unknown` ; expressions non réécrites (l.84, 99-116) |
| 13 → 14 | 022 | numéro seul (l.89) |
| 14 → 15 | 024 | numéro seul (l.91) |

Comportements limites (`migrate.ts:158-168`, `files.ts:118-128`) :
- `formatVersion` absent → traité comme 1.
- Version future (`> 15`) → exception « Format N plus récent que celui de l'outil (15). » → erreur `<fichier> : …`, rien n'est chargé.
- Version sans migration (ex. 0) → « Aucune migration depuis la version 0. ».
- `formatVersion` non numérique (ex. `"abc"` → `NaN`) : aucune migration, puis rejet par le schéma (entier attendu). `"15"` (chaîne) : pas de migration, rejet par le schéma.
- JSON illisible → message de `JSON.parse` préfixé du nom de fichier.
- Schéma non respecté → liste d'erreurs `<fichier> <chemin> : <message> (<propriété en trop>)`, dédoublonnées (`validate.ts:37-46`).
- Un seul fichier en erreur → `{ errors }` sans espace de travail (tout ou rien).

### Kit développeurs

`npm run kit-dev` → `node scripts/kit-dev.mjs [dossier]` (défaut `kit-dev/` à la racine, ignoré par Git : `.gitignore:11`). Il supprime puis recrée le dossier (`kit-dev.mjs:44-55`) :
- `schemas/` : les 6 `*.schema.json` copiés tels quels ;
- `exemple/` : les JSON de `examples/declaration-sinistre/` **sauf** `*.layout.json` (soit `projet.json`, `bibliotheque.json`, les 2 questionnaires) ;
- `exemple/chemins/` : les 7 parcours attendus ;
- `FORMAT.md` : `docs/FORMAT.md` sans les lignes contenant `<!-- outil -->`, chemins `src/format/schemas/` → `schemas/` et `examples/declaration-sinistre/` → `exemple/` (l.12-17) ;
- `LISEZMOI.md` : contenu, version du format lue dans `examples/.../projet.json` (15 aujourd'hui), fichiers à joindre (`projet.json`, `bibliotheque.json`, questionnaires, sans `.layout.json`), règle « seuls les questionnaires `validated` sont livrables » (l.20-42).
Aucun schéma n'est fourni pour les fichiers `chemins/*.json`.
