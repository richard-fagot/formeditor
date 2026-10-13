# core/references

Résolution des clés et espaces de noms, index des usages, renommage propagé. Dépend de `core/model`, `core/expressions`.

## API
- Parcours : `mapWorkspace(ws, mapper)`, `mapGraph`, `mapQuestion`, `collectExpressions(ws)`. Le `mapper`
  reçoit chaque texte (`'expr'` ou `'template'`) avec sa localisation (`ExprLocation` : propriétaire,
  nœud/arête, propriété, `structure` si champ de structure, `relative` si évalué par élément d'une entrée dynamique — `label` / `value` de `options[i]`, avec `source` = son `from`).
- Portée : `questionnaireScope(ws, qId)`, `fragmentScope(ws, fragmentId, callers?)` (`callers` : appelants retenus, type `Caller` ;
  défaut : tous, un fragment appelant apporte ses propres appelants ; `[]` : clés du fragment et `sys` seulement), `structureScope(outer, structure)`,
  `resolvePath(scope, path)` ; une variable système (et un champ de liste) porte `type`, `description`, `caption` (libellé, EVO-005) et `values` (énumération) pour l'autocomplétion ; `questionOfNode(ws, node)` (question effective, libellé surchargé, champs masqués retirés : absents de la portée, EVO-009) ;
  `hiddenFieldPaths(ws, graph)` : chemins des champs masqués visibles depuis un graphe (`cle.champ`, `alias.cle.champ`).
  Fragments imbriqués (EVO-008) : `alias.sous_alias.cle`, `RefInfo.alias` = chemin des alias (`ident.adr`) ; garde contre un cycle d'appels.
- `findUsages(ws, path)`.
- Suggestions d'un champ texte (EVO-016) : `suggestions` (non vide) parcourue comme expression (propriété `suggestions`) : vérifications, usages, renommage.
- Groupes d'options (EVO-003) : la portée contient `<chemin>.groupe` (genre `group`) pour chaque question ou champ à choix
  (questionnaire, `alias.cle.groupe`, `structure.champ.groupe`, champ frère `champ.groupe`) ; ailleurs `.groupe` est inconnu.
  Le parcours visite libellé (`options[i].group`), condition et entrées de chaque groupe (`options[i].options[j].…`).
- « Ne sais pas » (EVO-006) : la portée contient `<chemin>.nsp` (genre `dontKnow`, type `boolean`) pour une question ou un
  champ dont l'option est activée ; le libellé `dontKnow.label` est parcouru (renommage, traductions manquantes).
- Pays (EVO-007) : la portée contient `<chemin>.pays` (genre `country`, type `text`) pour une question ou un champ `phone` ou
  `address`. Les libellés d'une civilité (modifiés ou par défaut, propriété `labels.<code>`) sont parcourus (traductions
  manquantes) ; seuls les libellés modifiés sont réécrits.
- `renameKey(ws, target, newKey)` : `target` = question (`owner` + `nodeId`, `fieldId` pour un champ),
  alias d'un nœud fragment (`{ kind: 'alias', owner, nodeId }` : questionnaire ou fragment ; réécrit aussi chez les appelants), variable système (scénarios compris), ou champ d'une liste système (`systemField` :
  `sys.x.champ`, noms relatifs des entrées dynamiques dont `from` est `sys.x`, exemple et scénarios ; nom invalide ou pris → inchangé). Renvoie un nouveau `Workspace`. Renommer un champ d'une question de bibliothèque suit dans `hiddenFields` de ses instances (EVO-009).
- `renameKeysIn(part, renames, owner)` (EVO-010) : renomme clés locales et alias d'un morceau de graphe (nœuds collés) et réécrit leurs références
  (`cle`, `cle_other`, `cle.champ`, `alias.cle`…) dans ses seules expressions ; noms relatifs et clés masquées par un champ de structure inchangés.
- `qualifyKeys(ws, owner, keys, alias)` : préfixe par `alias.` les références à `keys` (et `cle_other`) dans les
  expressions de `owner` (questions déplacées dans un fragment appelé sous cet alias).

## Règles de visibilité
- Question d'un questionnaire : clé nue dans ce questionnaire.
- Question d'un fragment : clé nue dans le fragment, `alias.cle` chez chaque appelant, `a.b.cle` chez l'appelant d'un appelant (renommage propagé partout).
- Question de bibliothèque : clé nue dans chaque graphe qui la référence (et via alias si c'est un fragment).
- Champ de structure : nu dans les champs frères, `structure.champ` ailleurs.
- Un champ de même nom masque la clé racine dans les expressions de sa structure.

## Limites assumées
- Renommer une question de l'appelant ne modifie pas les fragments qui y font référence par clé nue
  (le fragment est partagé) : la vérification « clé attendue absente » le signale chez l'appelant.

## Tests
`references.test.ts` (sur l'exemple), `groups.test.ts`, `dont-know.test.ts`, `fragments.test.ts` (portée imbriquée, renommage chez les appelants), `hidden-fields.test.ts` (EVO-009), `rename-local.test.ts` (EVO-010).
