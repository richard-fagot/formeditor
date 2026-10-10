# plugins/question-types/choice

Types « choix unique » (`single`, raccourci U) et « choix multiple » (`multiple`, raccourci M), dans un
même dossier : ils partagent l'éditeur d'options et la saisie (DECISIONS.md).

- `options` : suite ordonnée d'entrées (option statique ou entrée dynamique `{ from, label?, value?, when? }`, EVO-001).
- `entries.ts` (pur, testé) : `lineOf` / `reconcile` (saisie rapide : `$<référence>` crée une entrée dynamique,
  `\$` en tête écrit une option statique commençant par `$`, `<` n'a pas de sens particulier ; une ligne
  identique garde son entrée, une ligne modifiée garde l'entrée de même rang et de même genre avec ses réglages),
  `moveEntry`, `duplicateEntry` (option statique dupliquée : nouvelle valeur).
- `options-editor.tsx` : saisie rapide une entrée par ligne (collage multi-lignes), puis la liste des détails.
- `entry-detail.tsx` : détail d'une entrée (monter, descendre, dupliquer, supprimer ; statique : valeur, libellé
  multilingue à variantes ; dynamique : `from`, puis `label` et `value` saisis dans la portée des sous-champs
  de la liste ; condition `when` pour les deux). Les modifications passent par `update` du panneau de propriétés
  (historique, comme les autres paramètres de type).
- `other-editor.tsx` : option « Autre (préciser) » (libellé éditable, précision obligatoire).
- Une valeur qui n'est plus parmi les options visibles est refusée par `validateAnswer` (`option`).
- Prévisualisation : options visibles fournies par `env.options(q)` (moteur : `choiceOptions` de `core/runtime`).
- Aperçu du logigramme : ○ / ☐ par entrée dans l'ordre (« ? » si conditionnée), `<from : libellé>` pour une entrée
  dynamique, « Autre » en dernier, tronqué par « … ».
- Changement de type unique ↔ multiple : entrées et « Autre » conservés.
