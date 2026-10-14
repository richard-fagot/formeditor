# EVO-025 — Refactoring du système de gestion des erreurs

Statut : en cours
Dépend de : —

## Besoin

Signaler un problème à l'utilisateur s'écrit aujourd'hui de cinq façons différentes, recopiées à la main :

- 15 écritures directes `st().set(s => void (s.notice = { title: t()(…), lines: […] }))`, chacune
  recréant `makeTranslate(st().uiLang)` (`app/commands/*`, `app/store/store.ts` `refused()`,
  `ui/diagram/useImageExport.ts`) ;
- 4 `window.confirm(makeTranslate(st().uiLang)(…))` dans `app/commands` (non testables) ;
- 7 vues qui refont `useMemo(() => checkWorkspace(ws).filter(…))` (`QuestionnaireView`, `FragmentView`,
  `ComparePane`, `Outline`, `Preview`, `TranslationsSection`, `SystemState`) ;
- 3 plugins (`email`, `phone`, `address`) qui recopient la même logique `blurErrors`
  (état local, remise à zéro à la saisie, `formatErrors` à la sortie, `<p … text-rose-600 role="alert">`).

Je veux regrouper ces mécanismes dans des modules dédiés dont on appelle les services en une ligne,
pour écrire moins de code et lire moins de fichiers à chaque évolution.

**C'est un refactoring : aucun changement de comportement visible.** Le format JSON, la spec fonctionnelle
et le guide utilisateur ne changent pas.

## Conception

Pas de bus d'événements ni d'abonnement : l'endroit d'affichage dépend de la **nature** de l'erreur.
`core/*` reste pur et continue de renvoyer des valeurs (`Issue[]`, `FieldError[]`, `SyntaxError`).

1. **`app/feedback`** (nouveau module) — refus, échecs, informations, confirmations :
   - `refuse(title, ...lines)`, `inform(title, ...lines)`, `fail(title, error)` : remplissent `notice` ;
   - `confirm(question): boolean` : seul appel à `window.confirm`, remplaçable en test ;
   - un message est une clé typée `MessageKey`, `{ key, params }` ou `{ raw: string }` (texte non traduit,
     ex. erreurs de schéma à l'import) ; la traduction se fait dans la langue de l'interface.
   - `store.ts` `refused()` et `useImageExport.ts` passent par ces fonctions.
   - Aucun changement visible : même boîte de dialogue, même titre, mêmes lignes, un seul message à la fois
     (le dernier remplace le précédent, comme aujourd'hui). Pas de file, pas de niveau affiché.
2. **`app/issues`** (nouveau module) — problèmes non bloquants du graphe :
   - `issuesOf(ws)` : `checkWorkspace` mémorisé sur la référence de `ws` ;
   - `selectIssues(issues, filtre)` pur (`{ owner?: { kind, id }, code? }`) et un hook `useIssues(filtre)` ;
   - les 7 vues l'utilisent ; leur rendu ne change pas.
3. **Erreurs de champ** (`plugin-api` + `ui-kit`) :
   - logique pure testable de la règle « à la sortie du champ » + hook `useBlurErrors` dans `plugin-api` ;
   - composant `FieldErrors` dans `ui-kit` (même balisage que l'actuel : `p.text-sm.text-rose-600[role=alert]`) ;
   - `email`, `phone`, `address` l'utilisent.
4. **Documentation de référence** : `docs/ERREURS.md` (une page) décrit quelle API utiliser selon la
   nature de l'erreur, avec un exemple d'une ligne pour chacune. `CLAUDE.md` (Invariants) et la matrice
   de `docs/MAP.md` y renvoient. Une règle dependency-cruiser interdit d'écrire `notice` hors de
   `app/feedback` si c'est exprimable simplement ; sinon un test Vitest qui recherche
   `s.notice =` et `window.confirm` hors de `app/feedback` (et de `App.tsx` pour la fermeture).

Hors périmètre : `core/expressions` (syntaxe), `ui/preview/path-check.ts`, les erreurs locales des
autres composants (`ValueInput`, `KeyInput`…) ; pas de reprise visuelle des panneaux de problèmes.

## Méthode (bonnes pratiques de refactoring)

1. **Tests d'abord, sur le code inchangé** : tests de caractérisation (Vitest) qui figent le comportement
   actuel — contenu exact de `notice` (titre, lignes, langue fr et en) pour chaque refus/échec atteignable
   depuis le store ou les commandes ; appel et effet de chaque confirmation (accepter / refuser, via un
   `window.confirm` simulé) ; résultat des filtres de problèmes de chaque vue (sur l'exemple) ;
   règle d'erreur à la sortie du champ pour `email`, `phone`, `address` (via `formatErrors`).
   Ils passent sur le code actuel et sont commités **seuls**, avant toute modification du code.
2. **Petits pas** : un mécanisme à la fois (feedback, puis issues, puis champs), un commit par pas,
   tests ciblés verts entre chaque pas. Les tests de caractérisation ne sont pas modifiés pendant
   le refactoring, sauf pour remplacer l'appel interne ciblé par la nouvelle API ; les valeurs attendues
   ne changent jamais.
3. **Pas de changement de comportement mêlé au refactoring** ; un défaut découvert est noté dans
   `docs/ECARTS.md`, pas corrigé.
4. **Suppression de l'ancien code** une fois tous les appelants migrés (aucune double voie restante).

## Critères d'acceptation

- Les tests de caractérisation existent dans un commit antérieur à tout changement de `src/` hors tests,
  et passent avant comme après le refactoring, avec les mêmes valeurs attendues.
- Plus aucune écriture `s.notice =` hors de `app/feedback` (la fermeture de la boîte dans `ui/shell` exceptée),
  plus aucun `window.confirm` hors de `app/feedback` : contrôlé automatiquement par `npm run check`.
- `app/feedback` : un test par fonction (`refuse`, `inform`, `fail` avec `Error` et valeur quelconque,
  `confirm` accepté / refusé, traduction fr / en, texte brut).
- `app/issues` : `checkWorkspace` n'est appelé que dans `app/issues` (hors tests et hors `core`) ;
  test de `selectIssues` et de la mémorisation (même `ws` → même tableau).
- `email`, `phone`, `address` utilisent `useBlurErrors` et `FieldErrors` ; test de la logique pure.
- Les tests de fumée existants (dont `evo-007`, `evo-014`, `evo-015`, `evo-022`) passent sans modification.
- `docs/ERREURS.md` existe ; `CLAUDE.md`, `docs/MAP.md` et les README des modules touchés y renvoient.

## Impacts attendus

- **Format JSON** : aucun.
- **Spec** : § 8.2 (deux modules ajoutés au tableau), aucun changement fonctionnel.
- **Guide** : aucun (pas de changement visible).
