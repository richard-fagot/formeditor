# Existant — 1. Coque, commandes et transverse

Partie de l'inventaire : index, état au commit et conventions dans `docs/EXISTANT.md`.


### Démarrage et cadre de l'application (`App`)

**Comportement observable**
- Au chargement, rien n'est affiché tant que la restauration de la session n'est pas terminée (`ready`), puis : barre de
  projet, barre d'onglets, contenu de l'onglet actif, palette, dialogue de copie en bibliothèque, fenêtre de messages.
- Contenu affiché selon l'onglet actif : questionnaire (`q:<id>` → `QuestionnaireView`), fragment (`f:<id>` →
  `FragmentView`), `library`, `system`, `settings`, `comments`.
- Une fenêtre modale unique « notice » (titre + liste de lignes, police monospace, texte rouge) sert à tous les messages :
  erreurs d'import, refus de validation, verrou d'un formulaire validé, collage partiel, image réduite, etc. Bouton « Fermer ».
- Premier lancement sans session : projet vierge « Nouveau projet », langue `fr`, un questionnaire vide « Questionnaire »
  (clé `questionnaire`), onglet de ce questionnaire ouvert.

**Règles de gestion et validations**
- Après restauration (réussie ou non), la sauvegarde automatique démarre.
- Les raccourcis sont (ré)installés à chaque changement de `keymap`.

**Cas limites gérés**
- Session absente ou illisible : démarrage sur le projet vierge, sans message.
- Plus aucun onglet ouvert : `activeTab` vaut `library` (contenu Bibliothèque affiché même si l'onglet n'est pas dans la liste).

**Références** : `src/ui/shell/App.tsx:17-57`, `src/app/store/store.ts:116-141` (`initialState`, `blankWorkspace`),
`src/app/store/store.ts:258-264` (`closeTab`).

---

### Messages, confirmations et problèmes du projet (`app/feedback`, `app/issues`, EVO-025)

**Comportement observable**
- Aucun effet visible propre : ces deux modules sont la seule voie vers la fenêtre « notice », `window.confirm` et
  `checkWorkspace` côté interface. Un seul message à la fois, le dernier remplace le précédent ; aucun niveau affiché.

**Règles de gestion**
- `app/feedback` : `refuse(titre, ...lignes)` et `inform(titre, ...lignes)` écrivent `notice` de la même façon (seule
  l'intention diffère) ; `fail(titre, erreur)` affiche une ligne : `erreur.message` si c'est une `Error`, sinon `String(erreur)` ;
  `confirm(question, ...lignes)` renvoie la réponse de `window.confirm`, seul appel du code ; question et lignes de précision
  traduites puis jointes par saut de ligne (EVO-027).
- Message : clé `MessageKey`, `{ key, params }`, ou `{ raw }` (texte non traduit : erreurs d'import, nom d'un élément,
  références réécrites, titre de l'avertissement des champs masqués). Traduction dans la langue de l'interface au moment de l'appel.
- Branchement : `app/store` appelle `bindFeedback` (langue = `uiLang`, écriture dans l'état) ; sans branchement, langue `fr`
  et rien n'est écrit.
- Appelants : commandes de projet (import, confirmation de perte), version et validation, bibliothèque (lien rompu, cycle,
  extraction refusée, références réécrites, confirmation de suppression), collage, suppression de nœuds commentés,
  suppression d'un questionnaire (confirmation multiligne, EVO-027),
  dévalidation, verrou du store (`refused`), export d'image (`inform` image réduite, `fail`), champs masqués.
- `notice` n'est remis à `undefined` qu'à la fermeture de la fenêtre (`App.tsx:50, 54`) et au chargement d'un projet
  (`store.ts:304`).
- `app/issues` : `issuesOf(ws)` = `checkWorkspace(ws)` mémorisé par référence de `ws` (même `ws` → même tableau) ;
  `selectIssues(issues, filtre)` cumule les critères `owner { kind, id? }`, `ownerIds`, `code`, `lang` (langue contenue dans
  `params.lang`, liste « fr, en ») et conserve l'ordre ; `useIssues(filtre)` lit `ws` dans le store, filtre comparé par valeur.
- Vues qui l'utilisent : `QuestionnaireView`, `FragmentView`, `ComparePane`, `Outline`, compteur de traductions de `Preview`,
  `TranslationsSection`, `SystemState`.
- Contrôle automatique (Vitest) : hors tests, pas de `window.confirm` ni d'écriture `.notice =` hors d'`app/feedback`
  (remises à zéro ci-dessus exceptées), pas d'appel à `checkWorkspace(` hors d'`app/issues` et de `core`.

**Références** : `src/app/feedback/feedback.ts:3-61`, `src/app/store/store.ts:156-170` (`refused`), `:342` (`bindFeedback`),
`src/app/issues/issues.ts:6-41`, `src/app/feedback/single-path.test.ts:20-33`, `docs/ERREURS.md`.

---

### Barre de projet (`TopBar`)

**Comportement observable**
- Logo « Q » ; champ du nom du projet (modifiable en place) ; indicateur « Modifications non exportées » (ambre) /
  « Tout est exporté » (vert).
- Boutons, dans cet ordre : Nouveau projet, Ouvrir / importer…, Exporter (bundle), icône « Exporter les fichiers
  unitaires ». Aucune icône d'ouverture de l'exemple (retirée par EVO-026).
- À droite : sélecteur de la langue du contenu (langues du projet), sélecteur de la langue de l'interface (`fr`, `en`),
  bouton engrenage (Paramètres), bouton « Palette de commandes » avec `Ctrl+K` affiché en dur.

**Règles de gestion et validations**
- Chaque bouton/sélecteur appelle une commande (`runCommand`) : `project.rename`, `project.new`, `project.open`,
  `project.export`, `project.exportFiles`, `lang.content`, `lang.ui`, `tab.settings`, `palette.open`.
- Le renommage du projet est un point d'historique de la portée `project`, frappes regroupées (clé `name`, fenêtre 1,5 s).
- `dirty` passe à vrai à toute modification avec historique (`edit`, `transact`, `silent`, annuler/rétablir) ; repasse à
  faux à l'export (bundle ou fichiers).

**Cas limites gérés**
- Nom de projet vide accepté (le nom de fichier exporté devient `projet.bundle.json` via `slug`).
- Le libellé `Ctrl+K` du bouton n'est pas mis à jour si le raccourci est personnalisé (texte en dur).

**Références** : `src/ui/shell/TopBar.tsx:8-52` (boutons l.29-32), `src/app/commands/edit-commands.ts:101-104`, `src/app/commands/files.ts:30-31`,
`src/app/store/history.ts:26` (`COALESCE_MS = 1500`).

---

### Onglets (`Tabs`) et navigation entre onglets

**Comportement observable**
- Onglets ouverts dans l'ordre d'ouverture : questionnaires (titre dans la langue du contenu, sinon langue par défaut,
  sinon clé), fragments (icône ambre, titre du fragment), Bibliothèque, État du système, Paramètres, Commentaires.
- Croix de fermeture visible au survol seulement.
- Bouton « + » : nouveau questionnaire.
- Questionnaires fermés : listés en petits boutons grisés après le « + » (clic = rouvrir).
- À droite : liens « Bibliothèque », « État du système », « Commentaires » tant que l'onglet correspondant n'est pas ouvert.
- Marqueur « Validé » (icône + texte, date de validation en infobulle) sur l'onglet ou le bouton de réouverture d'un
  questionnaire validé (EVO-015).
- Pastille ambre du nombre total d'éléments de bibliothèque inutilisés (`UnusedTotal`, EVO-028) sur l'onglet « Bibliothèque »,
  ou sur le lien « Bibliothèque » tant que l'onglet n'est pas ouvert ; infobulle « n éléments de bibliothèque inutilisés »
  (« 1 élément… inutilisé » au singulier) ; masquée aux technologies d'assistance (`aria-hidden`) ; absente quand le total est nul.
- Clic droit sur un onglet de questionnaire, un questionnaire fermé ou un onglet de fragment : menu « Dupliquer »
  (`questionnaire.duplicate` / `library.duplicate`) ; pour un questionnaire (ouvert ou fermé), aussi « Supprimer »
  (`questionnaire.delete`, EVO-027), qui s'applique aussi à un questionnaire validé.

**Règles de gestion et validations**
- `openTab` ajoute l'onglet s'il n'y est pas, le rend actif et vide la sélection.
- `closeTab` active l'onglet précédent (ou `library` s'il n'en reste aucun).
- `tab.next` / `tab.prev` parcourent circulairement la liste des onglets ouverts.
- Les onglets Paramètres et Commentaires ne s'ouvrent que par commande (engrenage, lien), jamais à l'ouverture d'un projet.
- `loadWorkspace` (nouveau projet, ouverture d'un projet/bundle, restauration de session) : un onglet par questionnaire, premier actif,
  vues, sélection, historiques, prévisualisations, vue côte à côte, commentaires affichés réinitialisés.
- Annuler/rétablir resynchronise les onglets (questionnaire disparu → onglet fermé, réapparu → rouvert ; fragment disparu → fermé). Un questionnaire qui réapparaît
  est remis au rang de son entrée dans `projet.json` (`placeReappeared`, `src/app/store/travel.ts:53,59-68`).
- Suppression d'un questionnaire (EVO-027, `closeDeleted`) : son onglet est retiré ; s'il était actif, l'onglet précédent
  devient actif (le suivant s'il était le premier), la Bibliothèque seulement s'il ne reste aucun onglet (EVO-027-012) ; s'il
  n'était pas actif et qu'il ne reste aucun questionnaire, la Bibliothèque est activée ; elle est ajoutée en fin si elle n'était
  pas ouverte (`delete-questionnaire.ts:63-71`) ;
  vue côte à côte fermée si elle affichait ce questionnaire ; sélection vidée si elle visait ce questionnaire. Le bouton de
  réouverture disparaît avec le questionnaire.
- Annulation de la suppression juste après (`reopenDeleted`) : l'onglet reprend sa place (un questionnaire fermé reste fermé),
  actif s'il l'était.

**Cas limites gérés**
- Un fragment fermé n'a pas de bouton de réouverture dans la barre (réouverture depuis la bibliothèque ou un nœud fragment).
- Un onglet dont l'objet n'existe plus affiche son identifiant brut (`q:…`).

**Références** : `src/ui/shell/Tabs.tsx:10-88` (menu `:80-83`, pastille `:59,78`), `src/app/commands/shell-commands.ts:16-37`, `src/app/commands/project-commands.ts:68-81`,
`src/app/store/store.ts:300-321`, `src/app/store/travel.ts:55-…` (`syncTabs`), `src/app/store/delete-questionnaire.ts:60-102`.

---

### Onglet de questionnaire : sous-vues, barre du logigramme, vue côte à côte

**Comportement observable**
- Sous-onglets « Logigramme » / « Prévisualisation » (bascule par `view.toggle`, raccourci P).
- En vue Logigramme, barre : « Mise en page automatique » (`view.layout`), « Image » (`view.exportImage`, libellé
  « Export en cours… » pendant l'export), « Inventaire RGPD » (`questionnaire.exportInventory`, EVO-029, icône tableur, `data-testid="export-inventory"`, `QuestionnaireView.tsx:54-60`), « Commentaires » (`comment.toggleAll`), « Vue côte à côte » (`view.compare`, si
  le projet a plus d'un questionnaire, état enfoncé quand active), « Valider le formulaire » ou « Dévalider » selon l'état,
  « Bibliothèque » (panneau latéral, `view.libraryPanel`).
- Zone : panneau Bibliothèque à gauche (s'il est affiché et sans vue côte à côte), logigramme + panneau Problèmes,
  éventuel volet de comparaison, panneau de propriétés (largeur fixe) à droite.
- Surimpression en haut à gauche du logigramme : marqueur « Validé » ; dessous, alerte de dépendance de version (EVO-022).
- « Ajuster la vue » : pas de bouton dans la barre ; disponible par les contrôles React Flow (`<Controls>`) et le raccourci F.
- Vue côte à côte : volet droit « Comparer avec » (liste des autres questionnaires), mention « lecture seule », bouton de
  fermeture ; logigramme de l'autre questionnaire en lecture seule.

**Règles de gestion et validations**
- `view.compare` : disponible si un questionnaire est actif et que le projet en compte au moins deux. Sans argument :
  ouvre le premier autre questionnaire, ou ferme la vue si elle est déjà ouverte ; avec un id : affiche ce questionnaire.
  L'ouverture force la vue Logigramme du questionnaire actif.
- L'état `compare` est global (un seul questionnaire comparé), ignoré s'il désigne le questionnaire actif ou un
  questionnaire disparu.
- Boutons Image et Commentaires grisés respectivement sur un questionnaire vide / pendant un export, et sans commentaire.

**Cas limites gérés**
- Changement d'onglet de questionnaire : la vue côte à côte reste ouverte sur le même questionnaire comparé (sauf s'il
  devient l'actif).
- En vue Prévisualisation, aucun bouton de la barre du logigramme n'est affiché (y compris Valider/Dévalider).

**Références** : `src/ui/shell/QuestionnaireView.tsx:16-112`, `src/ui/shell/ComparePane.tsx:10-34`,
`src/app/commands/settings-commands.ts:83-96`, `src/app/commands/nav-commands.ts:41-48`, `src/ui/diagram/Diagram.tsx:211`.

---

### Palette de commandes (cmdk)

**Comportement observable**
- `Ctrl+K` (ou bouton) ouvre une boîte de dialogue avec champ de recherche ; trois groupes :
  - « Commandes » : commandes non masquées et disponibles à l'instant de l'affichage, avec le **premier** raccourci effectif ;
  - « Bibliothèque » : « Insérer : <titre> » pour chaque question et fragment de la bibliothèque (fragments créant un cycle
    d'appels exclus), si `library.insert` est disponible ;
  - « Nœuds » : nœuds du graphe actif (questionnaire ou fragment), texte = intitulé/titre/message, alias (fragment) ou nom
    (sortie), avec la clé.
- Mode « relier » (commande `node.connect`, E) : seulement les nœuds ; choisir un nœud crée l'arête.
- Mode « bibliothèque » (commande `library.insert`, I) : seulement les éléments insérables, sans préfixe « Insérer ».
- Recherche floue cmdk sur libellé + id de commande, ou texte + clé + id ; navigation en boucle ; « Aucun résultat ».

**Règles de gestion et validations**
- Choisir un élément ferme la palette, exécute l'action (commande sans argument, `library.insertItem`, `node.connectTo`
  ou sélection du nœud), puis rend le focus au logigramme.
- Palette ouverte : aucun raccourci clavier n'est traité.

**Cas limites gérés**
- Une commande dont la disponibilité change pendant que la palette est ouverte n'est pas revérifiée au choix (`c.run()` direct).
- La recherche de nœud fonctionne aussi en vue Prévisualisation (sélection posée sans effet visible).

**Références** : `src/ui/shell/Palette.tsx:9-89`, `src/app/shortcuts/bind.ts:51`.

---

### Raccourcis clavier (`app/shortcuts`)

**Comportement observable**
- Raccourcis tinykeys liés à la fenêtre ; affichage `Ctrl`/`⌘`, flèches en symboles, `Entrée`.

**Règles de gestion et validations**
- Raccourcis effectifs = personnalisés (`keymap[id]`) sinon par défaut.
- Saisie en cours (INPUT, TEXTAREA, SELECT, contenteditable, CodeMirror ; élément focalisé **ou** cible de la frappe) :
  seules les commandes `allowInInput` (Ctrl+K, Ctrl+O, Ctrl+S, Ctrl+Tab/Alt+→, Ctrl+Shift+Tab/Alt+←).
- Commandes de portée `graph` : actives si le focus est dans `[data-graph-focus]`, nulle part / sur `body`, ou sur un
  élément non saisissable hors dialogue alors qu'un logigramme (questionnaire en vue Logigramme ou fragment) est affiché.
- Entrée / Espace sur un bouton, lien, onglet, `summary` focalisé hors logigramme : aucune commande (activation native).
- Plusieurs commandes sur une même combinaison : la dernière déclarée disponible l'emporte, sinon la précédente (chaînage).
- La commande n'est exécutée que si `enabled()` est vrai ; alors `preventDefault`.

**Cas limites gérés**
- Entrée validant la palette (champ démonté entre-temps) ne déclenche pas « Éditer l'intitulé » (test sur `e.target`).
- `Ctrl+Tab` est conservé en défaut mais doublé par `Alt+→/←` (les navigateurs ne transmettent pas Ctrl+Tab).

**Références** : `src/app/shortcuts/bind.ts:1-64`, `src/app/shortcuts/format.ts:1-39`, `docs/DECISIONS.md:26`.

---

### Catalogue des commandes (`app/commands`)

Ordre de déclaration : projet, coque, graphe, édition, bibliothèque (jeux de libellés), éléments de bibliothèque, état du
système, paramètres, image, presse-papiers, commentaires, versions, navigation. « masquée » = absente de la palette
(appelée par un bouton/champ avec argument). Portée `graph` = raccourci actif seulement sur le logigramme.
« Toujours » = pas de condition `enabled`.

| id | libellé fr | raccourci par défaut | disponible quand | effet |
| --- | --- | --- | --- | --- |
| `project.new` | Nouveau projet | — | toujours | Si modifications non exportées : confirmation (`window.confirm`) ; charge un projet vierge (1 questionnaire vide). |
| `project.open` | Ouvrir / importer… | Ctrl+O (aussi en saisie) | toujours | Sélecteur de fichiers `.json` multiples ; import (voir § Import). |
| `project.export` | Exporter (bundle) | Ctrl+S (aussi en saisie) | toujours | Télécharge `<slug du nom>.bundle.json` ; `dirty` = faux. |
| `project.exportFiles` | Exporter les fichiers unitaires | — | toujours | Télécharge chaque fichier unitaire (un toutes les 250 ms) ; `dirty` = faux. |
| `questionnaire.new` | Nouveau questionnaire | — | toujours | Crée « Questionnaire sans titre » (langue du contenu), clé unique `questionnaire[_n]`, ouvre son onglet (historique `project`). |
| `tab.library` | Bibliothèque | — | toujours | Ouvre/active l'onglet Bibliothèque. |
| `tab.system` | État du système | — | toujours | Ouvre/active l'onglet État du système. |
| `tab.next` | Onglet suivant | Control+Tab, Alt+→ (aussi en saisie) | toujours | Onglet suivant (circulaire). |
| `tab.prev` | Onglet précédent | Control+Shift+Tab, Alt+← (aussi en saisie) | toujours | Onglet précédent (circulaire). |
| `palette.open` | Palette de commandes | Ctrl+K (aussi en saisie) | toujours | Ouvre la palette en mode commandes. |
| `view.problems` | Problèmes | — | toujours | Replie/déplie le panneau Problèmes. |
| `tab.open` | Rouvrir un questionnaire fermé | — | au moins un questionnaire fermé | Arg = onglet ; sans arg : rouvre le premier questionnaire fermé. |
| `tab.show` (masquée) | Rouvrir un questionnaire fermé | — | toujours | Arg = onglet à afficher (clic sur un onglet). |
| `tab.close` | Fermer l'onglet | — | au moins un onglet ouvert | Arg = onglet ; sans arg : l'onglet actif. |
| `lang.content` | Langue du contenu suivante (actuelle : {lang}) | — | projet à plusieurs langues | Arg = code (doit être déclaré) ; sans arg : langue suivante. |
| `lang.ui` | Langue de l'interface suivante (actuelle : {lang}) | — | toujours | Arg = `fr`/`en` ; sans arg : suivante. |
| `node.newQuestion` | Nouvelle question à la suite | N | logigramme affiché | Crée une question (type par défaut) après la sélection ; insertion chaînée si successeur unique non conditionné ; saisie de l'intitulé. |
| `node.newBranch` | Nouvelle branche conditionnée | Shift+N | logigramme affiché et un nœud sélectionné | Crée une question reliée par une arête à condition vide ; focus sur la condition. |
| `node.newInfo` | Nouvelle page d'information | Alt+I | logigramme affiché | Crée une page d'information à la suite. |
| `node.newSummary` | Nouvelle page de synthèse | Alt+S | logigramme affiché | Crée une page de synthèse à la suite. |
| `node.newEnd` | Nouvelle fin | Alt+F | logigramme d'un questionnaire | Crée une fin à la suite. |
| `node.newRedirect` | Nouveau nœud Renvoi | Alt+R | logigramme d'un questionnaire | Crée un nœud Renvoi à la suite (texte « Texte de renvoi », aucun bouton) (EVO-024). |
| `node.type.text` / `date` / `number` / `single` / `multiple` / `boolean` / `structure` / `email` / `phone` / `address` / `civility` | Type : Texte / Date / Nombre / Choix unique / Choix multiple / Booléen / Structure / Mail / Téléphone / Adresse / Civilité | T / D / R / U / M / B / S / Shift+E / Shift+T / Shift+A / Shift+C | question locale seule sélectionnée | Change le type (champs communs conservés ; sans effet si même type). Généré depuis `registry`. |
| `node.toggleRequired` | Basculer obligatoire | O | question locale sélectionnée | Bascule `required`. |
| `node.resetRequired` | Revenir à la valeur héritée | — | nœud sélectionné portant une surcharge d'obligation | Retire la surcharge (référence) ou toutes celles d'un appel de fragment (EVO-012). |
| `node.toggleOther` | Activer « Autre (préciser) » | A | question locale d'un type admettant « Autre » | Bascule `other`. |
| `node.toggleDontKnow` | Activer « Ne sais pas » | — | question locale non structure | Bascule `dontKnow`. |
| `node.editLabel` | Éditer l'intitulé | Entrée | un nœud sélectionné | Demande la saisie de l'intitulé. |
| `edge.editCondition` | Éditer la condition de l'arête | C | arête sélectionnée, ou nœud ayant une arête entrante | Sélectionne l'arête (sinon la 1re arête entrante du nœud) et met la condition en saisie. |
| `node.connect` | Relier à un nœud… | E | un nœud sélectionné | Palette en mode « relier ». |
| `node.connectTo` (masquée) | Relier à un nœud… | — | un nœud sélectionné | Arg = id cible : crée l'arête, sélectionne la cible. |
| `node.setStart` | Définir comme départ | — | graphe d'un questionnaire, nœud sélectionné | `start` = nœud. |
| `node.duplicate` | Dupliquer | Ctrl+D | au moins un nœud sélectionné | Duplique la sélection, sélectionne les copies. |
| `node.delete` | Supprimer la sélection | Delete, Backspace | nœuds ou arête sélectionnés | Supprime les nœuds (sinon l'arête) ; confirmation si une question supprimée est commentée. |
| `edge.moveUp` | Évaluer plus tôt | Alt+↑ | arête sélectionnée qui n'est pas la 1re de son origine | Rang −1 (frappes regroupées). |
| `edge.moveDown` | Évaluer plus tard | Alt+↓ | arête sélectionnée qui n'est pas la dernière | Rang +1. |
| `edge.create` (masquée) | Relier à un nœud… | — | toujours | Arg `{ graph?, from, to, exit? }` : arête tracée à la souris. |
| `questionnaire.properties` | Propriétés du questionnaire | — | questionnaire actif | Vide la sélection (le panneau affiche les propriétés du questionnaire). |
| `questionnaire.setTitle` (masquée) | Titre du questionnaire | — | questionnaire actif | Arg = texte multilingue (frappes regroupées). |
| `questionnaire.setDescription` (masquée) | Description (pour l'équipe de dev) | — | questionnaire actif | Arg = texte. |
| `questionnaire.rename` (masquée) | Clé du questionnaire | — | questionnaire actif | Arg = clé ; ignorée si `canRenameQuestionnaire` refuse. |
| `questionnaire.validate` | Valider le formulaire | — | questionnaire visé (arg id, sinon actif) non validé | Refus (notice « Validation impossible ») si version vide ; sinon `status`, `validatedAt` (date du jour), `libraryVersions` ; notice non bloquante listant les éléments de bibliothèque provisoires utilisés. |
| `questionnaire.unvalidate` | Dévalider | — | questionnaire visé validé | Confirmation (`window.confirm`) puis retrait de `status`, `validatedAt`, `libraryVersions`. |
| `project.rename` (masquée) | Nom du projet | — | toujours | Arg = nom (frappes regroupées). |
| `labelSet.addBoolean` | Nouveau jeu de libellés booléen | — | toujours | Crée `oui_non[_n]` (Oui/Non dans les langues du projet) et ouvre la Bibliothèque. |
| `labelSet.delete` (masquée) | Supprimer le jeu de libellés | — | toujours | Arg = id. |
| `library.newQuestion` | Nouvelle question de bibliothèque | — | toujours | Crée et affiche la question dans l'onglet Bibliothèque. |
| `library.newFragment` | Nouveau fragment | — | toujours | Crée un fragment et ouvre son onglet `f:<id>`. |
| `library.openRef` (masquée) | Ouvrir dans la bibliothèque | — | toujours | Arg `{ kind, id }` ; élément introuvable → notice « lien rompu ». |
| `library.show` (masquée) | Bibliothèque | — | toujours | Question → onglet Bibliothèque ; fragment → son onglet ; sans arg → jeux de libellés. |
| `library.delete` (masquée) | Supprimer de la bibliothèque | — | toujours | Arg `{ kind, id }` ; confirmation si commenté ; ferme l'onglet du fragment. |
| `library.insert` | Insérer depuis la bibliothèque | I | logigramme affiché et bibliothèque non vide (questions ou fragments) | Palette en mode bibliothèque. |
| `library.insertItem` (masquée) | Insérer depuis la bibliothèque | — | toujours | Arg `{ kind, id, graph?, position? }` ; refus (notice) si cycle d'appels ; à la position du dépôt, sinon à la suite de la sélection. |
| `view.libraryPanel` | Afficher / masquer le panneau Bibliothèque | — | toujours | Bascule `libraryPanel` (affiché par défaut). |
| `node.group` | Extraire la sélection en fragment | Ctrl+G | logigramme d'un questionnaire, sélection non vide | Refus (notice) si fin/sortie dans la sélection (`group.forbidden`), nœud Renvoi (`group.redirect`, EVO-024) ou plusieurs entrées ; sinon crée un fragment et le nœud d'appel (transaction questionnaire + bibliothèque). |
| `node.toLibrary` | Copier dans la bibliothèque | — | question locale sélectionnée | Clé prise → dialogue `CopyDialog` ; références réécrites listées (notice). |
| `node.openInLibrary` | Ouvrir dans la bibliothèque | — | question de bibliothèque (référence) sélectionnée | Affiche la question dans l'onglet Bibliothèque. |
| `node.openFragment` | Ouvrir le fragment | — | nœud fragment sélectionné | Ouvre l'onglet du fragment. |
| `node.setEntry` | Définir comme entrée du fragment | — | onglet de fragment, nœud sélectionné | Règle `entry`, ou la retire si c'est déjà l'entrée. |
| `node.newExit` | Nouvelle sortie nommée | — | onglet de fragment | Crée une sortie `sortie[_n]` à la suite. |
| `system.addVariable` | Nouvelle variable de l'état du système | — | toujours | Crée une variable, ouvre l'onglet, focus sur le nom. |
| `system.deleteVariable` (masquée) | Supprimer la variable | — | toujours | Arg = nom. |
| `system.renameVariable` (masquée) | Renommer la variable | — | toujours | Arg `{ name, next }` ; renommage propagé en une transaction (projet, bibliothèque, questionnaires). |
| `system.renameField` (masquée) | Renommer le champ de liste | — | toujours | Arg `{ variable, field, next }` ; idem. |
| `scenario.add` | Nouveau scénario | — | toujours | Sans arg : valeurs d'exemple ; arg = id : copie ; ouvre l'onglet État du système. |
| `scenario.delete` (masquée) | Supprimer le scénario | — | toujours | Arg = id. |
| `preview.saveScenario` | Enregistrer l'état du système comme nouveau scénario | — | questionnaire actif en vue Prévisualisation | Nom = arg, sinon « <scénario courant> * » ; le nouveau scénario devient celui de la prévisualisation. |
| `preview.toggleSystem` | Afficher / masquer le panneau d'état du système | — | toujours | Bascule le panneau (affiché par défaut). |
| `preview.toggleDebug` | Afficher / masquer le panneau de débogage | — | toujours | Bascule (masqué par défaut). |
| `preview.toggleOutline` | Afficher / masquer l'outline du logigramme | — | toujours | Bascule (masqué par défaut, EVO-019). |
| `preview.toggleChecks` | Activer / désactiver les contrôles de saisie de la prévisualisation | — | toujours | Bascule `previewChecks` ; efface les erreurs affichées (EVO-014). |
| `tab.settings` | Paramètres | — | toujours | Ouvre l'onglet Paramètres. |
| `lang.add` (masquée) | Ajouter une langue | — | toujours | Arg = code ; ajouté s'il est valide et absent (historique `project`). |
| `lang.remove` (masquée) | Retirer la langue | — | toujours | Arg = code ; jamais la langue par défaut ; textes conservés ; langue du contenu / des prévisualisations qui l'utilisaient → langue par défaut. |
| `lang.default` (masquée) | Langue par défaut | — | toujours | Arg = code déclaré différent de l'actuel. |
| `preview.lang` | Langue de la prévisualisation suivante | — | vue Prévisualisation et projet multilingue | Arg = code ; sans arg : langue suivante. |
| `shortcut.set` (masquée) | Modifier un raccourci | — | toujours | Arg `{ id, keys }` : remplace les combinaisons de la commande (doublons retirés ; liste vide = aucun raccourci). |
| `shortcut.reset` | Rétablir tous les raccourcis par défaut | — | au moins un raccourci personnalisé | Arg = id : rétablit cette commande ; sans arg : toutes. |
| `view.layout` | Mise en page automatique | L | logigramme affiché (questionnaire ou fragment) | Incrémente `layoutRequest` (mise en page ELK par `ui/diagram`). |
| `view.compare` | Vue côte à côte | — | questionnaire actif et ≥ 2 questionnaires | Voir § Onglet de questionnaire. |
| `view.exportImage` | Exporter le logigramme en image | X | questionnaire actif en vue Logigramme et non vide | Ouvre le dialogue d'options. |
| `view.exportImageRun` (masquée) | Exporter l'image avec ces options | — | idem | Arg `{ scope, title }` : mémorise, ferme le dialogue, incrémente `imageRequest`. |
| `questionnaire.exportInventory` | Exporter l'inventaire RGPD | — | questionnaire actif (même vide ; vue Logigramme ou non, via la palette) | Génère un xlsx (`write-excel-file/browser`) et le télécharge ; ne modifie ni le store ni l'historique (`inventory-commands.ts:11-23`). |
| `node.copy` | Copier | Ctrl+C | logigramme affiché, nœuds sélectionnés, aucun texte sélectionné dans la page | Copie dans le presse-papiers interne (lié au projet). |
| `node.paste` | Coller | Ctrl+V | logigramme affiché et presse-papiers du même projet | Colle au pointeur (ou position arg) ; éléments écartés listés (notice) ; cibles nœud des boutons de renvoi repointées (EVO-024). |
| `questionnaire.duplicate` | Dupliquer le questionnaire | — | questionnaire visé (arg id, sinon actif) existant | Copie « Copie de … », ouvre son onglet. |
| `questionnaire.delete` | Supprimer le questionnaire | — | questionnaire visé (arg id, sinon actif) existant | Confirmation (titre ; « Il est validé. », nombre de commentaires de révision, nombre de boutons de renvoi d'autres questionnaires qui le ciblent, chaque ligne omise si nulle, singulier pour 1) ; refus = rien ; accord = `deleteQuestionnaire` (EVO-027). |
| `library.duplicate` | Dupliquer l'élément de bibliothèque | — | élément visé (arg, sinon fragment de l'onglet / question affichée) existant | Copie et l'affiche. |
| `comment.add` | Commenter | — | arg `{ host, node }` ou question seule sélectionnée sur le logigramme | Crée le commentaire s'il n'existe pas, l'affiche, met le texte en saisie. |
| `comment.toggle` | Afficher / masquer le commentaire | — | commentaire existant sur la cible | Bascule son affichage. |
| `comment.toggleAll` | Afficher / masquer les commentaires | — | logigramme affiché ayant des commentaires | Tout afficher si l'un est masqué, sinon tout masquer. |
| `comment.reply` (masquée) | Répondre | — | toujours | Ajoute une réponse vide en saisie. |
| `comment.deleteReply` (masquée) | Supprimer la réponse | — | toujours | Arg `{ host, node, index }`. |
| `comment.delete` | Supprimer le commentaire | — | commentaire existant sur la cible | Supprime texte et réponses. |
| `comment.open` (masquée) | Ouvrir | — | toujours | Ouvre l'objet, affiche ses commentaires, sélectionne et centre. |
| `tab.comments` | Commentaires | — | toujours | Ouvre l'onglet Commentaires. |
| `questionnaire.setVersion` (masquée) | Version | — | questionnaire actif | Arg = texte libre (frappes regroupées) ; refusé par le verrou si le questionnaire est validé. |
| `library.setVersion` (masquée) | Version | — | toujours | Arg `{ kind, id, version }` ; élément validé → notice « Désactiver la validation pour modifier la version ». |
| `library.validate` | Valider l'élément de bibliothèque | — | élément visé (arg, sinon fragment de l'onglet / question affichée) non validé | Refus (notice) si version vide ; sinon `status: validated`. |
| `library.unvalidate` | Dévalider l'élément de bibliothèque | — | élément visé validé | Retire `status`, sans confirmation. |
| `nav.down` / `nav.up` (masquées) | Aller au nœud suivant / précédent | ↓ / ↑ | toujours (portée graph) | Successeur / prédécesseur (1re arête) ; sans sélection : sélectionne le départ ou le 1er nœud. |
| `nav.right` / `nav.left` (masquées) | Aller au nœud voisin suivant / précédent | → / ← | toujours (portée graph) | Voisins de même parent (circulaire). |
| `edit.undo` | Annuler | Ctrl+Z | toujours (pas en saisie) | Annule dans l'historique de l'onglet : Bibliothèque → `library` ; questionnaire → `q:<id>` ; fragment → `library` ; autre onglet → `project`. Juste après une suppression de questionnaire : annule celle-ci depuis tout onglet (EVO-027). |
| `edit.redo` | Rétablir | Ctrl+Shift+Z, Ctrl+Y | toujours (pas en saisie) | Rétablit dans le même historique ; juste après l'annulation d'une suppression de questionnaire : la refait depuis tout onglet. |
| `view.fit` | Ajuster la vue | F | portée graph | Incrémente `fitRequest`. |
| `view.toggle` | Basculer logigramme ↔ prévisualisation | P | onglet de questionnaire | Bascule la sous-vue. |

**Références** : `src/app/commands/index.ts:21-39`, `types.ts:3-22`, fichiers `*-commands.ts` du dossier (`delete-commands.ts:9-36`) ;
libellés `src/app/i18n/messages*.ts` ; raccourcis de types `src/plugins/question-types/*/index.tsx` (`shortcut`).

---

### Historique annuler / rétablir (transverse)

**Règles de gestion et validations**
- Un historique par portée : `project`, `library`, `q:<id>` ; 500 entrées au plus par portée ; frappes d'un même champ
  regroupées si < 1,5 s.
- Une modification qui déborde de sa portée (renommage propagé, extraction en fragment) crée des points liés (transaction) :
  un seul annuler les défait tous.
- Toute modification (y compris annuler/rétablir) qui changerait le contenu verrouillé d'un questionnaire validé est
  annulée en bloc et signalée (« validation.locked »).
- Modification sans changement réel : aucun point d'historique.
- Suppression d'un questionnaire (EVO-027, `deleteQuestionnaire`) : un point lié dans `project` et `q:<id>`, hors verrou des
  formulaires validés (pas de `refused`) ; l'historique `q:<id>` est conservé. `lastDeletion` mémorise la suppression
  (transaction, rangs du questionnaire, de sa mise en page et de son onglet, onglet actif ou non).
- « Juste après » : tant que `lastDeletion` existe et que le dernier point de `project` est cette transaction, `undo(scope)`
  quelle que soit la portée annule la suppression (`travel('project')`), remet questionnaire et mise en page à leur rang et
  l'onglet à sa place ; ensuite `redo(scope)` quelle que soit la portée la refait. Ni l'un ni l'autre ne passe par le verrou.
- `lastDeletion` est effacé par `edit`, `transact`, `checkpoint`, `silent`, `loadWorkspace`, et par tout `undo` / `redo`
  ordinaire effectif. Un Annuler / Rétablir sans effet (portée sans `past` / `future`, `store.ts:236,256`) ou refusé par le
  verrou (`lastDeletion` restauré, `store.ts:161`) ne l'efface pas : un Annuler depuis la Bibliothèque restaure encore le
  questionnaire. Les changements d'onglet (`set`, `openTab`, `closeTab`) ne l'effacent pas.
- Annuler / rétablir ordinaire (`refused(prev, true, allowGone)`, `store.ts:156-160`) : la disparition d'un formulaire validé
  (ex. rétablir une suppression au-delà de « juste après », annuler sa création) n'est pas refusée ; toute autre modification
  de son contenu verrouillé l'est.

**Cas limites gérés**
- Nouveau projet, ouverture d'un projet ou d'un bundle : historiques vidés (non annulable).
- Historique non sauvegardé : perdu au rechargement.
- Passé « juste après », la suppression reste un point lié de `project` et `q:<id>`, annulable par l'historique de l'onglet
  (ex. État du système) ; le questionnaire revient alors à son rang dans le projet (`placeReappeared`) ; rétablir la suppression d'un
  questionnaire validé par ce chemin est possible (disparition non refusée par le verrou).

**Références** : `src/app/store/store.ts:156-298`, `src/app/store/history.ts:26-27,65,80`, `src/app/store/travel.ts`,
`src/app/store/delete-questionnaire.ts:36-102`.

---

### Sauvegarde automatique et restauration (`app/persistence`)

**Comportement observable**
- Le projet est sauvegardé en continu dans IndexedDB (base `editeur-questionnaires`, magasin `etat`, clé `session`) ;
  au rechargement, l'utilisateur retrouve projet, onglets, onglet actif, langue de l'interface, raccourcis, options
  d'export d'image, indicateur « non exporté ».

**Règles de gestion et validations**
- Sauvegarde 500 ms après le dernier changement de `ws`, `tabs`, `activeTab`, `dirty`, `uiLang`, `keymap` ou `imageOptions`.
- Contenu : bundle JSON (même sérialisation que l'export), `dirty`, `tabs`, `activeTab`, `uiLang`, `keymap`, `imageOptions`.
- Restauration via `importFiles` : donc migration de format et validation par schéma comme un import.

**Cas limites gérés**
- Erreurs d'IndexedDB ignorées (écriture) ; lecture en erreur ou bundle invalide → démarrage sur projet vierge, sans message.
- Onglets de questionnaires / fragments disparus écartés ; onglet actif repris seulement s'il est encore ouvert.
- `imageOptions` normalisées (`scope` ∈ {all, selection}, `title` booléen).
- `keymap` repris tel quel, sans contrôle ni message (`persistence/index.ts:34`) : une entrée d'une commande absente du
  catalogue (ex. `project.example`, retirée par EVO-026) n'est liée à aucune touche (`bind.ts:48` ne parcourt que
  `commands()`), n'apparaît pas dans l'écran des raccourcis (`ShortcutsSection.tsx:9`), reste dans la session et active
  « Rétablir tous les raccourcis par défaut » (`ShortcutsSection.tsx:43`), qui l'efface.
- Non sauvegardés (reviennent à leur valeur initiale) : langue du contenu (→ langue par défaut), sous-vue des
  questionnaires, prévisualisations (session, scénario, langue), vue côte à côte, panneau Bibliothèque, panneaux de
  prévisualisation, contrôles de saisie, panneau Problèmes, commentaires affichés, presse-papiers, historiques.

**Références** : `src/app/persistence/index.ts:1-65`.

---

### Langues de l'interface (`app/i18n`)

**Comportement observable**
- Interface en `fr` (défaut) ou `en`, sélecteur de la barre de projet ou commande `lang.ui`.

**Règles de gestion et validations**
- Dictionnaire `clé → { fr, en }` réparti en `messages*.ts` ; paramètres `{x}`.
- Repli : langue demandée → `fr` → clé brute.

**Cas limites gérés**
- Textes non traduits par le dictionnaire : messages d'erreur de `format` (« Type de document inconnu… », « Format N plus
  récent… », « Aucune migration… »), messages Ajv (anglais), nom par défaut « Nouveau projet » et titre « Questionnaire »
  du projet vierge (`blankWorkspace`), jeux de libellés Oui/Non (fr/en codés en dur, langues du projet seulement).

**Références** : `src/app/i18n/index.ts:1-14`, `src/format/validate.ts:41`, `src/format/migrate.ts:155-167`,
`src/app/store/store.ts:135-141`, `src/app/commands/library-commands.ts:7-15`.

---

### Onglet Paramètres (`ui/settings`)

**Comportement observable**
- Trois sections : « Langues des contenus », « Traductions manquantes » (colonne gauche) ; « Raccourcis clavier » (droite).
- **Langues** : liste des langues du projet ; badge « Langue par défaut » ; boutons « Définir par défaut » et « Retirer la
  langue » (infobulle : textes conservés) sur les autres ; champ « Code (ex. en, de, pt-BR) » + « Ajouter une langue »,
  message « Code de langue invalide ou déjà déclaré. ».
- **Traductions manquantes** : compteur, filtre par langue (« Toutes » ou une langue), liste des problèmes
  `missingTranslation` (description, propriétaire « Questionnaire / Fragment / Bibliothèque / État du système · nom »,
  clé du nœud) ; clic = aller à l'objet (onglet du questionnaire en vue Logigramme, onglet du fragment ou Bibliothèque,
  nœud sélectionné) ; « Aucune traduction manquante. ».
- **Raccourcis** : filtre texte (libellé ou id), une ligne par action (badge « logigramme » si portée graph, badge
  « personnalisé »), combinaisons effectives avec bouton de retrait, bouton « + » pour capturer une combinaison, bouton
  de retour au défaut par action, bouton « Rétablir tous les raccourcis par défaut » ; avertissement « Aussi utilisé par :
  … » sur les actions personnalisées dont une combinaison est partagée.

**Règles de gestion et validations**
- Code de langue : `^[a-z]{2,3}(-[A-Za-z0-9]+)?$`, non déjà déclaré ; la langue par défaut n'est jamais retirable.
- Actions listées : non masquées, ou masquées dotées d'un raccourci par défaut (flèches de navigation).
- Capture : champ en lecture seule, `keydown` arrêté (aucune commande pendant la capture) ; Échap annule ; touche de
  modification seule ignorée ; avec Alt, touche physique (`KeyX`) ; la combinaison est **ajoutée** aux combinaisons
  existantes ; perte de focus = abandon.
- Les doublons sont signalés mais acceptés.

**Cas limites gérés**
- Retirer la langue du contenu affichée ou d'une prévisualisation → bascule sur la langue par défaut.
- Retrait de la dernière combinaison d'une action : action personnalisée sans raccourci (liste vide).
- Toute frappe sauf Échap/modificateurs (Tab, Entrée, flèches…) est capturable comme raccourci.

**Références** : `src/ui/settings/Settings.tsx`, `LanguagesSection.tsx:7-45`, `TranslationsSection.tsx:8-79`,
`ShortcutsSection.tsx:8-88`, `src/app/store/language-edits.ts:1-25`, `src/app/shortcuts/format.ts:20-39`.

---

### Langues du projet (contenu) — transverse

**Comportement observable**
- Langue du contenu choisie dans la barre de projet (ou `lang.content`) : langue de saisie et d'affichage des textes
  multilingues dans l'éditeur (titres d'onglets, palette, panneaux).
- Langue de chaque prévisualisation réglable séparément (`preview.lang`).

**Règles de gestion et validations**
- Ajout / retrait / langue par défaut : historique `project` (annulable depuis un onglet non graphe : Paramètres, État du système…).
- Langue par défaut initiale d'un nouveau projet : `fr`.

**Références** : `src/app/commands/shell-commands.ts:37-50`, `src/app/commands/settings-commands.ts:9-52`.

---

### Import / ouverture de fichiers (`project.open`, `format/importFiles`)

**Comportement observable**
- Sélecteur de fichiers (`.json`, multiples). En cas d'erreur : fenêtre « Import impossible » listant les erreurs
  préfixées par le nom de fichier, rien n'est chargé.
- Fichiers contenant un projet ou un bundle : remplacement du projet courant (confirmation si non exporté).
- Fichiers unitaires sans projet : fusion dans le projet courant ; les nouveaux questionnaires s'ouvrent en onglet.

**Règles de gestion et validations**
- Pour chaque fichier : `JSON.parse` → `migrate` (de `formatVersion` (défaut 1) jusqu'à 14, migrations successives) →
  validation Ajv (JSON Schema 2020-12, `allErrors`, erreurs dédoublonnées, chemin + message + propriété en trop).
- Type de document par `kind` (`questionnaire`, `library`, `project`, `layout`, `bundle`) ; `kind` inconnu = erreur.
- Un bundle présent : il fait foi seul (les autres fichiers sont ignorés).
- Avec `projet.json` : nouveau projet (bibliothèque vide si absente), puis bibliothèque, mises en page, questionnaires.
- Sans projet : copie du projet courant ; `bibliotheque.json` remplace **toute** la bibliothèque ; un questionnaire de même
  id remplace l'existant, sinon est ajouté (entrée du projet créée avec le nom du fichier) ; mise en page de même graphe remplacée.
- Questionnaires triés selon l'ordre déclaré dans le projet.
- Questionnaire importé non validé : `status` et `libraryVersions` retirés (EVO-022).
- Détection « remplace le projet » par expression régulière sur le texte (`"kind": "project|bundle"`).
- Fusion : une seule modification `edit('project', …)` (annulable, transaction si plusieurs portées) ; soumise au verrou
  des formulaires validés (refus en bloc + message).

**Cas limites gérés**
- Version de format plus récente que l'outil → erreur « Format N plus récent que celui de l'outil (15). ».
- Version sans migration → erreur « Aucune migration depuis la version N. ».
- JSON illisible → erreur `<fichier> : <message du parseur>`.
- Sélection annulée (aucun fichier) → rien.
- Pas de contrôle de cohérence inter-fichiers : un `projet.json` qui liste des questionnaires absents est chargé tel quel ;
  références de bibliothèque introuvables signalées seulement par les vérifications.
- Remplacement (projet/bundle) non annulable (historiques vidés).

**Références** : `src/app/commands/project-commands.ts:14-31`, `src/app/commands/files.ts:16-29`, `src/format/files.ts:97-155`,
`src/format/validate.ts:24-46`, `src/format/migrate.ts:26-169`.

---

### Export de fichiers (`project.export`, `project.exportFiles`, `format`)

**Comportement observable**
- Bundle : un fichier `<slug du nom du projet>.bundle.json` (minuscules, sans accents, `_` ; vide → `projet`).
- Fichiers unitaires : `projet.json`, `bibliotheque.json`, pour chaque questionnaire `<clé> - <version> - <final|provisoire>.json`
  puis `<même nom>.layout.json` s'il a une mise en page, `fragment_<clé>.layout.json`, `question_<clé>.layout.json`
  (question de bibliothèque commentée), téléchargés l'un après l'autre (250 ms).

**Règles de gestion et validations**
- Sérialisation : JSON indenté 2 espaces, ordre des clés conservé, `\n` final.
- Bundle = image exacte du projet en mémoire (`formatVersion`, `kind: bundle`, `project`, `library`, `questionnaires`, `layouts`).
- `projet.json` exporté : `file` de chaque questionnaire réécrit avec le nom calculé.
- Fichier d'un questionnaire : propriétés de tête ordonnées (`formatVersion, kind, id, key, title, description, version,
  status, validatedAt, libraryVersions`) ; `status` toujours écrit (`draft` si absent) ; `libraryVersions` = versions de
  référence si validé, sinon versions actuelles des éléments utilisés (omis si aucun).
- `bibliotheque.json` : `version` et `status` placés après `key` pour chaque question et fragment.
- Nom de questionnaire : version vide → segment omis ; caractères `\ / : * ? " < > |` et de contrôle de la version → `_`.

**Cas limites gérés**
- Deux questionnaires de même clé et même version/statut produiraient le même nom de fichier (aucun contrôle à l'export ;
  l'unicité des clés est imposée à l'édition).

**Références** : `src/format/files.ts:12-95`, `src/format/serialize.ts`, `src/format/workspace.ts:24-27`,
`src/app/commands/project-commands.ts:40-53`.

---

### Export d'image du logigramme (EVO-004, EVO-023)

**Comportement observable**
- Commande `view.exportImage` (X, palette, bouton « Image » de la barre) → dialogue « Exporter le logigramme en image » :
  description « Format : PNG, haute résolution (2×), fond blanc », périmètre « Logigramme entier » / « Sélection seulement
  (n nœud(s) et les arêtes entre eux) » (proposé seulement si des nœuds sont sélectionnés), case « Titre du questionnaire
  en en-tête », boutons Annuler / Exporter ; Entrée (hors bouton) lance l'export.
- Pendant l'export, le bouton affiche « Export en cours… » et est grisé ; le fichier PNG est téléchargé.
- Nom : `<projet> - <titre du questionnaire> - <version> - <final|provisoire> - AAAAMMJJ.png`.
- Titre dessiné (option cochée) : `<titre> — <version> — <Validé|Provisoire>` (statut dans la langue de l'interface),
  dans un bandeau blanc de 48 px au-dessus du logigramme.

**Règles de gestion et validations**
- Disponible : questionnaire actif, vue Logigramme, au moins un nœud. Non disponible pour un fragment ni pour le volet de
  comparaison (capture seulement du logigramme modifiable d'un questionnaire).
- Dialogue ouvert avec les derniers choix (mémorisés en session IndexedDB) ; « sélection » mémorisée mais sans sélection → « entier ».
- Capture de `.react-flow__viewport` hors zoom (boîte englobante des nœuds et des tracés d'arêtes + marge 40 px), fond
  blanc, `pixelRatio` 2 ; poignées, rectangles de sélection exclus ; sélection vidée et transitions coupées
  (`data-exporting`) pendant la capture, puis sélection restaurée.
- Sélection : nœuds sélectionnés, arêtes dont les deux extrémités sont sélectionnées et leurs libellés.
- Titre : langue du contenu, sinon langue par défaut, sinon clé ; nom de fichier : caractères interdits → `_`, espaces
  réduits, espaces/points finaux retirés ; projet vide → `projet`, titre vide → `questionnaire` ; date locale du jour.

**Cas limites gérés**
- Côté > 16 384 px : `pixelRatio` réduit et notice « Image réduite ».
- Échec (`toBlob` nul, exception) : notice « Échec de l'export de l'image » avec le message.
- Questionnaire vide ou graphe introuvable : rien.

**Références** : `src/app/commands/image-commands.ts:1-38`, `src/app/commands/image-file.ts:1-44`,
`src/ui/diagram/ImageDialog.tsx:10-51`, `src/ui/diagram/useImageExport.ts:9-128`, `src/ui/diagram/Diagram.tsx:141-143`,
`src/app/store/image-state.ts`.

---

### Export de l'inventaire RGPD en xlsx (EVO-029)

**Comportement observable**
- Commande `questionnaire.exportInventory` (« Exporter l'inventaire RGPD », aucun raccourci par défaut, palette) et bouton « Inventaire RGPD » de la barre du logigramme (vue Logigramme seulement, après « Image »), qui lance la commande. Télécharge un xlsx.
- Nom : `inventoryFileName` = `questionnaireFileName` (`<clé> - <version> - <final|provisoire>.json`) avec « .json » remplacé par « - inventaire.xlsx » (`inventory-file.ts:22-24`) ; même nettoyage des caractères interdits que le JSON.
- Onglet « Données » : ligne d'en-tête figée (`stickyRowsCount: 1`), en gras, retour à la ligne ; 8 colonnes pré-remplies (fond `#D9E1F2`) — Identifiant, Chemin, Intitulé, Type, Obligatoire, Répétable, Donnée personnelle présumée, Description — puis 8 colonnes à compléter (fond `#FFF2CC`, cellules vides, texte libre) — Catégorie de donnée, Donnée sensible (art. 9 / 10), Finalité, Justification (minimisation), Base légale, Durée de conservation, Destinataires, Observations. Largeurs 32 (deux premières) puis 22.
- Une ligne par donnée (`inventoryRows`, `src/core/model/inventory.ts`) : Identifiant `<clé du questionnaire>/<chemin>` ; Chemin ; Intitulé = texte français de l'intitulé de la question effective, non interpolé (libellé à variantes : texte « sinon » français ; vide sans traduction française) ; Type = nom français du type (`questionType(t).name.fr`, sinon l'identifiant du type) ; Obligatoire = « Oui » / « Non » / « Si : <expression> » (expression vide → « Non ») ; Répétable « Oui » pour un champ de structure répétable, sinon vide ; Donnée personnelle présumée « Oui » pour mail, téléphone, adresse, civilité, sinon vide ; Description.
- Ligne `<chemin>_other` après la donnée dont « Autre (préciser) » est activé : Intitulé « <intitulé> — Autre (préciser) » (intitulé vide → cellule vide), Type « Texte », Obligatoire = `other.detailRequired`, Répétable et Description de la question.
- Onglet « À propos » (colonnes 26 / 60) : Projet (nom), Clé du questionnaire, Titre du questionnaire (français, sinon langue par défaut du projet, sinon vide), Version (vide si absente), Statut (« final » si validé, sinon « provisoire »), Date d'export (`AAAA-MM-JJ`, date locale), Version du format JSON (`FORMAT_VERSION`), puis la mention « Document d'amorce généré par l'éditeur : les colonnes RGPD sont à compléter et à valider par le DPO. » (étiquettes en gras). Noms d'onglets, en-têtes et textes fixes en français quelle que soit la langue de l'interface.

**Règles de gestion et validations**
- Ordre (`traversalOrder`, `inventory.ts:42-55`) : profondeur d'abord depuis le départ (`graphStart`), arêtes sortantes dans leur ordre, chaque nœud une fois (boucles comprises) ; puis les nœuds non atteignables dans l'ordre du graphe, sans signalement. Les lignes d'une structure et la ligne `_other` suivent leur question.
- Nœuds : question locale ou à référence (`instanceQuestion` : intitulé surchargé, champs masqués exclus) ; fragment appelé déplié récursivement avec chemin préfixé `alias.` (`a.b.cle` en cas d'imbrication) ; fragment déjà en cours d'appel (récursion) et référence introuvable : ignorés. Information, synthèse, fin, sortie nommée, renvoi : aucune ligne ; les cibles d'un renvoi ne sont pas suivies. Variables système : aucune ligne ni onglet. Pays d'un téléphone ou d'une adresse : aucune ligne.
- Structure : aucune ligne pour la structure elle-même ; une ligne `cle.champ` par champ, Obligatoire et Description du champ (`f.required`, `f.description`), Répétable = `repeat` de la structure.
- Obligatoire d'une question : `resolveRequired(ws, nœud, appels de fragment)` (surcharges du nœud et des appels).
- Description d'une référence : celle du nœud si renseignée, sinon celle de la définition de bibliothèque.
- Lecture seule : aucun appel au store en écriture ; la commande est `enabled` si un questionnaire est actif (`activeQuestionnaire`).

**Cas limites gérés**
- Questionnaire sans question : onglet « Données » avec l'en-tête seul.
- Cellule vide (`null`) pour toute valeur absente ou chaîne vide.

---

### Versionning des questionnaires et des éléments de bibliothèque (EVO-022)

**Comportement observable**
- Panneau de propriétés du questionnaire : champ « Version » (placeholder `1.0.0`) et badge « Validé » / « Provisoire » ;
  champ grisé (fieldset du panneau) avec infobulle « Désactiver la validation pour modifier la version » quand validé ;
  indication du nom de fichier exporté sous la clé.
- Élément de bibliothèque (question, fragment) : bloc `ItemVersion` — champ « Version » (grisé si validé, même infobulle),
  badge Validé/Provisoire, bouton « Valider » / « Dévalider », ligne « Questionnaires qui l'utilisent : … » (suffixe
  « (validé) ») ou « Aucun questionnaire ne l'utilise. » (affichée en permanence).
- Valider un questionnaire sans version : notice « Validation impossible — Saisissez une version pour « nom » avant de le valider. ».
- Valider un questionnaire qui utilise des éléments provisoires : validation effectuée, puis notice « Éléments de
  bibliothèque provisoires » listant « « nom » (version) n'est pas validé dans la bibliothèque. ».
- Questionnaire validé dont un élément utilisé a changé de version : encadré ambre « Éléments de bibliothèque modifiés
  depuis la validation » listant « nom : ancienne → nouvelle » (« (sans version) » si vide), en haut à gauche du logigramme.

**Règles de gestion et validations**
- Version = texte libre ; vide = propriété retirée (élément) ou chaîne vide (questionnaire).
- Éléments utilisés : nœuds `question` à `ref` et nœuds `fragment`, puis récursivement les graphes des fragments appelés,
  sans doublon (jeux de libellés non suivis).
- À la validation d'un questionnaire : `libraryVersions` = `{ id → { version, status } }` des éléments utilisés existants
  (omis si aucun) ; retiré à la dévalidation.
- Alerte : seulement sur questionnaire validé ; élément absent des références = référence vide ; élément introuvable ignoré.
- Questionnaire validé : version verrouillée par le verrou général (modification refusée en bloc) ; `status`, `validatedAt`,
  `libraryVersions` hors verrou.
- Élément validé : `library.setVersion` refusé (notice) ; `setItemVersion` refuse aussi au niveau du store.
- Dévalider un élément : sans confirmation ; un questionnaire : avec confirmation.

**Cas limites gérés**
- Questionnaire validé d'un projet antérieur sans version : reste validé.
- Migration 13 → 14 : seul `formatVersion` change (pas de fausse alerte).
- Valider est proposé même sans version ; le refus intervient à l'exécution.

**Références** : `src/core/model/versioning.ts:1-81`, `src/core/model/validation.ts:9-41`, `src/app/commands/version-commands.ts:1-91`,
`src/app/commands/edit-commands.ts:83-102`, `src/app/store/version-edits.ts`, `src/app/store/questionnaire-edits.ts:42-55`,
`src/ui/shell/VersionAlert.tsx`, `src/ui/library/ItemVersion.tsx`, `src/ui/properties/QuestionnaireProperties.tsx:12-29`,
`src/ui/properties/PropertiesPanel.tsx:35`, `src/format/files.ts:21-62`, `src/format/migrate.ts:89`.

---

### Dialogue de copie en bibliothèque (`CopyDialog`, EVO-009)

**Comportement observable**
- Ouvert quand la clé de la question copiée est déjà prise : « Nouvelle clé » proposée (suffixée, unique), message
  d'erreur et bouton « Copier » grisé tant que la clé est invalide ou prise ; Entrée = Copier ; Annuler ferme.

**Règles de gestion et validations**
- Clés prises = clés de la bibliothèque + clés utilisées dans le graphe source (hors la clé courante) ; format `isValidKey`.

**Références** : `src/ui/shell/CopyDialog.tsx:6-37`.
