# Existant — 2. Édition : logigramme, propriétés, commentaires, bibliothèque

Partie de l'inventaire : index, état au commit et conventions dans `docs/EXISTANT.md`.


### Logigramme : cadre et interactions générales

**Comportement observable**
- Le logigramme (React Flow) affiche les nœuds et les arêtes du graphe actif : un questionnaire (vue « Logigramme ») ou un fragment (onglet `f:<id>`).
- Positions lues dans la mise en page (`layouts`) ; un nœud sans position est placé en (0, 0).
- Clic sur un nœud : sélection (le store est la source de vérité), le logigramme prend le focus. Shift : sélection multiple et sélection par rectangle (`selectionKeyCode` et `multiSelectionKeyCode` = Shift).
- Clic sur une arête ou sur sa pastille : sélectionne l'arête seule. Clic sur le fond : vide la sélection.
- Double-clic sur un nœud (hors nœud commentaire, hors questionnaire validé) : édition en place de l'intitulé (voir §3).
- Glisser un nœud : position écrite sans historique pendant le glisser, un point d'historique est posé au début du glisser (`checkpoint`).
- Zoom minimal 0,2 ; contrôles de zoom de React Flow (sans bouton « interactif ») ; grille de fond.
- Vue ajustée (`fitView`, marge 0,2, zoom max 1,1) à l'ouverture d'un graphe et sur la cmd `view.fit` (touche `F`).
- À l'ouverture d'un graphe (changement d'onglet, nouveau questionnaire), le conteneur prend le focus (`data-graph-focus`) sauf si une saisie est en cours.
- Graphe vide (et ni lecture seule ni validé) : invitation centrale « Ajouter une question » avec le raccourci affiché (personnalisé s'il existe) ; le bouton lance `node.newQuestion`.
- Nœud sélectionné seul qui sort du cadre : la vue est recentrée (animation 200 ms).
- Modes particuliers :
  - lecture seule (vue côte à côte) : ni sélection, ni glisser, ni liaison, ni dépôt, ni menu contextuel, pas de focus, pas de commentaires affichés ;
  - outline de prévisualisation (EVO-019) : lecture seule, seul un clic sur une question « active » réagit ;
  - questionnaire validé (EVO-015, `locked`) : sélection permise, nœuds non déplaçables (les commentaires le restent), ni liaison, ni dépôt, ni édition en place, pas d'invitation sur graphe vide.

**Règles de gestion et validations**
- La suppression n'est jamais faite par React Flow (`deleteKeyCode={null}`) : uniquement par la cmd `node.delete`.
- Navigation clavier accessibilité de React Flow désactivée (`disableKeyboardA11y`) ; la navigation aux flèches passe par les cmd `nav.*` (§4).
- Un nœud recréé reprend les mesures de React Flow (`rf.getInternalNode(id)?.measured`) pour ne pas disparaître brièvement.

**Cas limites gérés**
- Graphe introuvable : rien n'est rendu (nœuds et arêtes vides).
- Toute modification d'un questionnaire validé est de toute façon annulée par le store (voir §20).

**Références** : `src/ui/diagram/Diagram.tsx:50-219`, `EmptyHint.tsx`, `useKeepSelectionVisible.ts`, `DiagramContext.tsx`, `src/app/commands/nav-commands.ts:40`.

---

### Création de nœuds et d'arêtes

**Comportement observable**
- Cmd `node.newQuestion` (touche `N`) : crée une question de type par défaut, intitulé « Nouvelle question » (texte de l'outil) dans la langue de contenu, clé dérivée unique ; le nœud est sélectionné et son intitulé passe en édition en place.
- Cmd `node.newBranch` (`Shift+N`, nœud sélectionné requis) : crée une question reliée au nœud sélectionné par une arête de condition vide (`when: ""`), sélectionne l'arête et met le focus dans sa condition.
- Cmd `node.newInfo` (`Alt+I`), `node.newSummary` (`Alt+S`), `node.newEnd` (`Alt+F`, questionnaire seulement) : créent la page correspondante après la sélection, intitulé en édition (sans effet visible pour ces nœuds, l'édition en place ne concerne que les questions).
- Cmd `node.newRedirect` (`Alt+R`, questionnaire seulement, EVO-024) : crée un nœud Renvoi après la sélection (`text` = « Texte de renvoi » / « Redirect text », `buttons: []`), même placement et même création chaînée que les autres pages.
- Cmd `node.newExit` (fragment seulement) : crée une sortie nommée `sortie`, `sortie_2`… après la sélection.
- Création chaînée : si le nœud sélectionné a exactement une arête sortante sans condition, le nouveau nœud est inséré entre le nœud et son successeur (l'arête est remplacée par deux arêtes).
- Sinon, le nouveau nœud est relié depuis le nœud sélectionné (ou posé seul si rien n'est sélectionné).
- Cmd `node.connect` (`E`) : ouvre la palette en mode « relier » ; choisir un nœud crée l'arête sélection → nœud choisi (`node.connectTo`) et sélectionne la cible.
- Liaison tracée à la souris (poignée basse → poignée haute) : cmd cachée `edge.create` ; depuis une poignée de sortie nommée d'un nœud fragment, l'arête porte `exit`.
- Cmd `node.setStart` (questionnaire, nœud sélectionné) : le nœud devient le départ.

**Règles de gestion et validations**
- Placement : sous le nœud d'origine (+150 px), décalé de 300 px par arête sortante déjà présente ; sans origine, sous le nœud le plus bas (x = 0).
- Le premier nœud ajouté à un questionnaire sans départ valide en devient le départ ; un fragment n'a pas de départ.
- `connect` refuse silencieusement une arête identique (même origine, même cible, même sortie).
- Une arête créée avec condition est insérée avant la première arête « sinon » (sans condition) de la même origine et même sortie ; sinon en fin de liste.
- Clé d'une nouvelle question : `deriveKey(intitulé)` rendue unique parmi les clés et alias du graphe (`usedKeys`, suffixe `_2`, `_3`…).

**Cas limites gérés**
- Pas de nœud fin ni de nœud Renvoi dans un fragment (cmd désactivées), pas de sortie nommée dans un questionnaire (cmd désactivée).
- `connect` ne refuse pas une arête d'un nœud vers lui-même (aucun contrôle dans le store).

**Références** : `src/app/commands/graph-commands.ts:36-62` (`createAfter`), `:93-101`, `:141-163` ; `src/app/commands/library-item-commands.ts:189` (`node.newExit`) ; `src/plugins/node-kinds/redirect/index.tsx:41` ; `src/app/commands/edit-commands.ts:52` (`edge.create`) ; `src/app/store/graph.ts:40-67` (`insertNode`, `connect`).

---

### Nœud : rendu, badges, édition en place

**Comportement observable**
- Cadre de 240 px ; contenu délégué au plugin du type de nœud (`registry.nodeKind(kind).Shape`), qui reçoit aussi `graphId` (id du graphe affiché, utilisé par le nœud Renvoi pour nommer ses cibles, EVO-024, `NodeView.tsx:98`).
- Poignée d'entrée en haut ; une poignée de sortie en bas, ou, pour un nœud fragment dont le fragment a des sorties nommées, une poignée par sortie (nom affiché au-dessus, répartition régulière).
- Badges :
  - « Départ » (questionnaire) ou « Entrée » (fragment : entrée implicite ou réglée) ;
  - `*` si la question effective est obligatoire, `* ?` si obligatoire sous condition (infobulle = l'expression) ;
  - « surch. » (`required-override`) : référence de bibliothèque avec `required` surchargé, ou nœud fragment avec au moins une surcharge active (EVO-012) ;
  - « Autre » si l'option « Autre (préciser) » est active ;
  - « bib. » sur une référence de bibliothèque ou un nœud fragment : infobulle « double-clic pour ouvrir », double-clic = cmd `library.openRef` (EVO-013) ;
  - « n / m champs » pour une instance de structure à champs masqués (EVO-009) ;
  - icône bulle si la question a un commentaire de révision (clic = afficher / masquer, EVO-011) ;
  - bouton « Ouvrir le fragment ↗ » sur un nœud fragment (hors lecture seule) ;
  - « trad. » si une traduction manque ; « ⚠ n » (rose si au moins une erreur, ambre sinon ; infobulle = liste des codes) pour les autres problèmes du nœud.
- Édition en place de l'intitulé (questions uniquement) : zone de 2 lignes, texte sélectionné ; Entrée valide, Shift+Entrée = saut de ligne, Échap annule, perte du focus valide ; au retour, le focus revient au logigramme.

**Règles de gestion et validations**
- Validation de l'édition en place seulement si le texte a changé et n'est pas vide.
- Intitulé à variantes : seul le texte « sinon » (`otherwise`) de la langue de contenu est modifié.
- Question locale : si la clé était dérivée de l'ancien intitulé (`^base(_\d+)?$`), elle est redérivée, rendue unique, et le renommage est propagé (`renameKey`).
- Référence de bibliothèque : l'édition en place écrit une **surcharge d'intitulé** sur le nœud (copie de l'intitulé effectif avec la langue modifiée), sans changer la clé.
- Double-clic sur le badge « bib. » : `stopPropagation`, donc pas d'édition en place ; sans effet dans l'outline.

**Cas limites gérés**
- Cmd `node.editLabel` (Entrée) active pour tout nœud sélectionné, mais l'édition n'apparaît que pour une question.
- Lien rompu au double-clic sur « bib. » : message « objet introuvable », aucune navigation.
- Poignées invisibles `comment-left` / `comment-right` (non reliables) placées après la poignée par défaut, pour que les arêtes sans poignée partent toujours de la poignée basse.

**Références** : `src/ui/diagram/NodeView.tsx:17-171` ; `src/app/store/question-edits.ts:10-29` (`setQuestionLabel`) ; `src/app/commands/graph-commands.ts:128` ; `src/app/commands/library-item-commands.ts:37-42` (`openRef`) ; `src/plugins/node-kinds/fragment/index.tsx:31-50` (titre, alias, nombre de questions, « Déplier »).

---

### Sélection, déplacement et navigation au clavier

**Comportement observable**
- Flèche bas : premier successeur ; flèche haut : premier prédécesseur ; gauche / droite : nœud voisin (cibles distinctes du même parent), en boucle. Sans sélection, une flèche sélectionne le départ (ou le premier nœud).
- Annuler / rétablir : `Ctrl+Z`, `Ctrl+Shift+Z` / `Ctrl+Y`, dans l'historique de l'onglet actif (onglet Bibliothèque → `library` ; fragment → `library`).

**Règles de gestion et validations**
- Positions arrondies à l'entier ; positions écrites par `silent` (sans point d'historique) pendant le glisser.

**Cas limites gérés**
- Nœud sans prédécesseur / successeur : sélection inchangée.

**Références** : `src/app/commands/nav-commands.ts:8-40`, `src/ui/diagram/Diagram.tsx:109-130`.

---

### Suppression

**Comportement observable**
- Cmd `node.delete` (Suppr, Retour arrière ; bouton « Supprimer » du panneau d'une arête) : supprime les nœuds sélectionnés, sinon l'arête sélectionnée ; la sélection est vidée.
- Si un nœud supprimé porte un commentaire de révision : confirmation (`window.confirm`) ; refus = rien n'est supprimé.

**Règles de gestion et validations**
- Suppression d'un nœud : ses arêtes entrantes et sortantes, sa position et son commentaire sont retirés.
- Départ supprimé : le premier nœud restant devient le départ (`''` si plus aucun nœud). Entrée réglée d'un fragment supprimée : `entry` retirée (retour à l'entrée implicite).
- Aucune autre confirmation (nœuds référencés par des expressions : signalés ensuite par les vérifications).

**Cas limites gérés**
- Les nœuds commentaires ne sont pas supprimables par cette cmd (pas sélectionnables).

**Références** : `src/app/commands/graph-commands.ts:172-183`, `src/app/store/graph.ts:69-89`.

---

### Arêtes : pastille, libellé, condition, rang, sortie

**Comportement observable (logigramme)**
- Tracé de Bézier, flèche ; couleur indigo si sélectionnée.
- Pastille au milieu de l'arête si l'arête est « conditionnée » (plusieurs arêtes de même origine et même sortie, ou `when` défini), porte une sortie nommée, ou a un libellé (EVO-005). Contenu : nom de sortie (ambre), rang `n.` s'il y a plusieurs arêtes sœurs, puis le libellé (police normale) **ou** la condition (tronquée à 32 caractères + « … »), « ? » si la condition est vide, « sinon » (italique) pour une arête sans condition parmi plusieurs.
- Pastille tronquée en CSS (largeur max 224 px, « … »). Infobulle : libellé puis condition (même règle), ou la condition seule.
- Clic sur la pastille : sélectionne l'arête.

**Comportement observable (panneau de propriétés d'une arête)**
- Origine et destination (intitulé et clé de la question, alias d'un fragment, sinon type du nœud).
- « Libellé » (EVO-005) : une ligne, sauts de ligne remplacés par une espace ; vide = propriété retirée.
- « Condition » : éditeur d'expression ; vide = « sinon » (propriété `when` retirée) ; focus automatique si demandé (cmd `edge.editCondition`, touche `C`, ou création d'une branche) ; Entrée rend le focus au logigramme ; aide « rang n / total ».
- « Sortie » (si l'origine est un nœud fragment à sorties nommées, ou si l'arête porte déjà `exit`) : « toute sortie » ou une sortie ; une sortie inconnue reste proposée, suffixée « (?) ».
- Boutons Monter / Descendre (cmd `edge.moveUp` `Alt+↑`, `edge.moveDown` `Alt+↓`) et Supprimer.

**Règles de gestion et validations**
- Rang = ordre des arêtes dans `edges` ; le moteur les évalue dans cet ordre.
- Monter / descendre échange l'arête avec sa voisine **parmi toutes les arêtes sortantes du même nœud** (toutes sorties confondues).
- Saisies regroupées dans l'historique par clé `<edgeId>:<champ>` (frappes < 1,5 s = une étape).
- `edge.editCondition` sur un nœud sélectionné : prend la première arête entrante du nœud.

**Cas limites gérés**
- Arête dont la sortie n'existe plus (renommée, supprimée) : rattachée à la poignée par défaut, reste visible et corrigeable.
- Le libellé n'a aucun effet sur la navigation (non parcouru par `mapGraph`).

**Références** : `src/ui/diagram/EdgeView.tsx:14-50`, `src/ui/diagram/edgeLabel.ts`, `src/ui/properties/EdgeProperties.tsx:12-69`, `src/ui/properties/useGraphEdit.ts:11-19`, `src/app/commands/edit-commands.ts:43-50`, `src/app/commands/graph-commands.ts:130-138`, `src/app/store/graph.ts:92-104` (`moveEdge`).

---

### Mise en page automatique (ELK)

**Comportement observable**
- Cmd `view.layout` (touche `L`, bouton « Mise en page » de la barre du questionnaire) : recalcul des positions par ELK (algorithme en couches, de haut en bas, espacement 40 px entre nœuds, 60 px entre couches), puis vue ajustée (250 ms).
- Les commentaires de révision affichés ou non suivent leur question (même décalage).

**Règles de gestion et validations**
- Tailles mesurées par React Flow (240 × 100 par défaut) ; le départ (ou l'entrée du fragment) est placé en premier ; cycles cassés en profondeur (`DEPTH_FIRST`) ; ordre du modèle respecté (`NODES_AND_EDGES`).
- Un seul point d'historique pour toute la mise en page.

**Cas limites gérés**
- Arêtes vers un nœud inexistant ignorées. Sans effet en lecture seule.
- Les poignées de sorties nommées et les libellés d'arêtes ne sont pas transmis à ELK.

**Références** : `src/ui/diagram/autoLayout.ts:14-36`, `src/ui/diagram/useAutoLayout.ts:10-34`.

---

### Copier-coller et duplication de nœuds (EVO-010)

**Comportement observable**
- Cmd `node.copy` (`Ctrl+C`) : copie les nœuds sélectionnés dans un presse-papiers interne (sans effet si du texte est sélectionné dans la page).
- Cmd `node.paste` (`Ctrl+V`) : colle dans le graphe actif (questionnaire ou fragment), au pointeur s'il est sur le logigramme, sinon décalé de 40 px par rapport à l'original ; les nœuds collés sont sélectionnés. Par le menu contextuel : au point du clic.
- Cmd `node.duplicate` (`Ctrl+D`) : copie puis colle dans le même graphe, décalé de 40 px ; les copies sont sélectionnées.
- Message « Collage : éléments écartés » listant les nœuds écartés ou dont le rôle de départ n'est pas repris.

**Règles de gestion et validations**
- Copie = instantané (nœuds, arêtes dont les deux extrémités sont copiées, positions, départ), lié à l'id du projet : coller est indisponible dans un autre projet.
- Nouveaux identifiants pour les nœuds et arêtes collés ; disposition relative conservée (coin haut gauche de la sélection au point de collage).
- Clés de questions locales et alias de fragments déjà pris dans la cible : suffixés (`uniqueKey`, hors des clés de la cible **et** des clés d'origine de la sélection) ; les références à ces clés **dans les seuls nœuds et arêtes collés** sont réécrites (`cle`, `cle_other`, `cle.champ`, `alias.cle`… via `renameKeysIn`). Les références hors sélection sont conservées.
- Écartés : nœud fin collé dans un fragment (`paste.end`), nœud Renvoi collé dans un fragment (`paste.redirect`, EVO-024), sortie nommée collée dans un questionnaire (`paste.exit`), nœud fragment créant un cycle d'appels (`paste.cycle`). Les arêtes vers un nœud écarté sont abandonnées.
- Nœud Renvoi collé (EVO-024) : boutons copiés avec lui ; une cible nœud dont le premier identifiant du chemin fait partie de la sélection copiée vise la copie (`retargetButtons`, `n_x/f1` → `n_copie/f1`) ; sinon la cible d'origine est conservée, cible questionnaire comprise, même collée dans un autre questionnaire. Les conditions d'affichage des boutons suivent la réécriture des clés collées (`renameKeysIn`).
- Départ : rôle, pas un nœud. Le nœud qui était le départ est collé comme nœud ordinaire et la cible garde son départ (message `paste.start` / `paste.startFragment`) ; un questionnaire sans départ valide prend le départ collé, sinon le premier nœud collé.
- Un collage = un point d'historique.

**Cas limites gérés**
- Référence de bibliothèque collée : même référence, clé non suffixable (un doublon est signalé par `duplicateKey`).
- Noms de sorties nommées collées dans un fragment non rendus uniques.
- Noms relatifs des entrées dynamiques et clés masquées par un champ homonyme de leur structure : non réécrits.

**Références** : `src/app/store/clipboard.ts:25-98` (`:56` Renvoi écarté, `:84-85` repointage), `src/core/model/redirect.ts:187-197` (`retargetButtons`), `src/core/references/rename-local.ts:10-31`, `src/app/commands/clipboard-commands.ts:15-19` (`setPastePoint`), `:35` (nom d'un Renvoi dans le message), `:39-47` (`report`), `:77-96`, `src/app/commands/graph-commands.ts:165-172`, `src/app/i18n/messages-clipboard.ts:5-11`.

---

### Duplication d'un questionnaire ou d'un élément de bibliothèque (EVO-010)

**Comportement observable**
- Cmd `questionnaire.duplicate` (menu contextuel des onglets, palette) : la copie est insérée juste après l'original et s'ouvre.
- Cmd `library.duplicate` (menu contextuel de la liste de la bibliothèque, onglet d'un fragment, palette) : copie juste après l'original, affichée (question dans l'onglet Bibliothèque, fragment dans son onglet).

**Règles de gestion et validations**
- Titre / intitulé « Copie de X » dans chaque langue (texte de l'outil dans cette langue si elle existe, sinon langue de l'interface), puis « Copie 2 de X »… jusqu'à un nom libre ; nouvelle clé unique (`cle_2`…) ; questionnaire : nouvelle entrée de fichier `<clé>.json` dans le projet.
- Nœuds et arêtes réidentifiés, mise en page reprise, références de bibliothèque conservées (pas de copie en cascade), départ et `entry` repointés ; nœuds Renvoi copiés avec leurs boutons, cibles nœud repointées vers les nœuds de la copie (`retargetButtons`, EVO-024, `duplicate.ts:22-23`), cibles questionnaire conservées.
- La copie n'a aucun appelant. Ni statut de validation, ni `validatedAt`, ni `libraryVersions` repris (EVO-015, EVO-022) ; version conservée.
- Commentaires de révision non repris.

**Références** : `src/app/store/duplicate.ts:10-79`, `src/app/commands/clipboard-commands.ts:24-27` (`copyName`), `:98-117`, `src/ui/shell/Tabs.tsx:43-44`, `src/ui/library/Library.tsx:64-69`.

---

### Suppression d'un questionnaire (EVO-027)

**Comportement observable**
- Cmd `questionnaire.delete` : menu contextuel de l'onglet ou du bouton de réouverture (« Supprimer »), palette (« Supprimer le
  questionnaire », questionnaire actif), bouton « Supprimer » des propriétés du questionnaire. Aucun raccourci.
- Confirmation `window.confirm` : « Supprimer le questionnaire « titre » ? » (titre dans la langue du contenu, sinon langue
  par défaut, sinon clé), puis « Il est validé. », « n commentaires seront supprimés. », « n boutons de renvoi le ciblent. »,
  chaque ligne omise si nulle, singulier pour 1. Refus : projet inchangé.
- Accord : « Modifications non exportées » (`dirty`), onglets mis à jour (§ Onglets).

**Règles de gestion et validations**
- `deletionImpact` : validé = `status === 'validated'` ; commentaires = `layout.comments` du questionnaire ; boutons = boutons
  des nœuds Renvoi des **autres** questionnaires dont la cible est `{ questionnaire: id }`.
- `removeQuestionnaire` : retire le questionnaire, sa mise en page (commentaires compris) et son entrée de `projet.json` ;
  bibliothèque inchangée. Les exports, « utilisée dans », la page des commentaires et les vérifications lisent le projet
  sans lui : boutons de renvoi qui le ciblaient signalés `buttonTargetMissing`, fragment sans autre appelant `unusedFragment`.
- Questionnaire validé : supprimé sans dévalidation ; projet réduit à un questionnaire : suppression permise, Bibliothèque affichée.

**Références** : `src/app/commands/delete-commands.ts:9-36`, `src/app/store/delete-questionnaire.ts:14-33`,
`src/app/store/store.ts:260-277`, `src/app/i18n/messages-clipboard.ts:13-18`, `src/app/feedback/feedback.ts:59-61`.

---

### Menu contextuel du logigramme

**Comportement observable**
- Clic droit sur un nœud : le nœud est sélectionné s'il ne l'était pas ; menu « Copier », « Coller » (au point du clic), « Dupliquer », et « Commenter » si le nœud est une question. Chaque entrée affiche son raccourci et est grisée si la cmd est indisponible.
- Clic droit sur le fond : sélection vidée, menu « Coller ».
- Aucun menu sur un nœud commentaire ni en lecture seule.
- La position du pointeur sur le logigramme est mémorisée par graphe (point de collage de `Ctrl+V`), oubliée quand le pointeur quitte le logigramme.

**Cas limites gérés**
- Clic droit sur une question faisant partie d'une sélection multiple : la sélection est conservée ; « Commenter » est affiché mais grisé (la cmd exige une question sélectionnée seule).

**Références** : `src/ui/diagram/useDiagramMenu.tsx:12-45`, `src/app/commands/comment-commands.ts:18-27` (`selectedQuestion`).

---

### Insertion depuis la bibliothèque (panneau latéral, palette, glisser-déposer)

**Comportement observable**
- Panneau latéral « Bibliothèque » à gauche du logigramme (questionnaire et fragment), affiché / masqué par la cmd `view.libraryPanel` : liste filtrable (intitulé ou clé) des questions puis des fragments.
- Glisser un élément sur le logigramme : inséré à la position du curseur, non relié, sélectionné.
- Double-clic ou Entrée sur un élément : inséré à la suite du nœud sélectionné (mêmes règles que la création chaînée, §2), sans édition de l'intitulé.
- Cmd `library.insert` (touche `I`) : palette en mode « bibliothèque » ; en mode commandes, la palette liste aussi les éléments insérables.

**Règles de gestion et validations**
- Nœud créé : question → `{ kind: 'question', ref }` ; fragment → `{ kind: 'fragment', ref, alias }` avec alias = clé du fragment rendue unique dans le graphe.
- Dans un fragment, les fragments dont l'insertion créerait un cycle d'appels (lui-même compris) ne sont pas proposés (panneau, palette) ; une insertion qui en créerait un est refusée avec message `insert.refused` / `insert.cycle`.
- Dépôt refusé en lecture seule et sur un questionnaire validé (`dragover` non accepté).
- Insertion dans un questionnaire vide : le nœud devient le départ.

**Cas limites gérés**
- Élément introuvable : aucune insertion.
- `library.insert` indisponible si la bibliothèque n'a ni question ni fragment.

**Références** : `src/ui/library/LibraryPanel.tsx:15-56`, `src/ui/diagram/Diagram.tsx:161-174`, `src/app/commands/library-item-commands.ts:45-64` (`insertItem`), `:121-131`, `src/app/store/library-edits.ts:41-58`, `src/ui/shell/Palette.tsx:10-18,35`.

---

### Panneau des problèmes

**Comportement observable**
- Sous le logigramme (questionnaire et fragment), repliable (cmd `view.problems`, ouvert par défaut) ; compteur coloré : rose s'il y a au moins une erreur, ambre s'il n'y a que des avertissements, vert à zéro.
- Une ligne par problème : pastille (rouge = erreur, ambre = avertissement), texte dans la langue de l'interface (`describeIssue`), id du nœud ou de l'arête.
- Clic : sélectionne le nœud concerné, sinon l'arête concernée.
- « Aucun problème » si la liste est vide.

**Règles de gestion et validations**
- Liste = `useIssues({ owner: { kind, id } })` (`app/issues`) : `checkWorkspace(ws)`, calculé une fois par état du projet, filtré sur le propriétaire du graphe affiché (`owner.kind` et `owner.id`), recalculé à chaque modification du projet.
- Les problèmes portés par une question de bibliothèque (propriétaire `libraryQuestion`) ou par le dictionnaire système (`system`) n'apparaissent pas dans ce panneau.

**Cas limites gérés**
- Problème sans nœud ni arête (ex. `missingStart`, `fragmentEntry`, traduction d'un titre) : le clic vide la sélection.

**Références** : `src/ui/diagram/ProblemsPanel.tsx:8-37`, `src/ui/shell/QuestionnaireView.tsx:27`, `src/ui/library/FragmentView.tsx:32`, `src/app/issues/issues.ts:20-41`, `src/core/validation/issue.ts:17-29`.

---

### Vérifications non bloquantes du graphe (`checkWorkspace` / `checkGraph`)

Gravité : `error` pour les codes de l'ensemble `ERRORS` (`issue.ts:17-18`), `warning` sinon. Affichage : panneau des problèmes du graphe propriétaire (§12) ; sur le nœud concerné, badge « ⚠ n » (ou « trad. » pour `missingTranslation`) ; `missingTranslation` aussi dans Paramètres › Traductions ; propriétaire `system` dans l'onglet État du système.

| Code | Condition (telle que codée) | Gravité / affichage |
| --- | --- | --- |
| `missingStart` | Questionnaire non vide dont `start` ne désigne aucun nœud. Jamais dans un fragment ni sur un graphe vide. | erreur ; panneau (sans nœud) |
| `unreachable` | Nœud non atteint par parcours des arêtes depuis le départ (fragment : `entry` réglée, sinon premier nœud sans arête entrante, sinon premier nœud). | avertissement ; nœud |
| `deadEnd` | Questionnaire : nœud (hors fin, sortie nommée, nœud fragment) sans arête sortante ; nœud fragment sans arête sortante dont le fragment n'a aucune sortie nommée. Jamais dans un fragment. | avertissement ; nœud |
| `noElse` | Famille d'arêtes concurrentes (même origine ; pour un nœud fragment, par sortie) de plus d'une arête, toutes avec `when` non vide. | avertissement ; nœud d'origine |
| `multipleElse` | Plus d'une arête de la famille sans condition (`!e.when`, donc condition vide `""` comprise). | avertissement ; nœud d'origine |
| `loopWithoutExit` | Composante fortement connexe (Tarjan) bouclée (plus d'un nœud, ou boucle sur soi) dont aucune arête ne sort ; signalée sur son premier nœud dans l'ordre du graphe. | avertissement ; nœud |
| `exitNotConnected` | Nœud fragment : sortie nommée du fragment sans arête `exit` égale ni arête sans `exit`. | avertissement ; nœud fragment (`{exit}`) |
| `unknownExit` | Arête d'un nœud fragment dont `exit` n'est pas une sortie nommée du fragment. | erreur ; arête |
| `implicitExitNotConnected` | Nœud fragment ayant des arêtes, dont le fragment a une sortie implicite (nœud sans arête sortante autre que sortie nommée ou fin) et aucune arête sans `exit`. | avertissement ; nœud fragment |
| `fragmentEntry` | Fragment non vide sans `entry` valide et dont le nombre de nœuds sans arête entrante ≠ 1. | avertissement ; panneau du fragment (`{count}`) |
| `fragmentNoExit` | Fragment non vide sans aucun nœud sans arête sortante. | avertissement ; panneau du fragment |
| `endInFragment` | Nœud fin dans un fragment. | avertissement ; nœud |
| `fragmentCycle` | Le fragment s'appelle lui-même, directement ou non (`calledFragments`). | erreur ; panneau du fragment |
| `unusedFragment` | Fragment sans appelant (questionnaire ou fragment). | avertissement ; panneau du fragment |
| `libraryMissing` | Référence de question ou nœud fragment dont l'élément n'existe pas ; booléen dont `labelSet` n'existe pas. | erreur ; nœud |
| `invalidKey` | Clé de question ou alias non `snake_case` ; nom de variable système ou de champ de liste invalide (propriétaire `system`). | erreur ; nœud / État du système |
| `duplicateKey` | Clé de question ou alias déjà vu dans le graphe ; champ de structure en double (`cle.champ`) ; variable ou champ de liste système en double. | erreur ; nœud / État du système |
| `duplicateGroup` | Deux groupes d'options d'un choix (ou d'un champ choix de structure) avec le même identifiant statique (code, sinon libellé « sinon » dans la langue par défaut). | erreur ; nœud |
| `reservedGroupCode` | Identifiant de groupe égal à `AUTRE` ou `NSP`. | erreur ; nœud |
| `emptyGroup` | Groupe d'options sans option. | avertissement ; nœud |
| `invalidExpression` | Erreur de syntaxe JSONata dans une expression ou dans une interpolation `{…}` d'un libellé. | erreur ; nœud ou arête |
| `unknownReference` | Référence non résolue dans la portée (questionnaire ; question de bibliothèque : dans **chaque** graphe qui l'utilise ; fragment : non fournie par aucun appelant, ou fragment sans appelant) ; nom relatif inconnu d'une entrée dynamique sur une liste système à champs déclarés (`sys.x.nom`). | erreur ; nœud ou arête |
| `unknownFilterReference` | Référence inconnue issue d'un nom de filtre qui est une clé de question connue (message suggérant `$$.cle`). | erreur ; nœud ou arête |
| `hiddenField` | Référence (dans le graphe propriétaire de l'instance, ou chez l'appelant via `alias.`) à un champ masqué d'une instance de structure (`cle.champ…`, `cle.champ_other`). Pas pour un champ frère dans la structure. Remplace `unknownReference`. | erreur ; nœud ou arête |
| `expectedKeyMissing` | Référence d'un fragment hors de ses propres clés, non résolue dans la portée d'un appelant ; signalée dans l'appelant, sur chaque nœud qui appelle le fragment. | erreur ; nœud fragment de l'appelant (`{ref}`, `{fragment}`) |
| `notGuaranteed` | Référence (hors `$exists(…)`, hors références de la condition d'une variante pour son texte, hors variables système et alias seuls, hors champ frère) à une clé qui n'est pas posée sur tous les chemins menant au point d'évaluation (nœud, ou origine de l'arête). Question de bibliothèque : contrôlée à chaque nœud qui la référence. Dans un fragment : seulement ses propres clés. Non évalué si la référence est inconnue ou masquée, ni sur un nœud inaccessible. | avertissement ; nœud ou arête |
| `missingTranslation` | Texte multilingue ou libellé interpolé sans valeur dans une langue du projet (une fois par propriété) ; titre d'un questionnaire ou d'un fragment ; libellés oui / non d'un jeu de libellés ; nœud Renvoi : `title`, `text`, `buttons[i].label`, `finishLabel` (EVO-024). | avertissement ; badge « trad. », panneau, Paramètres |
| `redirectNoButton` | Nœud Renvoi d'un questionnaire sans aucun bouton (EVO-024). | erreur ; nœud |
| `buttonNoLabel` | Bouton de renvoi dont le libellé n'a de texte non vide dans **aucune** langue (une langue manquante seule = `missingTranslation`). | erreur ; nœud, `property` = `buttons[i]` |
| `buttonNoTarget` | Bouton de renvoi sans `target`. | erreur ; nœud, `buttons[i]` |
| `buttonTargetMissing` | Cible questionnaire absente du projet ou égale au questionnaire du nœud (`targetMissing`, `redirect.ts:173-177`), ou chemin `node` qui ne désigne aucun nœud (`nodeAtPath`, à travers les appels de fragments) dans le questionnaire du bouton. `{label}` = libellé dans la langue par défaut (repli : première langue renseignée). | erreur ; nœud, `buttons[i]` |
| `duplicateButtonTarget` | Bouton dont la cible (`q:<id>` ou `n:<chemin>`, toggles ignorés) est déjà visée par un bouton précédent du même nœud ; signalé sur chaque bouton suivant. | avertissement ; nœud, `buttons[i]` |
| `linkedNotBeforeEnd` | Bouton à cible questionnaire avec `replace: false` sur un Renvoi qui n'est pas « juste avant une fin » (`isJustBeforeEnd` : au moins une arête sortante, toutes vers un nœud `end`, conditions ignorées). | avertissement ; nœud, `buttons[i]` |
| `buttonTargetNotGuaranteed` | Cible nœud (non introuvable) non traversée sur tous les chemins du départ au Renvoi (`alwaysBefore`, par dominance : retirer la cible rend le Renvoi inatteignable ; question de fragment `appel/question` : l'appel domine le Renvoi et la question domine, dans le fragment, toutes ses sorties depuis l'entrée) ; une cible qui n'est pas en amont est toujours signalée. | avertissement ; nœud, `buttons[i]` |

Les sept codes du nœud Renvoi ne sont calculés que pour les questionnaires (`checkRedirects`, `workspace-check.ts:90`) : un nœud Renvoi présent dans un fragment (import) n'est pas vérifié. La condition d'affichage d'un bouton (`buttons[i].when`) passe par les vérifications d'expressions communes (`invalidExpression`, `unknownReference`, `notGuaranteed`, propriété `buttons[i].when`). Un Renvoi sans arête sortante reçoit `deadEnd` comme toute page.

**Références** : `src/core/validation/graph.ts:8-124`, `workspace-check.ts:8-104`, `redirect-check.ts:10-35`, `refs-check.ts:21-186`, `groups-check.ts:19-30`, `guarantee.ts`, `expected.ts`, `messages.ts:51-104`, `src/core/model/redirect.ts:41-104, 173-184`.

---

### Panneau de propriétés : cadre

**Comportement observable**
- Contenu selon la sélection : un seul nœud → propriétés du nœud ; sinon une arête → propriétés de l'arête ; sinon, dans un questionnaire → propriétés du questionnaire ; sinon texte « rien de sélectionné ».
- Le panneau fournit à l'éditeur d'expression la portée du graphe (`questionnaireScope` ou `fragmentScope`) pour l'autocomplétion et le contrôle.
- Questionnaire validé (EVO-015) : tout le contenu est dans un `fieldset` désactivé (`properties-locked`), éditeurs CodeMirror en lecture seule.
- Sans nœud ni arête sélectionnés, dans un questionnaire : section « Supprimer le questionnaire » avec bouton « Supprimer »
  (`questionnaire-delete`, cmd `questionnaire.delete`, EVO-027), hors du `fieldset` : actif même si le questionnaire est validé.
- Nœud : question locale → éditeur de question + section « Bibliothèque » (« Copier dans la bibliothèque ») ; référence → §16 ; nœud fragment → §17 ; autres types → propriétés du plugin, qui reçoivent `graphId` (cibles d'un nœud Renvoi, EVO-024, `PropertiesPanel.tsx:63`) ; questionnaire : bouton « Définir comme départ » si le nœud ne l'est pas ; fragment : section Entrée (§19).

**Règles de gestion et validations**
- Saisies d'un nœud ou d'une arête : `store.edit` avec clé de regroupement `<id>:<champ>` ; une propriété mise à `undefined` est retirée du JSON.

**Références** : `src/ui/properties/PropertiesPanel.tsx:17-104` (bouton `:41-46`), `src/ui/properties/useGraphEdit.ts`.

---

### Propriétés du questionnaire

**Comportement observable**
- Version (EVO-022, `questionnaire.setVersion`) et statut « Validé » / « Provisoire » ; infobulle « verrouillé » si validé.
- Titre multilingue (`questionnaire.setTitle`), clé (`questionnaire.rename`, aide : nom du fichier exporté), description (`questionnaire.setDescription`).
- Sous ces champs, bouton « Supprimer » du questionnaire (EVO-027, voir § Panneau de propriétés : cadre).

**Règles de gestion et validations**
- Clé validée à la sortie du champ ou sur Entrée : refusée (bordure rouge, message) si invalide ou déjà prise par un autre questionnaire ; Échap rétablit la valeur. Renommer change aussi le fichier `<clé>.json` du projet en mémoire.
- Frappes regroupées par champ dans l'historique du questionnaire.

**Références** : `src/ui/properties/QuestionnaireProperties.tsx:12-44`, `src/app/commands/edit-commands.ts:61-79`, `src/app/store/questionnaire-edits.ts`.

---

### Propriétés d'une question (locale ou de bibliothèque) et clés

**Comportement observable**
- Section « Question » : intitulé (éditeur multilingue, interpolation, variantes), clé, type (liste des plugins), « Obligatoire » (case), « Obligatoire si » (expression, visible si la case n'est pas cochée), valeur par défaut littérale, valeur par défaut calculée (expression), aide, texte indicatif (types texte et nombre).
- Section propre au type (plugin), avec renommage propagé des champs de structure.
- Section « Contraintes » (contraintes libres et messages par contrainte, paramètres selon `messageParams`).
- Section « Description » (texte libre).
- Le même éditeur sert à la question de bibliothèque dans l'onglet Bibliothèque (historique `library`).

**Règles de gestion et validations**
- Clé (`KeyInput`) : espaces retirés à la frappe ; validée à la sortie ou sur Entrée si `snake_case` valide et non prise (clés et alias du graphe pour une question locale ; autres clés de la bibliothèque pour une question de bibliothèque) ; sinon bordure rouge, message, valeur rétablie. Validation = renommage propagé (`renameKey`, §25).
- Intitulé : clé redérivée et propagée si elle était dérivée de l'ancien intitulé (local et bibliothèque).
- Changement de type : `plugin.create(champs communs, ancienne question)`.
- Valeur par défaut : texte brut pour `text`, `date`, `single`, `email`, `phone`, `address`, `civility` ; JSON pour les autres types (saisie JSON invalide : message, valeur non écrite) ; vide = retirée.
- Cmd associées sur une question locale sélectionnée : `node.type.<type>` (raccourci de chaque plugin), `node.toggleRequired` (`O`), `node.toggleOther` (`A`, types à « Autre »), `node.toggleDontKnow` (hors structure).

**Cas limites gérés**
- Clé d'une question de bibliothèque : seule l'unicité dans la bibliothèque est contrôlée à la saisie ; un conflit avec une clé d'un graphe utilisateur est signalé par `duplicateKey`.

**Références** : `src/ui/properties/QuestionProperties.tsx:27-113`, `KeyInput.tsx:6-27`, `DefaultValueInput.tsx:6-36`, `src/ui/library/LibraryQuestionView.tsx:22-34`, `src/app/commands/graph-commands.ts:85-124`.

---

### Propriétés d'une référence de question de bibliothèque

**Comportement observable**
- Mention « question de bibliothèque », intitulé et clé de la définition.
- Intitulé surchargeable (aide « surchargé ») ; bouton « Reprendre l'intitulé de la bibliothèque » si surchargé.
- Caractère obligatoire (EVO-012) : sélecteur « Hérité (valeur, provenance) » / « Obligatoire » / « Facultatif » ; sous le sélecteur, valeur effective et provenance (bibliothèque, surcharge locale, fragment désigné par son titre sinon sa clé) ; bouton « Revenir à la valeur héritée » (cmd `node.resetRequired`) si une surcharge existe.
- Structure (EVO-009) : liste des champs de la définition (ordre de la bibliothèque) avec case « affiché » ; champ masqué barré ; la dernière case cochée est désactivée.
- Bouton « Ouvrir dans la bibliothèque » (cmd `node.openInLibrary`).

**Règles de gestion et validations**
- Surcharge de l'obligation : `required: true|false` sur le nœud ; « Hérité » la retire ; une surcharge égale à la valeur héritée est conservée.
- Masquage : `hiddenFields` (clés masquées) sur le nœud ; liste vide → propriété retirée ; refus de masquer le dernier champ affiché ; la définition n'est jamais modifiée.
- Masquer un champ référencé : le masquage est appliqué, puis une fenêtre d'avertissement « Champ masqué référencé : cle.champ » liste les expressions concernées (nœud ou arête, propriété, texte), celles d'un appelant de fragment préfixées « appelant « nom » ».

**Cas limites gérés**
- Valeur héritée « obligatoire si » affichée comme telle.
- Champ de bibliothèque renommé : suivi dans `hiddenFields` des instances ; champ masqué disparu ou plus aucun champ affiché : masquage ignoré (`instanceQuestion`).

**Références** : `src/ui/properties/ReferenceProperties.tsx:20-42`, `RequiredOverride.tsx:35-72`, `HiddenFields.tsx:13-51`, `src/app/store/required-edits.ts:9-39`, `src/app/store/library-edits.ts:127-175`, `src/core/model/instance.ts:9-18`.

---

### Propriétés d'un appel de fragment

**Comportement observable**
- Fragment référencé (titre, clé ; « ? » s'il est introuvable).
- Alias (`KeyInput`) : renommage propagé chez l'appelant et ses propres appelants.
- Sorties du fragment (nœuds sans arête sortante : `→ nom` pour une sortie nommée, sinon clé, alias ou type).
- Clés attendues de l'appelant (`expectedKeys`) : chacune marquée « absente » (rouge) si la portée de cet appelant ne la résout pas ; « aucune » sinon.
- « Questions du fragment » (EVO-012) : chaque question du fragment, fragments appelés compris (intitulé, chemin `alias.sous_alias.cle`), avec son sélecteur d'obligation, badge « Surchargé » si surchargée dans cet appel ; bouton « Revenir à la valeur héritée » pour tout l'appel.
- Bouton « Ouvrir le fragment » (cmd `node.openFragment`).

**Règles de gestion et validations**
- Alias refusé s'il est invalide ou pris (clés et alias du graphe).
- Surcharges stockées dans `requiredOverrides` du nœud fragment, clé = chemin d'identifiants (`n1/n2`) ; carte vide retirée ; « Revenir » retire toutes les surcharges de l'appel, orphelines comprises.
- Résolution : la surcharge du niveau le plus proche de l'appelant l'emporte, puis la référence dans le fragment, puis la bibliothèque.

**Références** : `src/ui/properties/ReferenceProperties.tsx:45-94`, `RequiredOverride.tsx:75-103`, `src/core/model/required.ts:35-71`.

---

### Départ, entrée et sorties nommées d'un fragment

**Comportement observable**
- Fragment : section « Entrée » sur un nœud qui n'est pas l'entrée implicite : « Définir comme entrée du fragment » ; sur l'entrée réglée : mention et « Revenir à l'entrée implicite » (cmd `node.setEntry`, bascule).
- Sortie nommée : propriétés du plugin ; renommer la sortie renomme aussi `exit` des arêtes de tous les appels (questionnaires et fragments).

**Règles de gestion et validations**
- `entry` retirée si son nœud est supprimé. Entrée implicite = `entry` valide, sinon premier nœud sans arête entrante, sinon premier nœud.

**Références** : `src/ui/properties/PropertiesPanel.tsx:63-97`, `src/app/commands/library-item-commands.ts:171-184`, `src/app/store/library-edits.ts:194-204`, `src/core/model/fragment.ts:6-30`.

---

### Historique et verrou

**Comportement observable**
- Annuler / rétablir par portée (`q:<id>`, `library`, `project`) ; frappes d'un même champ en moins de 1,5 s = une étape.
- Une modification qui touche d'autres portées (renommage propagé, extraction en fragment) devient une transaction : l'annuler depuis une portée l'annule dans toutes celles où ce point est en tête.
- Modification d'un questionnaire validé (EVO-015) : état d'avant remis (projet, historique, onglets, sélection) et message « formulaire validé » (sauf écriture silencieuse de position).
- Suppression d'un questionnaire (EVO-027) : échappe au verrou, de même que son annulation et son rétablissement juste après (voir § Historique annuler / rétablir).

**Références** : `src/app/store/store.ts:156-298`, `src/app/store/history.ts:26`, `src/app/store/travel.ts`.

---

### Commentaires de révision (EVO-011)

**Comportement observable**
- Création : cmd `comment.add` (« Commenter ») depuis le menu contextuel d'une question (questionnaire, fragment) ou d'une question de la liste de la bibliothèque, ou par la palette sur la question sélectionnée seule. Le commentaire est créé vide, affiché, et le texte initial prend le focus. Si la question en a déjà un : il est seulement affiché.
- Fil : texte initial (multiligne, hauteur ajustée) puis une carte par réponse ; « Répondre » ajoute une réponse vide en fin de fil et y met le focus ; croix = supprimer une réponse ; « Supprimer le commentaire » retire texte et réponses.
- Logigramme : nœud commentaire (256 px, déplaçable, non sélectionnable) relié par une branche ambre en pointillés partant du côté gauche ou droit de la question selon la position du centre du commentaire ; icône « masquer » dans son en-tête ; icône bulle sur la question (afficher / masquer) ; bouton « Commentaires » de la barre (questionnaire, fragment) : affiche tout si au moins un est masqué, sinon masque tout (désactivé sans commentaire).
- Question de bibliothèque : fil affiché en tête de la vue de la question (pas de logigramme).
- Page « Commentaires » (onglet `comments`, cmd `tab.comments`) : tous les commentaires (questionnaires dans l'ordre du projet, fragments, questions de bibliothèque) avec type d'objet, objet (titre sinon clé), question (intitulé et clé), fil éditable et « Ouvrir » (cmd `comment.open` : ouvre l'objet en vue logigramme, affiche ses commentaires, sélectionne la question et centre la vue sur le commentaire).

**Règles de gestion et validations**
- Stockage dans la mise en page de l'objet (`layout.comments`) : `{ node, x?, y?, text, replies[] }` ; un commentaire au plus par question ; position initiale à droite de la question (+300 px) ; aucune position pour une question de bibliothèque.
- Historique de l'objet : `q:<id>` pour un questionnaire, `library` pour un fragment ou une question de bibliothèque ; frappes regroupées par champ (`comment:<clé>:text`, `reply<i>`).
- Affichage = état de session `shownComments` (non enregistré, vidé au chargement).
- Supprimer une question commentée : confirmation, commentaire supprimé avec elle. Supprimer une question de bibliothèque commentée ou un fragment ayant des commentaires : confirmation. Suppression d'un élément de bibliothèque : sa mise en page (et ses commentaires) disparaît.
- Extraction en fragment : les commentaires des nœuds déplacés suivent dans la mise en page du fragment.
- Mise en page automatique : chaque commentaire garde son décalage par rapport à sa question.
- Les champs de saisie ne propagent pas les touches (raccourcis inactifs) et ne déclenchent ni glisser ni zoom.

**Cas limites gérés**
- Seules les questions peuvent être commentées (pas les pages, fins, nœuds fragment).
- Copier-coller et duplication ne reprennent pas les commentaires.
- Commentaire d'un nœud disparu : non affiché dans le logigramme.
- Mise en page d'une question de bibliothèque vidée de commentaires : retirée.

**Références** : `src/app/store/comment-edits.ts:1-93`, `src/app/commands/comment-commands.ts:42-122`, `src/ui/comments/CommentThread.tsx:13-87`, `src/ui/comments/CommentsPage.tsx:11-55`, `src/ui/diagram/useCommentNodes.ts:16-38`, `CommentNodeView.tsx`, `useCenterOnComment.ts`, `src/ui/library/Library.tsx:68`, `src/ui/library/LibraryQuestionView.tsx:49`.

---

### Onglet Bibliothèque

**Comportement observable**
- Liste à gauche : « Jeux de libellés » (avec leur nombre), « Questions » (intitulé + clé, bouton « + » = cmd `library.newQuestion`), « Fragments » (titre + clé, « + » = `library.newFragment`). L'élément affiché est mis en évidence (`aria-current`) et gardé visible dans la liste.
- Clic sur une question : affichée à droite ; clic sur un fragment : ouvert dans son onglet `f:<id>` ; clic sur « Jeux de libellés » : liste des jeux.
- Clic droit sur un élément : « Dupliquer » ; pour une question, aussi « Commenter ».
- Vue d'une question : aide, « utilisée dans » (clés des questionnaires et fragments qui la référencent) ou « inutilisée », bouton Supprimer, commentaire, version / statut (EVO-022), éditeur de question complet.
- Jeux de libellés (booléens) : création (cmd `labelSet.addBoolean`, clé `oui_non` unique, libellés Oui / Non dans les langues du projet), clé, libellés vrai / faux multilingues, suppression (cmd `labelSet.delete`).
- Éléments inutilisés (EVO-028) : triangle ambre (`unused-mark`, infobulle native et `aria-label`) après l'intitulé d'une question
  ou d'un fragment inutilisé dans la liste de gauche, et sur la carte d'un jeu de libellés inutilisé (vue de droite, après le
  badge du type ; l'entrée unique « Jeux de libellés » de la liste de gauche n'en porte pas). Textes : « Inutilisée : aucun
  questionnaire ni fragment ne l'utilise. » (question), « Inutilisé : aucun questionnaire ni fragment ne l'appelle. » (fragment),
  « Inutilisé : aucune question booléenne ne l'utilise. » (jeu). Après le titre de chaque rubrique (Jeux de libellés, Questions,
  Fragments) : « (n inutilisée(s)) » pour les questions, « (n inutilisé(s)) » sinon (`unused-count`), absent si n = 0.

**Règles de gestion et validations**
- Nouvelle question de bibliothèque : type texte, intitulé « Nouvelle question », clé dérivée unique dans la bibliothèque. Nouveau fragment : vide, titre par défaut, clé dérivée unique.
- Portée des expressions d'une question de bibliothèque = réunion des portées des graphes qui l'utilisent (au minimum l'état du système).
- Suppression d'un élément (cmd `library.delete`) : sans confirmation sauf commentaires ; les références restantes deviennent `libraryMissing` ; l'onglet du fragment est fermé.
- Clé d'un jeu de libellés : écrite telle quelle à la frappe ; invalide ou en double → bordure rouge et message, sans blocage de l'écriture.
- Définition d'un élément inutilisé (`unusedLibraryItems`, EVO-028) : question de bibliothèque qu'aucun nœud à référence (`ref`)
  d'un questionnaire ou d'un fragment ne désigne (même critère que « utilisée dans », `itemUsages`) ; fragment sans appelant
  (`fragmentCallers`, même critère que `unusedFragment` et le bandeau ; un fragment qui s'appelle lui-même a un appelant) ;
  jeu de libellés qu'aucune question booléenne ne désigne, qu'elle soit locale (nœud sans `ref` d'un questionnaire ou fragment),
  de bibliothèque, ou champ booléen d'une structure locale ou de bibliothèque. Usage direct seulement (un élément référencé par
  un fragment inutilisé est utilisé) ; statut validé / provisoire ignoré. Ordre de la bibliothèque.
- Recalcul (`useUnused`) mémorisé sur le projet `ws` : toute modification, annulation, rétablissement ou ouverture de projet
  met à jour indicateurs, compteurs et pastille. Affichage seul, aucune commande.

**Références** : `src/ui/library/Library.tsx:13-78` (indicateurs `:38,57,60`, compteurs `:53-58`), `Unused.tsx:7-39`, `src/core/model/usage.ts:28-46`, `LibraryQuestionView.tsx:14-56`, `LabelSets.tsx:17-59` (indicateur `:44`), `items.ts:7-37`, `src/app/commands/library-item-commands.ts:27-30,91-120`, `src/app/commands/library-commands.ts:17-40`, `src/app/store/library-edits.ts:17-38`.

---

### Onglet d'un fragment

**Comportement observable**
- Bandeau « Fragment de la bibliothèque · n appelant(s) : clés » ou « aucun appelant » ; boutons « Commentaires » et « Bibliothèque » (panneau latéral).
- Titre multilingue, clé (`KeyInput`, unique parmi les fragments), description, Supprimer, version / statut / Valider (EVO-022).
- Panneau latéral, logigramme éditable (les cmd du graphe y agissent), panneau des problèmes du fragment, panneau de propriétés.

**Règles de gestion et validations**
- Modifications dans l'historique `library` (frappes regroupées par champ). Changer la clé du fragment n'a pas d'effet sur les alias des appels.

**Références** : `src/ui/library/FragmentView.tsx:25-81`.

---

### Copie en bibliothèque (EVO-009) et déplacement

**Comportement observable**
- Bouton « Copier dans la bibliothèque » (cmd `node.toLibrary`) sur une question locale seulement.
- Clé libre dans la bibliothèque : copie immédiate ; le nœud devient une référence (même id, même place, mêmes arêtes).
- Clé prise : dialogue « autre clé » (proposition `cle_2`…, refus si invalide ou prise dans la bibliothèque ou le graphe) ; à la validation, la question est renommée avec propagation, puis copiée ; une fenêtre liste les expressions réécrites (« nœud · propriété : avant → après »).

**Règles de gestion et validations**
- Toute la définition locale (sauf `kind`) est copiée dans la bibliothèque avec un nouvel id `lq…` ; le nœud ne garde que `{ kind, id, ref }`.
- Refus (sans effet) si la clé cible est invalide, prise dans la bibliothèque, ou prise dans le graphe (si différente de la clé actuelle).

**Références** : `src/app/commands/library-item-commands.ts:70-85,154-158`, `src/app/store/library-edits.ts:61-113`, `src/ui/shell/CopyDialog.tsx:8-38`.

---

### Extraction d'une sélection en fragment

**Comportement observable**
- Cmd `node.group` (`Ctrl+G`, logigramme d'un questionnaire, sélection non vide) : crée un fragment « Nouveau fragment » dans la bibliothèque et remplace la sélection par un nœud fragment sélectionné.
- Refus avec message : sélection contenant une fin ou une sortie nommée (`group.forbidden`) ; sélection contenant un nœud Renvoi (`group.redirect`, « La sélection contient un nœud Renvoi : un fragment n'en contient pas. », EVO-024) ; sélection à plusieurs entrées (`group.multipleEntries`, liste des clés).

**Règles de gestion et validations**
- Entrées = départ du questionnaire s'il est sélectionné + cibles des arêtes venues de l'extérieur ; entrée retenue = l'unique entrée, sinon le premier nœud sélectionné ; `entry` réglée si elle n'est pas l'unique racine du fragment.
- Une sortie nommée par cible extérieure (nom = clé de la cible, sinon alias, sinon `fin` / `information` / `synthese`, sinon `sortie`, rendu unique) ; arêtes internes conservées (conditions comprises), arêtes sortantes redirigées vers la sortie ; l'appelant relie chaque sortie à sa cible (arête `exit`, sans condition).
- Arêtes entrantes redirigées vers le nœud fragment ; départ transféré au nœud fragment s'il était dans la sélection.
- Alias = clé du fragment rendue unique parmi les clés restantes ; références de l'appelant aux clés et alias déplacés préfixées par `alias.` (`qualifyKeys`, `cle_other` compris).
- Mise en page : positions reprises dans le fragment, sorties en ligne en dessous ; le nœud fragment prend la place de l'entrée ; commentaires déplacés.
- Une seule opération annulable depuis le questionnaire ou la bibliothèque (transaction).

**Références** : `src/app/store/group.ts:11-94` (`canExtract` l.21-22), `src/app/commands/library-item-commands.ts:132-155`, `src/core/references/rename.ts:147-151`.

---

### Renommage propagé et usages (`core/references`)

**Comportement observable**
- Renommer une clé (question, champ de structure, alias, variable système, champ de liste système) réécrit toutes les références dans les expressions et les libellés interpolés du projet.

**Règles de gestion et validations**
- Question d'un questionnaire : réécrite dans ce questionnaire (`cle`, `cle_other`, `cle.…`).
- Question d'un fragment : dans le fragment (nue) et chez chaque appelant récursivement (`alias.cle`, `a.b.cle`).
- Question de bibliothèque : dans la question elle-même, chaque questionnaire qui la référence, chaque fragment qui la référence et leurs appelants.
- Champ de structure : nu dans les expressions de la structure, `cle.champ` / `cle.champ_other` ailleurs ; suivi dans `hiddenFields` des instances (question de bibliothèque).
- Alias : dans le graphe propriétaire et chez ses appelants.
- Variable système : `sys.x` partout, et clés des valeurs de scénarios. Champ de liste système : `sys.x.champ`, noms relatifs des entrées dynamiques dont `from` est `sys.x`, exemple et scénarios ; nom invalide ou pris → inchangé.
- Non réécrits : expressions relatives d'une entrée dynamique (sauf champ de liste système), clé racine masquée par un champ homonyme dans les expressions de sa structure.
- `findUsages(ws, chemin)` : expressions (non relatives) dont une référence commence par ce chemin.
- Parcours des expressions : intitulé (variantes : condition et textes), aide, texte indicatif, « obligatoire si », valeur calculée, règles des contraintes, conditions d'options et d'entrées dynamiques, bornes date / nombre en expression, unité, suggestions (EVO-016), libellés de groupes, « Autre », « Ne sais pas », libellés de civilité, champs de structure ; nœuds info / synthèse / fin ; nœud Renvoi : titre, texte, `finishLabel`, libellé et condition d'affichage de chaque bouton (EVO-024, `visit.ts:135-147`) ; intitulé surchargé d'une référence ; conditions d'arêtes.
- Cible d'un bouton de renvoi : désignée par identifiant (`q:<id>`, chemin d'ids de nœuds), donc inchangée par un renommage de clé ou de questionnaire ; les boutons n'entrent pas dans la portée des expressions.

**Cas limites gérés**
- Renommer une question de l'appelant ne modifie pas les fragments qui la référencent par clé nue (signalé par `expectedKeyMissing`).

**Références** : `src/core/references/rename.ts:28-187`, `usages.ts`, `visit.ts:37-191`, `scope.ts:33-58`.
