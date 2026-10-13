# format

Fichiers JSON : schémas, validation (Ajv, JSON Schema 2020-12), migrations (`formatVersion`),
sérialisation, import/export unitaire et bundle. Dépend uniquement de `core/model`.

## API
- `SCHEMAS`, `validateDocument(doc) → string[]`, `documentKind(doc)`.
- `migrate(doc, migrations?, target?)`, `MIGRATIONS` (1 → 2 : `source` d'un choix devient une entrée dynamique
  placée après les options statiques, questionnaires, bibliothèque et bundle, champs de structure compris ;
  2 → 3 : groupes d'options ; 3 → 4 : libellés `caption` (EVO-005) ; 4 → 5 : « Ne sais pas » (EVO-006) ; 5 → 6 : types mail, téléphone, adresse, civilité (EVO-007) ; seul `formatVersion` change, documents d'un bundle compris ;
  6 → 7 (EVO-008) : `library.blocks` → `library.fragments` (`start` → `entry` seulement s'il n'est pas l'unique nœud sans arête entrante),
  nœuds `block` → `fragment`, bundle compris) ; 7 → 8 (EVO-009) : `hiddenFields` d'une instance, seul `formatVersion` change ; 8 → 9 (EVO-011) : `comments` d'une mise en page, seul `formatVersion` change ; 9 → 10 (EVO-012) : `required` d'une référence, `requiredOverrides` d'un appel, seul `formatVersion` change ; 10 → 11 (EVO-015) : `status` / `validatedAt` d'un questionnaire, seul `formatVersion` change ; 11 → 12 (EVO-016) : `suggestions` d'un champ texte, seul `formatVersion` change ; 12 → 13 (EVO-018) : tout `type: "tristate"` → `"boolean"` + `dontKnow` (existant gardé, sinon `{}`), `default: "unknown"` retiré, jeu `kind: "tristate"` → `"boolean"` sans `unknown` ; expressions non réécrites.
- `serialize(doc)` : JSON indenté 2 espaces, ordre des clés conservé, `\n` final.
- `newWorkspace(name, lang)`, `emptyLibrary()`, `toBundle(ws)`.
- `exportFiles(ws) → FileContent[]` (`projet.json`, `bibliotheque.json`, `<q>.json`, `<q>.layout.json`, `fragment_<cle>.layout.json`, `question_<cle>.layout.json` : commentaires d'une question de bibliothèque, EVO-011).
- `exportBundle(ws) → string`.
- `importFiles(files, current?) → { workspace?, errors }` : bundle ou fichiers unitaires ; sans `projet.json`,
  les fichiers sont fusionnés dans `current`. Un fichier invalide → rien n'est chargé.

## Schémas
`schemas/*.schema.json` sont des **livrables** pour l'équipe de dev ; ils sont la source de vérité
(édités à la main). `common.schema.json` : définitions partagées (`id` sans `/`, `langCode`, `question`, `params_<type>`, `node`, `edge`,
`caption` (libellé de lecture d'une arête ou d'une variable : chaîne non vide sur une ligne), `choiceEntry` = option | entrée dynamique | `choiceGroup`, `choiceItem` = option | entrée dynamique…, `dontKnowOption` (propriété `dontKnow` de `questionCore`, refusée par `params_structure`)).
`params_email`, `params_phone`, `params_address`, `params_civility`, `countryCode` (ISO 3166-1 alpha-2) : EVO-007.
Piège (Ajv) : un `params_<type>` sans propriété propre doit tout de même déclarer `properties` non vide (`params_email` déclare
`type`), sinon Ajv tient `type` pour évalué même quand aucun `if` ne correspond, et un type inconnu passe `unevaluatedProperties`.
Le sens de chaque propriété (navigation, validation, expressions) est dans `docs/FORMAT.md`.

## Invariants
- Changement du format → schéma + entrée dans `MIGRATIONS` + `FORMAT_VERSION` + `docs/FORMAT.md` + exemple.
- L'aller-retour import/export de l'exemple est identique à l'octet près (`tests/reference/format.test.ts`).

## Tests
`format.test.ts` (unitaires, migration 1 → 2 sur `fixtures/*-v1.json`, migration 2 → 3 et groupes, migration 3 → 4 et libellés `caption`, migration 4 → 5 et « Ne sais pas », migration 5 → 6 et types EVO-007, migration 6 → 7 et fragments EVO-008, migration 7 → 8 et champs masqués EVO-009, version 9 et commentaires EVO-011, version 10 et surcharges du caractère obligatoire EVO-012, version 11 et état de validation EVO-015, version 12 et suggestions EVO-016) ; `migrate-tristate.test.ts` (migration 12 → 13, EVO-018) ; `tests/reference/format.test.ts` (exemple).
