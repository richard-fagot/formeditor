# core/references

Résolution des clés et espaces de noms, index des usages, renommage propagé. Dépend de `core/model`, `core/expressions`.

## API
- Parcours : `mapWorkspace(ws, mapper)`, `mapGraph`, `mapQuestion`, `collectExpressions(ws)`. Le `mapper`
  reçoit chaque texte (`'expr'` ou `'template'`) avec sa localisation (`ExprLocation` : propriétaire,
  nœud/arête, propriété, `structure` si champ de structure, `relative` si évalué par élément d'une source).
- Portée : `questionnaireScope(ws, qId)`, `blockScope(ws, blockId, hostId?)`, `structureScope(outer, structure)`,
  `resolvePath(scope, path)` ; une variable système porte `type`, `description` et `values` (énumération) pour l'autocomplétion ; `questionOfNode(ws, node)` (question effective, libellé surchargé), `blockHosts`.
- `findUsages(ws, path)`.
- `renameKey(ws, target, newKey)` : `target` = question (`owner` + `nodeId`, `fieldId` pour un champ),
  alias d'instance de bloc, variable système (scénarios compris), ou champ d'une liste système (`systemField` :
  `sys.x.champ`, noms relatifs des sources dont `from` est `sys.x`, exemple et scénarios ; nom invalide ou pris → inchangé). Renvoie un nouveau `Workspace`.
- `qualifyKeys(ws, owner, keys, alias)` : préfixe par `alias.` les références à `keys` (et `cle_other`) dans les
  expressions de `owner` (questions déplacées dans un bloc instancié sous cet alias).

## Règles de visibilité
- Question d'un questionnaire : clé nue dans ce questionnaire.
- Question d'un bloc : clé nue dans le bloc, `alias.cle` chez chaque hôte.
- Question de bibliothèque : clé nue dans chaque graphe qui la référence (et via alias si c'est un bloc).
- Champ de structure : nu dans les champs frères, `structure.champ` ailleurs.
- Un champ de même nom masque la clé racine dans les expressions de sa structure.

## Limites assumées
- Renommer une question de l'hôte ne modifie pas les blocs qui y font référence par clé nue
  (le bloc est partagé) : la vérification « référence inconnue » le signale.

## Tests
`references.test.ts` (sur l'exemple).
