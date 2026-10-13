# core/runtime

Moteur de parcours : implémentation de référence de la navigation (docs/FORMAT.md §11). Pur, immuable.
Dépend de `core/model`, `core/expressions`.

## API
- `RuntimeInput` : `{ ws, questionnaireId, sys, env? }`.
- Étapes : id `nodeId`, `appelId/nodeId` dans un fragment, `a1/a2/nodeId` dans un fragment appelé par un fragment (EVO-008).
  `resolveStep(input, id)` → `Step` (nœud, graphe, `instances` : appels traversés, `instance` / `fragment` : le plus interne,
  question effective (`effectiveQuestion` : bibliothèque résolue par `instanceQuestion`, intitulé surchargé, champs masqués retirés, EVO-009 ; caractère obligatoire résolu par `resolveRequired` avec les appels traversés, EVO-012), `answerPath` = alias puis clé).
- `start(input)`, `next(input, s)`, `back(s)`, `goTo(s, stepId)` (retour depuis une synthèse, empilé),
  `setAnswer(input, s, value, other?)`, `currentStep(input, s)`.
- `summaryEntries(input, s)` : réponses du parcours effectif avant la page courante.
- `resume(input, s, target)` : après un retour depuis une synthèse, avance sur les pages déjà vues et répondues
  jusqu'à `target`, une page nouvelle, une question sans réponse, une page refusée par `accept` (revalidation), une fin ou un blocage.
- `edgeTrace(input, answers, stepId)` : arêtes sortantes évaluées dans l'ordre (`true` / `false` / `else` / `error`)
  et arête retenue (débogage).
- `progress(input, s)` : progression indicative (0..1).
- `buildContext(input, answers, stepId?)` : contexte d'évaluation (réponses + `sys` + clés de chaque appel traversé sans préfixe, la plus interne prioritaire ;
  les valeurs `null` sont retirées en profondeur, `answers` garde `null`).
- `choiceOptions(question, ctx, env?)` : options visibles d'un choix : chaque entrée dont `when` est vraie est
  déployée à sa position (statique : une option ; dynamique : une par élément de `from`, dans l'ordre de la source ;
  source absente ou vide : rien ; groupe dont `when` est vraie : ses entrées, chacune marquée `group: { id, label }`).
  Valeurs en chaînes ; vides, `other` et valeurs déjà proposées plus haut **dans le même groupe** écartées.
  `groupId(g, ctx, env)` : code, sinon libellé dans `env.defaultLang`, interpolé.
- `setAnswer(input, s, value, other?, group?)` range le groupe sous `<clé>_group` (`groupPath`) ; `prune` l'efface avec
  la réponse ; `SummaryEntry.group`.
- « Ne sais pas » (EVO-006) : `setAnswer(…, group?, dontKnow?)` range le marqueur `<clé>_nsp: true` (`dontKnowPath`) ; toute autre
  réponse l'efface ; `prune` l'efface avec la réponse ; `SummaryEntry.dontKnow`. `dontKnowAnswer(q)` : valeur (`null`, `[]` pour un
  choix multiple) et groupe (`NSP` pour un choix) d'une réponse « Ne sais pas ».
- Pays (EVO-007) : `setAnswer(…, dontKnow?, country?)` range `<clé>_pays` (`countryPath`) ; absent sinon ; `prune` l'efface avec la réponse.
- `successor`, `chooseEdge`, `firstStep`, `prune`, `projectedSteps`, `getAnswer`, `withAnswer`, `otherPath`.

## Règles
- Arêtes : première conditionnée vraie dans l'ordre, sinon l'arête sans condition ; aucune → `blocked`.
- Fragments (EVO-008) : entrée = `fragmentEntry` (`core/model`) ; un nœud sans arête sortante d'un fragment en sort (arêtes du nœud
  fragment sans `exit`, contexte de l'appelant) ; un nœud `exit` nommé sort par les arêtes `exit` = son nom ou sans nom ; un nœud
  fragment sans arête dans un fragment remonte à l'appelant ; profondeur bornée (garde contre un cycle d'appels).
- Réponses d'un fragment rangées sous `answers[alias]` (imbriqué : `answers[a][b]`) ; précision « Autre » sous `<cle>_other` ; groupe de la sélection
  d'un choix sous `<cle>_group` (identifiant, `AUTRE`, liste parallèle aux valeurs pour un choix multiple).
- `next` : question laissée vide → `null` ; valeur par défaut (`defaultExpr` puis `default`) posée à l'arrivée.
- Effacement : après chaque `next`, le chemin projeté est recalculé depuis le départ ; à la première
  question sans réponse, tout ce qui reste atteignable (sans repasser par le chemin projeté) est conservé ;
  les autres réponses sont effacées.
- Pas de validation des réponses ici : voir `core/validation` (`validateAnswer`).

## Tests
`runtime.test.ts`, `fragments.test.ts` (milieu, départ, sorties, `ident.majeur = false`, deux usages, imbrication, entrée réglée), `trace.test.ts`, `options.test.ts`, `groups.test.ts`, `dont-know.test.ts`, `country.test.ts`, `hidden-fields.test.ts`, `required.test.ts` ; `tests/reference/paths.test.ts` rejoue `examples/*/chemins/*.json`.
