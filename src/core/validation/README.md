# core/validation

Contraintes de champs (validation d'une réponse) et vérifications non bloquantes du graphe (spec §4.6).
Dépend de `core/model`, `core/expressions`, `core/references`.

## API
- `validateAnswer(question, value, ctx, env?, other?)` → `FieldError[]` (`path`, `param`, `message` multilingue).
  `ctx` doit contenir la réponse sous sa clé (contraintes libres). Messages : `question.messages[param]`
  sinon `defaultMessage(param, borne)`.
- `checkWorkspace(ws)` → `Issue[]` : `code`, `severity`, `owner`, `nodeId?`, `edgeId?`, `property?`, `params`.
- `describeIssue(issue, lang)` : texte fr/en.
- `checkGraph`, `guaranteedBefore` (analyse « posée sur tous les chemins »).

## Vérifications (codes)
`invalidExpression`, `unknownReference`, `duplicateKey`, `invalidKey`, `unreachable`, `deadEnd`,
`exitNotConnected`, `unknownExit`, `loopWithoutExit`, `noElse`, `multipleElse`, `notGuaranteed`,
`missingTranslation`, `libraryMissing`, `missingStart`.

## Choix
- `notGuaranteed` ignore les références testées par `$exists(…)` et, dans une variante de libellé, celles
  déjà présentes dans la condition de la variante.
- Expressions d'un bloc : vérifiées dans chaque hôte ; seules ses propres clés sont soumises à `notGuaranteed`.
- Le typage des expressions se limite à la syntaxe et à l'existence des références.

## Tests
`validation.test.ts` (l'exemple ne doit produire **aucun** problème).
