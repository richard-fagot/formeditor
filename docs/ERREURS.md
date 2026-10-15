# Signaler un problème à l'utilisateur

Référence unique (EVO-025). L'endroit d'affichage dépend de la **nature** du problème ; il n'y a ni bus d'événements
ni abonnement. `core/*` reste pur : il renvoie des valeurs (`Issue[]`, `FieldError[]`, `SyntaxError`), jamais de message affiché.

| Nature | API | Affichage | Exemple d'une ligne |
| --- | --- | --- | --- |
| Action refusée (rien n'est fait) | `refuse(titre, ...lignes)` — `app/feedback` | Boîte de message (`notice`, `ui/shell`) | `refuse('group.refused', 'group.forbidden')` |
| Information après une action faite | `inform(titre, ...lignes)` — `app/feedback` | Boîte de message | `inform('paste.title', { key: 'paste.end', params: { name } })` |
| Échec inattendu (exception) | `fail(titre, erreur)` — `app/feedback` | Boîte de message, ligne = `erreur.message` | `fail('image.failed', e)` |
| Confirmation avant une action | `confirm(question)` — `app/feedback` | `window.confirm` | `if (!confirm('comment.confirmDelete')) return;` |
| Problème non bloquant du projet (§4.6) | `useIssues(filtre)` (vues), `issuesOf(ws)` + `selectIssues` — `app/issues` | Panneau Problèmes, badges, listes | `const issues = useIssues({ owner: { kind: 'questionnaire', id } });` |
| Saisie invalide à la sortie d'un champ (prévisualisation) | `useBlurErrors(env, errors)` — `plugin-api` ; `FieldErrors` — `ui-kit` | Sous le champ | `<FieldErrors messages={blurErrors.shown} />` |

## Règles

- **Messages** (`app/feedback`) : clé typée (`MessageKey` d'`app/i18n`), `{ key, params }`, ou `{ raw: texte }` pour un texte
  non traduit (erreurs de schéma à l'import, expressions citées). Traduits dans la langue de l'interface au moment de l'appel.
  Un seul message à la fois : le dernier remplace le précédent ; aucun niveau n'est affiché (`refuse` et `inform` ne diffèrent que par l'intention).
- **Confirmations** : toujours `confirm` d'`app/feedback`, jamais `window.confirm` directement (simulable en test par
  `vi.stubGlobal('window', { confirm })`).
- **Problèmes du projet** : jamais `checkWorkspace(ws).filter(…)` dans une vue ; `issuesOf` mémorise la vérification par projet.
- **Champs** : `onBlur(formatErrors(…))` à la sortie, `reset()` à la saisie ; rien n'est affiché si les contrôles de saisie sont
  désactivés (EVO-014) ou si la question a déjà une erreur de validation.
- **Hors périmètre** : erreurs de syntaxe des expressions (`ui/expression-editor`), garde de parcours (`ui/preview/path-check.ts`),
  erreurs locales de saisie dans l'éditeur (`ValueInput`, `KeyInput`…).

## Contrôle automatique

`src/app/feedback/single-path.test.ts` (dans `npm run check`) : hors tests, pas de `window.confirm` ni d'écriture de `notice`
hors d'`app/feedback` (remise à zéro exceptée : fermeture dans `ui/shell/App.tsx`, chargement dans `app/store`) ;
`checkWorkspace` appelé seulement dans `app/issues` (et `core`).
