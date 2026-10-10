# ui/properties

Cadre du panneau de propriétés de l'objet sélectionné (nœud ou arête ; sans sélection, le questionnaire). Le contenu propre à chaque type
vient des plugins (`registry`). Dépend de `app/store`, `registry`, `core`, `ui-kit`, `ui/expression-editor`.

## Composants
- `PropertiesPanel({ graph })` : fournit la portée des références à l'éditeur d'expression (`ExpressionEnvProvider`).
- `QuestionnaireProperties` : titre multilingue, clé (= nom du fichier, unique, `KeyInput`), description.
- `QuestionProperties` : intitulé (clé dérivée), clé (renommage propagé, `KeyInput`), type, obligatoire
  (booléen ou expression), valeur par défaut littérale (`DefaultValueInput`) et calculée (`defaultExpr`), aide, texte indicatif, paramètres du type (plugin), contraintes libres,
  messages d'erreur par contrainte, description.
- `EdgeProperties` : condition (vide = « sinon »), rang (`edge.moveUp`/`moveDown`), sortie de bloc, suppression (`node.delete`).
- Autres nœuds : `plugin.Properties` du type de nœud ; question de bibliothèque : seul l'intitulé est surchargeable.

Les saisies de champs de nœud et d'arête passent par `store.edit` avec une clé de regroupement `nœud:champ`
(frappes regroupées dans l'historique). Les boutons (départ, rang, suppression) et les propriétés du
questionnaire passent par `runCommand`.
