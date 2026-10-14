# app/issues

Problèmes non bloquants du projet (spec §4.6), pour les vues (EVO-025). Règle d'usage : `docs/ERREURS.md`.
Dépend de `core/validation` (`checkWorkspace`, appelé ici seulement hors `core` et tests) et de `app/store`.

## API
- `issuesOf(ws)` : `checkWorkspace(ws)` mémorisé sur la référence de `ws` (même `ws` → même tableau).
- `selectIssues(issues, filtre)` (pure, ordre conservé) ; `IssueFilter` : `owner` (`{ kind, id? }`), `ownerIds`, `code`,
  `lang` (langue citée dans `params.lang` d'une traduction manquante).
- `useIssues(filtre)` : problèmes du projet courant retenus par le filtre (comparé par valeur).
