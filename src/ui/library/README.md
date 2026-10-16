# ui/library

Onglet Bibliothèque et panneau latéral de glisser-déposer. Dépend de `app/commands`, `app/store`, `core`,
`ui-kit`, `ui/diagram`, `ui/properties`, `ui/expression-editor`.

## API
- `Library` : contenu de l'onglet. À gauche, la liste (jeux de libellés, questions, fragments ; « + » = commandes
  `library.newQuestion` / `library.newFragment`) ; à droite la question `store.libraryItem` (sans élément : jeux de libellés) ;
  un fragment s'ouvre dans son onglet (`library.show`). L'élément affiché porte `aria-current` et reste visible dans la liste (`scrollIntoView`, EVO-013). Clic droit sur un élément : « Dupliquer » (`library.duplicate`, EVO-010), « Commenter » sur une question (`comment.add`, EVO-011).
- `LibraryPanel({ graph })` : panneau filtrable à gauche du logigramme d'un questionnaire. Glisser un élément sur le
  graphe l'insère à cet endroit (`LIBRARY_MIME`, `library.insertItem` avec `position`) ; double-clic ou Entrée l'insère
  à la suite du nœud sélectionné. Dans un fragment, pas de fragment dont l'insertion créerait un cycle d'appels (`insertionCycle`).
- `UnusedTotal` (EVO-028) : nombre total d'éléments inutilisés (pastille ambre), rien s'il est nul.
- `FragmentView({ id })` (EVO-008) : contenu de l'onglet `f:<id>` (`ui/shell`) : bandeau « Fragment de la bibliothèque · n appelant(s) »
  (`fragmentCallers`), bouton « Commentaires » (`comment.toggleAll`, EVO-011) et bouton du panneau latéral ; titre, clé, description (`store.edit('library')`), suppression (`library.delete`) ;
  puis panneau latéral, logigramme éditable (`Diagram` avec `GraphRef` fragment : les commandes du graphe y agissent), problèmes (`useIssues` d'`app/issues`), propriétés.

## Composants
- `LabelSets` : jeux de libellés booléens (clé, libellés multilingues vrai / faux ; plus de jeu tri-state, EVO-018).
  Création et suppression par les commandes `labelSet.addBoolean`, `labelSet.delete` ; saisie des libellés par `store.edit('library', …)` (frappes regroupées).
- `LibraryQuestionView` : commentaire de révision en tête s'il existe (`CommentThread`, EVO-011) ; question de bibliothèque, éditée avec `QuestionEditor` (`ui/properties`) dans l'historique
  `library` ; usages listés ; portée des expressions = réunion des graphes qui l'utilisent (`items.ts`).
- `items.ts` : `itemTitle`, `itemUsages`, `libraryQuestionScope`.
- `Unused.tsx` (EVO-028) : `useUnused` (`unusedLibraryItems` du projet), `UnusedMark` (triangle ambre `unused-mark`, infobulle), `UnusedCount`
  (« (n inutilisé(e)s) » après le titre d'une rubrique, `unused-count`), `UnusedTotal` (pastille `unused-total`, exportée pour l'onglet et le lien
  « Bibliothèque » de `ui/shell`). Rien d'affiché à zéro. Indicateurs dans la liste de `Library` (questions, fragments) et sur les cartes de `LabelSets`.
- `ItemVersion({ item })` (EVO-022) : version (`library.setVersion`, grisée si validé, infobulle), statut, « Valider » / « Dévalider » (`library.validate` / `library.unvalidate`),
  questionnaires qui l'utilisent (`itemUsers`) ; en tête de `LibraryQuestionView` et dans le bandeau de `FragmentView`.
