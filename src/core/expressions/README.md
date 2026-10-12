# core/expressions

Analyse, évaluation, extraction des références, interpolation des libellés. **Seul module qui importe
JSONata** (1.8, synchrone). Dépend de `core/model`.

## API
- Groupe de la sélection (EVO-003, `group-ref.ts`) : avant évaluation, toute étape **finale** `groupe` d'un chemin de noms
  est réécrite en `<dernier>_group` (`lien.groupe` → `lien_group`, `decl.lien.groupe` → `decl.lien_group`, indices et filtres
  conservés : `liens[0].groupe` → `liens_group[0]`) ; la syntaxe,
  `extractReferences` et `renameReference` voient l'écriture d'origine (`['lien','groupe']`).
- « Ne sais pas » (EVO-006, `dont-know-ref.ts`) : tout chemin de noms terminé par `.nsp` est réécrit en `(<chemin>_nsp = true)`
  avant évaluation (`victimes[0].age.nsp` → `(victimes[0].age_nsp = true)`) : vrai ou faux, jamais vide ; références et renommage
  voient l'écriture d'origine.
- Pays (EVO-007, `country-ref.ts`) : tout chemin de noms terminé par `.pays` est réécrit en `($exists(P_pays) ? P_pays : P.pays)`
  (`_pays` inséré après l'avant-dernier nom, comme `.groupe`) : un champ nommé `pays` reste lisible ; références et renommage
  voient l'écriture d'origine.
- Interpolation (EVO-007) : `EvalEnv.display` (mise en forme par clé) et `EvalEnv.lang` ; une expression interpolée réduite à une
  référence (`a`, `a.b`, `a[0].b`) dont le dernier nom a une mise en forme l'utilise (texte, ou texte multilingue pris dans
  `lang`) ; `resolveLabel` passe sa langue.
- `EvalEnv` : `today?`, `defaultLang?` (langue par défaut : identifiant d'un groupe d'options sans code, `core/runtime`).
- `evaluate(expr, ctx, env?)` → valeur ou `undefined` si erreur ; `evaluateStrict` lève ; `evaluateCondition` → `true` seulement si l'expression vaut `true`.
- `checkSyntax(expr)` → `{ message, position }` ou `undefined` ; `compile` (avec cache).
- `extractReferences(expr)` → chemins racines (`[['tiers','nom'], ['sys','plafond']]`). Un nom dans le filtre d'une
  étape de tête prolonge le chemin filtré (`sys.x[champ > 1]` → `['sys','x','champ']`) ; les étapes après la première
  non nommée et les filtres d'une expression non nommée (`(a)[b]`) sont relatifs : ignorés. `$$.cle` est une référence
  racine (`['cle']`), jamais prolongée par un filtre. `filterReferences(expr)` : références issues d'un filtre (avec le nom en cause).
- `renameReference(expr, path, newName)` : renomme le dernier segment de `path` dans les chemins racines qui commencent par `path` (filtres compris).
- Gabarits : `parseTemplate`, `interpolate`, `templateExpressions`, `templateReferences`, `renameInTemplate`, `formatValue`.
- `resolveLabel(label, {lang, defaultLang}, ctx, env?)` : variante → langue (repli langue par défaut) → interpolation ; `pickText`.
- Dates : `todayIso`, `addDays`, `daysBetween`, `age` ; exposées dans JSONata comme `$today()`, `$addDays`, `$daysBetween`, `$age`.

## Contexte d'évaluation
Objet des réponses par clé + `sys` (état du système) + un objet par alias de bloc. Construit par `core/runtime`.
`env.today` fige la date du jour (tests, prévisualisation).

## Pièges
- Les positions de l'AST JSONata sont des index de **fin** de jeton (début = position − longueur).
- JSONata renvoie des « séquences » : `evaluateStrict` les convertit en tableaux simples.

## Tests
`expressions.test.ts`, `dont-know.test.ts`, `country.test.ts`.
