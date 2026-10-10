# core/expressions

Analyse, évaluation, extraction des références, interpolation des libellés. **Seul module qui importe
JSONata** (1.8, synchrone). Dépend de `core/model`.

## API
- `evaluate(expr, ctx, env?)` → valeur ou `undefined` si erreur ; `evaluateStrict` lève ; `evaluateCondition` → `true` seulement si l'expression vaut `true`.
- `checkSyntax(expr)` → `{ message, position }` ou `undefined` ; `compile` (avec cache).
- `extractReferences(expr)` → chemins racines (`[['tiers','nom'], ['sys','plafond']]`). Un nom dans le filtre d'une
  étape de tête prolonge le chemin filtré (`sys.x[champ > 1]` → `['sys','x','champ']`) ; les étapes après la première
  non nommée et les filtres d'une expression non nommée (`(a)[b]`) sont relatifs : ignorés.
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
`expressions.test.ts`.
