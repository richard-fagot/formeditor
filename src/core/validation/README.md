# core/validation

Contraintes de champs (validation d'une réponse) et vérifications non bloquantes du graphe (spec §4.6).
Dépend de `core/model`, `core/expressions`, `core/references`, `core/runtime` (`choiceOptions`), `core/contact`.

## API
- `validateAnswer(question, value, ctx, env?, other?, path?, group?)` → `FieldError[]` (`path`, `param`, `message` multilingue).
  `ctx` doit contenir la réponse sous sa clé (contraintes libres). Messages : `question.messages[param]`
  sinon `defaultMessage(param, borne)`. Choix : une valeur absente des options visibles (statiques dont la
  condition est vraie, entrées dynamiques déployées, « Autre ») donne `option` ; si `group` est fourni (`<clé>_group`,
  lu par l'appelant à côté de la réponse — jamais dans `ctx`, où une clé homonyme d'un hôte ou du questionnaire peut
  figurer ; dans une structure, lu dans l'occurrence), c'est le couple (groupe, valeur) qui doit être visible. Structure répétable : `[]` est vide si la
  question est facultative (`repeat.min` ignoré) ; obligatoire, `repeat.min` (≥ 1) s'applique, et sans minimum
  la liste vide donne `required`.
- « Ne sais pas » (EVO-006) : `validateAnswer(…, group?, dontKnow?)` ; marqueur `true` et option activée → aucune erreur
  (obligatoire, contraintes intégrées et libres) ; dans une structure, lu dans l'occurrence (`champ_nsp`). Code de groupe `NSP` réservé.
- Mail, téléphone, adresse, civilité (EVO-007) : contrôles intégrés de `core/contact` (`email`, `phone`, `lineType`, `address`,
  `postalCode`, `option`) ; pays lu dans `ctx` sous `<clé>_pays` (dans une structure, l'occurrence), sinon `defaultCountry`.
  `formatErrors(q, valeur, pays?)` : ces contrôles seuls (réponse vide → aucun), pour le contrôle à la sortie du champ.
  Messages par défaut dans `messages.ts` (`lineType` : `{0}` = mobile / fixe ; `address` : `{0}` = bornes `5–200`).
- `messageParams(question)` : paramètres dont le message est personnalisable pour cette question.
- `checkWorkspace(ws)` → `Issue[]` : `code`, `severity`, `owner`, `nodeId?`, `edgeId?`, `property?`, `params`.
- `describeIssue(issue, lang)` : texte fr/en.
- `checkGraph`, `guaranteedBefore` (analyse « posée sur tous les chemins »), `expectedKeys(ws, fragmentId)` (clés attendues de l'appelant, triées).

## Vérifications (codes)
`invalidExpression`, `unknownReference`, `unknownFilterReference` (clé de question nue dans un filtre : `$$.cle` suggéré), `duplicateKey`, `invalidKey`, `unreachable`, `deadEnd`,
`exitNotConnected`, `unknownExit`, `loopWithoutExit`, `noElse`, `multipleElse`, `notGuaranteed`,
`missingTranslation`, `libraryMissing`, `missingStart`, `duplicateGroup`, `reservedGroupCode`, `emptyGroup`,
`implicitExitNotConnected`, `fragmentEntry`, `fragmentNoExit`, `fragmentCycle`, `unusedFragment`, `endInFragment`, `expectedKeyMissing`, `hiddenField`
(groupes d'options, `groups-check.ts` ; identifiant statique = code, sinon libellé « sinon » dans la langue par défaut).

## Choix
- Dictionnaire de l'état du système : noms de variables et de champs de liste invalides / en double → `invalidKey` /
  `duplicateKey` avec le propriétaire `{ kind: 'system', id: <variable> }`. Expressions relatives d'une source dont
  `from` est une liste système à champs déclarés : nom inconnu → `unknownReference` (`sys.x.nom`).
- `missingStart` n'est pas signalé sur un graphe vide (questionnaire neuf) ; le premier nœud ajouté devient le départ (`app/store`).
- `notGuaranteed` ignore les références testées par `$exists(…)` et, dans une variante de libellé, celles
  déjà présentes dans la condition de la variante.
- Expressions d'un fragment : une référence hors de ses propres clés (et de `sys`) est une **clé attendue de l'appelant** (`expectedKeys`) ;
  absente chez un appelant → `expectedKeyMissing` dans cet appelant, sur chaque nœud qui appelle le fragment ; absente chez tous
  (ou sans appelant) → aussi `unknownReference` dans le fragment. Seules ses propres clés sont soumises à `notGuaranteed`.
- Fragments (EVO-008, `graph.ts`) : `fragmentEntry` (pas d'entrée unique sans `entry`), `fragmentNoExit`, `endInFragment`,
  `implicitExitNotConnected` ; pas de `deadEnd` ni de `missingStart` dans un fragment (ses nœuds sans arête sortante sont ses
  sorties) ; nœud fragment sans arête : `deadEnd` dans un questionnaire, sortie implicite dans un fragment. `workspace-check.ts` :
  `fragmentCycle`, `unusedFragment`. `guarantee.ts` : clés garanties à toutes les sorties empruntées, `alias.` (imbriqué) ; garde contre un cycle.
- Champs masqués (EVO-009, `refs-check.ts`) : une référence du graphe qui vise un champ masqué d'une de ses instances (`hiddenFieldPaths` :
  `cle.champ…`, `cle.champ_other`, `alias.cle.champ` via un fragment appelé) → `hiddenField` (erreur) au lieu de `unknownReference` ;
  références internes à la définition (champ frère) non signalées.
- Le typage des expressions se limite à la syntaxe et à l'existence des références.

## Tests
`validation.test.ts` (l'exemple ne doit produire **aucun** problème), `groups.test.ts`, `dont-know.test.ts`, `contact.test.ts`, `fragments.test.ts`, `hidden-fields.test.ts`, `suggestions.test.ts` (expression des suggestions d'un texte, EVO-016).
