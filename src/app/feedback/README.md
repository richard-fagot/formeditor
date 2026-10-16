# app/feedback

Refus, informations, échecs et confirmations destinés à l'utilisateur (EVO-025). Règle d'usage : `docs/ERREURS.md`.
Dépend de `app/i18n` seulement ; `app/store` s'y branche (`bindFeedback`) pour éviter un cycle.

## API
- `refuse(titre, ...lignes)`, `inform(titre, ...lignes)`, `fail(titre, erreur)` : remplissent `notice` de l'état applicatif
  (boîte de `ui/shell`, un seul message à la fois, le dernier remplace le précédent ; aucun niveau affiché).
  `fail` affiche `erreur.message` (ou `String(erreur)`).
- `confirm(question, ...lignes): boolean` (lignes de précision jointes par saut de ligne, EVO-027) : seul appel à `window.confirm` (simulable en test par `vi.stubGlobal('window', …)`).
- `Message` : clé typée (`MessageKey`), `{ key, params }` ou `{ raw }` (texte non traduit, ex. erreurs d'import) ;
  traduit dans la langue de l'interface au moment de l'appel. `Notice` : `{ title, lines }`.
- `bindFeedback({ lang, set })` : branchement fait une fois par `app/store` (`store.ts`).

Contrôle (`single-path.test.ts`, dans `npm run check`) : hors tests, `window.confirm` et toute écriture de `notice` (sauf remise à zéro
à la fermeture dans `ui/shell/App.tsx` et au chargement dans `app/store`) sont interdits hors de ce module ; `checkWorkspace` n'est appelé que
dans `app/issues` (et `core`).
