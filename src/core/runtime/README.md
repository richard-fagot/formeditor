# core/runtime

Moteur de parcours : implémentation de référence de la navigation (docs/FORMAT.md §4). Pur, immuable.
Dépend de `core/model`, `core/expressions`.

## API
- `RuntimeInput` : `{ ws, questionnaireId, sys, env? }`.
- Étapes : id `nodeId` ou `instanceId/nodeId` (dans un bloc). `resolveStep(input, id)` → `Step`
  (nœud, graphe, instance et bloc éventuels, question effective, `answerPath`).
- `start(input)`, `next(input, s)`, `back(s)`, `goTo(s, stepId)` (retour depuis une synthèse, empilé),
  `setAnswer(input, s, value, other?)`, `currentStep(input, s)`.
- `summaryEntries(input, s)` : réponses du parcours effectif avant la page courante.
- `progress(input, s)` : progression indicative (0..1).
- `buildContext(input, answers, stepId?)` : contexte d'évaluation (réponses + `sys` + clés du bloc sans préfixe).
- `successor`, `chooseEdge`, `firstStep`, `prune`, `projectedSteps`, `getAnswer`, `withAnswer`, `otherPath`.

## Règles
- Arêtes : première conditionnée vraie dans l'ordre, sinon l'arête sans condition ; aucune → `blocked`.
- Réponses d'un bloc rangées sous `answers[alias]` ; précision « Autre » sous `<cle>_other`.
- `next` : question laissée vide → `null` ; valeur par défaut (`defaultExpr` puis `default`) posée à l'arrivée.
- Effacement : après chaque `next`, le chemin projeté est recalculé depuis le départ ; à la première
  question sans réponse, tout ce qui reste atteignable (sans repasser par le chemin projeté) est conservé ;
  les autres réponses sont effacées.
- Pas de validation des réponses ici : voir `core/validation` (`validateAnswer`).

## Tests
`runtime.test.ts` ; `tests/reference/paths.test.ts` rejoue `examples/*/chemins/*.json`.
