# plugins/question-types/choice

Types « choix unique » (`single`, raccourci U) et « choix multiple » (`multiple`, raccourci M), dans un
même dossier : ils partagent l'éditeur d'options et la saisie (DECISIONS.md).

- `options` : suite ordonnée d'entrées (option statique, entrée dynamique `{ from, label?, value?, when? }` (EVO-001),
  groupe `{ group, code?, when?, options }` (EVO-003)).
- `quick-lines.ts` (pur) : analyse et réaffichage de la saisie rapide. `# Libellé` ouvre un groupe ; `* ` / `- ` en tête
  est une puce retirée ; `$<référence>` crée une entrée dynamique ; `\$`, `\#`, `\*`, `\-` écrivent une option qui
  commence par ce caractère ; lignes vides ignorées. Réaffichage canonique : `# groupe`, options d'un groupe avec `* `,
  échappement si besoin (`linesOf`, `normalizeQuick`).
- `entries.ts` (pur, testé) : `lineOf` (ligne d'un élément), `reconcile` (une ligne identique garde son entrée, même
  déplacée ou changée de groupe ; une ligne modifiée garde l'entrée de même rang et de même genre avec ses réglages ;
  valeur nouvelle unique dans son groupe), `moveEntry` (un groupe se déplace avec ses options), `duplicateEntry`.
- `options-editor.tsx` : saisie rapide, puis une ligne par entrée ; la ligne d'un groupe précède celles de ses options.
  Monter / descendre n'échange qu'avec une voisine de même genre : une option reste dans son groupe, les options hors
  groupe restent avant le premier groupe.
- `group-detail.tsx` : ligne d'un groupe (libellé multilingue à variantes, « Code du groupe », condition ; monter,
  descendre, supprimer avec ses options).
- `entry-detail.tsx` : détail d'un élément (monter, descendre, dupliquer, supprimer ; statique : valeur, libellé
  multilingue à variantes ; dynamique : `from`, puis `label` et `value` saisis dans la portée des sous-champs
  de la liste ; condition `when` pour les deux). Les modifications passent par `update` du panneau de propriétés
  (historique, comme les autres paramètres de type).
- `other-editor.tsx` : option « Autre (préciser) » (libellé éditable, précision obligatoire).
- `choice-field.tsx` : saisie dans la prévisualisation (options visibles de `env.options(q)`, une section titrée par
  groupe visible, « Autre » en dernier) ; `onChange(valeur, précision, groupe)` : identifiant du groupe, `AUTRE`, ou
  liste parallèle aux valeurs (`""` hors groupe) ; `formatAnswer` : « Groupe — Option ».
- Une valeur (ou un couple groupe, valeur) qui n'est plus parmi les options visibles est refusée par `validateAnswer` (`option`).
- Aperçu du logigramme : ○ / ☐ par option dans l'ordre (« ? » si conditionnée), intitulé de groupe en gras avec ses
  options dessous, `<from : libellé>` pour une entrée dynamique, « Autre » en dernier, tronqué par « … ».
- Changement de type unique ↔ multiple : entrées et « Autre » conservés.

## Tests
`reconcile.test.ts`, `groups.test.ts` ; fumée : `tests/smoke/evo-001.spec.ts`, `tests/smoke/evo-003.spec.ts`.
