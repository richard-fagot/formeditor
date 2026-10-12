# format

Fichiers JSON : schémas, validation (Ajv, JSON Schema 2020-12), migrations (`formatVersion`),
sérialisation, import/export unitaire et bundle. Dépend uniquement de `core/model`.

## API
- `SCHEMAS`, `validateDocument(doc) → string[]`, `documentKind(doc)`.
- `migrate(doc, migrations?, target?)`, `MIGRATIONS` (1 → 2 : `source` d'un choix devient une entrée dynamique
  placée après les options statiques, questionnaires, bibliothèque et bundle, champs de structure compris ;
  2 → 3 : groupes d'options ; 3 → 4 : libellés `caption` (EVO-005) ; seul `formatVersion` change, documents d'un bundle compris).
- `serialize(doc)` : JSON indenté 2 espaces, ordre des clés conservé, `\n` final.
- `newWorkspace(name, lang)`, `emptyLibrary()`, `toBundle(ws)`.
- `exportFiles(ws) → FileContent[]` (`projet.json`, `bibliotheque.json`, `<q>.json`, `<q>.layout.json`, `bloc_<cle>.layout.json`).
- `exportBundle(ws) → string`.
- `importFiles(files, current?) → { workspace?, errors }` : bundle ou fichiers unitaires ; sans `projet.json`,
  les fichiers sont fusionnés dans `current`. Un fichier invalide → rien n'est chargé.

## Schémas
`schemas/*.schema.json` sont des **livrables** pour l'équipe de dev ; ils sont la source de vérité
(édités à la main). `common.schema.json` : définitions partagées (`id` sans `/`, `langCode`, `question`, `params_<type>`, `node`, `edge`,
`caption` (libellé de lecture d'une arête ou d'une variable : chaîne non vide sur une ligne), `choiceEntry` = option | entrée dynamique | `choiceGroup`, `choiceItem` = option | entrée dynamique…).
Le sens de chaque propriété (navigation, validation, expressions) est dans `docs/FORMAT.md`.

## Invariants
- Changement du format → schéma + entrée dans `MIGRATIONS` + `FORMAT_VERSION` + `docs/FORMAT.md` + exemple.
- L'aller-retour import/export de l'exemple est identique à l'octet près (`tests/reference/format.test.ts`).

## Tests
`format.test.ts` (unitaires, migration 1 → 2 sur `fixtures/*-v1.json`, migration 2 → 3 et groupes, migration 3 → 4 et libellés `caption`) ; `tests/reference/format.test.ts` (exemple).
