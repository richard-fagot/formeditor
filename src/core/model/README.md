# core/model

Types du domaine (projet, questionnaire, nœud, arête, question, bloc, variable, scénario) et quelques
utilitaires purs. Aucun import externe : c'est la base de tous les autres modules.

## API
- `text.ts` : `LocalizedText`, `Label` (texte ou variantes `{variants, otherwise}`), `Expression`, `isVariantLabel`, `labelTexts`.
- `question.ts` : `Question` (union discriminée par `type`), `QUESTION_TYPES`, `ChoiceEntry` (entrée d'un choix :
  `ChoiceOption` statique ou `DynamicEntry` `{ from, label?, value?, when? }`, discriminées par `isDynamicEntry` = présence de `from`),
  `OtherOption`, `StructureField`, `OTHER_VALUE` (`"other"`), `UNKNOWN_VALUE` (`"unknown"`).
- `node.ts` : `GraphNode` (union par `kind` : question locale ou de bibliothèque, block, info, summary, end, exit),
  `isLocalQuestion`, `isLibraryQuestion`.
- `graph.ts` : `Edge`, `Graph`.
- `documents.ts` : `Questionnaire`, `Library`, `Block`, `LabelSet`, `Project`, `SystemVariable`, `Scenario`,
  `Layout`, `Workspace` (projet complet en mémoire), `Bundle`, `FORMAT_VERSION`.
- `keys.ts` : `deriveKey` (« Date du sinistre » → `date_sinistre`), `uniqueKey`, `isValidKey`, `newId`, `RESERVED_KEYS`.

## Invariants
- Les types reflètent exactement le format JSON (docs/FORMAT.md) : le modèle en mémoire **est** le format.
  Toute modification ici implique schéma + migration + FORMAT.md + exemple.
- Un nœud question local porte la question (id du nœud = id de la question).
- Rang des arêtes = ordre dans `edges`.

## Pièges
- `StructureField` exclut le type `structure` (pas de structure imbriquée).

## Tests
`keys.test.ts`.
