# ui/library

Onglet Bibliothèque et panneau latéral de glisser-déposer. Dépend de `app/commands`, `app/store`, `core`,
`ui-kit`, `ui/diagram`, `ui/properties`, `ui/expression-editor`.

## API
- `Library` : contenu de l'onglet. À gauche, la liste (jeux de libellés, questions, blocs ; « + » = commandes
  `library.newQuestion` / `library.newBlock`) ; à droite l'élément `store.libraryItem` (sans élément : jeux de libellés).
- `LibraryPanel({ graph })` : panneau filtrable à gauche du logigramme d'un questionnaire. Glisser un élément sur le
  graphe l'insère à cet endroit (`LIBRARY_MIME`, `library.insertItem` avec `position`) ; double-clic ou Entrée l'insère
  à la suite du nœud sélectionné. Pas de bloc proposé dans un bloc.

## Composants
- `LabelSets` : jeux de libellés (`kind` booléen ou tri-state, clé, libellés multilingues vrai / faux /
  « ne sait pas »). Création et suppression par les commandes `labelSet.addBoolean`, `labelSet.addTristate`,
  `labelSet.delete` ; saisie des libellés par `store.edit('library', …)` (frappes regroupées).
- `LibraryQuestionView` : question de bibliothèque, éditée avec `QuestionEditor` (`ui/properties`) dans l'historique
  `library` ; usages listés ; portée des expressions = réunion des graphes qui l'utilisent (`items.ts`).
- `BlockView` : bloc ; titre, clé, description (saisie `store.edit('library')`), suppression (`library.delete`),
  puis logigramme éditable (`Diagram` avec `GraphRef` bloc : les commandes du graphe y agissent), problèmes et propriétés.
- `items.ts` : `itemTitle`, `itemUsages`, `libraryQuestionScope`.
