# ui/diagram

Logigramme d'un graphe (questionnaire, ou fragment de la bibliothèque) avec React Flow (@xyflow/react).
Dépend de `app/store`, `app/commands` (liaison tracée à la souris : `edge.create` ; dépôt : `library.insertItem`),
`registry`, `core`, `ui-kit`, `html-to-image`, `ui/properties` (`usePluginEnv` : environnement de l'éditeur + `questionType` du registre).

## API
- `Diagram({ graph, issues, readOnly? })` ; `readOnly` (vue côte à côte) : ni sélection, ni glisser, ni liaison, ni dépôt, pas de focus.
  Questionnaire validé (EVO-015, `locked` du contexte) : sélection gardée, nœuds du graphe non déplaçables (commentaires déplaçables), ni liaison, ni dépôt,
  ni édition en place, pas d'invitation sur un graphe vide ; le store refuse de toute façon toute modification.
- `outline?: OutlineOptions` (EVO-019, prévisualisation) : lecture seule comme `readOnly`, `data-testid="outline"`, pas de `fitView` ;
  `useOutlineCenter` recentre (`setCenter`, zoom `outlineView.ts` : voisins immédiats, borné à [0,5 ; 1], testé) à chaque `focusKey`
  une fois le nœud courant mesuré et le zoom React Flow prêt (`panZoom`) ; `NodeView` : nœud courant `data-outline-current` (anneau vert),
  question `data-outline="active"` (cliquable) ou `"inactive"` (grisée) ; seul un clic sur une question active appelle `onQuestionClick` ;
  badge « bib. » sans info-bulle, double-clic sans effet.
- `ProblemsPanel({ graph, issues })` : vérifications du §4.6 du graphe, repliable ; clic = sélection.
- `LIBRARY_MIME` : type des données glissées depuis le panneau de la bibliothèque (`{ kind, id }`).

## Fonctionnement
- Nœuds et arêtes dérivés du store (`ws` + mise en page `layouts`) ; un nœud recréé reprend ses mesures (`measured`,
  `rf.getInternalNode`), sinon React Flow le masque jusqu'à remesure (test : `tests/smoke/selection.spec.ts`) ; positions écrites sans historique
  pendant le glisser, point d'historique au début du glisser.
- `NodeView` : cadre, poignées, badges (départ, ou « Entrée » d'un fragment (`graphStart`), obligatoire, autre, bibliothèque (`library-badge`, `nopan` ; double-clic = `library.openRef`, sans édition de l'intitulé, EVO-013), « n / m champs » d'une instance de structure à champs masqués (EVO-009), « surch. » (`required-override`) sur une référence dont le caractère obligatoire est surchargé ou un nœud fragment qui en surcharge (`activeOverrides`, EVO-012), source, traduction,
  problèmes) ; contenu délégué au plugin du type de nœud (`registry.nodeKind`) ; édition en place de
  l'intitulé (double-clic, Entrée, `focusRequest`) avec dérivation de la clé (`setQuestionLabel`).
- Nœud fragment : bouton « Ouvrir le fragment ↗ » parmi les badges (`library.show`) ; une poignée de sortie par sortie nommée du fragment ; une liaison tirée depuis une poignée porte
  `exit` (arête `sourceHandle` = `exit` ; sortie inconnue → première poignée, l'arête reste visible). Sans sortie : poignée unique.
- Dépôt d'un élément de bibliothèque : inséré à la position du curseur (`screenToFlowPosition`).
- `EdgeView` : condition abrégée, rang si plusieurs arêtes sortent du même nœud, « sinon », sortie nommée. Libellé
  `caption` (EVO-005) : affiché à la place de la condition (`span[data-edge-caption]`, police normale), tronqué en CSS
  (« … ») ; pastille aussi pour une arête seule libellée ; `title` = libellé puis condition selon la même
  règle que la pastille (`edgeLabel.ts` : « ? » si vide, « sinon » parmi plusieurs sorties, rien pour une arête seule).
  La pastille garde `data-edge-label` (filtre de l'export d'image).
- Le conteneur porte `data-graph-focus` : les raccourcis à une lettre agissent s'il a le focus (ou si le focus est
  sur un bouton hors dialogue, cf. `app/shortcuts`).
  Il le prend à l'ouverture d'un graphe (nouveau questionnaire, changement d'onglet), sauf saisie en cours.
- Nœud sélectionné seul gardé visible (`useKeepSelectionVisible.ts`).
- Graphe vide (`EmptyHint.tsx`) : invitation « Ajouter une question » (commande `node.newQuestion`, raccourci affiché).
- Mise en page automatique (`autoLayout.ts` : `computeLayout`, ELK.js `elk.bundled.js`, couches de haut en bas ;
  `useAutoLayout` : réagit à `layoutRequest`, tailles mesurées par React Flow, un point d'historique, vue ajustée). Test : `autoLayout.test.ts`.
- Export en image (EVO-004, `useImageExport.ts`, `ImageDialog.tsx`) : le dialogue (derniers choix, `Entrée` = exporter) appelle
  `view.exportImageRun` ; le hook réagit à `imageRequest` : `html-to-image` (`toCanvas`, version 1.11.11 épinglée) sur
  `.react-flow__viewport` avec `transform` forcé (boîte des nœuds ∪ tracés d'arêtes, marge 40 px), fond blanc, `pixelRatio` 2
  (réduit et signalé au-delà de 16 384 px), poignées filtrées ; « sélection » : filtre sur `data-id` des nœuds / arêtes et
  `data-edge-label` des libellés. Titre dessiné sur un second canvas : `imageHeading` (titre — version — statut dans la
  langue de l'interface, EVO-023) ; nom du fichier par `imageFileName` (version et statut). Pièges : sélection vidée puis restaurée, transitions
  coupées (`[data-exporting]`, `index.css`), attente d'une tâche + une image avant capture : sinon surbrillance figée.
  Seulement pour le logigramme modifiable d'un questionnaire. Tests : `tests/smoke/evo-004.spec.ts`, `tests/smoke/evo-023.spec.ts`.
- Copier-coller (EVO-010, `useDiagramMenu.tsx`) : position du pointeur transmise à `setPastePoint` (Ctrl+V colle au pointeur) ; clic droit sur un nœud
  (Copier, Coller, Dupliquer ; le nœud est sélectionné s'il ne l'était pas) ou sur le fond (Coller au point du clic), menu `ContextMenu` de `ui-kit`.
- Commentaires de révision (EVO-011) : `useCommentNodes` ajoute un nœud React Flow `comment:<nœud>` (`CommentNodeView` : `CommentThread` de `ui/comments`,
  non sélectionnable, déplaçable : position écrite dans le commentaire) par commentaire affiché (`shownComments`, pas en lecture seule) et une branche en pointillés
  `comment:<nœud>:edge` depuis la poignée invisible `comment-left` / `comment-right` de la question (côté du centre du commentaire). Ces poignées sont **après** la
  poignée par défaut (React Flow prend la première pour une arête sans poignée). Icône bulle sur la question (`comment.toggle`) ; « Commenter » dans le menu
  contextuel d'une question ; `useCenterOnComment` (réagit à `centerRequest`) ; la mise en page automatique déplace chaque commentaire avec sa question.
  Clic et double-clic sur un nœud commentaire ne prennent pas le focus du logigramme.
- Suppression par la commande (touche Suppr), jamais par React Flow (`deleteKeyCode=null`).
