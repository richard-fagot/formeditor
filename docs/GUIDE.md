# Guide utilisateur — Éditeur de questionnaires
Mis à jour le 2026-10-12 — jusqu'à EVO-004

## Mode d'emploi du guide

- Une entrée par action, titrée par un verbe à l'infinitif, groupées par thème (sections 1 à 15) ; cherchez le verbe (« Créer », « Relier », « Supprimer »…).
- Les libellés entre « » sont ceux affichés par l'interface en français (langue d'interface par défaut).
- Raccourcis entre accents graves : `N`, `Ctrl+K`, `Alt+I`. Sur Mac, `Ctrl` s'affiche `⌘`. « Palette » = palette de commandes (`Ctrl+K`), où l'on tape le libellé de l'action.
- Les raccourcis marqués « logigramme » n'agissent que si le logigramme a le focus (cliquer dans une zone vide du graphe), jamais pendant une saisie.
- La balise en fin d'entrée (crochets, `cmd:`, identifiant) renvoie au catalogue de commandes : écran des raccourcis, index en fin de guide.

## Notions

- **Projet** : tout le travail (questionnaires, bibliothèque, état du système, scénarios, langues) ; un seul ouvert à la fois.
- **Questionnaire** : un graphe de nœuds reliés par des arêtes ; un onglet par questionnaire.
- **Nœud** : question, page d'information, page de synthèse, fin, instance de bloc (ou sortie, dans un bloc).
- **Départ** : nœud par lequel commence le parcours (badge « Départ »). Le premier nœud créé l'est d'office.
- **Arête** : liaison d'un nœud vers un autre, avec une condition facultative et un rang ; sans condition, c'est le « sinon ».
- **Rang** : ordre d'évaluation des arêtes qui sortent d'un même nœud ; la première condition vraie l'emporte.
- **Clé** : nom lisible d'une question en snake_case (`date_sinistre`), utilisé dans les expressions.
- **Bibliothèque** : questions, blocs et jeux de libellés réutilisables du projet, utilisés par référence (pas de copie).
- **Bloc** : sous-graphe de la bibliothèque avec un départ et des **sorties** nommées ; placé dans un questionnaire, c'est une **instance** avec un **alias** (`tiers.nom`).
- **Jeu de libellés** : libellés d'un booléen (« Oui / Non ») ou d'un tri-state (« Oui / Non / Ne sait pas »).
- **État du système** : variables fournies par le logiciel hôte (`sys.profil`), déclarées dans un dictionnaire.
- **Scénario** : jeu de valeurs nommé de l'état du système, pour la prévisualisation.
- **Référence** : nom qui désigne une réponse, un sous-champ ou une variable (`victimes.nom`, `sys.sinistres`).
- **Expression** : formule JSONata écrite en texte ; une **condition** est une expression qui doit valoir `true`.
- **Libellé à variantes** : texte qui change selon une condition (« Si … » / « Sinon »).
- **Langue du contenu** : langue des textes destinés à l'utilisateur final ; **langue de l'interface** : celle de l'outil.

## 1. Projet et fichiers

- **Créer un nouveau projet** — Barre de projet « Nouveau projet », ou palette « Nouveau projet ». Remplace tout le projet
  par un projet vierge (un questionnaire vide). Confirmation si des modifications ne sont pas exportées ; non annulable. `[cmd: project.new]`
- **Ouvrir ou importer des fichiers** — `Ctrl+O`, bouton « Ouvrir / importer… » ou palette. Choisir un ou plusieurs `.json`.
  Un bundle ou un `projet.json` remplace le projet (confirmation si non exporté, non annulable) ; des fichiers
  `<questionnaire>.json`, `bibliotheque.json` ou `.layout.json` seuls sont fusionnés dans le projet ouvert. `[cmd: project.open]`
- **Comprendre un import refusé** — Un seul fichier invalide et rien n'est chargé : la boîte « Import impossible »
  liste les erreurs par fichier. Les fichiers d'une ancienne version du format sont migrés automatiquement.
- **Importer un questionnaire dans le projet ouvert** — « Ouvrir / importer… » avec seulement son `<clé>.json` (et son
  `.layout.json`) : il est ajouté et s'ouvre dans un onglet, ou remplace celui de même identifiant (sans ouvrir d'onglet). `[cmd: project.open]`
- **Remplacer la bibliothèque** — Importer seul un `bibliotheque.json` : il remplace toute la bibliothèque du projet.
- **Ouvrir l'exemple « déclaration de sinistre »** — Icône étincelles de la barre de projet (info-bulle « Ouvrir l’exemple
  « déclaration de sinistre » ») ou palette. Remplace le projet ouvert (confirmation si non exporté). `[cmd: project.example]`
- **Exporter le projet** — `Ctrl+S` (actif même pendant une saisie), bouton « Exporter (bundle) » ou palette. Télécharge
  `<nom_du_projet>.bundle.json`, qui contient tout (questionnaires, bibliothèque, mises en page). `[cmd: project.export]`
- **Exporter les fichiers unitaires** — Icône fichier JSON de la barre de projet (info-bulle « Exporter les fichiers unitaires »)
  ou palette. Télécharge `projet.json`, `bibliotheque.json`, `<clé>.json` et `<clé>.layout.json` par questionnaire,
  `bloc_<clé>.layout.json` par bloc ; le navigateur peut demander d'autoriser les téléchargements multiples. `[cmd: project.exportFiles]`
- **Savoir si le projet est exporté** — Pastille à côté du nom du projet : « Modifications non exportées » (orange) ou
  « Tout est exporté » (vert). Elle repasse au vert après un export.
- **Renommer le projet** — Cliquer sur le nom en haut à gauche et le modifier. Il donne son nom au bundle exporté. `[cmd: project.rename]`
- **Retrouver son travail après fermeture** — Rien à faire : sauvegarde automatique continue dans le navigateur. À la
  réouverture : projet, onglets, langue de l'interface et raccourcis personnalisés reviennent ; l'historique d'annulation non.
  La sauvegarde est propre au navigateur : seul l'export est partageable.

## 2. Onglets et navigation

- **Créer un questionnaire** — Bouton « + » à droite des onglets (info-bulle « Nouveau questionnaire ») ou palette
  « Nouveau questionnaire ». Il s'ouvre dans un nouvel onglet, intitulé « Questionnaire sans titre ». `[cmd: questionnaire.new]`
- **Changer d'onglet** — Cliquer sur l'onglet, ou `Alt+→` / `Alt+←` (aussi `Ctrl+Tab` / `Ctrl+Shift+Tab`,
  souvent réservés par le navigateur). `[cmd: tab.show]`
  `[cmd: tab.next]` `[cmd: tab.prev]`
- **Fermer un onglet** — Survoler l'onglet et cliquer sa croix (« Fermer l’onglet »), ou palette « Fermer l’onglet » (onglet
  actif). Fermer un questionnaire ne le supprime pas. `[cmd: tab.close]`
- **Rouvrir un questionnaire fermé** — Cliquer son titre en gris après le bouton « + » des onglets, ou palette « Rouvrir un
  questionnaire fermé » (rouvre le premier fermé). `[cmd: tab.open]`
- **Ouvrir la bibliothèque** — Onglet « Bibliothèque », bouton « Bibliothèque » à droite de la barre d'onglets s'il est fermé,
  ou palette « Bibliothèque ». `[cmd: tab.library]`
- **Ouvrir l'état du système** — Onglet « État du système », bouton du même nom à droite de la barre d'onglets s'il est
  fermé, ou palette. `[cmd: tab.system]`
- **Ouvrir les paramètres** — Icône engrenage de la barre de projet (« Paramètres ») ou palette « Paramètres ». `[cmd: tab.settings]`
- **Ouvrir la palette de commandes** — `Ctrl+K` (même pendant une saisie) ou bouton « Palette de commandes ». Taper une partie
  du libellé, `↑` `↓` puis `Entrée`. Elle ne liste que les actions possibles dans le contexte. `[cmd: palette.open]`
- **Trouver un nœud par sa clé ou son intitulé** — Palette (`Ctrl+K`), taper la clé ou un mot de l'intitulé : le groupe
  « Nœuds » liste les nœuds du graphe affiché ; `Entrée` le sélectionne (la vue se recentre s'il est hors écran).
- **Passer du logigramme à la prévisualisation** — `P` (logigramme) ou sous-onglets « Logigramme » / « Prévisualisation »
  sous la barre d'onglets. Chaque questionnaire garde sa vue. `[cmd: view.toggle]`
- **Comparer deux questionnaires côte à côte** — Bouton « Vue côte à côte » de la barre du logigramme (au moins deux
  questionnaires) ou palette. Le second s'affiche à droite en lecture seule ; « Comparer avec » change le questionnaire
  affiché, la croix (« Fermer la vue côte à côte ») ferme la vue. Masque le panneau latéral de la bibliothèque. `[cmd: view.compare]`

## 3. Logigramme — nœuds

- **Créer la première question** — Sur un questionnaire vide, bouton « Ajouter une question » au centre, ou `N`. Elle
  devient le départ. `[cmd: node.newQuestion]`
- **Créer une question à la suite** — Sélectionner un nœud puis `N` (logigramme), ou palette « Nouvelle question à la suite ».
  La question, intitulée « Nouvelle question », est reliée au nœud sélectionné et son intitulé passe en édition : taper,
  puis `Entrée`. Si le nœud n'avait qu'une sortie sans condition, la question s'insère entre lui et son successeur. `[cmd: node.newQuestion]`
- **Créer une question isolée** — `N` sans aucun nœud sélectionné (cliquer d'abord dans le vide) : question non reliée,
  placée sous les autres. `[cmd: node.newQuestion]`
- **Créer une page d'information à la suite** — `Alt+I` ou palette « Nouvelle page d’information ». Même placement que `N` ;
  texte par défaut « Texte d’information », à modifier dans le panneau de propriétés. `[cmd: node.newInfo]`
- **Créer une page de synthèse à la suite** — `Alt+S` ou palette « Nouvelle page de synthèse » (titre « Récapitulatif »). `[cmd: node.newSummary]`
- **Créer une fin à la suite** — `Alt+F` ou palette « Nouvelle fin » (message « Merci, votre réponse est enregistrée. »).
  Plusieurs fins sont possibles. `[cmd: node.newEnd]`
- **Modifier l'intitulé d'une question sur le logigramme** — Double-clic sur la question, ou la sélectionner puis `Entrée`
  (palette « Éditer l’intitulé »). `Entrée` valide, `Shift+Entrée` va à la ligne, `Échap` annule. Si la clé suivait
  l'intitulé, elle est redérivée et renommée partout. Sans effet sur les autres types de nœuds. `[cmd: node.editLabel]`
- **Modifier une page d'information, de synthèse ou de fin** — La sélectionner ; panneau de droite : « Information »
  (« Titre », « Texte »), « Synthèse » (« Titre »), « Fin » (« Titre », « Message », « Issue (code libre : submitted,
  ineligible…) »). Textes interpolables, variantes possibles.
- **Sélectionner un nœud** — Clic sur le nœud, palette (groupe « Nœuds »), ou flèches (ci-dessous).
- **Sélectionner plusieurs nœuds** — `Shift`+clic sur chaque nœud, ou `Shift` + glisser un rectangle dans le vide.
- **Tout désélectionner** — Clic dans une zone vide du logigramme : le panneau de droite montre alors les propriétés du questionnaire.
- **Aller au nœud suivant / précédent** — `↓` : premier successeur ; `↑` : premier prédécesseur (logigramme). Sans
  sélection, `↓` sélectionne le départ. `[cmd: nav.down]` `[cmd: nav.up]`
- **Passer d'une branche à sa voisine** — `→` / `←` : nœud voisin issu du même parent (logigramme). `[cmd: nav.right]` `[cmd: nav.left]`
- **Déplacer un nœud** — Le glisser à la souris. La position est enregistrée (annulable par `Ctrl+Z`).
- **Ranger automatiquement le logigramme** — `L` (logigramme), bouton « Mise en page automatique » de la barre du logigramme,
  ou palette. Recalcule toutes les positions de haut en bas ; annulable. `[cmd: view.layout]`
- **Exporter le logigramme en image** — `X` (logigramme), bouton « Image » de la barre du logigramme, ou palette
  « Exporter le logigramme en image ». Une fenêtre d'options s'ouvre avec les derniers choix : périmètre « Logigramme entier »
  ou « Sélection seulement » (proposé si des nœuds sont sélectionnés : ces nœuds et les arêtes entre eux), case « Titre du
  questionnaire en en-tête » (cochée par défaut) ; `Entrée` ou « Exporter » lance l'export (« Export en cours… » pendant
  la capture). L'image PNG contient tout le logigramme quels que soient le zoom et la portion visible, tel qu'affiché
  (aperçus, conditions, badges), sans contrôles, fond quadrillé, poignées ni surbrillance de sélection ; fond blanc,
  marge, résolution 2×. Fichier téléchargé : `<projet> - <questionnaire> - AAAAMMJJ.png` (titre dans la langue des
  contenus affichée ; `\ / : * ? " < > |` remplacés par `_`). Les choix sont retenus dans le navigateur. Disponible dans la
  vue Logigramme d'un questionnaire non vide (pas pour un bloc de la bibliothèque ni la vue côte à côte).
  `[cmd: view.exportImage]` `[cmd: view.exportImageRun]`
- **Ajuster la vue au graphe** — `F` (logigramme), palette « Ajuster la vue », ou bouton cadre des contrôles en bas à gauche. `[cmd: view.fit]`
- **Zoomer, se déplacer dans le logigramme** — Molette pour zoomer, glisser le fond pour se déplacer ; boutons « + » / « − » en bas à gauche.
- **Définir le départ** — Sélectionner le nœud, bouton « Définir comme départ » (section « Départ ») du panneau de propriétés,
  ou palette « Définir comme départ ». `[cmd: node.setStart]`
- **Dupliquer des nœuds** — Sélectionner un ou plusieurs nœuds puis `Ctrl+D` (logigramme) ou palette « Dupliquer ». Les copies
  sont décalées et sélectionnées ; les arêtes entre nœuds copiés sont copiées, pas les autres ; clés et alias rendus uniques. `[cmd: node.duplicate]`
- **Supprimer des nœuds** — Sélectionner puis `Suppr` (Delete) ou `Retour arrière` (Backspace) (logigramme), ou palette « Supprimer la sélection ».
  Leurs arêtes disparaissent aussi ; si le départ est supprimé, le premier nœud restant le devient. Annulable. `[cmd: node.delete]`
- **Annuler** — `Ctrl+Z` ou palette « Annuler ». Un historique par questionnaire, un pour la bibliothèque, un pour le projet
  (état du système, scénarios, langues, nom) : `Ctrl+Z` agit sur celui de l'onglet affiché. Pendant une saisie, `Ctrl+Z`
  annule seulement la frappe dans le champ. `[cmd: edit.undo]`
- **Rétablir** — `Ctrl+Shift+Z` ou `Ctrl+Y`, ou palette « Rétablir ». `[cmd: edit.redo]`
- **Lire les badges d'un nœud** — « Départ » ; « * » obligatoire (« * ? » : obligatoire sous condition) ; « + autre » ;
  « bib. » élément de bibliothèque ; « trad. » traduction manquante ; « ⚠ n » problèmes (rouge si erreur).

## 4. Logigramme — arêtes et conditions

- **Relier deux nœuds à la souris** — Tirer depuis la poignée du bas du nœud de départ jusqu'au nœud cible. L'arête
  créée n'a pas de condition (« sinon »). Une liaison identique déjà présente n'est pas dupliquée. `[cmd: edge.create]`
- **Relier le nœud sélectionné au clavier** — `E` (logigramme) ou palette « Relier à un nœud… » : la palette « Relier au nœud… »
  liste les nœuds ; `Entrée` crée l'arête et sélectionne la cible. `[cmd: node.connect]` `[cmd: node.connectTo]`
- **Créer une branche conditionnée** — Sélectionner le nœud d'origine puis `Shift+N` (logigramme) ou palette « Nouvelle
  branche conditionnée ». Une nouvelle question est reliée par une arête placée avant le « sinon », et le curseur est dans
  le champ « Condition » de l'arête : taper la condition (ex. `type_sinistre = 'vol'`), puis `Entrée`. `[cmd: node.newBranch]`
- **Sélectionner une arête** — Clic sur l'arête ou sur son étiquette. Le panneau de droite affiche « Arête » : « De », « Vers »,
  « Condition », rang.
- **Modifier la condition d'une arête** — Sélectionner l'arête puis `C` (logigramme), ou taper dans le champ « Condition ».
  Avec un nœud sélectionné, `C` ouvre la condition de la première arête qui **arrive** sur ce nœud. `Entrée` rend le focus
  au logigramme. Vider le champ fait de l'arête un « sinon ». `[cmd: edge.editCondition]`
- **Lire l'étiquette d'une arête** — Condition abrégée (32 caractères) ; « sinon » en italique pour une arête sans condition ;
  « ? » pour une condition encore vide ; « 2. » : rang quand plusieurs arêtes sortent du nœud ; nom de sortie pour un bloc.
- **Changer l'ordre d'évaluation des arêtes** — Sélectionner l'arête puis `Alt+↑` / `Alt+↓` (logigramme), boutons « Évaluer
  plus tôt » / « Évaluer plus tard » du panneau, ou palette. Le rang est rappelé sous « Condition » (« Rang 1 sur 3 »). `[cmd: edge.moveUp]` `[cmd: edge.moveDown]`
- **Supprimer une arête** — Sélectionner l'arête puis `Suppr`, ou bouton « Supprimer » du panneau de l'arête. `[cmd: node.delete]`
- **Changer la cible d'une arête** — Impossible directement : supprimer l'arête et en tracer une nouvelle.
- **Faire une boucle ou une convergence** — Relier un nœud vers un nœud déjà atteint (même au-dessus). La réponse donnée
  au nouveau passage remplace la précédente.
- **Raccorder une sortie de bloc** — Sur une instance de bloc, tirer depuis la poignée orange de la sortie voulue (son nom
  est écrit au-dessus). Ou, sur l'arête, choisir la sortie dans « Sortie du bloc » (« Toute sortie » : valable pour toutes). `[cmd: edge.create]`

## 5. Questions — propriétés communes

Sélectionner la question : le panneau de droite affiche la section « Question », puis la section du type, « Contraintes
libres » et « Description (pour l’équipe de dev) ». Chaque saisie est enregistrée aussitôt et annulable.

- **Modifier l'intitulé** — Champ « Intitulé » (une ligne par langue, langue du contenu en premier), ou édition en place
  sur le logigramme (§3). `{clé}` insère une valeur : `Date de naissance de {victime.prenom} ?`
- **Rendre un libellé conditionnel** — Sous le champ, bouton « Variante conditionnelle » : saisir la condition après « Si »
  et le texte ; le texte « Sinon » s'applique quand aucune variante n'est vraie. La croix retire une variante. Valable
  pour l'intitulé, l'aide, le texte d'une page, une option, le message de fin.
- **Renommer la clé** — Champ « Clé », valider par `Entrée` ou en quittant le champ (`Échap` annule). Snake_case, unique
  dans le questionnaire. Le renommage met à jour toutes les expressions qui l'utilisent.
- **Changer le type d'une question** — Liste « Type » du panneau, ou raccourci du type (§6). Intitulé, clé, aide,
  obligation et contraintes sont conservés ; la valeur par défaut et les réglages de l'ancien type sont perdus (sauf
  options entre choix unique et multiple, et « Autre » entre types qui l'acceptent).
- **Rendre une question obligatoire** — Case « Obligatoire », ou `O` (logigramme ; palette « Basculer obligatoire »). `O`
  bascule : sur une question déjà obligatoire (même sous condition), il retire l'obligation. `[cmd: node.toggleRequired]`
- **Rendre une question obligatoire sous condition** — Case « Obligatoire » décochée, champ « Obligatoire si… (expression,
  facultatif) » : ex. `type_sinistre = 'accident'`.
- **Ajouter un texte d'aide** — Champ « Aide » (affiché sous l'intitulé dans le wizard ; variantes possibles).
- **Ajouter un texte indicatif dans le champ** — « Texte indicatif » (types texte et nombre seulement).
- **Donner une valeur par défaut** — « Valeur par défaut » : texte brut pour texte, date (`2026-01-31`) et choix unique
  (valeur de l'option) ; JSON pour les autres (`12`, `true`, `["a","b"]`). Posée à l'arrivée sur la question.
- **Calculer la valeur par défaut** — « Valeur par défaut calculée » : expression, prioritaire sur la valeur littérale
  (ex. `sys.date_effet_contrat`).
- **Décrire la question pour l'équipe de dev** — Section « Description (pour l’équipe de dev) » : texte libre, exporté, jamais affiché.
- **Modifier les propriétés du questionnaire** — Rien sélectionné (clic dans le vide) ou palette « Propriétés du questionnaire » :
  « Titre du questionnaire » (nom de l'onglet), « Clé du questionnaire » (donne le nom du fichier, ex. `sinistre.json`),
  « Description (pour l’équipe de dev) ». `[cmd: questionnaire.properties]` `[cmd: questionnaire.setTitle]`
  `[cmd: questionnaire.rename]` `[cmd: questionnaire.setDescription]`

## 6. Types de questions

Changer de type : sélectionner une question locale (pas une référence de bibliothèque) puis la touche du type
(logigramme), la liste « Type », ou palette « Type : … ».

### Texte
- **Passer une question en texte** — `T` ou palette « Type : Texte ». `[cmd: node.type.text]`
- **Régler un texte** — « Texte long (plusieurs lignes) », « Longueur min. », « Longueur max. », « Motif (expression
  régulière) » (ex. `^[0-9]{5}$` pour un code postal).

### Date
- **Passer une question en date** — `D` ou palette « Type : Date ». `[cmd: node.type.date]`
- **Borner une date** — « Au plus tôt » / « Au plus tard » : date `AAAA-MM-JJ` ou expression (`$today()`, `date_sinistre`,
  `sys.date_effet_contrat`, `$addDays($today(), -30)`).

### Nombre
- **Passer une question en nombre** — `R` ou palette « Type : Nombre ». `[cmd: node.type.number]`
- **Régler un nombre** — « Nature » (réel, entier naturel, entier relatif), « Décimales (max.) » (réel seulement),
  « Minimum » / « Maximum » (nombre ou expression : `sys.plafond`), « Unité affichée » (multilingue, ex. €).

### Choix unique et choix multiple
- **Passer une question en choix unique** — `U` ou palette « Type : Choix unique ». `[cmd: node.type.single]`
- **Passer une question en choix multiple** — `M` ou palette « Type : Choix multiple ». Les options sont conservées. `[cmd: node.type.multiple]`
- **Limiter le nombre de cases cochées** — Choix multiple : « Sélections min. », « Sélections max. ».
- Options : voir §7.

### Booléen
- **Passer une question en booléen** — `B` ou palette « Type : Booléen ». `[cmd: node.type.boolean]`
- **Changer les libellés Oui / Non** — Liste « Jeu de libellés » : « Oui / Non (par défaut) » ou un jeu booléen de la
  bibliothèque (§10). Les libellés ne se saisissent pas dans la question.

### Tri-state
- **Passer une question en tri-state** — `3` ou palette « Type : Tri-state ». `[cmd: node.type.tristate]`
- **Changer les trois libellés** — Liste « Jeu de libellés » : « Oui / Non / Ne sait pas (par défaut) » ou un jeu tri-state de la bibliothèque.

### Structure
- **Passer une question en structure** — `S` ou palette « Type : Structure ». `[cmd: node.type.structure]`
- **Ajouter un champ à une structure** — Bouton « Ajouter un champ » (section « Champs ») : champ texte « Champ n ». Déplier la
  ligne du champ pour régler « Intitulé », « Clé », « Type » (tous sauf structure), « Obligatoire », « Condition d'affichage
  (clés sœurs sans préfixe) », « Aide », les réglages du type et ses contraintes.
- **Réordonner ou supprimer un champ** — Flèches haut / bas et croix sur la ligne du champ (« Monter », « Descendre », « Supprimer le champ »).
- **Renommer la clé d'un champ** — Champ « Clé » du champ déplié ; validé en quittant le champ ; propagé aux expressions (`victime.nom`).
- **Rendre une structure répétable** — Case « Répétable (plusieurs occurrences) », puis « Occurrences min. », « Occurrences max. »,
  « Libellé du bouton « Ajouter » ». Le wizard affiche « Ajouter » et « Supprimer » par occurrence.

## 7. Options

Concerne le choix unique et le choix multiple. Le booléen et le tri-state n'ont pas d'options (§6).

- **Saisir les options** — Champ « Options (une par ligne) » : une ligne = une option ; collage de plusieurs lignes accepté ;
  lignes vides ignorées. Une puce `* ` ou `- ` en tête est facultative et retirée. La valeur technique est dérivée du
  libellé (« Très bien » → `tres_bien`) ; elle est unique dans son groupe.
- **Regrouper les options** — Dans « Options (une par ligne) », une ligne `# Libellé` ouvre un groupe ; les lignes suivantes
  sont ses options, jusqu'au `#` suivant. Les options écrites avant le premier `#` n'ont pas de groupe. Une même option peut
  figurer dans deux groupes. Exemple :
  ```
  # Victime directe
  * Conjoint
  * Enfant

  # Ayant droit
  * Conjoint
  * Ascendant
  ```
  Le champ réaffiche chaque groupe en `# Libellé` et ses options avec `* `. Dans le wizard, chaque groupe est une section
  titrée ; un groupe dont aucune option n'est visible n'est pas affiché. « Autre (préciser) » reste en dernier, hors groupe.
- **Régler un groupe** — Sous le champ des options, chaque groupe a sa ligne (« # Libellé (groupe) »), juste avant celles de
  ses options. La déplier : libellé multilingue (variantes, `{…}` possibles, comme une option), « Code du groupe » (ex. `SC` ;
  vide : le groupe est identifié par son libellé dans la langue par défaut ; `AUTRE` est réservé), « Condition d'affichage du groupe ».
- **Déplacer ou supprimer un groupe** — Flèches de la ligne du groupe (« Monter le groupe (avec ses options) », « Descendre le
  groupe (avec ses options) ») : le groupe se déplace avec ses options. Croix « Supprimer le groupe et ses options » (`Ctrl+Z`
  pour annuler). Pour changer une option de groupe, déplacer sa ligne dans « Options (une par ligne) » : ses réglages sont gardés.
- **Ajouter une option dynamique** — Dans « Options (une par ligne) », écrire une ligne `$` suivie de la référence :
  `$sys.sinistres` (liste de l'état du système) ou `$couleur_preferee` (réponse précédente). Ses options s'insèrent à cette
  position. Pour une liste d'objets, déplier l'entrée (marquée « (dynamique) ») et remplir « Libellé affiché (expression
  sur chaque élément) » (ex. `date & ' — ' & nature`) et « Valeur retenue (expression sur chaque élément) ».
- **Écrire une option qui commence par $, #, * ou -** — La saisir `\$…`, `\#…`, `\*…` ou `\-…` dans « Options (une par ligne) ».
- **Régler une option** — Déplier sa ligne sous le champ des options : « Valeur », libellé multilingue (variantes possibles),
  « Condition d'affichage ». Une entrée dynamique a « Liste (réponse précédente ou variable système) » à la place de la valeur.
- **Changer l'ordre des options** — Flèches haut / bas sur la ligne de l'entrée (« Monter » / « Descendre »), ou réordonner
  les lignes dans « Options (une par ligne) ». Pas de glisser-déposer. Les flèches gardent une option dans son groupe
  (et une option sans groupe avant le premier groupe).
- **Dupliquer une option** — Icône copier sur la ligne de l'entrée (« Dupliquer l'entrée ») : copie juste en dessous, valeur rendue unique.
- **Supprimer une option** — Croix sur la ligne de l'entrée (« Supprimer l'entrée »), ou effacer sa ligne dans le champ.
- **Afficher une option sous condition** — Déplier l'entrée, « Condition d'affichage » (ex. `sys.profil = 'pro'`). Une entrée
  dynamique dont la condition est fausse n'affiche rien. Une valeur déjà proposée plus haut n'est pas répétée.
- **Ajouter « Autre (préciser) »** — `A` (logigramme ; palette « Activer « Autre (préciser) » », bascule) ou case « Option
  « Autre (préciser) » ». Affichée en dernier ; ouvre un champ texte dans le wizard. Aussi pour booléen et tri-state. `[cmd: node.toggleOther]`
- **Régler « Autre (préciser) »** — « Libellé de l'option » (défaut « Autre (préciser) ») et « Précision obligatoire ».
  La précision se lit dans les expressions par `<clé>_other`.

## 8. Expressions et références

- **Écrire une expression** — Les champs d'expression (condition, « Obligatoire si… », bornes, règles, « Condition
  d'affichage »…) tiennent sur une ligne. L'autocomplétion propose clés et variables en tapant (`Ctrl+Espace` pour
  l'ouvrir) ; `$` propose les fonctions. Erreur de syntaxe soulignée en rouge, référence inconnue signalée
  (« Référence inconnue : … »). `Échap` quitte le champ.
- **Désigner une valeur** — `cle` : réponse du questionnaire ; `structure.champ` : sous-champ ; `victimes[0].nom` : occurrence
  (à partir de 0) ; `sys.variable`, `sys.liste.champ` : état du système ; `alias.cle` : question d'une instance de bloc ;
  `cle_other` : précision « Autre » ; `$$.cle` : réponse lue depuis la racine (dans un filtre).
- **Lire le groupe de l'option choisie** — `ma_question.groupe` (choix unique ou multiple, aussi `alias.cle.groupe`,
  `structure.champ.groupe`) : code du groupe, sinon son libellé dans la langue par défaut ; `AUTRE` si « Autre (préciser) »
  est choisie ; vide pour une option sans groupe. Choix multiple : liste des groupes, dans l'ordre des valeurs cochées.
  `ma_question` donne toujours la valeur seule. Ex. : `qualite_declarant.groupe = 'SC'`, `'AA' in liens.groupe`.
  `groupe` est un mot réservé : aucune clé ne peut s'appeler `groupe`.
- **Combiner** — `=`, `!=`, `<`, `<=`, `>`, `>=` (nombres et dates `AAAA-MM-JJ`) ; `and`, `or`, `$not(…)` ; `'x' in liste` ;
  `$exists(cle)` (est renseigné) ; `$count(…)`, `$sum(…)` ; filtre `liste[champ = 'x']` ; `&` concatène ;
  `a ? b : c` ; `+ - * / %`. Chaînes entre `'…'`.
- **Utiliser les fonctions de date** — `$today()`, `$addDays(date, n)`, `$daysBetween(d1, d2)`, `$age(date)` (âge révolu).
- **Savoir quand une condition est vraie** — Seulement si elle vaut `true`. Une réponse non posée ou vide est absente :
  `absent = 'x'` et `absent != 'x'` sont faux ; tester avec `$exists(cle)`.
- **Insérer une valeur dans un texte** — `{expression}` dans un libellé : `Bonjour {sys.nom_assure}`. C'est la valeur qui
  s'affiche, pas le libellé de l'option. `{{` et `}}` donnent des accolades.
- **Exemples prêts à copier** :
  1. `type_sinistre = 'vol'`
  2. `montant > 1000 and $exists(date_sinistre)`
  3. `'telephone' in canaux_contact`
  4. `$count(victimes) >= 2`
  5. `$count(victimes[hospitalise = true]) > 0`
  6. `sys.type_adherent in ['ud', 'amicale']`
  7. `$daysBetween(date_sinistre, $today()) > 30`
  8. `$age(sys.date_naissance) >= 18`
  9. `sys.sinistres[date <= $$.date_sinistre]` (dans un filtre, un nom nu est un champ de l'élément)
  10. `Montant pour {$count(victimes)} victime(s)` (interpolation dans un libellé)
  11. `qualite_declarant.groupe = 'SC'` (groupe de l'option choisie)

## 9. Contraintes et messages d'erreur

- **Ajouter une règle libre** — Section « Contraintes libres », bouton « Ajouter une règle » : expression « Règle (vraie si
  valide) » (ex. `date_sinistre <= $today()`) et « Message d’erreur » multilingue. Croix (« Supprimer ») pour la retirer.
- **Personnaliser un message d'erreur intégré** — Même section : un champ « Message d’erreur — <règle> » par règle
  applicable (`required`, `minLength`, `maxLength`, `pattern`, `min`, `max`, `numberKind`, `decimals`, `minSelected`,
  `maxSelected`, `format`, `option`, `otherDetail`, `minOccurrences`, `maxOccurrences`). Vide : message par défaut.
- **Borner une réponse** — Par les réglages du type (§6) : longueurs, motif, dates, minimum / maximum, sélections, occurrences.
- **Voir une contrainte en action** — Prévisualisation : les messages s'affichent en rouge sous la question après « Suivant ».

## 10. Bibliothèque et blocs

- **Afficher / masquer le panneau latéral de la bibliothèque** — Affiché par défaut à gauche du logigramme. Bouton
  « Bibliothèque » de la barre du logigramme (info-bulle « Afficher / masquer le panneau Bibliothèque ») ou palette.
  Champ « Filtrer la bibliothèque… ». `[cmd: view.libraryPanel]`
- **Insérer un bloc ou une question de la bibliothèque** — Sélectionner le nœud après lequel insérer, puis `I` (logigramme)
  ou palette « Insérer depuis la bibliothèque » ; choisir l'élément (« Insérer une question ou un bloc… »). Il est relié
  comme avec `N`. Aussi : palette `Ctrl+K`, entrées « Insérer : <nom> ». `[cmd: library.insert]` `[cmd: library.insertItem]`
- **Insérer depuis le panneau latéral** — Glisser l'élément sur le logigramme : il est posé à cet endroit, sans liaison ;
  ou double-clic (ou `Entrée`) : inséré à la suite du nœud sélectionné. `[cmd: library.insertItem]`
- **Créer une question de bibliothèque** — Onglet « Bibliothèque », « + » de la rubrique « Questions » (« Nouvelle question
  de bibliothèque »), ou palette. Elle se règle comme une question locale ; toute modification vaut pour tous ses usages. `[cmd: library.newQuestion]`
- **Placer une question existante dans la bibliothèque** — Sélectionner la question locale, palette « Placer la question dans
  la bibliothèque ». Le nœud devient une référence (même clé). Absent si la clé existe déjà dans la bibliothèque. `[cmd: node.toLibrary]`
- **Reformuler une question de bibliothèque dans un questionnaire** — Sélectionner la référence (badge « bib. ») : seul
  « Intitulé » est modifiable (« Intitulé surchargé localement. ») ; « Reprendre l’intitulé de la bibliothèque » annule la surcharge.
- **Ouvrir l'élément d'une référence ou d'une instance** — Bouton « Ouvrir dans la bibliothèque » du panneau, ou palette. `[cmd: node.openInLibrary]`
- **Afficher un élément de la bibliothèque** — Onglet « Bibliothèque », cliquer l'élément dans la liste de gauche (« Jeux de
  libellés », « Questions », « Blocs »). « Utilisé dans : … » liste les questionnaires et blocs qui l'emploient. `[cmd: library.show]`
- **Supprimer un élément de la bibliothèque** — L'afficher, bouton « Supprimer ». Sans confirmation : ses références
  deviennent « Élément de bibliothèque introuvable ». `Ctrl+Z` dans l'onglet Bibliothèque l'annule. `[cmd: library.delete]`
- **Créer un bloc** — « + » de la rubrique « Blocs » (« Nouveau bloc ») ou palette « Nouveau bloc ». Son logigramme s'édite
  dans l'onglet Bibliothèque avec les mêmes touches (`N`, `Shift+N`, `I`…), sans panneau latéral ; un bloc ne contient pas
  de bloc. `[cmd: library.newBlock]`
- **Régler un bloc** — En-tête : « Titre du bloc », « Clé du bloc », « Description (pour l’équipe de dev) ».
- **Ajouter une sortie à un bloc** — Dans le logigramme du bloc, palette « Nouvelle sortie de bloc » : nœud « Sortie » relié au
  nœud sélectionné, nommé `sortie`, `sortie_2`… Régler « Nom de la sortie » (snake_case ; renommer suit dans les instances)
  et « Libellé (facultatif) ». `[cmd: node.newExit]`
- **Grouper des nœuds en bloc** — Sélectionner les nœuds d'un questionnaire puis `Ctrl+G` (logigramme) ou palette « Grouper la
  sélection en bloc ». Crée un bloc « Nouveau bloc » et remplace la sélection par une instance (une sortie par destination extérieure).
  Refusé si la sélection a plusieurs entrées (« Regroupement en bloc impossible »). Annulable. `[cmd: node.group]`
- **Renommer l'alias d'une instance** — Sélectionner l'instance, champ « Alias » (préfixe `alias.cle`) ; propagé aux expressions.
- **Voir le contenu d'une instance** — Bouton « ▸ Déplier » sur le nœud du bloc (lecture seule) ; « Replier » pour refermer.
- **Placer deux fois le même bloc** — L'insérer deux fois : chaque instance reçoit un alias distinct et ses propres réponses.
- **Créer un jeu de libellés** — Onglet « Bibliothèque », entrée « Jeux de libellés », boutons « + Booléen » / « + Tri-state »,
  ou palette « Nouveau jeu de libellés booléen » / « … tri-state ». Puis « Clé », « Vrai (oui) », « Faux (non) »,
  « Troisième valeur (ne sait pas) ». `[cmd: labelSet.addBoolean]` `[cmd: labelSet.addTristate]`
- **Supprimer un jeu de libellés** — Bouton « Supprimer » de sa carte. Les questions qui l'utilisaient affichent les libellés
  par défaut et sont signalées « Élément de bibliothèque introuvable » : leur choisir un autre jeu. `[cmd: labelSet.delete]`

## 11. État du système et scénarios

- **Déclarer une variable de l'état du système** — Onglet « État du système », bouton « Nouvelle variable de l’état du
  système » (ou palette) : variable `variable` de type texte, nom en édition. `[cmd: system.addVariable]`
- **Renommer une variable** — Champ « Nom » (snake_case, unique), validé en quittant le champ ou par `Entrée`. Met à jour
  expressions et scénarios ; un seul `Ctrl+Z` annule tout. `[cmd: system.renameVariable]`
- **Typer une variable** — Liste « Type » : Texte, Nombre, Date, Booléen, Énumération (« Valeurs possibles (une par ligne) »),
  Liste d’objets (« Schéma des objets de la liste », bouton « Ajouter un champ »). Puis « Description », « Valeur d’exemple »
  (JSON pour une liste d'objets).
- **Renommer un champ d'une liste d'objets** — Son nom dans « Schéma des objets de la liste » ; propagé aux expressions,
  entrées dynamiques, exemple et scénarios. `[cmd: system.renameField]`
- **Voir si une variable est utilisée** — Badge « n usage(s) » ou « Non utilisée » sur sa carte.
- **Supprimer une variable** — Bouton « Supprimer » de sa carte ; elle disparaît aussi des scénarios. Annulable. `[cmd: system.deleteVariable]`
- **Créer un scénario** — Bouton « Nouveau scénario » (rubrique « Scénarios ») ou palette : pré-rempli avec les valeurs
  d'exemple. Le nommer (« Nom du scénario »), le décrire, saisir une valeur par variable. `[cmd: scenario.add]`
- **Dupliquer un scénario** — Bouton « Dupliquer » de sa carte. `[cmd: scenario.add]`
- **Supprimer un scénario** — Bouton « Supprimer » de sa carte. `[cmd: scenario.delete]`
- **Simuler un scénario d'état du système** — Passer en « Prévisualisation » (`P`) : le panneau « État du système » est à
  droite du wizard (bouton « État du système » de la barre pour l'afficher ou le masquer). Choisir le scénario dans sa
  liste (dernière option « Valeurs d’exemple ») : réévaluation immédiate. Par défaut, le premier scénario. `[cmd: preview.toggleSystem]`
- **Modifier l'état du système pendant un parcours** — Dans ce panneau, changer une valeur `sys.…` : réévaluation immédiate,
  badge « modifié » ; « Rétablir les valeurs du scénario » revient au scénario. Le scénario enregistré n'est pas modifié.
- **Enregistrer l'état simulé comme scénario** — Panneau « État du système » de la prévisualisation : « Nom du scénario »
  puis « Enregistrer comme scénario » (ou palette « Enregistrer l’état du système comme nouveau scénario »). Sans nom :
  nom du scénario de départ suivi de « * ». Le nouveau scénario devient le scénario choisi. `[cmd: preview.saveScenario]`

## 12. Prévisualisation

- **Tester le questionnaire** — Sous-onglet « Prévisualisation » ou `P`. Une page par question ; « Suivant » valide la
  page puis avance, « Précédent » revient sans valider. Barre de progression indicative en haut. `[cmd: view.toggle]`
- **Recommencer le parcours** — Bouton « Recommencer » de la barre de prévisualisation (réponses effacées).
- **Modifier une réponse depuis la synthèse** — Sur une page de synthèse, cliquer la réponse (crayon) : retour à la question ;
  après correction, « Revenir à la synthèse ». Les réponses sorties du chemin sont effacées.
  Une option d'un groupe s'y affiche « Groupe — Option » (ex. « Victime directe — Conjoint »).
- **Comprendre un retour forcé avant la fin** — Une réponse devenue invalide (option disparue après un changement d'état du
  système…) empêche d'atteindre la fin : le wizard ramène à la question avec son message jusqu'à correction.
- **Retrouver le nœud d'une page** — Cliquer la page : le nœud est sélectionné dans le logigramme (visible en revenant au logigramme).
- **Afficher le débogage** — Bouton « Débogage » ou palette : « Chemin parcouru », « Conditions évaluées (page courante) »
  (arête suivie surlignée, `true` / `false` / « sinon » / « erreur »), « Valeurs courantes » (réponses et `sys` ; le groupe
  de l'option choisie apparaît sous `<clé>_group`). `[cmd: preview.toggleDebug]`
- **Changer la langue de la prévisualisation** — Liste « Langue » de la barre, ou palette « Langue de la prévisualisation
  suivante » (plusieurs langues). Un bandeau compte les textes non traduits, affichés dans la langue par défaut. `[cmd: preview.lang]`
- **Comprendre « parcours bloqué »** — « Aucune arête ne s’applique : parcours bloqué. » : aucune condition vraie et pas de
  « sinon » ; ajouter une arête sans condition.

## 13. Langues

- **Ajouter une langue de contenu** — « Paramètres », section « Langues des contenus » : saisir le code dans « Code (ex. en,
  de, pt-BR) » puis « Ajouter une langue ». `[cmd: lang.add]`
- **Choisir la langue par défaut** — Même section, « Définir par défaut » sur la langue (badge « Langue par défaut »). Elle
  sert de repli pour les textes non traduits. `[cmd: lang.default]`
- **Retirer une langue** — Même section, « Retirer la langue » (impossible pour la langue par défaut). Les textes déjà
  saisis dans cette langue sont conservés. `[cmd: lang.remove]`
- **Saisir les traductions** — Chaque texte multilingue a une ligne par langue, préfixée du code ; un code orange signale
  une traduction manquante. La langue du contenu est la première ligne.
- **Changer la langue du contenu** — Première liste de la barre de projet (« Langue du contenu ») ou palette « Langue du
  contenu suivante » (proposée si le projet a au moins deux langues) : langue saisie en premier et affichée sur le logigramme. `[cmd: lang.content]`
- **Changer la langue de l'interface** — Seconde liste de la barre de projet (« Langue de l’interface » : fr, en) ou palette. `[cmd: lang.ui]`
- **Lister les traductions manquantes** — « Paramètres », section « Traductions manquantes », filtre « Langue » ; un clic
  ouvre l'objet concerné. Sur le logigramme : badge « trad. ».

## 14. Paramètres et raccourcis

- **Modifier un raccourci** — « Paramètres », section « Raccourcis clavier » (filtre « Filtrer les actions… ») : « + » sur
  la ligne (« Ajouter un raccourci »), puis presser la combinaison (`Échap` annule). Un doublon affiche « Aussi utilisé
  par : … ». Badge « logigramme » : actif seulement focus sur le logigramme. `[cmd: shortcut.set]`
- **Retirer un raccourci** — Croix à droite de la touche (« Retirer … »). Badge « personnalisé » sur l'action modifiée. `[cmd: shortcut.set]`
- **Rétablir les raccourcis par défaut** — Flèche circulaire sur la ligne (« Rétablir le raccourci par défaut ») ou bouton
  « Rétablir tous les raccourcis par défaut » (aussi en palette). Les raccourcis personnalisés restent dans le navigateur ;
  ils ne sont pas exportés. `[cmd: shortcut.reset]`

## 15. Vérifications

Les vérifications ne bloquent jamais. Panneau « Problèmes » sous le logigramme (compteur ; repliable en cliquant son titre,
ou palette « Problèmes ») ; un clic sur un problème sélectionne le nœud ou l'arête. Rouge : erreur ; orange : avertissement. `[cmd: view.problems]`

- **Expression invalide « … » : …** — Erreur de syntaxe → corriger l'expression (guillemets, parenthèses, opérateurs §8).
- **Référence inconnue « … »** — Clé ou variable inexistante (faute, question supprimée) → corriger le nom ou créer la question / variable.
- **Référence inconnue « x » : dans un filtre, un nom désigne un champ de l’élément…** → écrire `$$.cle` pour une réponse.
- **Clé en double « … »** — Deux questions (ou variables) avec la même clé → renommer l'une (« Clé » ou « Nom »).
- **Clé invalide « … » (snake_case attendu)** — Minuscules, chiffres et `_`, commençant par une lettre → renommer.
- **Nœud inaccessible depuis le départ** — Aucune arête n'y mène → le relier, le supprimer ou changer le départ.
- **Nœud sans sortie qui n’est pas une fin** — Ajouter une arête sortante ou une fin (`Alt+F`).
- **Sortie « … » du bloc non raccordée** — Tirer une liaison depuis la poignée de cette sortie sur l'instance.
- **Sortie « … » inconnue dans le bloc** — La sortie a été renommée ou supprimée → choisir une sortie dans « Sortie du bloc » de l'arête.
- **Boucle sans sortie possible** — Ajouter une arête qui quitte la boucle (condition ou « sinon »).
- **Plusieurs sorties sans « sinon »** — Le parcours peut se bloquer → vider la condition d'une des arêtes ou en ajouter une sans condition.
- **Plusieurs arêtes sans condition : seule la première sert** — Donner une condition aux autres ou les supprimer.
- **« … » n’est pas posée sur tous les chemins menant ici** — Garder la référence derrière `$exists(cle)` ou revoir le graphe.
- **Traduction manquante (…) : …** — Saisir le texte dans la langue indiquée (§13). Vaut aussi pour le libellé d'un groupe d'options.
- **Groupe d’options en double « … »** — Deux groupes d'une question ont le même code (ou, sans code, le même libellé) →
  donner un « Code du groupe » distinct (§7).
- **Code de groupe réservé « … » (« Autre (préciser) »)** — Le code `AUTRE` désigne « Autre (préciser) » → choisir un autre code.
- **Groupe d’options sans option « … »** — Ajouter des options sous la ligne `#` du groupe, ou supprimer le groupe.
- **Élément de bibliothèque introuvable « … »** — Référence vers un élément supprimé → supprimer le nœud ou réinsérer un élément.
- **Nœud de départ introuvable** — « Définir comme départ » sur un nœud (§3).
- **Problèmes du dictionnaire** — Nom de variable ou de champ invalide ou en double : signalé en rouge sur la carte de la
  variable (onglet « État du système ») → la renommer.

## Ce que l'outil ne fait pas

- **Supprimer ou dupliquer un questionnaire** : aucune action ; on peut seulement fermer son onglet.
- **Copier / coller des nœuds**, y compris entre questionnaires : non disponible (dupliquer avec `Ctrl+D` dans le même graphe ;
  pour partager, passer par la bibliothèque).
- **Changer la cible ou l'origine d'une arête** : la supprimer et la retracer.
- **Imbriquer** : pas de bloc dans un bloc, pas de structure dans une structure ; une sortie n'existe que dans un bloc.
- **Glisser-déposer des options ou des champs** : utiliser les flèches.
- **Construire une condition à la souris** : les expressions s'écrivent en texte ; seuls la syntaxe et les noms sont vérifiés, pas les types.
- **Conserver les itérations d'une boucle** : un nouveau passage remplace la réponse ; utiliser une structure répétable.
- **Modifier plusieurs nœuds à la fois** dans le panneau de propriétés (seuls dupliquer, supprimer, grouper agissent sur une sélection).
- **Rechercher / remplacer** dans les textes ; **traduire automatiquement**.
- **Exporter autre chose que du JSON et l'image PNG du logigramme** (pas de PDF, de formulaire final).
- **Exporter le logigramme en SVG** : un SVG produit par capture de l'écran n'est qu'un bloc HTML enveloppé (`foreignObject`),
  que Word, PowerPoint et la plupart des éditeurs vectoriels n'affichent pas ; seul le PNG est proposé.
- **Travailler à plusieurs** ou sur un serveur : la sauvegarde automatique reste dans le navigateur ; partager par l'export.
- **Annuler après un rechargement** de la page, ou annuler « Nouveau projet », « Ouvrir l’exemple… », l'import d'un projet.
- **Piloter le wizard au clavier** par des raccourcis dédiés (« Suivant », « Précédent », « Recommencer » sont à la souris).
- **Importer un seul bloc ou une seule question de bibliothèque** : `bibliotheque.json` remplace toute la bibliothèque.

## Index des raccourcis

<!-- debut:raccourcis (généré par npm run guide, ne pas modifier à la main) -->
| Action | Raccourci par défaut | Identifiant |
| --- | --- | --- |
| Nouveau projet | — | `project.new` |
| Ouvrir / importer… | `Ctrl+O` | `project.open` |
| Ouvrir l’exemple « déclaration de sinistre » | — | `project.example` |
| Exporter (bundle) | `Ctrl+S` | `project.export` |
| Exporter les fichiers unitaires | — | `project.exportFiles` |
| Nouveau questionnaire | — | `questionnaire.new` |
| Bibliothèque | — | `tab.library` |
| État du système | — | `tab.system` |
| Onglet suivant | `Ctrl+Tab` ou `Alt+→` | `tab.next` |
| Onglet précédent | `Ctrl+Shift+Tab` ou `Alt+←` | `tab.prev` |
| Palette de commandes | `Ctrl+K` | `palette.open` |
| Problèmes | — | `view.problems` |
| Rouvrir un questionnaire fermé | — | `tab.open` |
| Rouvrir un questionnaire fermé | — | `tab.show` |
| Fermer l’onglet | — | `tab.close` |
| Langue du contenu suivante (actuelle : fr) | — | `lang.content` |
| Langue de l’interface suivante (actuelle : fr) | — | `lang.ui` |
| Nouvelle question à la suite | `N` | `node.newQuestion` |
| Nouvelle branche conditionnée | `Shift+N` | `node.newBranch` |
| Nouvelle page d’information | `Alt+I` | `node.newInfo` |
| Nouvelle page de synthèse | `Alt+S` | `node.newSummary` |
| Nouvelle fin | `Alt+F` | `node.newEnd` |
| Type : Texte | `T` | `node.type.text` |
| Type : Date | `D` | `node.type.date` |
| Type : Nombre | `R` | `node.type.number` |
| Type : Choix unique | `U` | `node.type.single` |
| Type : Choix multiple | `M` | `node.type.multiple` |
| Type : Booléen | `B` | `node.type.boolean` |
| Type : Tri-state | `3` | `node.type.tristate` |
| Type : Structure | `S` | `node.type.structure` |
| Basculer obligatoire | `O` | `node.toggleRequired` |
| Activer « Autre (préciser) » | `A` | `node.toggleOther` |
| Éditer l’intitulé | `Entrée` | `node.editLabel` |
| Éditer la condition de l’arête | `C` | `edge.editCondition` |
| Relier à un nœud… | `E` | `node.connect` |
| Relier à un nœud… | — | `node.connectTo` |
| Définir comme départ | — | `node.setStart` |
| Dupliquer | `Ctrl+D` | `node.duplicate` |
| Supprimer la sélection | `Delete` ou `Backspace` | `node.delete` |
| Évaluer plus tôt | `Alt+↑` | `edge.moveUp` |
| Évaluer plus tard | `Alt+↓` | `edge.moveDown` |
| Relier à un nœud… | — | `edge.create` |
| Propriétés du questionnaire | — | `questionnaire.properties` |
| Titre du questionnaire | — | `questionnaire.setTitle` |
| Description (pour l’équipe de dev) | — | `questionnaire.setDescription` |
| Clé du questionnaire | — | `questionnaire.rename` |
| Nom du projet | — | `project.rename` |
| Nouveau jeu de libellés booléen | — | `labelSet.addBoolean` |
| Nouveau jeu de libellés tri-state | — | `labelSet.addTristate` |
| Supprimer le jeu de libellés | — | `labelSet.delete` |
| Nouvelle question de bibliothèque | — | `library.newQuestion` |
| Nouveau bloc | — | `library.newBlock` |
| Bibliothèque | — | `library.show` |
| Supprimer de la bibliothèque | — | `library.delete` |
| Insérer depuis la bibliothèque | `I` | `library.insert` |
| Insérer depuis la bibliothèque | — | `library.insertItem` |
| Afficher / masquer le panneau Bibliothèque | — | `view.libraryPanel` |
| Grouper la sélection en bloc | `Ctrl+G` | `node.group` |
| Placer la question dans la bibliothèque | — | `node.toLibrary` |
| Ouvrir dans la bibliothèque | — | `node.openInLibrary` |
| Nouvelle sortie de bloc | — | `node.newExit` |
| Nouvelle variable de l’état du système | — | `system.addVariable` |
| Supprimer la variable | — | `system.deleteVariable` |
| Renommer la variable | — | `system.renameVariable` |
| Renommer le champ de liste | — | `system.renameField` |
| Nouveau scénario | — | `scenario.add` |
| Supprimer le scénario | — | `scenario.delete` |
| Enregistrer l’état du système comme nouveau scénario | — | `preview.saveScenario` |
| Afficher / masquer le panneau d’état du système | — | `preview.toggleSystem` |
| Afficher / masquer le panneau de débogage | — | `preview.toggleDebug` |
| Paramètres | — | `tab.settings` |
| Ajouter une langue | — | `lang.add` |
| Retirer la langue | — | `lang.remove` |
| Langue par défaut | — | `lang.default` |
| Langue de la prévisualisation suivante | — | `preview.lang` |
| Modifier un raccourci | — | `shortcut.set` |
| Rétablir tous les raccourcis par défaut | — | `shortcut.reset` |
| Mise en page automatique | `L` | `view.layout` |
| Vue côte à côte | — | `view.compare` |
| Exporter le logigramme en image | `X` | `view.exportImage` |
| Exporter l’image avec ces options | — | `view.exportImageRun` |
| Aller au nœud suivant | `↓` | `nav.down` |
| Aller au nœud précédent | `↑` | `nav.up` |
| Aller au nœud voisin suivant | `→` | `nav.right` |
| Aller au nœud voisin précédent | `←` | `nav.left` |
| Annuler | `Ctrl+Z` | `edit.undo` |
| Rétablir | `Ctrl+Shift+Z` ou `Ctrl+Y` | `edit.redo` |
| Ajuster la vue | `F` | `view.fit` |
| Basculer logigramme ↔ prévisualisation | `P` | `view.toggle` |
<!-- fin:raccourcis -->
