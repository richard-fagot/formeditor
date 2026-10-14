# app/feedback

Refus, informations, échecs et confirmations destinés à l'utilisateur (EVO-025). Règle d'usage : `docs/ERREURS.md`.
Dépend de `app/i18n` seulement ; `app/store` s'y branche (`bindFeedback`) pour éviter un cycle.

## API
- `refuse(titre, ...lignes)`, `inform(titre, ...lignes)`, `fail(titre, erreur)` : remplissent `notice` de l'état applicatif
  (boîte de `ui/shell`, un seul message à la fois, le dernier remplace le précédent ; aucun niveau affiché).
  `fail` affiche `erreur.message` (ou `String(erreur)`).
- `confirm(question): boolean` : seul appel à `window.confirm` (simulable en test par `vi.stubGlobal('window', …)`).
- `Message` : clé typée (`MessageKey`), `{ key, params }` ou `{ raw }` (texte non traduit, ex. erreurs d'import) ;
  traduit dans la langue de l'interface au moment de l'appel. `Notice` : `{ title, lines }`.
- `bindFeedback({ lang, set })` : branchement fait une fois par `app/store` (`store.ts`).
