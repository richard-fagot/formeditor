# Existant — fonctionnalités réellement implémentées

État au commit `d390080` (2026-10-15), jusqu'à EVO-025 (EVO-024 n'existe pas). Format JSON : version 14.

Inventaire **factuel**, établi par lecture du code source (et non de la spec, du guide ou des fiches EVO).
Il décrit ce que fait le code, y compris quand cela diffère de la spec ; les différences avec les fiches
sont regroupées à la fin. Aucune suggestion d'évolution. Les chemins sont relatifs à la racine du dépôt ;
les numéros de ligne valent pour le commit indiqué. Tenu à jour par l'agent `inventoriste`
(`.claude/agents/inventoriste.md`) à chaque évolution.

Abréviations : « cmd » = commande du catalogue `app/commands` (palette, raccourcis) ; « historique » = portée
d'annulation (`q:<id>` pour un questionnaire, `library` pour la bibliothèque et les fragments, `project`).

## Sommaire

1. Coque, commandes et transverse
2. Édition : logigramme, propriétés, commentaires, bibliothèque
3. Types de questions et de nœuds
4. Parcours : prévisualisation, moteur, validation, état du système, expressions
5. Format JSON d'export (schéma réel)
6. Non implémenté / limites
7. EVO réalisées par zone
8. Écarts code ↔ fiches EVO

## 1. Coque, commandes et transverse

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
  `confirm(question)` renvoie la réponse de `window.confirm`, seul appel du code.
- Message : clé `MessageKey`, `{ key, params }`, ou `{ raw }` (texte non traduit : erreurs d'import, nom d'un élément,
  références réécrites, titre de l'avertissement des champs masqués). Traduction dans la langue de l'interface au moment de l'appel.
- Branchement : `app/store` appelle `bindFeedback` (langue = `uiLang`, écriture dans l'état) ; sans branchement, langue `fr`
  et rien n'est écrit.
- Appelants : commandes de projet (import, confirmation de perte), version et validation, bibliothèque (lien rompu, cycle,
  extraction refusée, références réécrites, confirmation de suppression), collage, suppression de nœuds commentés,
  dévalidation, verrou du store (`refused`), export d'image (`inform` image réduite, `fail`), champs masqués.
- `notice` n'est remis à `undefined` qu'à la fermeture de la fenêtre (`App.tsx:50, 54`) et au chargement d'un projet
  (`store.ts:247`).
- `app/issues` : `issuesOf(ws)` = `checkWorkspace(ws)` mémorisé par référence de `ws` (même `ws` → même tableau) ;
  `selectIssues(issues, filtre)` cumule les critères `owner { kind, id? }`, `ownerIds`, `code`, `lang` (langue contenue dans
  `params.lang`, liste « fr, en ») et conserve l'ordre ; `useIssues(filtre)` lit `ws` dans le store, filtre comparé par valeur.
- Vues qui l'utilisent : `QuestionnaireView`, `FragmentView`, `ComparePane`, `Outline`, compteur de traductions de `Preview`,
  `TranslationsSection`, `SystemState`.
- Contrôle automatique (Vitest) : hors tests, pas de `window.confirm` ni d'écriture `.notice =` hors d'`app/feedback`
  (remises à zéro ci-dessus exceptées), pas d'appel à `checkWorkspace(` hors d'`app/issues` et de `core`.

**Références** : `src/app/feedback/feedback.ts:3-61`, `src/app/store/store.ts:149-162` (`refused`), `:285` (`bindFeedback`),
`src/app/issues/issues.ts:6-41`, `src/app/feedback/single-path.test.ts:20-33`, `docs/ERREURS.md`.

---

### Barre de projet (`TopBar`)

**Comportement observable**
- Logo « Q » ; champ du nom du projet (modifiable en place) ; indicateur « Modifications non exportées » (ambre) /
  « Tout est exporté » (vert).
- Boutons : Nouveau projet, Ouvrir / importer…, icône « Ouvrir l'exemple », Exporter (bundle), icône « Exporter les fichiers
  unitaires ».
- À droite : sélecteur de la langue du contenu (langues du projet), sélecteur de la langue de l'interface (`fr`, `en`),
  bouton engrenage (Paramètres), bouton « Palette de commandes » avec `Ctrl+K` affiché en dur.

**Règles de gestion et validations**
- Chaque bouton/sélecteur appelle une commande (`runCommand`) : `project.rename`, `project.new`, `project.open`,
  `project.example`, `project.export`, `project.exportFiles`, `lang.content`, `lang.ui`, `tab.settings`, `palette.open`.
- Le renommage du projet est un point d'historique de la portée `project`, frappes regroupées (clé `name`, fenêtre 1,5 s).
- `dirty` passe à vrai à toute modification avec historique (`edit`, `transact`, `silent`, annuler/rétablir) ; repasse à
  faux à l'export (bundle ou fichiers).

**Cas limites gérés**
- Nom de projet vide accepté (le nom de fichier exporté devient `projet.bundle.json` via `slug`).
- Le libellé `Ctrl+K` du bouton n'est pas mis à jour si le raccourci est personnalisé (texte en dur).

**Références** : `src/ui/shell/TopBar.tsx:7-52`, `src/app/commands/edit-commands.ts:101-104`, `src/app/commands/files.ts:30-31`,
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
- Clic droit sur un onglet de questionnaire, un questionnaire fermé ou un onglet de fragment : menu « Dupliquer »
  (`questionnaire.duplicate` / `library.duplicate`).

**Règles de gestion et validations**
- `openTab` ajoute l'onglet s'il n'y est pas, le rend actif et vide la sélection.
- `closeTab` active l'onglet précédent (ou `library` s'il n'en reste aucun).
- `tab.next` / `tab.prev` parcourent circulairement la liste des onglets ouverts.
- Les onglets Paramètres et Commentaires ne s'ouvrent que par commande (engrenage, lien), jamais à l'ouverture d'un projet.
- `loadWorkspace` (nouveau projet, exemple, ouverture d'un projet/bundle) : un onglet par questionnaire, premier actif,
  vues, sélection, historiques, prévisualisations, vue côte à côte, commentaires affichés réinitialisés.
- Annuler/rétablir resynchronise les onglets (questionnaire disparu → onglet fermé, réapparu → rouvert ; fragment disparu → fermé).

**Cas limites gérés**
- Un fragment fermé n'a pas de bouton de réouverture dans la barre (réouverture depuis la bibliothèque ou un nœud fragment).
- Un onglet dont l'objet n'existe plus affiche son identifiant brut (`q:…`).

**Références** : `src/ui/shell/Tabs.tsx:10-82`, `src/app/commands/shell-commands.ts:16-37`, `src/app/commands/project-commands.ts:68-81`,
`src/app/store/store.ts:244-264`, `src/app/store/travel.ts:55-…` (`syncTabs`).

---

### Onglet de questionnaire : sous-vues, barre du logigramme, vue côte à côte

**Comportement observable**
- Sous-onglets « Logigramme » / « Prévisualisation » (bascule par `view.toggle`, raccourci P).
- En vue Logigramme, barre : « Mise en page automatique » (`view.layout`), « Image » (`view.exportImage`, libellé
  « Export en cours… » pendant l'export), « Commentaires » (`comment.toggleAll`), « Vue côte à côte » (`view.compare`, si
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
| `project.example` | Ouvrir l'exemple « déclaration de sinistre » | — | toujours | Confirmation si non exporté ; charge l'exemple embarqué (2 questionnaires, bibliothèque, mises en page). |
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
| `node.group` | Extraire la sélection en fragment | Ctrl+G | logigramme d'un questionnaire, sélection non vide | Refus (notice) si fin/sortie dans la sélection ou plusieurs entrées ; sinon crée un fragment et le nœud d'appel (transaction questionnaire + bibliothèque). |
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
| `node.copy` | Copier | Ctrl+C | logigramme affiché, nœuds sélectionnés, aucun texte sélectionné dans la page | Copie dans le presse-papiers interne (lié au projet). |
| `node.paste` | Coller | Ctrl+V | logigramme affiché et presse-papiers du même projet | Colle au pointeur (ou position arg) ; éléments écartés listés (notice). |
| `questionnaire.duplicate` | Dupliquer le questionnaire | — | questionnaire visé (arg id, sinon actif) existant | Copie « Copie de … », ouvre son onglet. |
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
| `edit.undo` | Annuler | Ctrl+Z | toujours (pas en saisie) | Annule dans l'historique de l'onglet : Bibliothèque → `library` ; questionnaire → `q:<id>` ; fragment → `library` ; autre onglet → `project`. |
| `edit.redo` | Rétablir | Ctrl+Shift+Z, Ctrl+Y | toujours (pas en saisie) | Rétablit dans le même historique. |
| `view.fit` | Ajuster la vue | F | portée graph | Incrémente `fitRequest`. |
| `view.toggle` | Basculer logigramme ↔ prévisualisation | P | onglet de questionnaire | Bascule la sous-vue. |

**Références** : `src/app/commands/index.ts:21-38`, `types.ts:3-22`, fichiers `*-commands.ts` du dossier ;
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

**Cas limites gérés**
- Nouveau projet, exemple, ouverture d'un projet ou d'un bundle : historiques vidés (non annulable).
- Historique non sauvegardé : perdu au rechargement.

**Références** : `src/app/store/store.ts:149-238`, `src/app/store/history.ts:26-27,80`, `src/app/store/travel.ts`.

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
- Version de format plus récente que l'outil → erreur « Format N plus récent que celui de l'outil (14). ».
- Version sans migration → erreur « Aucune migration depuis la version N. ».
- JSON illisible → erreur `<fichier> : <message du parseur>`.
- Sélection annulée (aucun fichier) → rien.
- Pas de contrôle de cohérence inter-fichiers : un `projet.json` qui liste des questionnaires absents est chargé tel quel ;
  références de bibliothèque introuvables signalées seulement par les vérifications.
- Remplacement (projet/bundle) non annulable (historiques vidés).

**Références** : `src/app/commands/project-commands.ts:14-31`, `src/app/commands/files.ts:16-29`, `src/format/files.ts:97-155`,
`src/format/validate.ts:24-46`, `src/format/migrate.ts:26-167`.

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

## 2. Édition : logigramme, propriétés, commentaires, bibliothèque

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
- Pas de nœud fin dans un fragment (cmd désactivée), pas de sortie nommée dans un questionnaire (cmd désactivée).
- `connect` ne refuse pas une arête d'un nœud vers lui-même (aucun contrôle dans le store).

**Références** : `src/app/commands/graph-commands.ts:36-62` (`createAfter`), `:95-99`, `:139-161` ; `src/app/commands/library-item-commands.ts:185` (`node.newExit`) ; `src/app/commands/edit-commands.ts:52` (`edge.create`) ; `src/app/store/graph.ts:40-67` (`insertNode`, `connect`).

---

### Nœud : rendu, badges, édition en place

**Comportement observable**
- Cadre de 240 px ; contenu délégué au plugin du type de nœud (`registry.nodeKind(kind).Shape`).
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

**Références** : `src/ui/diagram/NodeView.tsx:17-171` ; `src/app/store/question-edits.ts:10-29` (`setQuestionLabel`) ; `src/app/commands/graph-commands.ts:126` ; `src/app/commands/library-item-commands.ts:37-42` (`openRef`) ; `src/plugins/node-kinds/fragment/index.tsx:31-50` (titre, alias, nombre de questions, « Déplier »).

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
- Écartés : nœud fin collé dans un fragment (`paste.end`), sortie nommée collée dans un questionnaire (`paste.exit`), nœud fragment créant un cycle d'appels (`paste.cycle`). Les arêtes vers un nœud écarté sont abandonnées.
- Départ : rôle, pas un nœud. Le nœud qui était le départ est collé comme nœud ordinaire et la cible garde son départ (message `paste.start` / `paste.startFragment`) ; un questionnaire sans départ valide prend le départ collé, sinon le premier nœud collé.
- Un collage = un point d'historique.

**Cas limites gérés**
- Référence de bibliothèque collée : même référence, clé non suffixable (un doublon est signalé par `duplicateKey`).
- Noms de sorties nommées collées dans un fragment non rendus uniques.
- Noms relatifs des entrées dynamiques et clés masquées par un champ homonyme de leur structure : non réécrits.

**Références** : `src/app/store/clipboard.ts:25-94`, `src/core/references/rename-local.ts:10-31`, `src/app/commands/clipboard-commands.ts:15-19` (`setPastePoint`), `:38-46` (`report`), `:76-95`, `src/app/commands/graph-commands.ts:163-170`, `src/app/i18n/messages-clipboard.ts:5-10`.

---

### Duplication d'un questionnaire ou d'un élément de bibliothèque (EVO-010)

**Comportement observable**
- Cmd `questionnaire.duplicate` (menu contextuel des onglets, palette) : la copie est insérée juste après l'original et s'ouvre.
- Cmd `library.duplicate` (menu contextuel de la liste de la bibliothèque, onglet d'un fragment, palette) : copie juste après l'original, affichée (question dans l'onglet Bibliothèque, fragment dans son onglet).

**Règles de gestion et validations**
- Titre / intitulé « Copie de X » dans chaque langue (texte de l'outil dans cette langue si elle existe, sinon langue de l'interface), puis « Copie 2 de X »… jusqu'à un nom libre ; nouvelle clé unique (`cle_2`…) ; questionnaire : nouvelle entrée de fichier `<clé>.json` dans le projet.
- Nœuds et arêtes réidentifiés, mise en page reprise, références de bibliothèque conservées (pas de copie en cascade), départ et `entry` repointés.
- La copie n'a aucun appelant. Ni statut de validation, ni `validatedAt`, ni `libraryVersions` repris (EVO-015, EVO-022) ; version conservée.
- Commentaires de révision non repris.

**Références** : `src/app/store/duplicate.ts:10-78`, `src/app/commands/clipboard-commands.ts:24-27` (`copyName`), `:97-116`, `src/ui/shell/Tabs.tsx:43-44`, `src/ui/library/Library.tsx:64-69`.

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
| `missingTranslation` | Texte multilingue ou libellé interpolé sans valeur dans une langue du projet (une fois par propriété) ; titre d'un questionnaire ou d'un fragment ; libellés oui / non d'un jeu de libellés. | avertissement ; badge « trad. », panneau, Paramètres |

**Références** : `src/core/validation/graph.ts:8-124`, `workspace-check.ts:8-102`, `refs-check.ts:21-186`, `groups-check.ts:19-30`, `guarantee.ts`, `expected.ts`, `messages.ts:51-91`.

---

### Panneau de propriétés : cadre

**Comportement observable**
- Contenu selon la sélection : un seul nœud → propriétés du nœud ; sinon une arête → propriétés de l'arête ; sinon, dans un questionnaire → propriétés du questionnaire ; sinon texte « rien de sélectionné ».
- Le panneau fournit à l'éditeur d'expression la portée du graphe (`questionnaireScope` ou `fragmentScope`) pour l'autocomplétion et le contrôle.
- Questionnaire validé (EVO-015) : tout le contenu est dans un `fieldset` désactivé (`properties-locked`), éditeurs CodeMirror en lecture seule.
- Nœud : question locale → éditeur de question + section « Bibliothèque » (« Copier dans la bibliothèque ») ; référence → §16 ; nœud fragment → §17 ; autres types → propriétés du plugin ; questionnaire : bouton « Définir comme départ » si le nœud ne l'est pas ; fragment : section Entrée (§19).

**Règles de gestion et validations**
- Saisies d'un nœud ou d'une arête : `store.edit` avec clé de regroupement `<id>:<champ>` ; une propriété mise à `undefined` est retirée du JSON.

**Références** : `src/ui/properties/PropertiesPanel.tsx:17-98`, `src/ui/properties/useGraphEdit.ts`.

---

### Propriétés du questionnaire

**Comportement observable**
- Version (EVO-022, `questionnaire.setVersion`) et statut « Validé » / « Provisoire » ; infobulle « verrouillé » si validé.
- Titre multilingue (`questionnaire.setTitle`), clé (`questionnaire.rename`, aide : nom du fichier exporté), description (`questionnaire.setDescription`).

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

**Références** : `src/app/store/store.ts:149-239`, `src/app/store/history.ts:26`, `src/app/store/travel.ts`.

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

**Règles de gestion et validations**
- Nouvelle question de bibliothèque : type texte, intitulé « Nouvelle question », clé dérivée unique dans la bibliothèque. Nouveau fragment : vide, titre par défaut, clé dérivée unique.
- Portée des expressions d'une question de bibliothèque = réunion des portées des graphes qui l'utilisent (au minimum l'état du système).
- Suppression d'un élément (cmd `library.delete`) : sans confirmation sauf commentaires ; les références restantes deviennent `libraryMissing` ; l'onglet du fragment est fermé.
- Clé d'un jeu de libellés : écrite telle quelle à la frappe ; invalide ou en double → bordure rouge et message, sans blocage de l'écriture.

**Références** : `src/ui/library/Library.tsx:12-72`, `LibraryQuestionView.tsx:14-56`, `LabelSets.tsx:16-55`, `items.ts:7-37`, `src/app/commands/library-item-commands.ts:27-30,91-120`, `src/app/commands/library-commands.ts:17-40`, `src/app/store/library-edits.ts:17-38`.

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
- Refus avec message : sélection contenant une fin ou une sortie nommée (`group.forbidden`) ; sélection à plusieurs entrées (`group.multipleEntries`, liste des clés).

**Règles de gestion et validations**
- Entrées = départ du questionnaire s'il est sélectionné + cibles des arêtes venues de l'extérieur ; entrée retenue = l'unique entrée, sinon le premier nœud sélectionné ; `entry` réglée si elle n'est pas l'unique racine du fragment.
- Une sortie nommée par cible extérieure (nom = clé de la cible, sinon alias, sinon `fin` / `information` / `synthese`, sinon `sortie`, rendu unique) ; arêtes internes conservées (conditions comprises), arêtes sortantes redirigées vers la sortie ; l'appelant relie chaque sortie à sa cible (arête `exit`, sans condition).
- Arêtes entrantes redirigées vers le nœud fragment ; départ transféré au nœud fragment s'il était dans la sélection.
- Alias = clé du fragment rendue unique parmi les clés restantes ; références de l'appelant aux clés et alias déplacés préfixées par `alias.` (`qualifyKeys`, `cle_other` compris).
- Mise en page : positions reprises dans le fragment, sorties en ligne en dessous ; le nœud fragment prend la place de l'entrée ; commentaires déplacés.
- Une seule opération annulable depuis le questionnaire ou la bibliothèque (transaction).

**Références** : `src/app/store/group.ts:11-94`, `src/app/commands/library-item-commands.ts:132-151`, `src/core/references/rename.ts:147-151`.

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
- Parcours des expressions : intitulé (variantes : condition et textes), aide, texte indicatif, « obligatoire si », valeur calculée, règles des contraintes, conditions d'options et d'entrées dynamiques, bornes date / nombre en expression, unité, suggestions (EVO-016), libellés de groupes, « Autre », « Ne sais pas », libellés de civilité, champs de structure ; nœuds info / synthèse / fin ; intitulé surchargé d'une référence ; conditions d'arêtes.

**Cas limites gérés**
- Renommer une question de l'appelant ne modifie pas les fragments qui la référencent par clé nue (signalé par `expectedKeyMissing`).

**Références** : `src/core/references/rename.ts:28-187`, `usages.ts`, `visit.ts:37-178`, `scope.ts:33-58`.

## 3. Types de questions et de nœuds

### Socle commun

#### Contrat des plugins (`plugin-api`) et registre (`registry`)

**Comportement observable**
- Un plugin de type de question fournit : `type`, `name` ({fr,en}), `shortcut`, `create(base, previous?)`, `Preview` (aperçu
  dans le nœud du logigramme), `Properties` (paramètres propres au type), `Field` (saisie de prévisualisation), `formatAnswer`
  (texte de la synthèse) et `badges?` (contract.ts:81-98).
- Un plugin de type de nœud fournit : `kind`, `name`, `create?(id)`, `Shape`, `shapeClass`, `Properties?`, `Page?` (contract.ts:122-135).
- `FieldProps` transmet au champ : `value`, `other` (précision « Autre »), `group` (`<clé>_group`), `country` (`<clé>_pays`),
  `dontKnow` (`<clé>_nsp`), `errors` (messages déjà résolus, par chemin), `env` (RenderEnv), `inputId`. Le champ répond par
  `onChange(value, other?, group?, country?)` et `onDontKnow(on)` (contract.ts:57-79).
- `RenderEnv` : `label()` (variante, langue, interpolation), `text()` (texte multilingue simple), `evaluate`, `condition`,
  `options(q)` (options visibles d'un choix), `scoped(extra)` (contexte d'une occurrence de structure), `checks` (EVO-014),
  `graph` (graphe de la page) (contract.ts:27-44).
- Registre : ordre d'affichage des types : texte, date, nombre, choix unique, choix multiple, booléen, structure, mail,
  téléphone, adresse, civilité (registry/index.ts:22-25). Nœuds : question, info, synthèse, fin, fragment, sortie (l.27).
  Type par défaut d'une nouvelle question : `text` (l.38).

**Règles de gestion**
- Propriétés communes conservées au changement de type (`QuestionBase`) : `id`, `key`, `label`, `description`, `help`,
  `placeholder`, `required`, `messages`, `constraints`, `dontKnow` (contract.ts:47 ; helpers.ts:10-15). `default` et
  `defaultExpr` ne font pas partie de cette liste.
- `tr(t, lang)` : texte de l'outil, repli sur `fr` puis sur la première langue (helpers.ts:5-7).
- `previewText` : texte brut d'un libellé pour l'éditeur (le texte « sinon » d'un libellé à variantes, langue du contenu, puis
  langue par défaut, puis première langue ; pas d'interpolation) (helpers.ts:18-22).
- `dontKnowLabel(q)` : libellé de « Ne sais pas », par défaut `{fr: 'Ne sais pas', en: 'Don’t know'}` (helpers.ts:25 ;
  core/model/question.ts:227).
- Erreurs « à la sortie du champ » (EVO-025, mail, téléphone, adresse) : `useBlurErrors(env, errors)` garde les messages
  calculés à la sortie (`onBlur(formatErrors(…))`, traduits par `env.label`), les efface à la saisie (`reset()`) et expose
  `shown`, vide si les contrôles sont désactivés (`env.checks === false`) ou si la question a déjà une erreur de validation
  (`errors['']`) (blur-errors.ts:11-34). `FieldErrors` (ui-kit) affiche un `<p class="text-sm text-rose-600" role="alert">`
  par message (FieldErrors.tsx:2-4).

**Références** : `src/plugin-api/contract.ts`, `src/plugin-api/helpers.ts`, `src/plugin-api/blur-errors.ts`,
`src/ui-kit/FieldErrors.tsx`, `src/registry/index.ts`.

#### Raccourcis (commandes `app/commands/graph-commands.ts`)

| Action | Raccourci par défaut | Condition |
| --- | --- | --- |
| Nouvelle question (type texte) | `n` | un logigramme est affiché (questionnaire ou fragment) |
| Nouvelle branche (question texte, arête conditionnelle à saisir) | `Shift+N` | un nœud sélectionné |
| Nouvelle page d'information | `Alt+I` | logigramme affiché |
| Nouvelle synthèse | `Alt+S` | logigramme affiché |
| Nouvelle fin | `Alt+F` | logigramme d'un **questionnaire** seulement |
| Nouvelle sortie nommée | aucun (palette) | logigramme d'un **fragment** seulement (library-item-commands.ts:185-189) |
| « Type : X » (change le type de la question sélectionnée) | `t` texte, `d` date, `r` nombre, `u` choix unique, `m` choix multiple, `b` booléen, `s` structure, `Shift+E` mail, `Shift+T` téléphone, `Shift+A` adresse, `Shift+C` civilité | question **locale** sélectionnée (pas une référence de bibliothèque) |
| Obligatoire oui/non | `o` | question locale |
| « Autre (préciser) » oui/non | `a` | question locale de type choix unique, choix multiple ou booléen (`OTHER_TYPES`) |
| « Ne sais pas » oui/non | aucun (palette) | question locale, sauf structure |

Les raccourcis de type ne **créent** pas une question : ils changent le type de la question sélectionnée
(graph-commands.ts:82-89). Une question se crée toujours en type texte (`n`), puis on change son type.
Une création chaînée s'insère entre le nœud sélectionné et son successeur unique non conditionnel (graph-commands.ts:42-47).

#### Champs communs d'une question (panneau de propriétés)

Rendus par `ui/properties/QuestionProperties.tsx` (hors zone, mais c'est le cadre de chaque plugin) :
- Intitulé (`label`) : `LabelEditor` (multilingue, interpolable, variantes conditionnelles).
- Clé (`key`) : validée (snake_case, unique) ; renommage propagé aux expressions.
- Type : liste de tous les plugins du registre ; changement = `plugin.create(commonQuestionFields(q), q)`.
- Obligatoire (`required: true`) ; sinon « Obligatoire si » (`required` = expression), visible quand la case est décochée.
- Valeur par défaut (`default`) : chaîne brute pour texte, date, choix unique, mail, téléphone, adresse, civilité ; JSON pour
  les autres types (JSON invalide signalé, valeur non enregistrée) (DefaultValueInput.tsx:6-29).
- Valeur par défaut calculée (`defaultExpr`).
- Aide (`help`) : `LabelEditor`.
- Texte indicatif (`placeholder`) : **seulement pour texte et nombre** (QuestionProperties.tsx:85-89).
- Section « Contraintes » : `ConstraintsEditor` (règles libres + messages des contrôles intégrés `messageParams(q)`).
- Description (`description`) : texte interne, non affiché en prévisualisation.
- Puis la section propre au type (`plugin.Properties`).

Page de prévisualisation d'une question (Preview.tsx:160-172) : intitulé interpolé, astérisque rouge si obligatoire
(`requiredAt`), aide, champ du plugin, puis messages d'erreur de la page (affichés après une tentative de « Suivant », si les
contrôles sont actifs).

#### Validation commune (`core/validation/field.ts`)

- « Ne sais pas » cochée (et l'option activée sur la question) : aucune vérification, obligatoire compris (l.46).
- Réponse vide (`undefined`, `null`, `''`, `[]`) : seule l'obligation est vérifiée (`required`) ; exception : liste vide d'une
  structure répétable obligatoire avec `repeat.min` (l.53-57).
- Après les contrôles du type : précision « Autre » obligatoire (`otherDetail`) si `other.detailRequired` et « Autre » choisie,
  puis chaque contrainte libre (`constraints[i]`, message propre ou « Valeur invalide. ») (l.114-117).
- Message d'une erreur : `messages.<param>` de la question, sinon message par défaut (messages.ts:4-26), borne insérée à `{0}`.

#### Saisie d'expressions et de libellés (`ui/expression-editor`)

**Comportement observable**
- `ExpressionInput` : CodeMirror 6 **sur une ligne** (toute transaction qui créerait une 2e ligne est refusée,
  ExpressionInput.tsx:70). Coloration JSONata minimale (chaînes, nombres, mots-clés `and|or|in|true|false|null`, fonctions
  `$…`, chemins, opérateurs). Autocomplétion : clés de la portée par préfixe, puis clés dont le libellé contient le mot tapé
  (casse et accents ignorés, EVO-005) ; mot commençant par `$` : 12 fonctions (`$count`, `$exists`, `$not`, `$sum`,
  `$string`, `$number`, `$length`, `$contains`, `$today`, `$addDays`, `$daysBetween`, `$age`) insérées avec `()`.
  Diagnostics en direct (délai 250 ms) : erreur de syntaxe (position), avertissement « Référence inconnue : x » pour un chemin
  non résolu dans la portée. Survol d'une référence `sys.…` : clé, libellé, description (rien dans un littéral).
  Entrée → `onSubmit` ; Échap → quitte le champ. Lecture seule si `readOnly` (formulaire validé, EVO-015 ; lu au montage).
- `LabelEditor` : une saisie par langue du projet (langue affichée en premier, langue sans texte marquée en orange),
  bouton « Variante conditionnelle » qui transforme le libellé en `{variants: [{when, text}], otherwise}` ; chaque variante a
  sa condition (`ExpressionInput`) et ses textes ; retirer la dernière variante revient au texte « sinon » seul.
- `ConstraintsEditor` : liste de règles (`rule` : expression « vraie si valide », `message` multilingue facultatif), ajout /
  suppression ; puis un champ de message multilingue par contrôle intégré applicable (`messages.<param>`).
- `DontKnowEditor` : case « Option « Ne sais pas » » (`dontKnow: {}`), puis libellé (`LabelEditor`, texte indicatif = libellé
  par défaut dans la langue du contenu) ; libellé vidé → propriété `label` retirée.

**Références** : `src/ui/expression-editor/ExpressionInput.tsx`, `LabelEditor.tsx`, `ConstraintsEditor.tsx`,
`DontKnowEditor.tsx`, `completion.ts`, `hover.ts`, `language.ts`, `context.tsx`.

### Types de questions

#### Texte (`type: "text"`)

**Comportement observable**
- Paramètres : `multiline` (case « Texte long », défaut absent = court), `minLength`, `maxLength` (entiers ≥ 0, vide = absent),
  `pattern` (expression régulière, texte libre), `suggestions` (case « Suggestions » ; cochée = `suggestions: ''`, puis
  « Expression des suggestions » ; décochée = propriété retirée), « Ne sais pas ».
- Aperçu du logigramme : `<texte>` ou `<texte long>` en police mono, icône de filtre si `suggestions` est présente (même
  vide), « + Ne sais pas » en italique si l'option est activée.
- Prévisualisation : `<input>` (court, `autoComplete="off"`) ou `<textarea>` 5 lignes (long) ; texte indicatif interpolé ;
  attribut HTML `maxLength` posé (la frappe au-delà est bloquée par le navigateur). Avec suggestions non vides et sans
  « Ne sais pas » cochée : combobox (`SuggestBox`) : liste ouverte à la prise de focus, filtrée à la frappe (« contient », casse
  ignorée), flèches haut/bas, Entrée choisit, Échap ferme, clic choisit ; saisie libre conservée.
- Valeur : la chaîne saisie ; champ vidé → `null`. Synthèse : la chaîne.

**Règles de gestion et validations**
- `minLength` / `maxLength` : longueur en unités UTF-16 (`String.length`) ; messages « Au moins {0} caractères. » /
  « Au plus {0} caractères. ».
- `pattern` : `new RegExp(pattern).test(s)` : recherche non ancrée ; message « Format invalide. ».
- Suggestions (EVO-016) : expression évaluée à chaque rendu avec les réponses courantes ; résultat mis en liste (valeur
  unique → 1 élément ; `null`/`undefined` → aucun ; listes aplaties d'un niveau) ; nombres et booléens convertis en texte ;
  objets, chaînes vides et la valeur `other` écartés ; doublons supprimés, ordre conservé. Une valeur égale à celle d'une
  option d'une question à choix référencée par l'expression est remplacée par le libellé de l'option dans la langue courante
  (question cherchée dans le graphe de la page, puis questions et fragments de la bibliothèque).

**Cas limites gérés**
- Motif d'expression régulière invalide : le test passe (aucune erreur) (field.ts:142-148).
- Expression de suggestions vide ou sans résultat : champ texte simple.
- « Ne sais pas » cochée : champ désactivé, sans liste de suggestions.

**Références** : `src/plugins/question-types/text/index.tsx`, `suggest-box.tsx`, `src/core/runtime/suggestions.ts`,
`src/core/validation/field.ts:60-66`.

#### Nombre (`type: "number"`)

**Comportement observable**
- Paramètres : `numberKind` (`real` défaut, `natural`, `integer`), `decimals` (entier ≥ 0 ; champ désactivé pour entier naturel
  ou relatif, valeur existante conservée), `min` / `max` (`ExpressionInput` : un texte numérique `-?\d+(\.\d+)?` est
  enregistré comme nombre, sinon comme expression), `unit` (texte multilingue simple), « Ne sais pas ».
- Aperçu : `<réel>` / `<entier naturel>` / `<entier relatif>`, suivi de l'unité dans la langue du contenu, « + Ne sais pas ».
- Prévisualisation : champ texte `inputMode="decimal"` (largeur fixe), unité affichée à droite. La virgule est acceptée comme
  séparateur décimal ; une saisie partielle (« 12, ») n'est pas réécrite.
- Valeur : nombre (`Number(saisie avec , → .)`) ; saisie vide ou non convertible → `null`. Synthèse : `valeur unité`.

**Règles de gestion et validations**
- `natural` : entier ≥ 0, sinon « Nombre entier positif attendu. » ; `integer` : entier, sinon « Nombre entier attendu. ».
- `min` / `max` : nombre littéral ou expression évaluée ; borne ignorée si le résultat n'est pas un nombre ; messages
  « Valeur minimale : {0}. » / « Valeur maximale : {0}. ».
- `decimals` : nombre de chiffres après le point de `String(n)` ; message « Au plus {0} décimales. ».
- Pas d'attribut HTML `min` / `max` sur le champ.

**Cas limites gérés**
- Texte non numérique (« abc ») : la réponse devient `null` sans message de format ; seule l'obligation peut alors échouer
  (number/index.tsx:77-81). Toute chaîne acceptée par `Number()` est un nombre (ex. « 1e3 »).
- « Ne sais pas » cochée : texte local vidé, champ désactivé.

**Références** : `src/plugins/question-types/number/index.tsx`, `src/core/validation/field.ts:79-89`.

#### Date (`type: "date"`)

**Comportement observable**
- Paramètres : `min` (« Au plus tôt »), `max` (« Au plus tard ») : date ISO littérale ou expression (`$today()`, clé,
  `sys.…`), « Ne sais pas ». Pas de texte indicatif.
- Aperçu : `<date>`, « + Ne sais pas ».
- Prévisualisation : `<input type="date">` natif ; bornes évaluées et posées en attributs `min` / `max` si elles donnent une
  chaîne `AAAA-MM-JJ`.
- Valeur : chaîne `AAAA-MM-JJ` ; vide → `null`. Synthèse : la chaîne ISO telle quelle.

**Règles de gestion et validations**
- Format : `AAAA-MM-JJ` et date calendaire réelle, sinon « Date invalide (AAAA-MM-JJ). » (`format`).
- Bornes comparées comme chaînes ; borne ignorée si l'expression ne renvoie pas une chaîne ; messages min / max avec la date.

**Cas limites gérés** : date impossible (`2024-02-30`) refusée par le contrôle `format` (field.ts:29-33).

**Références** : `src/plugins/question-types/date/index.tsx`, `src/core/validation/field.ts:67-78`.

#### Booléen (`type: "boolean"`)

**Comportement observable**
- Paramètres : `labelSet` (jeu de libellés de la bibliothèque, liste limitée aux jeux `kind: 'boolean'` ; vide = « Oui / Non »),
  `other` (case « Autre (préciser) », libellé à variantes, « Précision obligatoire » `detailRequired`), « Ne sais pas »
  (après « Autre »).
- Aperçu : « Oui / Non » (ou libellés du jeu), puis libellé « Autre » s'il est activé, puis « / Ne sais pas » en italique.
- Prévisualisation : boutons radio en cartes, dans l'ordre Oui, Non, Autre, Ne sais pas ; « Autre » choisie → champ de
  précision (focus automatique).
- Valeur : `true`, `false` ou `"other"` (+ `<clé>_other`) ; « Ne sais pas » : `null` + `<clé>_nsp: true`. Synthèse : libellé
  oui/non dans la langue courante, ou « Autre (préciser) : précision ». Badge `other` si l'option est activée.

**Règles de gestion et validations**
- Aucun contrôle de valeur propre au type (pas de branche `boolean` dans `validateAnswer`) : seuls obligatoire,
  `otherDetail` (« Précisez votre réponse. ») et contraintes libres.
- Changement de type vers booléen : `other` repris de la question précédente si elle en avait un (boolean/index.tsx:31-35).

**Cas limites gérés** : `labelSet` introuvable dans la bibliothèque → Oui / Non par défaut (l.21-24).

**Références** : `src/plugins/question-types/boolean/index.tsx`.

#### Choix unique (`type: "single"`) et choix multiple (`type: "multiple"`)

**Comportement observable**
- Paramètres :
  - `options` : suite ordonnée d'entrées : option statique `{value, label, when?}`, entrée dynamique
    `{from, label?, value?, when?}` (EVO-001), groupe `{group, code?, when?, options[]}` (EVO-003, pas de groupe imbriqué).
  - Saisie rapide (zone multi-lignes) : une ligne = une option ; `# Libellé` ouvre un groupe ; `* ` ou `- ` en tête = puce
    retirée ; `$référence` = entrée dynamique ; `\$`, `\#`, `\*`, `\-` = option qui commence par ce caractère ; lignes vides
    ignorées ; options avant le premier `#` hors groupe ; une ligne commençant par `<` reste une option statique.
  - Réconciliation à chaque frappe : ligne identique (même genre, même texte) → entrée conservée même déplacée ; ligne modifiée
    → entrée de même rang conservée si même genre (valeur, condition, traductions gardées ; seul le texte de la langue affichée
    change) ; sinon entrée nouvelle. Valeur d'une nouvelle option = clé dérivée du libellé (`deriveKey`, défaut `option`),
    rendue unique dans son groupe (ou parmi les options hors groupe), `other` exclu.
  - Détail par entrée (repliable) : option statique : valeur (texte mono ; une saisie vide ou `other` est ignorée), libellé
    (`LabelEditor`), condition d'affichage ; entrée dynamique : liste source, libellé et valeur (expressions évaluées sur
    chaque élément, autocomplétion limitée aux sous-champs de la source ; vides = l'élément lui-même), condition. Boutons
    Monter / Descendre (seulement avec une voisine de même genre), Dupliquer (valeur rendue unique), Supprimer.
  - Détail par groupe (placé juste avant ses options) : libellé à variantes, code (texte libre, vide = absent), condition ;
    Monter / Descendre (avec ses options, seulement entre groupes), Supprimer (le groupe et ses options).
  - `other` (« Autre (préciser) », libellé à variantes, précision obligatoire), « Ne sais pas » (après « Autre »).
  - Choix multiple seulement : `minSelected`, `maxSelected` (entiers ≥ 0).
- Aperçu : ○ (unique) ou ☐ (multiple) par option ; groupe en gras avec ses options indentées dessous ; entrée dynamique
  `<from : label>` ; « ? » après un élément conditionné ; « Autre » puis « Ne sais pas » (italique) en dernier ; 4 lignes au
  plus puis « … ».
- Prévisualisation : radios (unique) ou cases (multiple) en cartes ; une section titrée (`role="group"`, `aria-label`) par
  groupe visible ; « Autre » après les options, séparée par un trait et hors section **si au moins un groupe est affiché**
  (EVO-017) ; champ de précision sous la liste quand « Autre » est cochée ; « Ne sais pas » en dernier.
- Valeur : unique : chaîne (`<clé>_group` = identifiant du groupe, absent hors groupe, `AUTRE` pour « Autre ») ; multiple :
  liste des valeurs dans l'ordre de la sélection, `<clé>_group` = liste parallèle (`""` hors groupe, `AUTRE`) ; rien de coché →
  `null`. « Ne sais pas » : `null` (unique) / `[]` (multiple), `<clé>_group: "NSP"`, `<clé>_nsp: true`. Synthèse :
  « Groupe — Option » pour une option groupée, « Autre (préciser) : précision », valeurs jointes par « , ».

**Règles de gestion et validations**
- Options proposées (`choiceOptions`) : entrée dont la condition est vraie ou absente, déployée à sa position ; entrée
  dynamique = un élément par valeur de la source, dans l'ordre (libellé vide → la valeur) ; groupe = ses entrées, chacune
  marquée du groupe ; identifiant de groupe = `code`, sinon libellé dans la langue par défaut, interpolé. Valeurs vides,
  `other` et doublons (même groupe, même valeur) écartés.
- `option` : chaque valeur doit être un couple (groupe, valeur) proposé (groupe non renseigné : la valeur suffit) ;
  message « Cette réponse n'est plus proposée. ».
- `minSelected` / `maxSelected` (multiple, réponse non vide) : « Choisissez au moins / au plus {0} réponses. » ; « Autre » compte
  comme une sélection.
- « Ne sais pas » exclusive : cochée → sélection vidée ; cocher une option → marqueur effacé (l'appelant range la réponse).
- Changement de type unique ↔ multiple : options et `other` conservés ; depuis booléen : `other` conservé, options vides.

**Cas limites gérés**
- Groupe dont aucune option n'est visible : pas de titre de section (les sections sont construites à partir des choix visibles).
- Même valeur dans deux groupes : distinguée par le groupe (sélection et validation par couple).
- Réponse sans groupe enregistré : associée à la première option de même valeur.
- Source dynamique vide ou absente : aucune option, ni ligne vide.

**Références** : `src/plugins/question-types/choice/index.tsx`, `choice-field.tsx`, `selection.ts`, `entries.ts`,
`quick-lines.ts`, `options-editor.tsx`, `entry-detail.tsx`, `group-detail.tsx`, `other-editor.tsx`,
`src/core/runtime/options.ts`, `src/core/validation/field.ts:90-103`.

#### Structure (`type: "structure"`)

**Comportement observable**
- Paramètres : `repeat` (case « Répétable » ; `min` ≥ 0, `max` ≥ 1, `addLabel` libellé du bouton « Ajouter ») ; `fields` :
  liste de champs, ajout (« Champ N », clé dérivée unique, type texte), monter / descendre / supprimer. Par champ : intitulé
  (`LabelEditor`), clé (validée snake_case et unique parmi les champs, appliquée à la sortie du champ ou sur Entrée, renommage
  propagé), type (tous sauf structure ; changement via `create`, `when` conservé), case Obligatoire (`required: true`),
  condition d'affichage `when` (clés sœurs sans préfixe), aide, paramètres propres au type du champ (plugin), contraintes et
  messages. Portée d'autocomplétion des expressions des champs : `structureScope`.
- Pas d'option « Ne sais pas » sur la structure (retirée par `create`), mais chaque champ peut l'avoir.
- Aperçu : « × n » si répétable ; `▸ libellé type` par champ, 4 au plus puis « … » ; `<aucun champ>` si vide.
- Prévisualisation : les champs visibles (condition évaluée avec les clés sœurs), chacun avec intitulé, « * » si
  `required === true`, aide, saisie du plugin du champ, messages d'erreur du champ ; répétable : un cadre « #i » par occurrence
  avec « Supprimer » (désactivé au minimum), bouton « Ajouter » (désactivé au maximum) ; occurrences vides ajoutées
  jusqu'au minimum.
- Valeur : objet `{clé: valeur, clé_other, clé_group, clé_nsp, clé_pays}` (non répétable) ou liste de tels objets
  (répétable). Synthèse : champs visibles « , », occurrences « ; » ; champ « Ne sais pas » → son libellé.

**Règles de gestion et validations**
- `minOccurrences` / `maxOccurrences` (« Au moins / Au plus {0} élément(s). ») ; s'ils échouent, les champs ne sont pas
  validés.
- Puis chaque champ visible de chaque occurrence est validé avec les règles de son type ; erreur rangée sous
  `cle[i].champ` (répétable) ou `cle.champ`.
- Liste vide d'une structure répétable obligatoire : `required` sans `repeat.min`, `minOccurrences` avec.

**Cas limites gérés** : valeur non-objet pour une structure non répétable → occurrence vide `{}` ; réponse non-liste pour
une répétable → liste vide.

**Références** : `src/plugins/question-types/structure/index.tsx`, `fields-editor.tsx`, `occurrences.tsx`,
`src/core/validation/field.ts:150-168`.

#### Mail (`type: "email"`, EVO-007)

**Comportement observable**
- Paramètres propres : aucun (texte d'aide sur le contrôle intégré), « Ne sais pas ».
- Aperçu : icône enveloppe + `<mail>`, « + Ne sais pas ».
- Prévisualisation : `<input type="text" inputMode="email" autoComplete="email">`. À chaque frappe la valeur enregistrée
  est la saisie normalisée ; à la sortie du champ, le texte est remplacé par la valeur enregistrée et le contrôle de format
  s'affiche (si les contrôles sont actifs et qu'aucune erreur de page n'est déjà affichée).
- Valeur : mail valide → espaces de bord retirés, domaine en minuscules (partie locale et littéral IP inchangés) ;
  invalide → saisie sans espaces de bord ; vide → `null`. Synthèse : la valeur.

**Règles de gestion et validations** (`email`, « Adresse mail invalide. »)
- Partie locale : `dot-atom` (atext RFC 5322) ou chaîne entre guillemets (qtextSMTP / paire `\`), 64 caractères max.
- Domaine : labels 1-63 caractères `[A-Za-z0-9-]` sans tiret en bord, ou littéral `[IPv4]` / `[IPv6:…]` (forme complète ou
  compressée, IPv4 finale acceptée).
- Longueur totale ≤ 254 ; dernier `@` séparateur ; ASCII seulement (RFC 6531/6532 non prises en charge).

**Cas limites gérés** : `"jean dupont"@exemple.fr`, `jean@[192.0.2.1]`, `jean@[IPv6:2001:db8::1]` acceptés ; point en
début/fin/doublé, `@@`, domaine accentué refusés.

**Références** : `src/plugins/question-types/email/index.tsx:23, 41` (`useBlurErrors`, `FieldErrors`), `src/core/contact/email.ts`.

#### Téléphone (`type: "phone"`, EVO-007)

**Comportement observable**
- Paramètres : `defaultCountry` (liste de tous les pays, drapeau, nom, indicatif ; `FR` = absent), `countries` (codes ISO
  séparés par virgules/espaces/points-virgules, appliqué à la sortie du champ ; majuscules, codes inconnus et doublons écartés ;
  vide = tous), `lineType` (indifférent, `mobile`, `fixed`), « Ne sais pas ».
- Aperçu : icône téléphone + `<téléphone>`, « · BE » si pays par défaut ≠ FR, « · mobile » / « · fixe », « + Ne sais pas ».
- Prévisualisation : sélecteur d'indicatif (pays autorisés, triés par nom dans la langue du contenu, `🇫🇷 France +33`) puis
  `<input type="tel">`. Pays initial : réponse existante, sinon pays par défaut s'il est autorisé, sinon le premier autorisé.
  À la frappe : valeur = E.164 si le numéro est valide, sinon la saisie ; pays = celui du numéro (`+` / `00`), sinon le
  sélecteur ; le sélecteur suit le pays du numéro s'il est autorisé. À la sortie : affichage au format national, contrôle.
- Valeur : E.164 (`+33612345678`) ; `<clé>_pays` = code ISO. Synthèse et interpolation : format international lisible.

**Règles de gestion et validations**
- Caractères admis : chiffres, espaces, `.`, `-`, `(`, `)`, `+` en tête ; `00` en tête remplacé par `+`.
- `phone` (« Numéro de téléphone invalide. ») : numéro invalide pour le pays (métadonnées `libphonenumber-js/max`), ou pays
  du numéro hors de `countries`.
- `lineType` (« Numéro mobile / fixe attendu. ») : type `MOBILE` ou `FIXED_LINE` exigé ; `FIXED_LINE_OR_MOBILE` accepté pour
  les deux.

**Cas limites gérés** : pays du numéro non autorisé → le sélecteur ne bouge pas, contrôle `phone` en échec ; numéro invalide →
pays du numéro s'il est reconnu, sinon le pays choisi.

**Références** : `src/plugins/question-types/phone/index.tsx`, `phone-field.tsx` (`:25, 63` : `useBlurErrors`, `FieldErrors`), `src/core/contact/phone.ts`,
`countries.ts`.

#### Adresse (`type: "address"`, EVO-007)

**Comportement observable**
- Paramètres : `defaultCountry`, `countries` (comme le téléphone), `minLength` (défaut affiché 5), `maxLength` (défaut
  affiché 200 ; 0 → absent), `verify` (« Adresse à vérifier par un service de normalisation », exporté, sans effet dans
  l'outil), « Ne sais pas ».
- Aperçu : icône repère + `<adresse>`, « · XX » si pays par défaut ≠ FR, « + Ne sais pas ».
- Prévisualisation : sélecteur de pays (drapeau, nom ; **masqué si un seul pays est autorisé**) puis une ligne de texte ;
  contrôle à la sortie du champ.
- Valeur : ligne sans espaces de bord, `<clé>_pays` = pays choisi (rangé seulement si la ligne est non vide). Synthèse : la ligne.

**Règles de gestion et validations**
- `address` (« Adresse invalide : une ligne de {min–max} caractères, avec au moins une lettre. ») : longueur en points de
  code hors bornes (défaut 5–200), aucune lettre Unicode `\p{L}`, ou caractère de contrôle (retour à la ligne compris).
- `postalCode` (« Code postal manquant. ») : pays `FR` (pays rangé, sinon pays par défaut, sinon FR) et aucune suite de
  exactement 5 chiffres.
- Les messages `minLength` / `maxLength` ne sont pas proposés pour ce type (seuls `address` et `postalCode`).

**Cas limites gérés** : alphabets non latins acceptés (`東京都千代田区1-1`) ; `12345` refusé (pas de lettre).

**Références** : `src/plugins/question-types/address/index.tsx:39, 69` (`useBlurErrors`, `FieldErrors`), `src/core/contact/address.ts`.

#### Civilité (`type: "civility"`, EVO-007)

**Comportement observable**
- Paramètres : `short` (libellés courts « Mme », « M. »), `undisclosed` (option « Ne se prononce pas », code `NP`, en
  dernier), `labels` (libellé multilingue modifié par code ; vide = libellé par défaut, affiché en texte indicatif),
  « Ne sais pas ». Codes fixes `MME`, `M`, `NP`.
- Libellés par défaut : long `Madame` / `Monsieur` / `Ne se prononce pas` (en : `Madam` / `Mister` / `Prefer not to say`),
  court `Mme` / `M.` (en : `Mrs` / `Mr`).
- Aperçu : icône personne + libellés séparés par « / », « + Ne sais pas ».
- Prévisualisation : boutons radio sur une ligne (retour à la ligne si la place manque), puis « Ne sais pas ».
- Valeur : code (`MME`, `M`, `NP`). Synthèse et interpolation : libellé dans la langue courante.

**Règles de gestion et validations** : `option` (« Cette réponse n'est plus proposée. ») si la valeur n'est pas un code
proposé (`NP` sans `undisclosed` compris). Pas d'« Autre », pas d'options ajoutées.

**Références** : `src/plugins/question-types/civility/index.tsx`, `src/core/model/question.ts:181-257`,
`src/core/contact/checks.ts`, `display.ts`.

#### Contrôles transverses de `core/contact`

- `contactErrors(q, valeur, pays?)` : point d'entrée des quatre contrôles ; valeur passée en chaîne sans espaces de bord.
- `formatErrors` (core/validation) : contrôles de format seuls, pour la sortie du champ ; réponse vide → aucune erreur.
  Affichage commun aux trois champs par `useBlurErrors` et `FieldErrors` (voir Socle commun).
- `displayFormatters(ws, graph)` : mise en forme de l'interpolation par clé (civilité → libellé, téléphone → international) ;
  clé cherchée dans le graphe courant puis la bibliothèque ; la première question trouvée l'emporte même sans mise en forme.
- Pays : liste de `libphonenumber-js` ; nom via `Intl.DisplayNames` (repli : le code) ; drapeau calculé.

### Types de nœuds

#### Question (`kind: "question"`)

- **Comportement observable** : rectangle blanc ; intitulé en gras (texte brut), clé en mono, aperçu du plugin du type,
  badges fournis par l'éditeur ; « ? » rouge si la question est introuvable. Pas de `create` (création par `n`), pas de
  `Properties` (panneau commun), pas de `Page` (page rendue par `ui/preview`).
- **Règles** : la question effective (locale ou bibliothèque) et le plugin de type sont fournis par l'éditeur.
- **Cas limites gérés** : question manquante → « ? ».
- **Références** : `src/plugins/node-kinds/question/index.tsx`.

#### Information (`kind: "info"`)

- **Comportement observable** : création avec `text` = « Texte d'information » (Alt+I) ; forme bleu ciel « INFORMATION »,
  titre en gras, texte sur 2 lignes. Propriétés : titre (`LabelEditor`, facultatif), texte (`LabelEditor` multi-lignes).
  Page : titre `h2` puis texte (sauts de ligne conservés), interpolés.
- **Règles** : texte vidé → `text: {}`.
- **Références** : `src/plugins/node-kinds/info/index.tsx`.

#### Synthèse (`kind: "summary"`)

- **Comportement observable** : création avec titre « Récapitulatif » (Alt+S) ; forme violette à double bordure.
  Propriétés : titre seul. Pas de `Page` dans le plugin : le récapitulatif est rendu par `ui/preview` (`Summary`).
- **Références** : `src/plugins/node-kinds/summary/index.tsx`.

#### Fin (`kind: "end"`)

- **Comportement observable** : création avec message « Merci, votre réponse est enregistrée. » (Alt+F, questionnaire
  seulement) ; pilule verte « FIN · issue », titre ou message sur 2 lignes. Propriétés : titre (facultatif), message
  (multi-lignes), issue `outcome` (code libre, vide = absent). Page : coche ✓, titre, message.
- **Références** : `src/plugins/node-kinds/end/index.tsx`.

#### Sortie nommée (`kind: "exit"`)

- **Comportement observable** : création par la commande « Nouvelle sortie nommée » (sans raccourci, fragment seulement),
  nom unique dérivé de `sortie`. Forme grise « SORTIE » + nom en mono. Propriétés : nom (snake_case validé ; espaces retirés à
  la frappe ; appliqué à la sortie du champ ou sur Entrée ; Échap annule ; cadre rouge si invalide), libellé multilingue
  facultatif (retiré si toutes les langues sont vides). Pas de `Page`.
- **Références** : `src/plugins/node-kinds/exit/index.tsx`, `src/app/commands/library-item-commands.ts:185-189`.

#### Appel de fragment (`kind: "fragment"`, EVO-008)

- **Comportement observable** : pas de `create` (créé par glisser-déposer / regroupement, hors zone). Forme ambre en
  pointillés : « FRAGMENT », titre du fragment (langue du contenu, langue par défaut, puis clé ; « Fragment introuvable »
  sinon), alias, « N question(s) » (fragments appelés compris), bouton Déplier/Replier : liste en lecture seule des nœuds
  (question : libellé + `alias.clé` ; sortie : « → sortie nom » ; fragment imbriqué : `▣ alias.alias` ; autres : nom du genre).
  Pas de `Properties` ni de `Page` dans le plugin.
- **Cas limites gérés** : cycle d'appels → arrêt du comptage (questionCount, l.23-28).
- **Références** : `src/plugins/node-kinds/fragment/index.tsx`.

## 4. Parcours : prévisualisation, moteur, validation, état du système, expressions

### Prévisualisation : barre et panneaux (`Preview`)

**Comportement observable**
- Barre : sélecteur de langue du contenu (commande `preview.lang`), compteur de textes non traduits dans la langue affichée (`preview-missing-translations`, masqué à 0), bouton « Recommencer », puis quatre bascules (`aria-pressed`) : Outline (`preview.toggleOutline`), Contrôles de saisie (`preview.toggleChecks`), État du système (`preview.toggleSystem`), Débogage (`preview.toggleDebug`).
- Contrôles désactivés : bandeau ambre `preview-checks-off` (« Contrôles de saisie désactivés »).
- Mise en page : le wizard au centre, l'outline à droite (`w-[28rem]`, au plus 45 % de la largeur), puis une colonne latérale (`w-80`) qui contient l'état du système et/ou le débogage. Le panneau de débogage ne s'affiche que si l'historique n'est pas vide.

**Règles de gestion et validations**
- Valeurs par défaut des panneaux : système affiché, débogage et outline masqués ; contrôles activés (`store.ts:172-173`). Ces réglages sont dans l'état de l'application (hors `initialState(ws)`) : ils survivent au chargement d'un autre projet et ne sont pas enregistrés dans le projet.
- `preview.toggleChecks` inverse `previewChecks` et remet `attempted = false` dans toutes les prévisualisations, donc efface les erreurs affichées (`system-commands.ts:103-107`).
- `preview.lang` : sans argument, passe à la langue suivante ; avec un argument, l'applique seulement s'il fait partie des langues du projet. La commande n'est active qu'avec plus d'une langue (`settings-commands.ts:43-51`).
- « Recommencer » : nouvelle session `start(input)` ; `attempted`, `returnTo` et `unchecked` sont remis à zéro et `visited` vidé (`Preview.tsx:42`). Ce bouton n'est pas une commande du catalogue.
- Compteur de traductions manquantes : problèmes `missingTranslation` dont le propriétaire est le questionnaire ou un élément de bibliothèque qu'il référence directement (nœuds `ref`), pour la langue affichée (`Preview.tsx:84-96`).

**Cas limites gérés**
- Session enregistrée dont une page n'existe plus (graphe modifié) : le parcours recommence automatiquement (`usePreview.ts:26-30`).
- Questionnaire sans départ atteignable : message `preview.empty` (`Preview.tsx:114`).

**Références** : `src/ui/preview/Preview.tsx:20-96`, `src/ui/preview/usePreview.ts`, `src/app/commands/system-commands.ts:77-108`, `src/app/commands/settings-commands.ts:43-51`, `src/app/store/store.ts:29-43`.

---

### Wizard : page, Suivant / Précédent, progression

**Comportement observable**
- Une page par étape : question (intitulé interpolé, astérisque si obligatoire effective, aide, champ du plugin), information ou fin (`Page` du plugin de nœud), synthèse (`Summary`).
- Barre de progression en haut de la page.
- Boutons « Précédent » (désactivé quand l'historique compte moins de 2 pages), « Suivant » (absent sur une fin) et « Revenir à la synthèse » (voir plus bas).
- Message « Aucune arête ne s'applique : parcours bloqué. » quand `session.blocked`.
- Un clic dans la page sélectionne le nœud dans le logigramme. Sur une page de fragment, c'est le nœud fragment le plus externe du questionnaire qui est sélectionné (`Preview.tsx:136, 152`).
- Erreurs : celles d'un champ sont passées au plugin (`errors` indexé par chemin) ; celles de la question (chemin `''`) s'affichent sous le champ (`role="alert"`).

**Règles de gestion et validations**
- « Suivant » (`advance`) : avec les contrôles activés, la réponse de la page courante est validée d'abord (`answerErrors`). S'il y a des erreurs, la page ne change pas et `attempted = true` les fait afficher (`Preview.tsx:141`). Le moteur exécute ensuite `next`, puis la garde de fin `guardEnd`.
- Les erreurs ne s'affichent qu'après une tentative (`attempted`) et seulement si les contrôles sont activés (`Preview.tsx:131`).
- « Précédent » (`back`) ne valide rien et remet `attempted = false`.
- Saisie : `setAnswer(input, session, v, other, group, undefined, country)`. La précision « Autre » n'est conservée que si la valeur est ou contient `other` (`Preview.tsx:169`). Toute saisie efface le marqueur « Ne sais pas ».
- Case « Ne sais pas » : cochée, elle enregistre `dontKnowAnswer(q)` (`null`, ou `[]` pour un choix multiple, avec le groupe `NSP` pour un choix) et le marqueur `_nsp: true` ; décochée, la réponse est effacée (`undefined`) (`Preview.tsx:125-129`).
- Progression : pages vues divisées par (pages vues + pages restantes en suivant `successor` avec les réponses actuelles). Elle vaut 1 sur une fin (`session.ts:170-182`).

**Cas limites gérés**
- Type de question sans plugin : l'intitulé s'affiche avec le nom du type (`Preview.tsx:173`).
- Boucle dans le calcul de progression : arrêt au premier nœud déjà vu.
- L'historique contient des doublons après un `goTo` (retour depuis la synthèse) ; la progression les compte.

**Références** : `src/ui/preview/Preview.tsx:98-196`, `src/core/runtime/session.ts`.

---

### Contrôles de saisie activables (EVO-014)

**Comportement observable**
- Contrôles désactivés : « Suivant », « Revenir à la synthèse » et la fin ne sont jamais bloqués, aucune erreur n'est affichée, les valeurs saisies sont conservées. Les plugins reçoivent `env.checks = false` pour taire leurs messages à la sortie du champ (mail, téléphone, adresse).

**Règles de gestion et validations**
- Un seul point de bascule, `checks` dans `Wizard`. Désactivés, il n'y a ni `check()` avant d'avancer, ni prédicat de `resume`, ni `guardEnd`, ni affichage d'erreurs (`Preview.tsx:109, 131, 141, 144, 186`).
- Pages quittées contrôles désactivés : elles sont ajoutées à `PreviewState.unchecked` (y compris les pages traversées par `resume`) puis ignorées par `firstInvalidStep` / `guardEnd` (`Preview.tsx:148`, `path-check.ts:35`).
- Les conditions (arêtes, `when`, options) sont évaluées normalement. Une erreur d'évaluation donne « faux » (`evaluateCondition`).

**Cas limites gérés**
- Réactivation : la page courante est contrôlée à la tentative suivante, sans contrôle rétroactif.
- Une page de `unchecked` reste exclue de la garde de fin jusqu'à « Recommencer », même si on la revisite contrôles activés (seul « Recommencer » vide `unchecked`).

**Références** : `src/ui/preview/Preview.tsx:105-151`, `src/ui/preview/path-check.ts:32-50`, `src/ui/preview/usePreview.ts:43-71`, `src/app/commands/system-commands.ts:101-108`.

---

### Garde de fin et réponses devenues invalides (EVO-001)

**Comportement observable**
- Avant d'afficher une fin, que ce soit après « Suivant », après « Revenir à la synthèse » ou au rendu (par exemple après un changement de l'état du système alors qu'une fin est affichée), le wizard revient à la première question du chemin dont la réponse est devenue invalide. Il y empile la page (`goTo`), affiche les erreurs et conserve la réponse.

**Règles de gestion et validations**
- `firstInvalidStep` parcourt `projectedSteps(input, answers)` dans l'ordre, ignore les pages `skip`, et retient la première étape qui a une réponse définie (y compris `null`) et des erreurs `answerErrors` (`path-check.ts:33-40`).
- `guardEnd` n'agit que si la page courante est un nœud `end` (`path-check.ts:46-50`).
- Au rendu, la garde est relancée par un `useEffect` qui dépend de l'étape cible ; elle n'agit qu'avec les contrôles activés (`Preview.tsx:109-113`).
- La réponse invalide n'est jamais effacée automatiquement.

**Cas limites gérés**
- Option dynamique disparue, réponse hors bornes après un changement de `sys`, « obligatoire si » devenu vrai sur une réponse `null` : tous ces cas donnent des erreurs `answerErrors` et ramènent à la question.
- Sur une page de synthèse (qui n'est pas une fin), aucune garde ne s'applique.

**Références** : `src/ui/preview/path-check.ts`, `src/ui/preview/Preview.tsx:108-113, 143-145`.

---

### Synthèse et retour à la synthèse

**Comportement observable**
- La page de synthèse affiche son titre (interpolé) et la liste des réponses du parcours avant la page courante : intitulé de la question et réponse mise en forme par `formatAnswer` du plugin (option d'un groupe « Groupe — Option »), ou le libellé « Ne sais pas ». Un crayon s'affiche au survol. Sans réponse, le message `preview.summaryEmpty` s'affiche.
- Un clic sur une réponse ramène à la question (`goTo`, page empilée), mémorise la synthèse (`returnTo`) et remet `attempted = false`.
- Sur cette question, le bouton « Revenir à la synthèse » apparaît si `returnTo` est dans l'historique et n'est pas la page courante, et si la page n'est pas une fin.

**Règles de gestion et validations**
- `summaryEntries` : on parcourt l'historique sans la page courante ; chaque étape n'apparaît qu'une fois (ordre de première visite) ; les étapes dont la réponse est `undefined` sont ignorées (une réponse `null` est listée) (`session.ts:150-167`).
- « Revenir à la synthèse » = `advance(resume(…), revalidate = true)`. La page courante est d'abord validée, puis `resume` avance sur les pages déjà vues et répondues. Il s'arrête sur la synthèse cible, une fin, une page nouvelle, une question sans réponse, un blocage ou une page refusée par `accept` (revalidation par `answerErrors` si les contrôles sont activés). Il y a au plus 500 pas (`session.ts:72-85`).
- Arrêt sur une page devenue invalide : `attempted = true`, donc les erreurs s'affichent (`Preview.tsx:150`). Quand on arrive sur la cible, `returnTo` est effacé.

**Cas limites gérés**
- Une page déjà vue avant la modification mais plus sur le chemin arrête le retour (« page nouvelle »).
- Le libellé de la question d'une étape de fragment est résolu dans le contexte de cette étape (`makeRenderEnv` par entrée).

**Références** : `src/ui/preview/Summary.tsx`, `src/core/runtime/session.ts:62-85, 138-167`, `src/ui/preview/Preview.tsx:137, 185-189`.

---

### Outline et mise en évidence dans le logigramme (EVO-019)

**Comportement observable**
- Panneau latéral `outline-panel` : le composant `Diagram` du questionnaire en mode `outline`, donc en lecture seule (`readOnly = ro || !!outline`, `Diagram.tsx:51`), avec les problèmes de vérification du questionnaire.
- Nœud courant entouré d'un anneau vert (`data-outline-current`). Les questions actives sont cliquables. Les questions inactives sont grisées (`opacity-40 grayscale`, `data-outline="inactive"`). Les nœuds autres que des questions n'ont pas d'état (`NodeView.tsx:79-92`).
- Le clic sur une question active affiche cette question dans le wizard. Ailleurs, le clic est sans effet (`Diagram.tsx:183`).
- Recentrage animé (200 ms) à chaque changement de `focusKey` (longueur de l'historique, étape, compteur de clics). Le zoom est le plus fort qui laisse voir les voisins immédiats, borné à [0,5 ; 1] (`outlineView.ts`).
- Sur une page de fragment, c'est le nœud fragment de l'appelant (le plus externe) qui est mis en évidence. Il n'est pas cliquable.
- Hors outline, un clic dans la page du wizard sélectionne le nœud correspondant dans l'onglet Logigramme (`select`).

**Règles de gestion et validations**
- `passedQuestions(input, s, visited)` : parcours recalculé depuis le départ avec les réponses actuelles (`successor`), arrêté à la première page jamais affichée (`visited` ∪ historique). On n'en garde que les questions, sans les étapes internes à un fragment (filtre `!id.includes('/')`, `Outline.tsx:20`).
- `jumpTo` : l'historique devient le préfixe de ce parcours jusqu'à la question, les réponses sont conservées, `blocked` est remis à faux, sans validation. Une question hors parcours est sans effet (`outline.ts:27-31`).
- `visited` : chaque mise à jour de session y ajoute l'historique ; « Recommencer » le vide (`usePreview.ts:32-38`).

**Cas limites gérés**
- Si une réponse antérieure change, les questions qui sortent du parcours sont grisées immédiatement, avant même « Suivant ».
- Boucle dans le parcours recalculé : arrêt sur la première étape répétée.
- Un voisin lointain peut sortir du cadre quand le zoom atteint son plancher.

**Références** : `src/ui/preview/Outline.tsx`, `src/core/runtime/outline.ts`, `src/ui/diagram/Diagram.tsx:51, 139, 183`, `src/ui/diagram/NodeView.tsx:79-92`, `src/ui/diagram/useOutlineCenter.ts`, `src/ui/diagram/outlineView.ts`.

---

### Panneau de débogage

**Comportement observable**
- Si la page est dans un fragment : bandeau « Dans le fragment : » avec le chemin des alias et le titre du fragment (dans la langue de l'interface, sinon la langue par défaut, sinon la clé).
- Chemin parcouru : historique numéroté, chaque étape désignée par `alias.cle` ou par le type de nœud.
- Conditions des arêtes sortantes de la page courante, dans l'ordre : cible, nom de sortie, résultat (`true` / `false` / « sinon » / « erreur ») et expression. L'arête retenue est surlignée. En sortie de fragment, les arêtes de l'appelant suivent, sous l'intitulé « Puis, à la sortie du fragment : ».
- Valeurs courantes : JSON des réponses et de `sys`.

**Règles de gestion et validations**
- `edgeTrace` utilise `evaluateStrict` : une exception donne `error`, une valeur autre que `true` donne `false`. L'arête retenue suit la même règle que `chooseEdge` (`trace.ts:39-50`).
- Le libellé d'arête (EVO-005) n'est pas affiché ; seule la condition l'est.

**Cas limites gérés** : aucune arête, message `preview.noCondition` ; fin, trace vide ; profondeur des sorties imbriquées bornée à 50.

**Références** : `src/ui/preview/DebugPanel.tsx`, `src/core/runtime/trace.ts`.

---

### Panneau état du système de la prévisualisation

**Comportement observable**
- Sélecteur de scénario (scénarios du projet, plus « aucun scénario », qui prend les valeurs d'exemple). Une `ValueInput` par variable, avec `sys.<nom>`, le libellé (EVO-005) et le type.
- Après une modification : badge « modifié » et bouton « Rétablir » (`sys` effacé). Formulaire « Enregistrer comme scénario » (commande `preview.saveScenario`).

**Règles de gestion et validations**
- `systemStateOf` : valeurs éditées (`p.sys`), sinon celles du scénario choisi (le premier par défaut si aucun n'a été choisi), sinon les exemples du dictionnaire (`system-edits.ts:90-97`).
- Changer de scénario remet `sys` à zéro. La session est conservée, avec une réévaluation immédiate (options, libellés, garde de fin si une fin est affichée).
- `preview.saveScenario` : nom saisi (après `trim`), ou « <scénario> * » à défaut. Le nom est rendu unique (« Nom (2) ») ; le nouveau scénario est sélectionné et `sys` effacé (`system-commands.ts:77-88`, `system-edits.ts:46-53`).

**Cas limites gérés** : une valeur vide supprime la clé de `sys` ; les réponses ne sont pas élaguées après un changement de `sys`.

**Références** : `src/ui/preview/SystemPanel.tsx`, `src/app/store/system-edits.ts`.

---

### Moteur : départ, choix d'arête, ordre d'évaluation, sorties de fragment

**Comportement observable** : sans objet (module pur, utilisé par le wizard, l'outline, le débogage et les tests de référence).

**Règles de gestion et validations**
- `chooseEdge` : première arête conditionnée dont la condition vaut exactement `true`, dans l'ordre du tableau `edges` ; sinon la première arête sans condition ; sinon `undefined`, et la session passe en `blocked` (`navigate.ts:7-9`, `session.ts:52-53`).
- `successor` : une fin n'a pas de successeur. Un nœud sans arête sortante dans un fragment en sort par les arêtes du nœud fragment appelant (`leave`). Un nœud `exit` nommé sort par les arêtes `exit` = son nom ou sans nom. Un nœud fragment sans arête remonte à l'appelant. L'entrée d'un fragment est `fragmentEntry`. Profondeur bornée à 50 (`navigate.ts:26-61`).
- Les conditions sont évaluées dans le contexte de l'étape d'origine (`buildContext`), ou de l'appelant en sortie de fragment.
- Identifiants d'étape : `nodeId`, `appel/nodeId`, `a1/a2/nodeId`. `resolveStep` renvoie la question effective (bibliothèque résolue, surcharges EVO-009 et EVO-012) et `answerPath` = alias puis clé (`steps.ts:48-74`).
- `isPage` : tous les nœuds sauf `fragment` et `exit`.

**Cas limites gérés** : fragment ou nœud introuvable, `undefined` (session `blocked`) ; cycle d'appels (garde de profondeur ; `stepIds` mémorise les fragments déjà vus).

**Références** : `src/core/runtime/navigate.ts`, `src/core/runtime/steps.ts`.

---

### Moteur : réponses, valeurs par défaut, élagage

**Règles de gestion et validations**
- `next` : une question sans réponse reçoit `null`. Après le passage à la page suivante, `prune` est appliqué, puis la valeur par défaut de la nouvelle page (`defaultExpr` évaluée, sinon `default`), seulement si la réponse est `undefined` (`session.ts:48-56, 87-93`).
- `setAnswer` range la valeur, `<clé>_other` (si non vide), `<clé>_group`, `<clé>_nsp: true` et `<clé>_pays` (si non vide). Une valeur `undefined` supprime la clé (`session.ts:34-45`).
- `projectedSteps` : chemin depuis le départ avec les réponses connues. À la première question sans réponse (`undefined`), on ajoute tout ce qui reste atteignable sans repasser par le chemin (toutes arêtes, toutes sorties) (`session.ts:99-112`, `navigate.ts:68-104`).
- `prune` : pour chaque étape du questionnaire (fragments compris) dont le chemin de réponse n'est pas tenu par une étape projetée, il efface la réponse et ses compagnons `_other`, `_group`, `_nsp`, `_pays` (`session.ts:115-127`).
- Réponses d'un fragment rangées sous `answers[alias]` (imbriquées pour plusieurs niveaux).

**Cas limites gérés**
- Deux nœuds de même clé : une réponse est gardée dès qu'une des étapes est projetée (comparaison par chemin).
- `back` et `goTo` remettent `blocked` à faux. `back` est sans effet sur une page unique.

**Références** : `src/core/runtime/session.ts`, `src/core/runtime/context.ts`.

---

### Moteur : contexte d'évaluation

**Règles de gestion et validations**
- `buildContext` : réponses débarrassées en profondeur des valeurs `null` (dans les objets et les éléments de listes), puis, pour chaque appel traversé, les clés de l'alias sans préfixe (la plus interne l'emporte), puis `sys` (`context.ts:13-32`).
- Conséquence : une question facultative laissée vide est absente du contexte (`$exists` vaut faux). Un choix multiple « Ne sais pas » (`[]`) reste présent.

**Références** : `src/core/runtime/context.ts`.

---

### Moteur : options d'un choix (options dynamiques, groupes, « autre »)

**Règles de gestion et validations**
- Entrées parcourues dans l'ordre. Une entrée (ou un groupe) dont `when` n'est pas vraie est ignorée.
- Option statique : telle quelle. Entrée dynamique : une option par élément de `from` (valeur unique traitée comme une liste d'un élément ; `null`, `undefined` ou absente : rien), dans l'ordre de la source. Les expressions `value` et `label` sont évaluées avec l'élément comme contexte ; sans expression, c'est l'élément lui-même. Les objets sont rendus en JSON et le libellé vide est remplacé par la valeur (`options.ts:53-62`).
- Groupe : ses entrées, chacune marquée `{ id, label }`. `id` = code du groupe, sinon libellé dans `env.defaultLang`, interpolé (`options.ts:31-35`).
- Sont écartées : les valeurs vides, la valeur `other` et les doublons du couple (groupe, valeur) (`options.ts:46-51`).
- L'option « Autre (préciser) » n'est pas produite ici ; elle est ajoutée par le plugin et par la validation.

**Cas limites gérés** : une erreur d'évaluation de `from` ne produit aucune option ; les éléments `null` sont ignorés.

**Références** : `src/core/runtime/options.ts`.

---

### Moteur : « Ne sais pas », « Autre », pays

**Règles de gestion et validations**
- `dontKnowAnswer(q)` : choix multiple `{ value: [], group: 'NSP' }`, choix unique `{ value: null, group: 'NSP' }`, autres types `{ value: null }` (`context.ts:62-65`).
- Chemins compagnons : `otherPath`, `groupPath`, `dontKnowPath`, `countryPath` (`<clé>_other`, `_group`, `_nsp`, `_pays`).
- `SummaryEntry.dontKnow` / `.group` / `.other`.

**Références** : `src/core/runtime/context.ts:50-65`, `src/core/runtime/session.ts:34-45, 138-167`.

---

### Moteur : suggestions d'un champ texte (EVO-016)

**Règles de gestion et validations**
- `suggestionList(raw, labelOf?)` : `undefined` ou `null` donne une liste vide ; une valeur unique donne un élément ; une liste est aplatie d'un niveau (`flat()`). Les chaînes non vides sont gardées (une chaîne faite d'espaces est écartée), les nombres et booléens passent par `String()`, les objets et la valeur `other` sont écartés. `labelOf` remplace une valeur d'option par son libellé. Les doublons sont retirés après ce remplacement, en gardant l'ordre de première occurrence (`suggestions.ts:19-29`).
- `referencedChoices` : questions à choix dont la clé est le dernier nom d'une référence (hors `sys.`), cherchées dans le graphe courant, puis dans les questions de la bibliothèque, puis dans les fragments. La première question trouvée par clé l'emporte, même si ce n'est pas un choix (elle est alors filtrée) (`suggestions.ts:39-55`).
- `filterSuggestions` : « contient », casse ignorée selon la locale, après `trim` de la saisie ; une saisie vide garde toute la liste.
- Le plugin `text` évalue l'expression à chaque rendu avec `env.evaluate` (contexte de la page) (`plugins/question-types/text/index.tsx:30-35, 93`).

**Références** : `src/core/runtime/suggestions.ts`.

---

### Validation d'une réponse (`validateAnswer`, `isRequired`, messages par défaut)

**Comportement observable** : erreurs `{ path, param, message }` affichées par le wizard. Le message est multilingue et interpolé dans la langue affichée.

**Règles de gestion et validations**
- « Ne sais pas » : marqueur `true` et option activée sur la question (`hasDontKnow`, jamais sur une structure), alors aucune erreur, quelle que soit la règle (`field.ts:46`).
- `isRequired` : un booléen, ou une expression « obligatoire si » évaluée dans `ctx` (si elle n'est pas évaluable, la question est facultative) (`field.ts:25-27`).
- Vide = `undefined`, `null`, `''` ou `[]`. Une réponse vide et obligatoire donne `required` ; une réponse vide et facultative ne donne aucune erreur. Exception : la liste vide d'une structure répétable obligatoire qui a un `repeat.min` passe aux contrôles d'occurrences (`field.ts:53-57`).
- Texte : `minLength`, `maxLength`, `pattern` (un motif invalide est ignoré).
- Date : format ISO réel (`format`, qui arrête les autres contrôles de la date), bornes `min` / `max` (littéral ISO ou expression).
- Nombre : `numberKind` (`natural` ≥ 0 et entier, `integer`), `min` / `max` (nombre ou expression), `decimals`.
- Choix : chaque couple (groupe, valeur) doit figurer parmi les options visibles, plus (`AUTRE`, `other`) si « Autre » est activée. Un groupe absent ou `null` : la valeur suffit (`option`). Choix multiple : `minSelected`, `maxSelected`.
- Mail, téléphone, adresse, civilité : `contactErrors` de `core/contact`, avec le pays lu dans `ctx['<clé>_pays']`.
- Structure : occurrences `minOccurrences` / `maxOccurrences`. Sans erreur à ce niveau, chaque champ est validé récursivement dans le contexte de l'occurrence (`{...ctx, ...occ}`). Un champ dont `when` est fausse n'est pas validé. Chemins `cle[i].champ` ou `cle.champ` (`field.ts:150-168`).
- « Autre » avec `detailRequired` et une précision vide donne `otherDetail`.
- Contraintes libres : chaque `constraints[i].rule` qui ne vaut pas `true` donne `constraints[i]`, avec le message de la contrainte, sinon « Valeur invalide. ».
- Message : `question.messages[param]`, sinon `defaultMessage(param, borne)`. Les accolades de la borne sont échappées. Pour `numberKind` et `lineType`, le terme est traduit (`messages.ts:4-48`).
- `formatErrors` : contrôles de contact seuls (réponse vide : aucune erreur), pour le contrôle à la sortie du champ.
- Dans le wizard, `answerErrors` valide dans le contexte de la page, réponse courante comprise sous sa clé ; groupe et marqueur sont lus à côté de la réponse, pas dans `ctx` (`path-check.ts:5-19`).
- Astérisque du wizard (EVO-021) : `requiredAt` appelle `isRequired` sur la question effective, dans ce même contexte (`path-check.ts:25-30`).

**Cas limites gérés** : un motif regex invalide ne bloque pas ; une borne dont l'expression échoue est ignorée ; une précision « Autre » vide n'est enregistrée que si elle est renseignée.

**Références** : `src/core/validation/field.ts`, `src/core/validation/messages.ts:1-48`, `src/ui/preview/path-check.ts`.

---

### Onglet État du système (dictionnaire, scénarios, valeurs)

**Comportement observable**
- Colonne de gauche : variables (nom, libellé, type, description, valeurs d'une énumération, schéma d'une liste, valeur d'exemple, badge du nombre d'usages, supprimer) et problèmes du dictionnaire sous chaque variable. Colonne de droite : scénarios (nom, dupliquer, supprimer, description, valeur de chaque variable).
- Types proposés : texte, nombre, date, booléen, énumération, liste (d'objets).

**Règles de gestion et validations**
- Ajout (`system.addVariable`) : variable texte au nom unique (`variable`, `variable_2`…), l'onglet s'ouvre et le nom reçoit le focus.
- Renommage par `KeyInput`, qui refuse un nom invalide ou déjà pris, puis `system.renameVariable`, propagé dans les expressions `sys.…` et les scénarios. Les champs de liste suivent la même règle avec `system.renameField`.
- Changer de type supprime `values`, `fields` et `example` ; une énumération reçoit `values: []`, une liste `fields: []` et `example: []` (`system-edits.ts:34-43`).
- Libellé (EVO-005) : une ligne (les retours sont remplacés par des espaces) ; vide, la propriété est retirée. Clé d'historique `sys:<nom>:caption`.
- Valeurs d'une énumération : une par ligne, sans espaces autour, lignes vides ignorées, sans doublons.
- Champs d'une liste : types simples seulement (pas de liste ni d'énumération). Nouveau champ `champ_<n>`.
- Suppression d'une variable : elle est retirée du dictionnaire et de tous les scénarios (aucune confirmation).
- Scénarios : `scenario.add` crée un scénario aux valeurs d'exemple, ou une copie si un id est fourni (nom rendu unique). `scenario.delete`.
- `ValueInput` : saisie selon le type (nombre ; date `input type=date` ; booléen et énumération avec « non renseigné » ; liste en JSON transmis seulement s'il est valide, message `system.jsonError` sinon). Un écart au type est signalé sans bloquer (`valueError`).
- Les saisies continues passent par `store.edit('project', …, clé)` : elles sont regroupées et annulables.

**Cas limites gérés**
- Énumération dont la valeur courante n'est plus dans la liste : la valeur reste proposée dans le sélecteur.
- `valueError` sur une liste : premier écart de champ, sous la forme « champ: type ».
- Énumération sans valeurs déclarées : toute chaîne est acceptée.
- Date vérifiée par motif (mois 01-12, jour 01-31, sans contrôle du calendrier).

**Références** : `src/ui/system-state/*.tsx`, `src/app/store/system-edits.ts`, `src/app/commands/system-commands.ts:29-73`.

---

### Expressions (JSONata, fonctions ajoutées, interpolation, variables système, erreurs)

**Règles de gestion et validations**
- JSONata 1.8, synchrone, compilé avec un cache par texte d'expression (`evaluate.ts:33-45`).
- Avant évaluation, trois réécritures dans cet ordre : `.pays` en `($exists(P_pays) ? P_pays : P.pays)`, `.groupe` final en `_group`, `.nsp` final en `(P_nsp = true)`. Une expression invalide reste inchangée (`evaluate.ts:66`, `country-ref.ts`, `group-ref.ts`, `dont-know-ref.ts`).
- Fonctions ajoutées : `$today()` (date de `env.today`, sinon date locale du jour), `$addDays(d, n)`, `$daysBetween(a, b)` (arrondi), `$age(naissance)` (âge à `today`) (`evaluate.ts:54-62`, `dates.ts`).
- Gestion des erreurs : `evaluateStrict` lève une exception ; `evaluate` renvoie `undefined` ; `evaluateCondition` n'est vraie que si le résultat vaut `true`. Les séquences JSONata sont converties en tableaux.
- Variables système : `sys.<nom>` dans le contexte (`buildContext`).
- Interpolation : gabarit `{expr}`, où `{{` et `}}` sont des accolades littérales. Les guillemets sont respectés pour trouver l'accolade fermante ; une accolade non fermée est laissée en texte. Valeur affichée : vide si absente, liste jointe par « , », objet en JSON. Une simple référence dont le dernier nom a une mise en forme `env.display` (civilité, téléphone) utilise cette mise en forme (`template.ts`).
- `resolveLabel` : première variante dont la condition est vraie, sinon `otherwise` ; puis la langue demandée, sinon la langue par défaut, sinon la première disponible ; puis l'interpolation (`label.ts`).
- Références : `extractReferences` (chemins racines, prolongement par un filtre de tête, `$$.cle` absolu, option `skipExists`), `renameReference`, `checkSyntax` (message et position de fin du jeton).

**Cas limites gérés** : une expression non évaluable dans un gabarit donne une chaîne vide ; un chemin `.nsp` vaut toujours vrai ou faux, jamais vide ; un champ de structure nommé `pays` reste lisible grâce au repli.

**Références** : `src/core/expressions/*.ts`.

## 5. Format JSON d'export (schéma réel)

Version courante : **`FORMAT_VERSION = 14`** (`src/core/model/documents.ts:5`). Les 7 fichiers JSON de `examples/declaration-sinistre/` sont valides pour les schémas du dépôt (Ajv 2020, `strict: false`, comme `src/format/validate.ts`).

### Fichiers produits

Deux commandes d'export (`src/app/commands/project-commands.ts:38-51`), et une sauvegarde automatique.

| Export | Fonction | Fichier(s) | Contenu |
| --- | --- | --- | --- |
| Bundle (`project.export`, `Mod+S`) | `exportBundle` (`files.ts:64`) | `<slug(nom du projet)>.bundle.json` (`project-commands.ts:41`, slug = minuscules sans accents, non-alphanumériques → `_`, défaut `projet`) | `{ formatVersion, kind: "bundle", project, library, questionnaires[], layouts[] }` : image exacte de l'espace de travail en mémoire (`toBundle`, `workspace.ts:27`). Contient les mises en page et commentaires. |
| Fichiers unitaires (`project.exportFiles`) | `exportFiles` (`files.ts:72-96`) | un téléchargement par fichier, espacés de 250 ms | voir ci-dessous |
| Sauvegarde navigateur | `exportBundle` dans `src/app/persistence/index.ts:53`, relue par `importFiles` sous le nom `session.bundle.json` (l.27) | stockage local | même bundle, donc migré à la relecture |

Fichiers unitaires, dans cet ordre :

1. `projet.json` (`PROJECT_FILE`) : le projet, avec `questionnaires[].file` **réécrit** au nom exporté de chaque questionnaire (`files.ts:74`).
2. `bibliotheque.json` (`LIBRARY_FILE`) : la bibliothèque ; pour chaque question et fragment, clés réordonnées `id, key, version, status` en tête (`deliveredLibrary`, `files.ts:58-61`). Le `status` absent n'est **pas** ajouté.
3. Pour chaque questionnaire (ordre du projet) : `<clé> - <version> - <final|provisoire>.json` (`questionnaireFileName`, `files.ts:26-29` : version vide → segment omis ; caractères `\ / : * ? " < > |` et de contrôle → `_` ; `final` si `status === "validated"`). Contenu (`deliveredQuestionnaire`, `files.ts:47-51`) :
   - clés en tête dans l'ordre `formatVersion, kind, id, key, title, description, version, status, validatedAt, libraryVersions` (`QUESTIONNAIRE_HEAD`, l.40), puis les autres dans leur ordre ;
   - `status` toujours écrit (`"draft"` si absent en mémoire) ;
   - `libraryVersions` : si validé, valeurs mémorisées à la validation ; sinon instantané courant `versionSnapshot` (`versioning.ts:46-50` : `{ version: item.version ?? "", status: "validated" | "draft" }` pour chaque question de bibliothèque ou fragment utilisé, récursivement à travers les fragments) ; omis si vide.
   - suivi, s'il existe, de sa mise en page `<même nom sans .json>.layout.json` (`layoutFileFor`, l.15).
4. `fragment_<clé>.layout.json` pour chaque fragment ayant une mise en page (l.86-89).
5. `question_<clé>.layout.json` pour chaque question de bibliothèque ayant un document layout (commentaires, EVO-011, l.91-94).

Séparation / exclusion :
- Les mises en page et commentaires de révision ne sont **que** dans les documents `layout` (fichiers `*.layout.json` ou `layouts[]` du bundle). Les fichiers unitaires les **incluent** ; c'est le kit développeurs qui les exclut (`kit-dev.mjs:48`), et `LISEZMOI.md` demande de ne pas les joindre.
- Le bundle n'applique ni le renommage des fichiers, ni l'écriture forcée de `status`/`libraryVersions`, ni le réordonnancement des clés.
- Pas de fichier par élément de bibliothèque (EVO-022, analyse §4).

Sérialisation (`serialize.ts:2-4`) : `JSON.stringify(doc, null, 2) + "\n"` : indentation 2 espaces, ordre d'insertion des clés conservé (pas de tri), saut de ligne final, UTF-8 (navigateur). La stabilité repose sur l'ordre en mémoire, plus les deux réordonnancements ci-dessus. L'aller-retour de l'exemple est testé identique à l'octet près (`tests/reference/format.test.ts:10` unitaire, `:49` bundle).

Import (`importFiles`, `files.ts:115-155`) : chaque fichier est parsé, **migré** puis **validé** ; une seule erreur → rien n'est chargé (`{ errors }`). Un bundle remplace tout. Sinon : avec `projet.json`, nouvel espace ; sans, fusion dans l'espace courant (ou un nouveau projet « Nouveau projet »). Questionnaire : remplacé par id ou ajouté (son nom de fichier devient l'entrée `file` s'il est absent du projet) ; `status` et `libraryVersions` **retirés** s'il n'est pas validé (`importedQuestionnaire`, l.54-57). Layout : remplacé par `graph`. Questionnaires triés selon l'ordre de `project.questionnaires`.

### Schéma JSON réel

JSON Schema 2020-12, validé par Ajv (`validate.ts:16`, `allErrors: true, strict: false`). Choix du schéma par `kind` (`documentKind`, l.31-34 : `questionnaire | library | project | layout | bundle` ; sinon erreur « Type de document inconnu (propriété "kind") »). Tous les objets sont fermés (`additionalProperties: false`, ou `unevaluatedProperties: false` pour les questions composées par `allOf`).

#### Définitions communes (`common.schema.json`)

| Définition | Type | Contraintes |
| --- | --- | --- |
| `formatVersion` (l.525) | integer | `minimum: 1` (pas de `const 14`) |
| `id` (l.10) | string | `minLength 1`, `pattern ^[^/]+$` — utilisé pour id de nœud, arête, question, champ de structure |
| `key` (l.71) | string | `^[a-z][a-z0-9_]*$` (mots réservés non contrôlés par le schéma) |
| `langCode` (l.16) | string | `^[a-z]{2,3}(-[A-Za-z0-9]+)?$` |
| `localizedText` (l.21) | object | `propertyNames` = `langCode`, valeurs string |
| `label` (l.31) | oneOf | `localizedText` \| `{ variants: [{ when: expression, text: localizedText }], otherwise: localizedText }` (fermé, `variants`/`otherwise` requis) |
| `expression` (l.6) | string | aucune contrainte syntaxique |
| `caption` (l.519) | string | `minLength 1`, `^[^\r\n]*$` |
| `numberBound` | oneOf | number \| expression |
| `dateBound` (l.86) | string | pas de pattern (date ISO ou expression) |
| `version` (l.529) | string | libre |
| `itemStatus` (l.533) | enum | `draft`, `validated` |
| `versionRef` (l.540) | object fermé | `version` (string) et `status` (`itemStatus`) requis |
| `countryCode` (l.557) | string | `^[A-Z]{2}$` |

**Options de choix**

| Définition | Propriétés (obligatoires en gras) | Notes |
| --- | --- | --- |
| `option` (l.90) | **`value`** string (`not const "other"`), **`label`** label, `when` expression | fermé |
| `dynamicEntry` (l.113) | **`from`**, `label`, `value`, `when` (expressions) | fermé |
| `choiceGroup` (l.148) | **`group`** label, `code` string `minLength 1`, `when`, **`options`** [choiceItem] | pas de groupe imbriqué |
| `choiceItem` / `choiceEntry` | oneOf option \| dynamicEntry (\| choiceGroup pour `choiceEntry`) | |
| `otherOption` (l.190) | `label` label, `detailRequired` boolean | fermé |
| `dontKnowOption` (l.202) | `label` label | fermé ; `{}` = activée |

**Question** : `questionCore` (l.817) + paramètres du type (branches `if type = … then params_<type>`, 11 branches) ; fermeture par `unevaluatedProperties: false` sur `question` (l.212-242, bibliothèque), `structureField` (l.244-270) et la question locale d'un nœud (l.272-294).

| Propriété (`questionCore`) | Type | Obligatoire |
| --- | --- | --- |
| `id` | `id` | oui |
| `key` | `key` | oui |
| `label` | label | oui |
| `type` | enum (voir ci-dessous) | oui |
| `description` | string | non |
| `help`, `placeholder` | label | non |
| `required` | boolean \| expression | non |
| `default` | quelconque | non |
| `defaultExpr` | expression | non |
| `messages` | objet : clé libre → localizedText | non |
| `constraints` | `[{ rule: expression (requis), message?: localizedText }]` fermé | non |
| `dontKnow` | `dontKnowOption` | non (interdit sur `structure` : `not required dontKnow`, l.710) |

Spécifique selon le contexte : `question` (bibliothèque) ajoute `version`, `status` (`itemStatus`) et `type` ∈ 11 types ; `structureField` ajoute `when` et `type` ∈ 10 types (sans `structure`) ; la question locale d'un nœud ajoute `kind: "question"` et interdit `ref` (l.289).

| `type` | Paramètres (`params_<type>`) | Obligatoire |
| --- | --- | --- |
| `text` | `multiline` bool, `minLength`/`maxLength` int ≥ 0, `pattern` string, `suggestions` expression | — |
| `date` | `min`, `max` : dateBound | — |
| `number` | `numberKind` enum `real\|natural\|integer`, `min`/`max` numberBound, `decimals` int ≥ 0, `unit` localizedText | — |
| `single` | `options` [choiceEntry], `other` | `options` |
| `multiple` | `options`, `other`, `minSelected`/`maxSelected` int ≥ 0 | `options` |
| `boolean` | `labelSet` string (id), `other` | — |
| `structure` | `fields` [structureField], `repeat` `{ min int ≥ 0, max int ≥ 1, addLabel localizedText }` fermé | `fields` |
| `email` | aucun (déclare `type: const email` pour le piège Ajv, README format) | — |
| `phone` | `defaultCountry`, `countries` (uniques), `lineType` enum `mobile\|fixed` | — |
| `address` | `defaultCountry`, `countries` (uniques), `minLength` int ≥ 0, `maxLength` int ≥ 1, `verify` bool | — |
| `civility` | `labels` `{ MME?, M?, NP? }` localizedText fermé, `short` bool, `undisclosed` bool | — |

**Nœuds** (`node`, l.272, `oneOf` à 7 branches ; `kind` obligatoire partout)

| Branche | Propriétés (obligatoires en gras) |
| --- | --- |
| question locale (l.272-294) | `kind: "question"` + question complète (`questionCore` + paramètres), sans `ref` |
| question de bibliothèque (l.296-) | **`kind`** `question`, **`id`**, **`ref`** string, `label` label, `hiddenFields` [key] `uniqueItems` (l.326), `required` boolean, `description` |
| fragment (l.353) | **`kind`** `fragment`, **`id`**, **`ref`**, **`alias`** key, `requiredOverrides` objet (clés `^[^/]+(/[^/]+)*$` → boolean), `description` |
| info (l.390) | **`kind`**, **`id`**, **`text`** label, `title` label, `description` |
| summary (l.416) | **`kind`**, **`id`**, `title` label, `description` |
| end (l.440) | **`kind`**, **`id`**, **`message`** label, `title` label, `outcome` string, `description` |
| exit (l.470) | **`kind`**, **`id`**, **`name`** key, `label` localizedText, `description` |

**Arête** (`edge`, l.482) : **`id`** (`id`), **`from`**, **`to`** (string), `when` expression, `exit` string, `caption`, `description` ; fermée.

#### Projet (`project.schema.json`)

| Propriété | Type | Obligatoire | Contraintes |
| --- | --- | --- | --- |
| `formatVersion` | formatVersion | oui | |
| `kind` | `const "project"` | oui | |
| `id`, `name` | string | oui | `id` non contraint |
| `description` | string | non | |
| `languages` | [langCode] | oui | `minItems 1`, `uniqueItems` |
| `defaultLanguage` | langCode | oui | appartenance à `languages` non contrôlée |
| `systemState` | [`variable`] | oui | |
| `scenarios` | [`{ id, name, values }` + `description?`] | oui | fermé ; `values` objet libre |
| `questionnaires` | [`{ id, file }`] | oui | fermé |

`variable` (`$defs`, l.20-64) : **`name`** key, **`type`** enum `text|number|date|boolean|enum|list`, `caption`, `description`, `values` [string], `fields` [variable] (récursif), `example` (quelconque) ; fermé.

#### Questionnaire (`questionnaire.schema.json`)

Requis : `formatVersion, kind ("questionnaire"), id, key, title (localizedText), start (string), nodes [node], edges [edge]`.
Facultatifs : `description` string, `version`, `status` enum `draft|validated` (l.39), `validatedAt` string `^[0-9]{4}-[0-9]{2}-[0-9]{2}$` (l.46), `libraryVersions` objet id → `versionRef`. Fermé.

#### Bibliothèque (`library.schema.json`)

Requis : `formatVersion, kind ("library"), questions [question], fragments [...], labelSets [...]`. Fermé.
- Fragment : **`id`**, **`key`**, **`title`** localizedText, **`nodes`**, **`edges`**, `version`, `status` (itemStatus), `description`, `entry` string ; fermé ; pas de `start`.
- Jeu de libellés : **`id`**, **`key`**, **`kind`** enum `["boolean"]` (seul), **`yes`**, **`no`** localizedText, `description` ; fermé.

#### Layout (`layout.schema.json`, « outil seulement »)

Requis : `formatVersion, kind ("layout"), graph (string), nodes` ; `nodes` = objet id → `{ x, y (number, requis), collapsed? bool }` fermé ; `comments?` = [`{ node, text, replies[string] }` requis, `x?`, `y?` number] fermé.

#### Bundle (`bundle.schema.json`)

Requis : `formatVersion, kind ("bundle"), project, library, questionnaires[], layouts[]` ; chaque partie est validée par le schéma de son document (`$ref`), donc porte elle-même `formatVersion` et `kind`. Fermé.

#### Extraits (tirés de `examples/declaration-sinistre/`, abrégés)

`demande_remboursement - 1.0.4 - final.json` :

```json
{
  "formatVersion": 14,
  "kind": "questionnaire",
  "id": "q_remboursement",
  "key": "demande_remboursement",
  "title": { "fr": "Demande de remboursement", "en": "Refund request" },
  "description": "Commence par le fragment « identification_assure » (départ sur le nœud fragment).",
  "version": "1.0.4",
  "status": "validated",
  "validatedAt": "2026-10-13",
  "libraryVersions": {
    "frg_identification_assure": { "version": "1.2.0", "status": "validated" },
    "lq_identite": { "version": "2.1.0", "status": "validated" }
  },
  "start": "n_ident",
  "nodes": [
    { "kind": "fragment", "id": "n_ident", "ref": "frg_identification_assure", "alias": "ident",
      "requiredOverrides": { "fn_num_secu": false } },
    { "kind": "info", "id": "n_mineur", "title": { "fr": "Assuré mineur", "en": "Minor policyholder" }, "text": { "…": "…" } }
  ],
  "edges": [
    { "id": "e_ident_mineur", "from": "n_ident", "to": "n_mineur", "when": "ident.majeur = false", "caption": "Assuré mineur" },
    { "id": "e_ident_montant", "from": "n_ident", "to": "n_montant_demande" }
  ]
}
```

`bibliotheque.json` (question) :

```json
{ "id": "lq_date_sinistre", "key": "date_sinistre", "version": "1.0.0", "status": "validated",
  "label": { "fr": "Date du sinistre", "en": "Date of the claim" }, "type": "date", "required": true,
  "min": "sys.date_effet_contrat", "max": "$today()",
  "messages": { "min": { "fr": "Le sinistre est antérieur à la date d'effet du contrat.", "en": "…" } },
  "defaultExpr": "$today()" }
```

`declaration_sinistre - 1.0.5 - provisoire.layout.json` (abrégé) :

```json
{ "formatVersion": 14, "kind": "layout", "graph": "q_declaration",
  "nodes": { "n_intro": { "x": 0, "y": 0 } },
  "comments": [ { "node": "n_date", "x": -320, "y": 300, "text": "Faut-il borner à la date du jour ?",
                  "replies": ["Oui, pas de date future.", "Et pas avant la date d'effet du contrat."] } ] }
```

Composition de l'exemple : `projet.json` (2 langues fr/en, 6 variables système dont `enum` et `list`, scénarios, 2 questionnaires) ; `bibliotheque.json` (4 questions : `date_sinistre` date 1.0.0 validée, `telephone` text 1.0.0 validée, `souscripteur` structure 0.1.0 **sans status**, `identite` structure 2.1.0 validée ; 2 fragments `identite_tiers` 1.1.0 et `identification_assure` 1.2.0 validés, sans `entry` ; 2 jeux booléens) ; un questionnaire provisoire (`status: "draft"`, `libraryVersions` courant) et un validé ; 3 layouts ; `chemins/` (7 parcours attendus, propriétés `description, questionnaire, scenario, today, answers[{step, value, group, other, dontKnow}], path, outcome`).

### Migrations

`migrate(doc, MIGRATIONS, FORMAT_VERSION)` (`migrate.ts:154-168`), appliquée à chaque fichier **avant** validation (`files.ts:121`). Les étapes sont indexées par la version de départ ; pour un bundle, chaque étape met aussi à jour `formatVersion` de `project`, `library`, `questionnaires[]`, `layouts[]` (`bump`, l.142-151).

| N → N+1 | EVO | Transformation (`src/format/migrate.ts`) |
| --- | --- | --- |
| 1 → 2 | 001 | `source` d'un choix (question, champ de structure, questions et `blocks` de bibliothèque) ajouté en dernière entrée de `options` puis supprimé (l.9-22, 27-46) |
| 2 → 3 | 003 | numéro seul (l.48) |
| 3 → 4 | 005 | numéro seul (l.50) |
| 4 → 5 | 006 | numéro seul (l.52) |
| 5 → 6 | 007 | numéro seul (l.54) |
| 6 → 7 | 008 | nœuds `kind: "block"` → `"fragment"` ; `library.blocks` → `library.fragments` (placé après `questions`, fusionné avec un `fragments` existant) ; `start` d'un bloc → `entry` seulement s'il n'est pas l'unique nœud sans arête entrante et désigne un nœud existant (l.56-71, 117-140) |
| 7 → 8 | 009 | numéro seul (l.73) |
| 8 → 9 | 011 | numéro seul (l.75) |
| 9 → 10 | 012 | numéro seul (l.77) |
| 10 → 11 | 015 | numéro seul (l.79) |
| 11 → 12 | 016 | numéro seul (l.81) |
| 12 → 13 | 018 | parcours récursif de tout le document : tout objet `type: "tristate"` → `"boolean"`, `default: "unknown"` retiré, `dontKnow ??= {}` ; tout objet `kind: "tristate"` ayant `yes` → `"boolean"` sans `unknown` ; expressions non réécrites (l.83, 97-114) |
| 13 → 14 | 022 | numéro seul (l.88) |

Comportements limites (`migrate.ts:156-166`, `files.ts:118-128`) :
- `formatVersion` absent → traité comme 1.
- Version future (`> 14`) → exception « Format N plus récent que celui de l'outil (14). » → erreur `<fichier> : …`, rien n'est chargé.
- Version sans migration (ex. 0) → « Aucune migration depuis la version 0. ».
- `formatVersion` non numérique (ex. `"abc"` → `NaN`) : aucune migration, puis rejet par le schéma (entier attendu). `"14"` (chaîne) : pas de migration, rejet par le schéma.
- JSON illisible → message de `JSON.parse` préfixé du nom de fichier.
- Schéma non respecté → liste d'erreurs `<fichier> <chemin> : <message> (<propriété en trop>)`, dédoublonnées (`validate.ts:37-46`).
- Un seul fichier en erreur → `{ errors }` sans espace de travail (tout ou rien).

### Kit développeurs

`npm run kit-dev` → `node scripts/kit-dev.mjs [dossier]` (défaut `kit-dev/` à la racine, ignoré par Git : `.gitignore:11`). Il supprime puis recrée le dossier (`kit-dev.mjs:44-55`) :
- `schemas/` : les 6 `*.schema.json` copiés tels quels ;
- `exemple/` : les JSON de `examples/declaration-sinistre/` **sauf** `*.layout.json` (soit `projet.json`, `bibliotheque.json`, les 2 questionnaires) ;
- `exemple/chemins/` : les 7 parcours attendus ;
- `FORMAT.md` : `docs/FORMAT.md` sans les lignes contenant `<!-- outil -->`, chemins `src/format/schemas/` → `schemas/` et `examples/declaration-sinistre/` → `exemple/` (l.12-17) ;
- `LISEZMOI.md` : contenu, version du format lue dans `examples/.../projet.json` (14 aujourd'hui), fichiers à joindre (`projet.json`, `bibliotheque.json`, questionnaires, sans `.layout.json`), règle « seuls les questionnaires `validated` sont livrables » (l.20-42).
Aucun schéma n'est fourni pour les fichiers `chemins/*.json`.

## 6. Non implémenté / limites

### 1. Coque, commandes et transverse

- Aucune commande pour **supprimer un questionnaire** (la clé i18n `questionnaire.delete` existe mais n'est reliée à rien) ;
  seule la fermeture d'onglet existe (`src/app/i18n/messages.ts:29`).
- **Annuler / rétablir** limité à 500 entrées par portée (`history.ts:27`), non persistant, et dépendant de l'onglet
  affiché : une modification de portée `project` (nom, langues, variables) ne s'annule pas depuis un onglet de questionnaire
  (`nav-commands.ts:30`). Remplacement de projet (nouveau, exemple, ouverture projet/bundle) non annulable.
- **Ctrl+Tab / Ctrl+Shift+Tab** déclarés par défaut mais généralement interceptés par le navigateur (doublés par Alt+→/←).
- La **palette** n'affiche que le premier raccourci d'une commande (`Palette.tsx:54`).
- Libellés dynamiques « (actuelle : fr) » de `lang.content` / `lang.ui` ; libellés partagés entre commandes (`tab.open`/`tab.show`,
  `node.connect`/`node.connectTo`/`edge.create`, `tab.library`/`library.show`, `library.setVersion`/`questionnaire.setVersion`).
- Pas de raccourci par défaut pour : définir le départ, copier dans la bibliothèque, nouvelle sortie, vue côte à côte,
  valider/dévalider, onglets Paramètres/Commentaires.
- Le bouton de la barre de projet affiche « Ctrl+K » en dur, même si le raccourci est personnalisé (`TopBar.tsx:48`).
- **Langue du contenu** non sauvegardée en session (revient à la langue par défaut au rechargement), ni les sous-vues,
  panneaux, vue côte à côte, langue/scénario de prévisualisation.
- **Import** : pas d'import d'un élément isolé de bibliothèque (`bibliotheque.json` remplace tout) ; pas de contrôle de
  cohérence entre `projet.json` et les questionnaires fournis ; un bundle parmi d'autres fichiers fait ignorer les autres ;
  messages d'erreur de format et d'Ajv non traduits (français / anglais Ajv mêlés).
- **Export d'image** : PNG seul (pas de SVG) ; pas d'export d'image d'un fragment ni du volet côte à côte.
- La fenêtre « notice » affiche toutes les lignes en rouge monospace, y compris les messages non bloquants (alerte
  d'éléments provisoires, image réduite).
- Bouton « Ajuster la vue » absent de la barre du logigramme (seulement contrôles React Flow et raccourci F) alors que la
  spec §4.1 le place dans la barre.
- Les onglets de fragments fermés n'ont pas de bouton de réouverture dans la barre d'onglets.
- Les conflits de raccourcis ne sont signalés que sur les actions personnalisées et ne sont pas bloquants.
- Valeurs par défaut du projet vierge (« Nouveau projet », « Questionnaire », langue `fr`) codées en français.
- Les **éléments de bibliothèque** ne sont pas exportés en fichiers distincts (choix EVO-022) ; aucune comparaison de versions.

### 2. Édition : logigramme, propriétés, commentaires, bibliothèque

- Pas de « couper » (Ctrl+X) ; presse-papiers interne, limité au projet ouvert.
- Rang des arêtes : `moveEdge` et le panneau de l'arête comptent toutes les arêtes sortantes du nœud (toutes sorties nommées confondues), alors que la pastille numérote par couple (origine, sortie) (`src/app/store/graph.ts:98`, `src/ui/properties/EdgeProperties.tsx:17`, `src/ui/diagram/EdgeView.tsx:18`).
- Une arête de condition vide `""` (branche en attente de saisie, pastille « ? ») est traitée comme « sinon » par `checkFamily` (`multipleElse`) et par `connect` pour l'ordre d'insertion (`src/core/validation/graph.ts:9`, `src/app/store/graph.ts:63`).
- Les problèmes dont le propriétaire est une question de bibliothèque (`invalidExpression`, `unknownReference`, `duplicateGroup`, `reservedGroupCode`, `emptyGroup`, `libraryMissing` d'un jeu de libellés, `duplicateKey` de champ) ne sont affichés dans aucun panneau : `LibraryQuestionView` n'a pas de panneau des problèmes et les panneaux filtrent sur `questionnaire` / `fragment` (seul `missingTranslation` est repris dans Paramètres).
- Clic sur un problème sans nœud ni arête : aucune sélection.
- Édition en place réservée aux questions ; pas d'édition en place des pages d'information, synthèses, fins, sorties.
- Sur une référence de bibliothèque, l'édition en place crée une surcharge d'intitulé (pas de modification de la définition).
- `connect` n'empêche pas une arête d'un nœud vers lui-même.
- Noms des sorties nommées non rendus uniques au collage / à la duplication de nœuds.
- Clé d'un jeu de libellés : invalide ou en double écrite quand même (seulement signalée en rouge dans la liste, aucune vérification `checkWorkspace`).
- Commentaires : uniquement sur des questions ; non copiés au collage / à la duplication ; pas d'auteur, de date ni de statut.
- Suppression d'un élément de bibliothèque utilisé : aucune confirmation (sauf commentaires).
- Mise en page automatique : sorties nommées (poignées) et libellés d'arêtes ignorés par ELK.
- Recentrage de la sélection calculé sur une taille fixe de 240 × 100.
- Typage des expressions limité à la syntaxe et à l'existence des références.
- Commentaires de code encore en « bloc » (`src/ui/diagram/Diagram.tsx:141`, `src/app/commands/edit-commands.ts:51`), déjà notés dans `docs/ECARTS.md`.

### 3. Types de questions et de nœuds

- Aucun raccourci ne crée directement une question d'un type donné : `n` crée un texte, les raccourcis de type changent le type
  de la question **locale** sélectionnée (graph-commands.ts:82-89).
- Texte indicatif (`placeholder`) : éditable seulement pour texte et nombre (QuestionProperties.tsx:85), alors que les champs
  mail, téléphone et adresse l'affichent (email/index.tsx:39, phone-field.tsx:57, address/index.tsx:63). La date ne l'utilise pas.
- Changement de type : `default` et `defaultExpr` ne sont pas conservés (hors de `QuestionBase`, contract.ts:47) ; les
  paramètres propres au type sont perdus (sauf options/`other` entre choix, `other` vers booléen et choix).
- Champs de structure : l'éditeur ne propose ni texte indicatif, ni valeur par défaut, ni « Obligatoire si » (case liée à
  `required === true`), ni description (fields-editor.tsx:104-129).
- `repeat.addLabel` est saisi avec `LabelEditor` (qui propose des variantes) mais typé et rendu comme texte multilingue simple
  (`as Record<string, string>`, fields-editor.tsx:62 ; rendu `env.text`, occurrences.tsx:96).
- Nombre : pas de message de format pour une saisie non numérique (réponse `null`) ; pas d'attributs `min` / `max`.
- Texte : `pattern` non ancré, motif invalide ignoré ; `maxLength` bloque la frappe (attribut HTML) plutôt que d'afficher le message.
- Booléen : aucune vérification de la valeur (pas de branche dans `validateAnswer`).
- Choix multiple : `minSelected` non vérifié quand aucune option n'est cochée (réponse vide → seule l'obligation compte).
- Options : déplacement par boutons ou par la saisie rapide uniquement (ni glisser-déposer ni raccourci) ; un groupe ne se
  déplace qu'entre groupes et une option qu'à l'intérieur de sa liste ; la valeur d'une option ne peut pas être vidée ni valoir
  `other` (frappe ignorée) ; unicité d'une valeur modifiée à la main non vérifiée dans l'éditeur.
- Mail : ASCII seulement (pas d'adresses internationalisées), pas de vérification d'existence.
- Adresse : `verify` sans effet dans l'outil (aucun appel à un service externe).
- Civilité, unité de nombre, libellés de sortie : texte multilingue simple (ni interpolation ni variantes).
- Noms de pays dépendants de `Intl.DisplayNames` du navigateur (repli : code ISO).
- Nœuds sortie et fragment : pas de page de prévisualisation propre ; synthèse : page rendue hors plugin.

### 4. Parcours : prévisualisation, moteur, validation, état du système, expressions

- « Suivant », « Précédent », « Recommencer », « Revenir à la synthèse », le clic sur une réponse de la synthèse et le clic dans l'outline ne sont pas des commandes du catalogue. Il n'y a ni palette ni raccourci pour ces actions (seules `preview.lang`, `preview.toggle*` et `preview.saveScenario` existent). Le guide le signale (`docs/GUIDE.md:901`).
- La prévisualisation ne fige pas la date du jour : `usePreview` ne renseigne pas `env.today` (`usePreview.ts:20-23`), donc `$today()` utilise la date locale. Le README de `core/expressions` dit pourtant « `env.today` fige la date du jour (tests, prévisualisation) ».
- La garde contre une réponse devenue invalide n'agit qu'à l'arrivée sur une fin. Sur une synthèse ou une autre page, une réponse antérieure devenue invalide n'est signalée qu'au prochain passage par cette question ou à la fin.
- Les réponses ne sont pas élaguées quand l'état du système change ; l'élagage (`prune`) n'a lieu qu'à `next`.
- L'astérisque des champs d'une structure teste `f.required === true` et ignore un « obligatoire si » de champ, que la validation évalue pourtant (`plugins/question-types/structure/occurrences.tsx:74` contre `field.ts:50`). Ce point est signalé comme hors périmètre dans l'analyse d'EVO-021.
- Pages de fragment : elles ne sont pas cliquables dans l'outline (seul le nœud fragment est mis en évidence).
- Le panneau de débogage n'affiche pas les libellés d'arêtes, seulement les conditions.
- Progression : indicative ; elle compte les doublons de l'historique créés par `goTo` et s'appuie sur le chemin le plus probable avec les réponses actuelles.
- Suppression d'une variable ou d'un scénario sans confirmation.
- Le dictionnaire ne contrôle les dates que par motif (un 31 février est accepté).

### 5. Format JSON

- Pas de schéma pour les fichiers `chemins/*.json` (décrits seulement par FORMAT.md §15), alors qu'ils sont livrés dans le kit.
- Les expressions (`expression`) ne sont que des chaînes pour le schéma : syntaxe, références et mots réservés relèvent des vérifications de l'éditeur, non de l'import.
- L'intégrité référentielle (`start`, `from`/`to`, `ref`, `labelSet`, `entry`, `exit`, clés de `requiredOverrides`, `libraryVersions`, `graph` d'un layout, `questionnaires[].id`) n'est pas vérifiée à l'import : un fichier conforme au schéma mais incohérent est chargé.
- `default`, `example`, `scenarios[].values` et les clés de `messages` ne sont pas typés par le schéma.
- `dateBound` sans pattern ; `version` texte libre sans format.
- La migration 12 → 13 ne réécrit pas les expressions qui testaient `"unknown"` (documenté, FORMAT.md l.949).
- Import sans `projet.json` : les fichiers sont fusionnés dans l'espace courant ; un questionnaire nouveau prend comme `file` le nom du fichier importé.
- Aucun export ne produit un unique fichier « livrable développeurs » : le tri des fichiers (exclusion des layouts, questionnaires validés seulement) est laissé à l'utilisateur ou au kit (qui ne travaille que sur l'exemple du dépôt, pas sur le projet de l'utilisateur).

## 7. EVO réalisées par zone

Les fiches EVO-001 à EVO-023 sont au statut « fait » ; EVO-025 est « en cours » (branche non fusionnée). Une EVO peut apparaître dans plusieurs zones.

### 1. Coque, commandes et transverse

- **EVO-002** — Guide utilisateur : chaque commande du catalogue est balisée `[cmd: id]` dans `docs/GUIDE.md` ; index des
  raccourcis généré (`scripts/guide/`) ; « Ajouter une action » du README `app/commands` impose la balise.
- **EVO-004** — Export du logigramme en image : `image-commands.ts` (`view.exportImage` X, `view.exportImageRun`),
  `image-file.ts`, `ImageDialog.tsx`, `useImageExport.ts`, `image-state.ts`, `imageOptions` persistées, bouton « Image »
  de `QuestionnaireView`, `download` accepte un `Blob`.
- **EVO-008** — Fragments : onglets `f:<id>` (Tabs, App, persistance des onglets de fragments, `activeGraphRef`), commandes
  `library.newFragment`, `node.group`, `node.setEntry`, `node.newExit`, `node.openFragment`, migration 6 → 7.
- **EVO-009** — Copie en bibliothèque : `node.toLibrary`, `CopyDialog` de `ui/shell`.
- **EVO-010** — Copier-coller et duplication : `clipboard-commands.ts`, menu contextuel « Dupliquer » des onglets.
- **EVO-011** — Commentaires : `comment-commands.ts`, onglet/lien « Commentaires », bouton de la barre, `question_<clé>.layout.json`.
- **EVO-012** — `node.resetRequired`.
- **EVO-013** — `library.openRef` (lien rompu → notice).
- **EVO-014** — `preview.toggleChecks`. **EVO-019** — `preview.toggleOutline`.
- **EVO-015** — Validation d'un formulaire : `questionnaire.validate` / `unvalidate`, verrou `lockedChanges` dans `store.edit`,
  marqueurs « Validé » (onglet, bouton de réouverture, logigramme), migration 10 → 11.
- **EVO-018** — migration 12 → 13 (tri-state), jeu de libellés booléen seul (`labelSet.addBoolean`).
- **EVO-020** — Kit développeurs : hors code applicatif (script `scripts/kit-dev.mjs`) ; aucune trace dans la coque.
- **EVO-022** — Versionning : `core/model/versioning.ts`, `version-commands.ts`, `version-edits.ts`, `VersionAlert.tsx`,
  `ItemVersion.tsx`, version dans `QuestionnaireProperties`, `questionnaireFileName`, export `status`/`libraryVersions`,
  import d'un questionnaire provisoire, migration 13 → 14, exemple renommé (`declaration_sinistre - 1.0.5 - provisoire.json`, …).
- **EVO-023** — Version et statut dans l'image : `imageFileName(projet, titre, { version, status }, date)`, `imageHeading`,
  appel dans `useImageExport.ts:114-119`.
- **EVO-025** — Refactoring de la gestion des erreurs (sans changement visible) : modules `app/feedback` (`refuse`, `inform`,
  `fail`, `confirm`, `bindFeedback` branché par `store.ts:285`) et `app/issues` (`issuesOf`, `selectIssues`, `useIssues`) ;
  commandes, `refused()` du store, `useImageExport`, `HiddenFields` et sept vues migrés ; `single-path.test.ts` ; `docs/ERREURS.md`.
- (Format) **EVO-001, 003, 005, 006, 007, 016** : uniquement par leurs migrations dans `src/format/migrate.ts`.

### 2. Édition : logigramme, propriétés, commentaires, bibliothèque

- **EVO-003 — Groupes d'options** : vérifications `duplicateGroup`, `reservedGroupCode` (`AUTRE`, `NSP`), `emptyGroup` (`groups-check.ts`) ; portée `cle.groupe` et parcours des libellés de groupes (`core/references`).
- **EVO-004 — Export image du logigramme** : `useImageExport.ts`, `ImageDialog.tsx`, attribut `data-edge-label` des pastilles.
- **EVO-005 — Libellés d'arêtes** : `caption` (pastille, troncature CSS, infobulle `edgeLabel.ts`, champ « Libellé » du panneau d'arête).
- **EVO-006 — « Ne sais pas »** : cmd `node.toggleDontKnow`, portée `cle.nsp`, parcours du libellé.
- **EVO-007 — Types contact** : portée `cle.pays`, libellés de civilité parcourus ; valeur par défaut texte brut pour `email`, `phone`, `address`, `civility`.
- **EVO-008 — Fragments** : onglet `FragmentView`, nœud fragment (poignées de sorties, « Ouvrir le fragment »), `FragmentCallProperties` (alias, sorties, clés attendues), entrée réglée, sorties nommées, extraction `groupIntoFragment`, insertion refusée sur cycle, vérifications `fragmentEntry`, `fragmentNoExit`, `endInFragment`, `implicitExitNotConnected`, `exitNotConnected`, `unknownExit`, `fragmentCycle`, `unusedFragment`, `expectedKeyMissing`.
- **EVO-009 — Copie en bibliothèque et champs masqués** : `copyToLibrary`, `CopyDialog`, `HiddenFields`, `setFieldHidden`, `hiddenFieldUsages`, badge « n / m champs », vérification `hiddenField`.
- **EVO-010 — Copier-coller et duplication** : `clipboard.ts`, `renameKeysIn`, `duplicate.ts`, menu contextuel `useDiagramMenu.tsx`, menus de la liste de bibliothèque et des onglets.
- **EVO-011 — Commentaires de révision** : `comment-edits.ts`, `comment-commands.ts`, `ui/comments`, nœuds `CommentNodeView` / `useCommentNodes`, page des commentaires, confirmation à la suppression.
- **EVO-012 — Surcharge du caractère obligatoire** : `RequiredOverride.tsx`, `required-edits.ts`, cmd `node.resetRequired`, badge « surch. ».
- **EVO-013 — Ouvrir l'objet lié depuis le badge** : `library-badge` (double-clic, `nopan`, infobulle), cmd `library.openRef` (message si lien rompu), défilement de la liste de la bibliothèque.
- **EVO-015 — Validation du formulaire** : `locked` dans le logigramme, `fieldset` désactivé du panneau, refus dans le store.
- **EVO-016 — Suggestions** : expression `suggestions` parcourue (vérifications, usages, renommage).
- **EVO-018 — Suppression du tri-state** : jeux de libellés booléens uniquement (`LabelSets.tsx`).
- **EVO-019 — Outline de prévisualisation** : mode `outline` de `Diagram`, `NodeView` (`data-outline`, nœud courant), badge « bib. » inerte.
- **EVO-021 — Astérisque après surcharge** : `isRequired` dans `core/validation/field.ts` (côté prévisualisation) ; dans le logigramme, le badge `*` lit la question effective (`instanceQuestion` applique la surcharge d'une référence).
- **EVO-022 — Versionning** : version et statut dans `QuestionnaireProperties`, `ItemVersion` (question et fragment), copies provisoires à la duplication.
- **EVO-023 — Version et statut dans l'export d'image** : titre `imageHeading` et nom de fichier (`useImageExport.ts`).
- **EVO-025 — Gestion des erreurs** : panneau des problèmes, `FragmentView`, `ComparePane` via `useIssues` ; confirmations de suppression et refus de la bibliothèque via `app/feedback` ; sans changement visible.

### 3. Types de questions et de nœuds

| EVO | Titre | Ce qui en est visible dans le code |
| --- | --- | --- |
| EVO-001 | Options dynamiques placées librement | Entrée `{from, label?, value?, when?}` dans `options` ; saisie `$référence` (quick-lines.ts:37) ; détail d'entrée dynamique (entry-detail.tsx:81-99) ; déploiement à la position (runtime/options.ts:53-62) ; commits `a55b3d5`, `7bcaf28`. |
| EVO-003 | Groupes d'options | `ChoiceGroup`, saisie `#` / puces / échappements, `GroupDetail` (code, condition), sections titrées, `<clé>_group`, `AUTRE` ; commits `09d2470`, `ccc5a95`. |
| EVO-005 | Libellés des arêtes et des variables système | Autocomplétion par libellé (completion.ts:28-47), survol `sys.…` (hover.ts) ; commits `f158826`, `a3d40c8`. |
| EVO-006 | Option « Ne sais pas » | `DontKnowEditor`, `dontKnowLabel`, `FieldProps.dontKnow/onDontKnow`, rendu dans chaque plugin, retrait sur structure ; commit `ac77bde`. |
| EVO-007 | Types mail, téléphone, adresse, civilité | Quatre plugins, module `core/contact`, `FieldProps.country`, raccourcis Shift+E/T/A/C ; commits `4cdcbac`, `baf30f2` (champ mail en texte), `e78926e`. |
| EVO-008 | Fragments de questionnaire | Plugins `fragment` (appel, alias, dépliage) et `exit` ; commit `a627f78`. |
| EVO-014 | Contrôles désactivables en prévisualisation | `RenderEnv.checks` ; messages de sortie de champ masqués dans mail, téléphone, adresse ; commit `ab5d8a5`. |
| EVO-015 | Formulaire validé (lecture seule) | `ExpressionEnv.readOnly` (context.tsx:10, ExpressionInput.tsx:69) ; commit `9991c3e`. |
| EVO-016 | Suggestions sur un champ texte | `suggestions`, `SuggestBox`, `suggestionList`, `referencedChoices` ; commits `cfac7f0`, `d635ca2`, `dc605f8`. |
| EVO-017 | « Autre » séparée des groupes | `separatedOther` (selection.ts:56-60), conteneur `choice-other-apart` ; commit `7f45678`. |
| EVO-018 | Suppression du tri-state | Plus de plugin ni de type `tristate` (registre, `QUESTION_TYPES`) ; jeux de libellés `kind: 'boolean'` seulement ; conversion dans `format/migrate.ts:93-110` ; commit `6c337ec`. |
| EVO-025 | Refactoring de la gestion des erreurs | `useBlurErrors`, `blurMessages`, `shownBlurErrors` (plugin-api/blur-errors.ts) et `FieldErrors` (ui-kit) utilisés par mail, téléphone, adresse ; sans changement visible ; commit `a28d093`. |

### 4. Parcours : prévisualisation, moteur, validation, état du système, expressions

- **EVO-001** — Options dynamiques placées librement : déploiement à leur position dans `choiceOptions` (`options.ts:43-73`) ; garde de fin `guardEnd` / `firstInvalidStep` (`path-check.ts`, commit `88ab4ff`).
- **EVO-003** — Groupes d'options : `groupId`, couple (groupe, valeur) dans `choiceOptions` et `validateAnswer`, `groupPath`, réécriture `.groupe` (`group-ref.ts`), affichage « Groupe — Option » dans la synthèse.
- **EVO-005** — Libellés d'arêtes et de variables : `caption` des variables et des champs de liste (`VariableCard.tsx:21-26, 50-52, 109-110`), libellé affiché dans `SystemValuesEditor` (`ValueInput.tsx:103`) ; l'arête n'intervient pas dans `chooseEdge`.
- **EVO-006** — « Ne sais pas » : `dontKnowAnswer`, `dontKnowPath`, `SummaryEntry.dontKnow`, case dans le wizard (`Preview.tsx:124-129`), aucune erreur dans `validateAnswer` (`field.ts:46`), réécriture `.nsp`.
- **EVO-007** — Mail, téléphone, adresse, civilité : `countryPath`, `contactErrors` et `formatErrors`, messages par défaut, réécriture `.pays`, `env.display` dans l'interpolation.
- **EVO-008** — Fragments : identifiants d'étape imbriqués, `enter` / `leave`, contexte par alias, `edgeTrace` avec les arêtes de l'appelant, bandeau du débogage.
- **EVO-009** — Champs masqués : `effectiveQuestion` → `instanceQuestion` (`steps.ts:38-46`).
- **EVO-012** — Surcharge du caractère obligatoire : `withQuestion` → `resolveRequired` (`steps.ts:66-74`).
- **EVO-014** — Contrôles de saisie activables : bascule, bandeau, `unchecked`, `env.checks` (`Preview.tsx:47, 52-54, 105-151`).
- **EVO-016** — Suggestions d'un champ texte : `suggestions.ts` (`suggestionList`, `referencedChoices`, `filterSuggestions`).
- **EVO-018** — Suppression du tri-state : visible seulement dans la migration et le modèle, hors de cette zone ; aucune trace spécifique dans le moteur.
- **EVO-019** — Outline : `outline.ts`, `Outline.tsx`, `visited`, mode `outline` de `Diagram`.
- **EVO-021** — Astérisque : `isRequired` partagé, `requiredAt` (`field.ts:25-27`, `path-check.ts:25-30`, `Preview.tsx:164`, commit `32dc34a`).
- **EVO-025** — Gestion des erreurs : `Outline` et compteur de traductions de `Preview` via `useIssues`, `TranslationsSection` et `SystemState` aussi ; sans changement visible.
- **EVO-015** — Validation d'un formulaire : rien dans cette zone. La prévisualisation n'a aucun verrou : son état est dans `store.preview`, hors du projet, et `preview.saveScenario` modifie la portée `project`.

## 8. Écarts code ↔ fiches EVO

« Respecté différemment » désigne un critère dont la lettre n'est pas suivie, le plus souvent conformément à l'analyse de la fiche. Les écarts déjà suivis dans `docs/ECARTS.md` sont rappelés quand ils concernent le code.

### 1. Coque, commandes et transverse

Fiches lues : EVO-002, EVO-004, EVO-015 (commandes et coque), EVO-022, EVO-023, EVO-025.

- **EVO-022, « Le JSON contient `version` et `statut` (`final` | `provisoire`) »** : respecté différemment — le fichier porte
  `status` avec les valeurs `draft` / `validated` (pas de champ `statut`, pas de valeurs `final`/`provisoire`) ; seuls les
  noms de fichiers emploient `final`/`provisoire`. Choix documenté dans l'Analyse §3 de la fiche. Preuve :
  `src/format/files.ts:48`, `src/format/files.ts:27`.
- **EVO-022, « Quand je modifie la version d'un élément de bibliothèque, alors la liste des questionnaires qui l'utilisent
  est affichée »** : respecté différemment — la liste est affichée en permanence sous le champ, pas en réaction à la
  modification. Preuve : `src/ui/library/ItemVersion.tsx:33-35`.
- **EVO-022, « champ grisé avec infobulle » (questionnaire)** : l'infobulle est portée par le conteneur du champ et le
  grisage par le `fieldset` désactivé de tout le panneau (pas par le champ lui-même) ; comportement observable conforme.
  Preuve : `src/ui/properties/QuestionnaireProperties.tsx:20-24`, `src/ui/properties/PropertiesPanel.tsx:35`.
- **EVO-004, « la fenêtre d'options s'ouvre avec mes derniers choix »** : le périmètre « sélection » mémorisé est ramené à
  « entier » s'il n'y a pas de sélection (choix de l'Analyse). Preuve : `src/ui/diagram/ImageDialog.tsx:16-19`.
- **EVO-004, « Formats : SVG si … »** : PNG seul, conformément à la conclusion de l'Analyse. Aucun écart.
- **EVO-023** : critères respectés dans le code (`image-file.ts:30-38`, `useImageExport.ts:114-119`) ; le test de fumée ne
  vérifie que la présence d'un titre (déjà noté dans `docs/ECARTS.md`, 2026-10-14).
- **EVO-002, anomalies relevées** (non des critères) toujours présentes dans le code : n° 1 (pas de suppression de
  questionnaire), 5 (500 étapes, pas de persistance), 6 (Ctrl+Tab), 7 (libellés partagés), 11 (Ctrl+Z selon l'onglet),
  12 (premier raccourci seul dans la palette), 14 (actions sans raccourci), 15 (libellés dynamiques). N° 3 (copier-coller)
  résolue par EVO-010.
- **EVO-025, « Plus aucune écriture `s.notice =` hors de `app/feedback` (la fermeture de la boîte dans `ui/shell` exceptée) »** :
  respecté différemment — une seconde remise à zéro reste dans `app/store` au chargement d'un projet (`store.ts:247`), admise
  par le contrôle automatique (`single-path.test.ts:26-27`, décision notée dans DECISIONS.md). Autres critères vérifiés :
  tests de caractérisation commités seuls (`036411a`) avant tout changement de `src/`, valeurs attendues inchangées ensuite
  (seuls les appels internes remplacés) ; `window.confirm` et `checkWorkspace(` n'apparaissent hors tests que dans
  `feedback.ts:60` et `issues.ts:22` ; tests par fonction (`feedback.test.ts`, `issues.test.ts`, `blur-errors.test.ts`) ;
  tests de fumée (`tests/`) non modifiés.
- **EVO-015** : aucun écart constaté dans la zone (boutons selon l'état `QuestionnaireView.tsx:69-81`, confirmation
  `edit-commands.ts:97-99`, marqueurs `Tabs.tsx:29-34`, `QuestionnaireView.tsx:96-101`).

### 2. Édition : logigramme, propriétés, commentaires, bibliothèque

- **EVO-003** : aucun constaté dans cette zone.
- **EVO-005** : aucun constaté.
- **EVO-008** :
  - « alias en double » : pas de code dédié, signalé par le code générique `duplicateKey` (`src/core/validation/workspace-check.ts:10-14,21`) — respecté différemment.
- **EVO-009** :
  - Titre de la fenêtre d'avertissement assemblé en dur `« … : cle.champ »` (`src/ui/properties/HiddenFields.tsx:30`) — écart I18N déjà noté dans `docs/ECARTS.md`, toujours présent.
  - « une référence à un champ masqué est signalée » : non signalée lorsqu'elle provient de la définition d'une question de bibliothèque (champ frère, décision d'analyse) ; si elle provient d'une autre question de bibliothèque utilisée dans le même graphe, elle devient un `unknownReference` de propriétaire `libraryQuestion`, affiché dans aucun panneau (`src/core/validation/refs-check.ts:91-92`, voir limites).
- **EVO-010** :
  - Critère « colle une sélection contenant un départ et une fin dans un fragment → ces deux nœuds sont écartés » : la fin est écartée, mais le nœud qui était le départ est **collé** comme nœud ordinaire (seul le rôle est écarté, message `paste.startFragment`) (`src/app/store/clipboard.ts:83-86`) — conforme à la décision de l'analyse EVO-010 (« Départ »), différent de la lettre du critère.
  - « Une seule fin par questionnaire » (comportement attendu) : une fin collée dans un questionnaire est collée sans contrôle (`clipboard.ts:51-57`) — décision de l'analyse (la spec §3.2 autorise plusieurs fins).
- **EVO-011** :
  - « Export développeurs sans commentaires » : les commentaires sont dans les documents de mise en page (`layout.comments`) ; il n'existe pas d'export développeurs distinct de la sauvegarde (décision d'analyse ; le kit `npm run kit-dev` exclut les `*.layout.json`).
  - « Clic droit sur une question → menu propose Commenter » : si la question fait partie d'une sélection multiple, l'entrée est affichée mais grisée (`src/ui/diagram/useDiagramMenu.tsx:20,33`, `src/app/commands/comment-commands.ts:21`).
- **EVO-012** : aucun constaté.
- **EVO-013** :
  - Badge d'un fragment : le fragment s'ouvre dans son propre onglet `f:<id>`, pas dans l'onglet Bibliothèque (`src/app/commands/library-item-commands.ts:27-30`) — décision d'analyse.
  - « Panneau de propriétés : idem si le badge y est affiché » : le panneau n'affiche pas de badge « bib. » (texte « question de bibliothèque » et bouton « Ouvrir dans la bibliothèque » à la place, `src/ui/properties/ReferenceProperties.tsx:27,38`) — sans objet selon l'analyse.
- **EVO-017** : aucun constaté (rendu de prévisualisation, hors de cette zone).
- **EVO-021** : aucun constaté (« Logigramme / panneau : sans objet »).

### 3. Types de questions et de nœuds

- **EVO-001** : « elle peut être déplacée (glisser-déposer, raccourcis) » respecté différemment : boutons Monter / Descendre /
  Dupliquer / Supprimer et réordonnancement de la saisie rapide (entry-detail.tsx:59-62, options-editor.tsx:39-44). Écart
  accepté dans la fiche (« Écart accepté à la réalisation »). Critère « booléen ou tri-state » abandonné (arbitrage A). Autres
  critères : aucun écart constaté.
- **EVO-003** : aucun constaté.
- **EVO-006** : critère « table de décision » sans objet (aucune table dans l'outil, noté dans la fiche). Autres critères :
  aucun écart constaté.
- **EVO-007** : aucun constaté dans la zone. Rappel ECARTS.md (2026-10-13, EVO-014, TEST) : le silence des messages de format
  mail / téléphone / adresse, contrôles désactivés, n'est pas testé en fumée (code : `plugin-api/blur-errors.ts:19-21`, appelé par
  email/index.tsx:23, phone-field.tsx:25, address/index.tsx:39) ; la règle pure est testée en unitaire depuis EVO-025
  (`blur-errors.test.ts:13`, `blur-errors-caracterisation.test.ts`).
- **EVO-016** : aucun constaté dans la zone. Rappel ECARTS.md (TEST) : « valeur unique » et « doublons » couverts seulement en
  unitaire. Le critère « référence à une question située après le champ » relève des vérifications de `core/validation`
  (hors zone) ; `ExpressionInput` ne signale que les références absentes de la portée.
- **EVO-017** : aucun constaté. Rappel ECARTS.md (TEST) : le test « projet antérieur » réécrit les options avant de prévisualiser.
- **EVO-018** : respecté différemment, selon l'arbitrage du 2026-10-13 : la 3e réponse affichée est « Ne sais pas »
  (`DONT_KNOW_LABEL`, core/model/question.ts:227), et non « Ne sait pas » comme dans l'exemple de la fiche ; la valeur par
  défaut « ne sait pas » et l'équivalence des expressions sont abandonnées (critères barrés dans la fiche). Rappel ECARTS.md
  (TEST) : cas d'un tri-state ayant déjà « Ne sais pas » non testé (format/migrate.ts:109).

### 4. Parcours : prévisualisation, moteur, validation, état du système, expressions

- **EVO-001** : aucun constaté dans cette zone. Une option dynamique disparue bloque la fin avec les contrôles activés. Avec les contrôles désactivés (EVO-014), ce blocage est volontairement levé (`Preview.tsx:109, 144`).
- **EVO-005** : aucun constaté dans cette zone. Le libellé d'arête n'a pas d'effet sur la navigation et n'apparaît pas dans le wizard. Le libellé de la variable s'affiche dans le dictionnaire et dans les scénarios. L'autocomplétion et le survol relèvent de `ui/expression-editor`, hors zone, non vérifiés ici.
- **EVO-006** : aucun constaté. Obligatoire satisfait et contrôles levés (`field.ts:46`), `.nsp` toujours vrai ou faux (`dont-know-ref.ts`), `.groupe` = `NSP` pour un choix (`context.ts:63-64`). L'ordre d'affichage (après « Autre », hors groupes) relève du plugin `choice`, hors zone.
- **EVO-012** : aucun constaté. La valeur effective s'applique à l'astérisque et au blocage (`steps.ts:70-72`), et seulement sur les questions présentées (validation par page, garde sur le chemin projeté). ECARTS.md note déjà l'absence de test direct pour « surchargée obligatoire mais non présentée ».
- **EVO-014** : critères respectés. Un point est traité autrement que dans la fiche (déjà dans ECARTS.md comme SPEC) : une page quittée contrôles désactivés reste exclue de la garde de fin jusqu'à « Recommencer », même revisitée contrôles activés. Seul « Recommencer » vide `unchecked` (`Preview.tsx:42, 148`, `path-check.ts:35`). La référence de ECARTS.md, `Preview.tsx:375`, est périmée (le fichier compte 196 lignes) ; l'endroit réel est `Preview.tsx:148`, et `path-check.ts:33-38` pour l'exclusion.
- **EVO-015** : aucun constaté. La prévisualisation reste utilisable sur un formulaire validé, sans verrou dans `ui/preview`.
- **EVO-016** : aucun constaté sur le moteur. Valeur unique, vide, conversion en texte, doublons et ordre suivent `suggestionList` ; le filtre « contient » ignore la casse ; le recalcul a lieu à chaque rendu de l'étape. Un détail diffère de l'analyse de la fiche, qui annonçait la conversion par `formatValue` : le code utilise `asText` (`String()`), avec le même résultat pour les nombres, booléens et dates ISO. `suggestionList` aplatit aussi d'un niveau les listes imbriquées (`suggestions.ts:20`), ce que la fiche ne dit pas.
- **EVO-019** : critères respectés dans le code. Le recentrage suit `focusKey` (longueur de l'historique, étape, clics), l'outline est en lecture seule, les questions hors parcours sont grisées et inactives, les réponses sont conservées lors d'un saut. Une précision n'est pas dans la fiche : sur une page interne à un fragment, c'est le nœud fragment qui est mis en évidence, et il n'est pas cliquable (`Outline.tsx:20, 24`). Ce choix est noté dans l'analyse de la fiche.
- **EVO-021** : aucun constaté pour les questions (même fonction `isRequired` pour l'astérisque et le blocage, même contexte). Limite déjà assumée dans l'analyse de la fiche : les champs de structure gardent un astérisque `required === true` (`occurrences.tsx:74`).
- Croisement avec ECARTS.md : les autres lignes qui touchent la zone sont des écarts de test (EVO-014 messages de format des plugins, EVO-016 unitaire seulement, EVO-019 rendu sans outline), sans écart de comportement visible dans le code.

### 5. Format JSON (schémas, sérialisation ↔ `docs/FORMAT.md` et fiches)

Contrôle automatique : les 95 noms de propriétés déclarés dans les schémas apparaissent tous dans `docs/FORMAT.md` ; l'exemple est valide pour les schémas en version 14 ; la table §16 de FORMAT.md (l.936-950) correspond aux étapes de `MIGRATIONS` ; `formatVersion` 14 partout (FORMAT.md l.1, 38, 934 ; `documents.ts:5` ; exemple). Écarts relevés :

1. **Nom de fichier dans le schéma projet** : `project.schema.json:143` décrit `file` comme « `<clé>.json` », alors que l'export écrit `<clé> - <version> - <final|provisoire>.json` (`files.ts:26-29`, FORMAT.md l.132, l.174). Ce schéma est livré tel quel dans le kit.
2. **`file` dans le bundle** : FORMAT.md l.132 annonce le nommage EVO-022 pour `questionnaires[].file`, mais seul `exportFiles` le réécrit (`files.ts:74`) ; en mémoire et donc dans le bundle, la valeur reste celle de la création (`<clé>.json`, `project-commands.ts:63`, `duplicate.ts:48` ; `questionnaire.json`, `store.ts:139`) ou du dernier import.
3. **Statut `"draft"` dans un bundle** : FORMAT.md l.180-181 (« `status` et `libraryVersions` n'y figurent que pour un questionnaire validé ») est vrai pour l'édition (`questionnaire-edits.ts:51-54` supprime les propriétés) mais un bundle importé contenant `status: "draft"` le conserve (`files.ts:131-134`, aucun `importedQuestionnaire` sur le bundle) et le réexporte.
4. **Règles annoncées non portées par les schémas** (FORMAT.md les présente comme règles, le schéma ne les vérifie pas) : `validatedAt` « présente seulement si `status` vaut `validated` » (FORMAT.md l.165 ; `questionnaire.schema.json:46` sans dépendance) ; `defaultLanguage` « présente dans `languages` » (FORMAT.md l.129 ; `project.schema.json:93`, simple description) ; mots réservés interdits comme clé (FORMAT.md l.109-110 ; `key` = pattern seul, `common.schema.json:71`) ; `exit` « dans un fragment uniquement » (FORMAT.md l.238 le dit lui-même : « règle non vérifiée »). FORMAT.md l.825-826 précise que ces vérifications sont celles de l'éditeur, non bloquantes.
5. **`formatVersion`** : FORMAT.md l.38 « entier, actuellement 14 » ; le schéma accepte tout entier ≥ 1 (`common.schema.json:525-528`) : un document validé seul (hors `importFiles`) n'est pas contraint à la version 14.
6. **Nom du layout d'un questionnaire** : FORMAT.md l.35 « `<nom du questionnaire>.layout.json` » ; le code produit `<clé> - <version> - <final|provisoire>.layout.json` (`files.ts:15, 82`) ; EVO-011 l.159 et EVO-008 l.185 parlent encore de `<clé>.layout.json` (antérieurs à EVO-022). Formulation imprécise plutôt que contradiction.
7. **EVO-022 vs migration** : la section « Impacts » d'EVO-022 (l.108-109) prévoit une migration qui initialise les versions de référence et mentionne un champ `statut` ; la migration 13 → 14 ne change que le numéro (`migrate.ts:88`) et il n'y a pas de champ `statut`. L'analyse de la même fiche (l.147-153) justifie ces deux choix ; FORMAT.md l.950 est conforme au code.
8. **EVO-020** (l.12, l.22) cite la version 13 : antérieur à EVO-022, sans effet sur le code.
9. Schémas : aucune mention obsolète (`tristate`, `block`) ; les mentions de version (`common.schema.json:322, 330, 363`) sont exactes.

Aucun autre écart constaté sur EVO-003, 005, 006, 007, 009, 012, 015, 016, 017 (sans effet sur le format, EVO-017 l.80) et 018 : propriétés, enums et migrations conformes au schéma et à FORMAT.md.
