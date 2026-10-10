# ui/diagram

Logigramme d'un graphe (questionnaire ; bloc en phase 7) avec React Flow (@xyflow/react).
Dépend de `app/store`, `registry`, `core`, `ui-kit`.

## API
- `Diagram({ graph, issues })`.

## Fonctionnement
- Nœuds et arêtes dérivés du store (`ws` + mise en page `layouts`) ; positions écrites sans historique
  pendant le glisser, point d'historique au début du glisser.
- `NodeView` : cadre, poignées, badges (départ, obligatoire, autre, bibliothèque, source, traduction,
  problèmes) ; contenu délégué au plugin du type de nœud (`registry.nodeKind`) ; édition en place de
  l'intitulé (double-clic, Entrée, `focusRequest`) avec dérivation de la clé (`setQuestionLabel`).
- `EdgeView` : condition abrégée, rang si plusieurs arêtes sortent du même nœud, « sinon », sortie de bloc.
- Le conteneur porte `data-graph-focus` : les raccourcis à une lettre n'agissent que s'il a le focus.
- Suppression par la commande (touche Suppr), jamais par React Flow (`deleteKeyCode=null`).
