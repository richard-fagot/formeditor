# core/validation

Contraintes de champs (validation d'une réponse) et vérifications non bloquantes du graphe (spec §4.6).
Dépend de `core/model`, `core/expressions`, `core/references`, `core/runtime` (`choiceOptions`).

## API
- `validateAnswer(question, value, ctx, env?, other?)` → `FieldError[]` (`path`, `param`, `message` multilingue).
  `ctx` doit contenir la réponse sous sa clé (contraintes libres). Messages : `question.messages[param]`
  sinon `defaultMessage(param, borne)`. Choix : une valeur absente des options visibles (statiques dont la
  condition est vraie, source dynamique, « Autre ») donne `option`. Structure répétable : `[]` est vide si la
  question est facultative (`repeat.min` ignoré) ; obligatoire, `repeat.min` (≥ 1) s'applique, et sans minimum
  la liste vide donne `required`.
- `messageParams(question)` : paramètres dont le message est personnalisable pour cette question.
- `checkWorkspace(ws)` → `Issue[]` : `code`, `severity`, `owner`, `nodeId?`, `edgeId?`, `property?`, `params`.
- `describeIssue(issue, lang)` : texte fr/en.
- `checkGraph`, `guaranteedBefore` (analyse « posée sur tous les chemins »).

## Vérifications (codes)
`invalidExpression`, `unknownReference`, `unknownFilterReference` (clé de question nue dans un filtre : `$$.cle` suggéré), `duplicateKey`, `invalidKey`, `unreachable`, `deadEnd`,
`exitNotConnected`, `unknownExit`, `loopWithoutExit`, `noElse`, `multipleElse`, `notGuaranteed`,
`missingTranslation`, `libraryMissing`, `missingStart`.

## Choix
- Dictionnaire de l'état du système : noms de variables et de champs de liste invalides / en double → `invalidKey` /
  `duplicateKey` avec le propriétaire `{ kind: 'system', id: <variable> }`. Expressions relatives d'une source dont
  `from` est une liste système à champs déclarés : nom inconnu → `unknownReference` (`sys.x.nom`).
- `missingStart` n'est pas signalé sur un graphe vide (questionnaire neuf) ; le premier nœud ajouté devient le départ (`app/store`).
- `notGuaranteed` ignore les références testées par `$exists(…)` et, dans une variante de libellé, celles
  déjà présentes dans la condition de la variante.
- Expressions d'un bloc : vérifiées dans chaque hôte ; seules ses propres clés sont soumises à `notGuaranteed`.
- Le typage des expressions se limite à la syntaxe et à l'existence des références.

## Tests
`validation.test.ts` (l'exemple ne doit produire **aucun** problème).
