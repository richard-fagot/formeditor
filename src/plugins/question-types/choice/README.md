# plugins/question-types/choice

Types « choix unique » (`single`, raccourci U) et « choix multiple » (`multiple`, raccourci M), dans un
même dossier : ils partagent l'éditeur d'options et la saisie (DECISIONS.md).

- `options-editor.tsx` : saisie rapide une option par ligne (collage multi-lignes), réconciliée avec les
  options existantes (`reconcile` : valeur, condition et traductions conservées) ; détail par option
  (valeur, libellé multilingue à variantes, condition d'affichage `when`).
- `source-editor.tsx` : source dynamique (`from` ; `label`, `value` évaluées sur chaque élément,
  saisies avec l'éditeur d'expression dans la portée des sous-champs de la liste).
- `other-editor.tsx` : option « Autre (préciser) » (libellé éditable, précision obligatoire).
- Une valeur qui n'est plus parmi les options visibles est refusée par `validateAnswer` (`option`).
- Prévisualisation : options visibles fournies par `env.options(q)` (moteur : `choiceOptions` de `core/runtime`).
- Aperçu du logigramme : ○ / ☐ par option (« ? » si conditionnée), `<source : libellé>`, tronqué par « … ».
- Changement de type unique ↔ multiple : options, source et « Autre » conservés.
