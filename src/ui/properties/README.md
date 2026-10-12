# ui/properties

Cadre du panneau de propriétés de l'objet sélectionné (nœud ou arête ; sans sélection, le questionnaire). Le contenu propre à chaque type
vient des plugins (`registry`). Dépend de `app/store`, `registry`, `core`, `ui-kit`, `ui/expression-editor`.

## API
- `PropertiesPanel({ graph })`, `QuestionEditor({ question, target })` (propriétés d'une question, locale ou de
  bibliothèque, selon `QuestionTarget` : historique, propriétaire du renommage, clés prises, écriture, intitulé),
  `KeyInput`, `usePluginEnv()` (`useEditorEnv()` + `questionType` du registre, transmis aux plugins ; seul exemplaire,
  utilisé aussi par `ui/diagram` et `ui/library`).

## Composants
- Contraintes et messages : `ConstraintsEditor` (`ui/expression-editor`), paramètres par `messageParams`.
- `PropertiesPanel({ graph })` : fournit la portée des références à l'éditeur d'expression (`ExpressionEnvProvider`).
- `QuestionnaireProperties` : titre multilingue, clé (= nom du fichier, unique, `KeyInput`), description.
- `QuestionProperties` : intitulé (clé dérivée), clé (renommage propagé, `KeyInput`), type, obligatoire
  (booléen ou expression), valeur par défaut littérale (`DefaultValueInput`) et calculée (`defaultExpr`), aide, texte indicatif, paramètres du type (plugin, avec `renameField` pour les champs de structure), contraintes libres,
  messages d'erreur par contrainte, description.
- `EdgeProperties` : libellé (`caption`, une ligne, vide = retiré ; clé d'historique `<id>:caption`), condition (vide = « sinon »), rang (`edge.moveUp`/`moveDown`), sortie de bloc (une sortie inconnue
  reste proposée, marquée « (?) »), suppression (`node.delete`).
- `LibraryQuestionProperties` : question de bibliothèque référencée ; seul l'intitulé est surchargeable
  (« Reprendre l'intitulé de la bibliothèque » retire la surcharge), « Ouvrir dans la bibliothèque ».
- `BlockInstanceProperties` : alias (renommage propagé dans le questionnaire, `renameKey` cible `alias`), sorties, ouverture du bloc.
- Autres nœuds : `plugin.Properties` du type de nœud ; renommer une sortie passe par `renameExit` (arêtes des instances suivies).

Les saisies de champs de nœud et d'arête passent par `store.edit` avec une clé de regroupement `nœud:champ`
(frappes regroupées dans l'historique). Les boutons (départ, rang, suppression) et les propriétés du
questionnaire passent par `runCommand`.
