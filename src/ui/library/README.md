# ui/library

Onglet Bibliothèque et panneau latéral de glisser-déposer. Dépend de `app/commands`, `app/store`, `core`,
`ui-kit`, `ui/diagram`, `ui/properties`, `ui/expression-editor`.

## API
- `Library` : contenu de l'onglet. À gauche, la liste (jeux de libellés, questions, fragments ; « + » = commandes
  `library.newQuestion` / `library.newFragment`) ; à droite la question `store.libraryItem` (sans élément : jeux de libellés) ;
  un fragment s'ouvre dans son onglet (`library.show`). Clic droit sur un élément : « Dupliquer » (`library.duplicate`, EVO-010).
- `LibraryPanel({ graph })` : panneau filtrable à gauche du logigramme d'un questionnaire. Glisser un élément sur le
  graphe l'insère à cet endroit (`LIBRARY_MIME`, `library.insertItem` avec `position`) ; double-clic ou Entrée l'insère
  à la suite du nœud sélectionné. Dans un fragment, pas de fragment dont l'insertion créerait un cycle d'appels (`insertionCycle`).
- `FragmentView({ id })` (EVO-008) : contenu de l'onglet `f:<id>` (`ui/shell`) : bandeau « Fragment de la bibliothèque · n appelant(s) »
  (`fragmentCallers`) et bouton du panneau latéral ; titre, clé, description (`store.edit('library')`), suppression (`library.delete`) ;
  puis panneau latéral, logigramme éditable (`Diagram` avec `GraphRef` fragment : les commandes du graphe y agissent), problèmes, propriétés.

## Composants
- `LabelSets` : jeux de libellés (`kind` booléen ou tri-state, clé, libellés multilingues vrai / faux /
  « ne sait pas »). Création et suppression par les commandes `labelSet.addBoolean`, `labelSet.addTristate`,
  `labelSet.delete` ; saisie des libellés par `store.edit('library', …)` (frappes regroupées).
- `LibraryQuestionView` : question de bibliothèque, éditée avec `QuestionEditor` (`ui/properties`) dans l'historique
  `library` ; usages listés ; portée des expressions = réunion des graphes qui l'utilisent (`items.ts`).
- `items.ts` : `itemTitle`, `itemUsages`, `libraryQuestionScope`.
