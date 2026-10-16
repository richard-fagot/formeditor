# Guide utilisateur — Éditeur de questionnaires
Mis à jour le 2026-10-16 — jusqu'à EVO-024

## Mode d'emploi du guide

- Une entrée par action, titrée par un verbe à l'infinitif, groupées par thème (sections 1 à 17) ; cherchez le verbe (« Créer », « Relier », « Supprimer »…).
- Les libellés entre « » sont ceux affichés par l'interface en français (langue d'interface par défaut).
- Raccourcis entre accents graves : `N`, `Ctrl+K`, `Alt+I`. Sur Mac, `Ctrl` s'affiche `⌘`. « Palette » = palette de commandes (`Ctrl+K`), où l'on tape le libellé de l'action.
- Les raccourcis marqués « logigramme » n'agissent que si le logigramme a le focus (cliquer dans une zone vide du graphe), jamais pendant une saisie.
- La balise en fin d'entrée (crochets, `cmd:`, identifiant) renvoie au catalogue de commandes : écran des raccourcis, index en fin de guide.

## Notions

- **Projet** : tout le travail (questionnaires, bibliothèque, état du système, scénarios, langues) ; un seul ouvert à la fois.
- **Questionnaire** : un graphe de nœuds reliés par des arêtes ; un onglet par questionnaire.
- **Formulaire validé** : questionnaire relu et approuvé par les métiers, livrable aux développeurs ; marqué « Validé » et en lecture seule jusqu'à sa dévalidation (section 17).
- **Version** : texte libre saisi à la main sur un questionnaire ou un élément de bibliothèque (convention `X.Y.Z`), figé tant que l'objet est validé ; statut « Validé » (final) ou « Provisoire » (section 18).
- **Nœud** : question, page d'information, page de synthèse, fin, nœud Renvoi, nœud fragment (ou sortie nommée, dans un fragment).
- **Nœud Renvoi** : page de texte avec des **boutons de renvoi** : vers un autre questionnaire du projet (mauvais
  questionnaire, déclaration liée) ou vers un nœud déjà passé du questionnaire (revenir corriger) ; section 3.
- **Départ** : nœud par lequel commence le parcours d'un questionnaire (badge « Départ »). Le premier nœud créé l'est d'office ;
  ce peut être un nœud fragment.
- **Arête** : liaison d'un nœud vers un autre, avec une condition facultative et un rang ; sans condition, c'est le « sinon ».
  Elle peut porter un **libellé** de lecture (« Ayant droit adhérent »), affiché à la place de la condition.
- **Rang** : ordre d'évaluation des arêtes qui sortent d'un même nœud ; la première condition vraie l'emporte.
- **Clé** : nom lisible d'une question en snake_case (`date_sinistre`), utilisé dans les expressions.
- **Bibliothèque** : questions, fragments et jeux de libellés réutilisables du projet, utilisés par référence (pas de copie).
- **Fragment** : morceau de parcours de la bibliothèque, édité comme un questionnaire mais **sans départ ni fin** : il
  commence à son **entrée** (le nœud sans arête entrante, badge « Entrée ») et rend la main à l'appelant à chaque
  **sortie** (nœud sans arête sortante). Un questionnaire l'appelle par un **nœud fragment** avec un **alias** (`ident.nom`).
  Il remplace le « bloc » des versions précédentes : un projet ancien s'ouvre avec ses blocs devenus fragments.
- **Fragment ou bloc ?** Il n'y a plus que des fragments : un ancien bloc garde ses **sorties nommées** (facultatives), un
  fragment neuf n'en a pas besoin, chacun de ses nœuds sans arête sortante est une sortie.
- **Jeu de libellés** : libellés d'un booléen (« Oui / Non »).
- **État du système** : variables fournies par le logiciel hôte (`sys.profil`), déclarées dans un dictionnaire ; chacune
  peut porter un **libellé** de lecture (« Profil de l'utilisateur connecté »).
- **Libellé (de lecture)** : nom court, en une seule langue, destiné au concepteur et à l'équipe de dev ; jamais montré à
  l'utilisateur final, sans effet sur le parcours, jamais écrit dans une expression.
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
  fichiers de questionnaire, `bibliotheque.json` ou `.layout.json` seuls sont fusionnés dans le projet ouvert (le nom des
  fichiers est indifférent). `[cmd: project.open]`
- **Comprendre un import refusé** — Un seul fichier invalide et rien n'est chargé : la boîte « Import impossible »
  liste les erreurs par fichier. Les fichiers d'une ancienne version du format sont migrés automatiquement, sans message
  (ex. un ancien tri-state devient un booléen avec « Ne sais pas » activée, §6 ; même chose au rechargement de la page).
- **Importer un questionnaire dans le projet ouvert** — « Ouvrir / importer… » avec seulement son fichier (et son
  `.layout.json`) : il est ajouté et s'ouvre dans un onglet, ou remplace celui de même identifiant (sans ouvrir d'onglet). `[cmd: project.open]`
- **Remplacer la bibliothèque** — Importer seul un `bibliotheque.json` : il remplace toute la bibliothèque du projet.
- **Ouvrir l'exemple « déclaration de sinistre »** — Icône étincelles de la barre de projet (info-bulle « Ouvrir l’exemple
  « déclaration de sinistre » ») ou palette. Remplace le projet ouvert (confirmation si non exporté). `[cmd: project.example]`
- **Exporter le projet** — `Ctrl+S` (actif même pendant une saisie), bouton « Exporter (bundle) » ou palette. Télécharge
  `<nom_du_projet>.bundle.json`, qui contient tout (questionnaires, bibliothèque, mises en page et commentaires de révision). `[cmd: project.export]`
- **Exporter les fichiers unitaires** — Icône fichier JSON de la barre de projet (info-bulle « Exporter les fichiers unitaires »)
  ou palette. Télécharge `projet.json`, `bibliotheque.json` et, par questionnaire, `<clé> - <version> - <final|provisoire>.json`
  (ex. `blessure - 1.0.5 - provisoire.json`, `dc - 1.0.4 - final.json` ; sans version : `blessure - provisoire.json` ;
  un caractère interdit dans un nom de fichier, comme `/`, devient `_`) et sa mise en page au même nom en `.layout.json`,
  `fragment_<clé>.layout.json` par fragment, `question_<clé>.layout.json` par question de bibliothèque commentée. Les commentaires
  de révision (§16) ne sont que dans les `.layout.json`, que l'équipe de dev ignore ; le navigateur peut demander d'autoriser les téléchargements multiples.
  Chaque fichier de questionnaire contient sa version, son statut et la version et le statut des éléments de bibliothèque
  qu'il utilise (section 18). `[cmd: project.exportFiles]`
- **Livrer aux développeurs** — Exporter les fichiers unitaires et joindre `projet.json`, `bibliotheque.json` et les
  fichiers des formulaires **validés** (`… - final.json`, §17), sans les `.layout.json`. Pour ne livrer que ce qui a
  changé, joindre ceux dont la version a changé depuis la dernière livraison (section 18). Y joindre la documentation du format : dans le
  dépôt de l'outil, `npm run kit-dev` crée le répertoire `kit-dev/` (`FORMAT.md`, `schemas/`, `exemple/`, `LISEZMOI.md`) ;
  relancé, il le remplace.
- **Savoir si le projet est exporté** — Pastille à côté du nom du projet : « Modifications non exportées » (orange) ou
  « Tout est exporté » (vert). Elle repasse au vert après un export.
- **Renommer le projet** — Cliquer sur le nom en haut à gauche et le modifier. Il donne son nom au bundle exporté. `[cmd: project.rename]`
- **Retrouver son travail après fermeture** — Rien à faire : sauvegarde automatique continue dans le navigateur. À la
  réouverture : projet, onglets, langue de l'interface et raccourcis personnalisés reviennent ; l'historique d'annulation non.
  La sauvegarde est propre au navigateur : seul l'export est partageable.

## 2. Onglets et navigation

- **Créer un questionnaire** — Bouton « + » à droite des onglets (info-bulle « Nouveau questionnaire ») ou palette
  « Nouveau questionnaire ». Il s'ouvre dans un nouvel onglet, intitulé « Questionnaire sans titre ». `[cmd: questionnaire.new]`
- **Dupliquer un questionnaire** — Clic droit sur son onglet (ou sur son titre gris s'il est fermé), « Dupliquer », ou palette
  « Dupliquer le questionnaire » (questionnaire affiché). La copie, « Copie de <titre> » (puis « Copie 2 de… »), clé suffixée
  (`declaration_sinistre_2`), est placée juste après l'original et s'ouvre. Contenu complet, sans aucun lien : modifier l'un
  ne modifie pas l'autre ; les questions et fragments de bibliothèque restent des références. Les boutons des nœuds Renvoi
  copiés visent les nœuds de la copie. Annulable. `[cmd: questionnaire.duplicate]`
- **Changer d'onglet** — Cliquer sur l'onglet, ou `Alt+→` / `Alt+←` (aussi `Ctrl+Tab` / `Ctrl+Shift+Tab`,
  souvent réservés par le navigateur). `[cmd: tab.show]`
  `[cmd: tab.next]` `[cmd: tab.prev]`
- **Fermer un onglet** — Survoler l'onglet et cliquer sa croix (« Fermer l’onglet »), ou palette « Fermer l’onglet » (onglet
  actif). Fermer un questionnaire ou un fragment ne le supprime pas. `[cmd: tab.close]`
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
  Plusieurs fins sont possibles. Indisponible dans un fragment. `[cmd: node.newEnd]`
- **Créer un nœud Renvoi à la suite** — `Alt+R` ou palette « Nouveau nœud Renvoi ». Même placement que `N` ; texte par
  défaut « Texte de renvoi », aucun bouton (signalé tant qu'il n'en a pas). Indisponible dans un fragment. `[cmd: node.newRedirect]`
- **Paramétrer un nœud Renvoi** — Le sélectionner ; panneau « Renvoi » : « Titre », « Texte », puis « Boutons » et
  « Libellé du bouton Terminer ». « Ajouter un bouton » en crée un ; pour chacun : « Libellé » (multilingue, interpolable),
  « Cible » (liste fermée : les **autres questionnaires** du projet, pour une déclaration, puis les **nœuds en amont** —
  questions, pages d'information ou de synthèse depuis lesquelles un chemin mène au Renvoi, et questions des fragments
  appelés en amont, écrites `alias.cle` — pour revenir corriger), « Condition d’affichage » (expression, vide = toujours
  affiché), flèches « Monter » / « Descendre », corbeille « Supprimer le bouton ». Un bouton n'a pas de type : son effet
  découle de sa cible. Une cible questionnaire ajoute deux cases, décochées au choix de la cible :
  « Pré-remplissage de la cible » et « Annule et remplace » ; elles sont **documentaires** (écrites dans le JSON pour l'équipe de dev, non simulées).
  Choisir une cible nœud les retire. La cible est gardée si on renomme la question ou le questionnaire visé, et le bouton est
  gardé si on supprime la cible (signalé, section 15). Sur le logigramme, le nœud (bordure rose épaisse à gauche) liste ses
  boutons dans l'ordre, chacun avec sa cible (`→ proprio`, `→ Dommage au bien`), les icônes des cases cochées
  (presse-papiers : pré-remplissage ; flèches : annule et remplace) et un entonnoir s'il a une condition ; aucun lien n'est
  tracé vers les cibles. Le Renvoi garde ses arêtes sortantes : « Suivant » (ou « Terminer ») les suit.
- **Choisir le libellé du bouton Terminer** — Quand toutes les arêtes sortantes du Renvoi mènent directement à une fin, la
  prévisualisation affiche « Terminer » à la place de « Suivant » ; « Libellé du bouton Terminer » le remplace (multilingue,
  vide = « Terminer »). Il n'a ni cible ni condition : il suit les arêtes du nœud.
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
  marge, résolution 2×. Fichier téléchargé : `<projet> - <questionnaire> - <version> - <final|provisoire> - AAAAMMJJ.png`
  (titre dans la langue des contenus affichée ; segment version omis si la version est vide ; `final` / `provisoire`
  comme pour le fichier JSON ; `\ / : * ? " < > |` remplacés par `_`), par exemple
  `sinistres - blessure - 1.0.5 - provisoire - 20261014.png`. Titre dessiné en en-tête (case cochée) :
  « <titre> — <version> — <statut> », statut « Validé » ou « Provisoire » dans la langue de l'interface, version omise si
  elle est vide ; case décochée : aucun titre. Les choix sont retenus dans le navigateur. Disponible dans la
  vue Logigramme d'un questionnaire non vide (pas pour un fragment ni la vue côte à côte).
  `[cmd: view.exportImage]` `[cmd: view.exportImageRun]`
- **Ajuster la vue au graphe** — `F` (logigramme), palette « Ajuster la vue », ou bouton cadre des contrôles en bas à gauche. `[cmd: view.fit]`
- **Zoomer, se déplacer dans le logigramme** — Molette pour zoomer, glisser le fond pour se déplacer ; boutons « + » / « − » en bas à gauche.
- **Définir le départ** — Sélectionner le nœud, bouton « Définir comme départ » (section « Départ ») du panneau de propriétés,
  ou palette « Définir comme départ ». Le départ peut être un nœud fragment : le parcours commence alors par la première
  question du fragment. Indisponible dans un fragment (voir « Définir l'entrée d'un fragment », §10). `[cmd: node.setStart]`
- **Dupliquer des nœuds** — Sélectionner un ou plusieurs nœuds puis `Ctrl+D` (logigramme), clic droit sur un nœud « Dupliquer » ou palette « Dupliquer ». Les copies
  sont décalées et sélectionnées ; les arêtes entre nœuds copiés sont copiées, pas les autres ; clés et alias rendus uniques, et les références
  internes à la sélection suivent le renommage, comme au collage (`{date_sinistre}` → `{date_sinistre_2}`). `[cmd: node.duplicate]`
- **Copier des nœuds** — Sélectionner un ou plusieurs nœuds puis `Ctrl+C` (logigramme), clic droit sur un nœud « Copier », ou
  palette « Copier ». Tous les types de nœuds se copient, avec tout leur contenu ; les arêtes entre nœuds copiés (conditions,
  rang) suivent, les autres non. Le presse-papiers est interne à l'outil et au projet ouvert (pas de copie vers un autre
  projet) ; un texte sélectionné dans la page se copie normalement. `[cmd: node.copy]`
- **Coller des nœuds** — Dans le logigramme d'un questionnaire ou d'un fragment (le même ou un autre), `Ctrl+V` : les nœuds
  arrivent au pointeur de la souris (décalés de l'original si le pointeur est hors du logigramme), disposition conservée,
  **non raccordés** et sélectionnés. Aussi clic droit sur le fond ou un nœud, « Coller » (au point du clic), ou palette
  « Coller ». Chaque collage crée de nouveaux nœuds, sans lien avec l'original ; un seul `Ctrl+Z` l'annule.
  Règles : une clé (ou un alias) déjà pris dans la cible est suffixé (`date_sinistre` → `date_sinistre_2`) et les références
  **de la sélection** à cette clé (conditions, contraintes, libellés `{…}`, entrées dynamiques) sont réécrites ; une
  référence à une question **non copiée** est gardée telle quelle et signalée par « Problèmes » si la cible ne l'a pas. Une
  instance de fragment ou de question de bibliothèque reste une référence au même élément. Le rôle de départ n'est pas
  collé : la cible garde son départ (un questionnaire vide prend le nœud qui était le départ dans la copie, à défaut le premier nœud collé). Dans un **fragment**, les fins ne
  sont pas collées (ni leurs arêtes) et une instance qui créerait un cycle d'appels (le fragment lui-même…) est refusée ;
  dans un questionnaire, les sorties nommées ne sont pas collées. Un nœud Renvoi n'est pas collé dans un fragment. Collé avec
  la cible nœud d'un de ses boutons, ce bouton vise la copie de la cible ; sinon il garde sa cible d'origine. Une fenêtre
  « Collage : éléments écartés » liste ce qui a été écarté ; le reste est collé. `[cmd: node.paste]`
- **Supprimer des nœuds** — Sélectionner puis `Suppr` (Delete) ou `Retour arrière` (Backspace) (logigramme), ou palette « Supprimer la sélection ».
  Leurs arêtes disparaissent aussi ; si le départ est supprimé, le premier nœud restant le devient (dans un fragment, une
  entrée réglée supprimée redevient implicite). Une question commentée demande confirmation : son commentaire de
  révision est supprimé avec elle (§16). Annulable. `[cmd: node.delete]`
- **Annuler** — `Ctrl+Z` ou palette « Annuler ». Un historique par questionnaire, un pour la bibliothèque (fragments compris), un pour le projet
  (état du système, scénarios, langues, nom) : `Ctrl+Z` agit sur celui de l'onglet affiché. Pendant une saisie, `Ctrl+Z`
  annule seulement la frappe dans le champ. `[cmd: edit.undo]`
- **Rétablir** — `Ctrl+Shift+Z` ou `Ctrl+Y`, ou palette « Rétablir ». `[cmd: edit.redo]`
- **Lire les badges d'un nœud** — « Départ » (« Entrée » dans un fragment) ; « * » obligatoire (« * ? » : obligatoire sous condition) ; « + autre » ;
  « bib. » élément de bibliothèque (double-clic : l'ouvrir dans la bibliothèque, voir §10) ; « 3 / 7 champs » instance de structure dont des champs sont masqués (§10) ; « trad. » traduction manquante ; « ⚠ n » problèmes (rouge si erreur) ; icône bulle : la question a un commentaire de révision (§16).

## 4. Logigramme — arêtes et conditions

- **Relier deux nœuds à la souris** — Tirer depuis la poignée du bas du nœud de départ jusqu'au nœud cible. L'arête
  créée n'a pas de condition (« sinon »). Une liaison identique déjà présente n'est pas dupliquée. `[cmd: edge.create]`
- **Relier le nœud sélectionné au clavier** — `E` (logigramme) ou palette « Relier à un nœud… » : la palette « Relier au nœud… »
  liste les nœuds ; `Entrée` crée l'arête et sélectionne la cible. `[cmd: node.connect]` `[cmd: node.connectTo]`
- **Créer une branche conditionnée** — Sélectionner le nœud d'origine puis `Shift+N` (logigramme) ou palette « Nouvelle
  branche conditionnée ». Une nouvelle question est reliée par une arête placée avant le « sinon », et le curseur est dans
  le champ « Condition » de l'arête : taper la condition (ex. `type_sinistre = 'vol'`), puis `Entrée`. `[cmd: node.newBranch]`
- **Sélectionner une arête** — Clic sur l'arête ou sur son étiquette. Le panneau de droite affiche « Arête » : « De », « Vers »,
  « Libellé », « Condition », rang.
- **Donner un libellé à une arête** — Sélectionner l'arête, taper dans le champ « Libellé » (au-dessus de « Condition ») :
  texte libre sur une ligne, une seule langue (ex. « Ayant droit adhérent », « Sinon »). Possible avec ou sans condition,
  y compris pour une arête qui sort d'un nœud fragment. Le logigramme l'affiche **à la place** de la condition ; la condition reste
  lisible au survol de l'étiquette. Vider le champ retire le libellé (la condition s'affiche de nouveau). Saisie et
  effacement s'annulent par `Ctrl+Z` une fois sorti du champ (ou palette « Annuler »). Le libellé ne change rien au parcours et n'apparaît jamais dans le wizard.
- **Modifier la condition d'une arête** — Sélectionner l'arête puis `C` (logigramme), ou taper dans le champ « Condition ».
  Avec un nœud sélectionné, `C` ouvre la condition de la première arête qui **arrive** sur ce nœud. `Entrée` rend le focus
  au logigramme. Vider le champ fait de l'arête un « sinon ». `[cmd: edge.editCondition]`
- **Lire l'étiquette d'une arête** — Condition abrégée (32 caractères) ; « sinon » en italique pour une arête sans condition ;
  « ? » pour une condition encore vide ; « 2. » : rang quand plusieurs arêtes sortent du nœud ; nom de la sortie nommée d'un fragment.
  Avec un libellé : le libellé (police normale) au lieu de la condition, tronqué par « … » s'il est trop long ; au survol,
  le libellé complet puis la condition telle que l'étiquette l'afficherait sans libellé (« ? » si encore vide, « sinon »
  parmi plusieurs sorties, rien pour une arête seule sans condition). Une arête seule sans condition, hors sortie nommée,
  n'a d'étiquette que si elle a un libellé ; une arête de sortie nommée a toujours une étiquette (nom de la sortie).
- **Changer l'ordre d'évaluation des arêtes** — Sélectionner l'arête puis `Alt+↑` / `Alt+↓` (logigramme), boutons « Évaluer
  plus tôt » / « Évaluer plus tard » du panneau, ou palette. Le rang est rappelé sous « Condition » (« Rang 1 sur 3 »). `[cmd: edge.moveUp]` `[cmd: edge.moveDown]`
- **Supprimer une arête** — Sélectionner l'arête puis `Suppr`, ou bouton « Supprimer » du panneau de l'arête. `[cmd: node.delete]`
- **Changer la cible d'une arête** — Impossible directement : supprimer l'arête et en tracer une nouvelle.
- **Faire une boucle ou une convergence** — Relier un nœud vers un nœud déjà atteint (même au-dessus). La réponse donnée
  au nouveau passage remplace la précédente.
- **Reprendre après un fragment** — Tirer une liaison depuis la poignée du bas du nœud fragment : à chaque sortie du
  fragment (nœud sans arête sortante), le parcours suit ces arêtes, par rang, comme pour une question. Leur condition peut
  tester les réponses du fragment (`ident.majeur = false`). `[cmd: edge.create]`
- **Raccorder une sortie nommée d'un fragment** — Si le fragment a des sorties nommées (ancien bloc), le nœud fragment a
  une poignée orange par sortie (son nom est écrit au-dessus) : tirer depuis celle voulue. Ou, sur l'arête, choisir la
  sortie dans « Sortie du fragment » (« Toute sortie » : valable pour toutes). `[cmd: edge.create]`

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
  options entre choix unique et multiple, « Autre » entre types qui l'acceptent, et « Ne sais pas » sauf vers une structure).
- **Rendre une question obligatoire** — Case « Obligatoire », ou `O` (logigramme ; palette « Basculer obligatoire »). `O`
  bascule : sur une question déjà obligatoire (même sous condition), il retire l'obligation. Question locale seulement :
  pour une question de bibliothèque ou d'un fragment utilisé, voir « Surcharger le caractère obligatoire… » (§10). `[cmd: node.toggleRequired]`
- **Rendre une question obligatoire sous condition** — Case « Obligatoire » décochée, champ « Obligatoire si… (expression,
  facultatif) » : ex. `type_sinistre = 'accident'`.
- **Ajouter « Ne sais pas »** — Case « Option « Ne sais pas » » du panneau (section du type : juste après « Autre
  (préciser) » pour les choix et le booléen ; en fin de section pour texte, date et nombre ; aussi dans un
  champ de structure, jamais sur la structure elle-même), ou palette « Activer « Ne sais pas » » (bascule, question locale
  sélectionnée). Désactivée par défaut. `[cmd: node.toggleDontKnow]`
- **Régler « Ne sais pas »** — « Libellé de l'option » (défaut « Ne sais pas ») : multilingue, `{…}` interpolé, variantes
  conditionnelles, traductions manquantes signalées, comme une option. Effet dans le wizard :
  - choix unique ou multiple, booléen : dernière option, après « Autre (préciser) », hors de tout groupe ;
    exclusive (la cocher décoche les autres options, cocher une autre option la décoche) ;
  - texte, date, nombre : case « Ne sais pas » sous le champ ; cochée, le champ est vidé et désactivé ; décochée, il revient vide.
  Cochée, elle satisfait une question obligatoire et aucun contrôle (format, min/max, longueur, contraintes) ne s'applique.
  Logigramme : dernière ligne en italique (choix ; « / libellé » en fin de ligne pour oui/non), « + Ne sais pas » en italique après l'aperçu (saisie). Pas de table de
  décision dans l'outil : rien d'autre à régler.
- **Ajouter un texte d'aide** — Champ « Aide » (affiché sous l'intitulé dans le wizard ; variantes possibles).
- **Ajouter un texte indicatif dans le champ** — « Texte indicatif » (types texte et nombre seulement).
- **Donner une valeur par défaut** — « Valeur par défaut » : texte brut pour texte, date (`2026-01-31`) et choix unique
  (valeur de l'option) ; JSON pour les autres (`12`, `true`, `["a","b"]`). Posée à l'arrivée sur la question.
- **Calculer la valeur par défaut** — « Valeur par défaut calculée » : expression, prioritaire sur la valeur littérale
  (ex. `sys.date_effet_contrat`).
- **Décrire la question pour l'équipe de dev** — Section « Description (pour l’équipe de dev) » : texte libre, exporté, jamais affiché.
- **Modifier les propriétés du questionnaire** — Rien sélectionné (clic dans le vide) ou palette « Propriétés du questionnaire » :
  « Version » et statut (section 18), « Titre du questionnaire » (nom de l'onglet), « Clé du questionnaire » (début du nom
  du fichier exporté, affiché dessous, ex. `sinistre - 1.0.0 - provisoire.json`),
  « Description (pour l’équipe de dev) ». `[cmd: questionnaire.properties]` `[cmd: questionnaire.setTitle]`
  `[cmd: questionnaire.rename]` `[cmd: questionnaire.setDescription]`

## 6. Types de questions

Changer de type : sélectionner une question locale (pas une référence de bibliothèque) puis la touche du type
(logigramme), la liste « Type », ou palette « Type : … ».

### Texte
- **Passer une question en texte** — `T` ou palette « Type : Texte ». `[cmd: node.type.text]`
- **Régler un texte** — « Texte long (plusieurs lignes) », « Longueur min. », « Longueur max. », « Motif (expression
  régulière) » (ex. `^[0-9]{5}$` pour un code postal).
- **Proposer des suggestions sur un texte** — Case « Suggestions » (texte seulement, question ou champ de structure ;
  décochée par défaut) : le champ « Expression des suggestions » apparaît (autocomplétion et validation des autres
  expressions). L'expression renvoie une **liste** de textes (voir §8 « Écrire une expression de suggestions ») : ex.
  `marques` (réponse d'un choix multiple posé avant), `sys.villes`, `sys.sinistres.nature`, `["Peugeot", "Renault"]`.
  En prévisualisation, la liste s'ouvre quand le champ prend le focus, se filtre à la frappe (le texte tapé est contenu,
  casse ignorée : « toy » garde « Toyota ») ; choisir une suggestion au clic, ou avec les flèches puis `Entrée` ; `Échap`
  ferme la liste. On peut toujours taper une autre valeur (« Dacia ») : la réponse est le texte saisi, contrôlé comme
  d'habitude (obligatoire, longueurs, motif, contraintes). Les suggestions sont recalculées à chaque affichage de la page
  (changer une réponse précédente puis revenir les met à jour) ; aucune suggestion → champ de texte simple. Décocher la case
  efface l'expression (rien n'est exporté). Logigramme : petite icône de liste après `<texte>` (info-bulle « Avec suggestions »).

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
- **Modéliser « oui / non / ne sait pas »** — Booléen avec la case « Option « Ne sais pas » » cochée (§5) : le wizard
  propose Oui, Non, Ne sais pas, dans cet ordre. Il n'y a plus de type tri-state : un projet qui en contenait est converti
  à l'ouverture, à l'import ou au rechargement de la page (booléen, « Ne sais pas » cochée ; une valeur par défaut « ne sait
  pas » est retirée ; un jeu de libellés tri-state devient un jeu booléen et perd son troisième libellé). Les expressions ne
  sont pas réécrites : `cle = "unknown"` devient `cle.nsp` à la main.

### Structure
- **Passer une question en structure** — `S` ou palette « Type : Structure ». `[cmd: node.type.structure]`
- **Ajouter un champ à une structure** — Bouton « Ajouter un champ » (section « Champs ») : champ texte « Champ n ». Déplier la
  ligne du champ pour régler « Intitulé », « Clé », « Type » (tous sauf structure), « Obligatoire », « Condition d'affichage
  (clés sœurs sans préfixe) », « Aide », les réglages du type et ses contraintes.
- **Réordonner ou supprimer un champ** — Flèches haut / bas et croix sur la ligne du champ (« Monter », « Descendre », « Supprimer le champ »).
- **Renommer la clé d'un champ** — Champ « Clé » du champ déplié ; validé en quittant le champ ; propagé aux expressions (`victime.nom`).
- **Rendre une structure répétable** — Case « Répétable (plusieurs occurrences) », puis « Occurrences min. », « Occurrences max. »,
  « Libellé du bouton « Ajouter » ». Le wizard affiche « Ajouter » et « Supprimer » par occurrence.
- **Réutiliser une structure de bibliothèque avec moins de champs** — Voir « Masquer des champs d'une structure de bibliothèque » (§10).

### Mail, téléphone, adresse, civilité
Types dédiés (aussi comme champ de structure) avec **contrôles de format intégrés** : rien à écrire, un message par
défaut multilingue, personnalisable (§9). Les espaces en début et en fin de saisie sont retirés ; une question facultative
laissée vide n'est pas contrôlée. Obligatoire, contraintes libres, conditions et « Ne sais pas » s'appliquent comme ailleurs.
Dans le wizard, le contrôle s'applique à la sortie du champ (message sous le champ) et à « Suivant ».
- **Passer une question en mail** — `Shift+E` ou palette « Type : Mail ». Contrôle `email` : adresse conforme aux RFC 5321 / 5322
  (`jean+test@exemple.fr`, `"jean dupont"@exemple.fr`, `jean@[192.0.2.1]` acceptées ; espace, `@` doublé, point en début, en
  fin ou doublé, partie locale de plus de 64 caractères, accents refusés). Valeur : domaine en minuscules
  (`Jean.Dupont@Exemple.FR` → `Jean.Dupont@exemple.fr`). `[cmd: node.type.email]`
- **Passer une question en téléphone** — `Shift+T` ou palette « Type : Téléphone ». Saisie : liste d'indicatifs (drapeau,
  pays, `+33`) puis numéro ; espaces, points, tirets, parenthèses acceptés. Un numéro en `+` ou `00` fixe le pays (la liste
  suit : `+32 470 12 34 56` → Belgique). Valeur : format international `+33612345678` ; le champ réaffiche le numéro au
  format national en sortie (`06 12 34 56 78`). Contrôles `phone` (numéro valide pour le pays, pays autorisé) et `lineType`.
  `[cmd: node.type.phone]`
- **Régler un téléphone** — « Pays par défaut » (France par défaut), « Pays autorisés » (codes ISO séparés par des virgules,
  ex. `FR, BE` ; vide : tous ; la liste du wizard est restreinte), « Type de ligne attendu » (indifférent, mobile, fixe).
- **Passer une question en adresse** — `Shift+A` ou palette « Type : Adresse ». Saisie : pays (liste masquée si un seul pays est
  autorisé) puis une ligne (numéro, voie, code postal, ville). Contrôle `address` : au moins une lettre, entre 5 et 200
  caractères, une seule ligne (tous alphabets acceptés : `東京都千代田区1-1`) ; `postalCode` en France : code postal à 5
  chiffres (`12 rue des Lilas 31000 Toulouse`). `[cmd: node.type.address]`
- **Régler une adresse** — « Pays par défaut », « Pays autorisés », « Longueur min. » / « Longueur max. » (5 / 200 par défaut),
  case « Adresse à vérifier par un service de normalisation (BAN…) » : indicateur exporté pour l'équipe de dev, l'outil
  n'appelle aucun service.
- **Passer une question en civilité** — `Shift+C` ou palette « Type : Civilité ». Boutons « Madame » / « Monsieur » sur une
  ligne ; codes fixes `MME`, `M`. `[cmd: node.type.civility]`
- **Régler une civilité** — « Libellés courts (« Mme », « M. ») » ; « Option « Ne se prononce pas » (code NP) » (en dernier) ;
  « Libellé — MME » / « — M » / « — NP » : libellés multilingues remplaçant ceux par défaut (fournis en français et en
  anglais ; les autres langues du projet sont signalées en traduction manquante). Le code ne change jamais. Message
  `option` (code non proposé, par exemple dans une donnée importée) personnalisable comme les autres (§9).
- Logigramme : icône du type ; pour le téléphone et l'adresse, le pays par défaut s'il n'est pas `FR`, « mobile » ou « fixe »
  si un type de ligne est exigé ; pour la civilité, ses libellés.

## 7. Options

Concerne le choix unique et le choix multiple. Le booléen n'a pas d'options (§6).

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
  titrée ; un groupe dont aucune option n'est visible n'est pas affiché. « Autre (préciser) » reste en dernier, hors groupe :
  avec au moins un groupe affiché, elle est séparée du dernier groupe par un trait
  (choix unique ou multiple ; sa précision s'ouvre comme d'habitude). Exemple, avec `A` sur la question :
  ```
  Transports en commun
  ○ Bus
  ○ Métro
  ○ Train
  Véhicule personnel
  ○ Voiture
  ○ Vélo
  ───────────────────────
  ○ Autre (préciser)
  ```
  Les options ne sont pas décalées : c'est le trait qui distingue « Autre (préciser) ».
  Sans groupe, « Autre (préciser) » suit les options, sans trait.
- **Régler un groupe** — Sous le champ des options, chaque groupe a sa ligne (« # Libellé (groupe) »), juste avant celles de
  ses options. La déplier : libellé multilingue (variantes, `{…}` possibles, comme une option), « Code du groupe » (ex. `SC` ;
  vide : le groupe est identifié par son libellé dans la langue par défaut ; `AUTRE` et `NSP` sont réservés), « Condition d'affichage du groupe ».
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
  « Autre (préciser) » ». Affichée en dernier ; ouvre un champ texte dans le wizard. Aussi pour le booléen. `[cmd: node.toggleOther]`
- **Régler « Autre (préciser) »** — « Libellé de l'option » (défaut « Autre (préciser) ») et « Précision obligatoire ».
  La précision se lit dans les expressions par `<clé>_other`.

## 8. Expressions et références

- **Écrire une expression** — Les champs d'expression (condition, « Obligatoire si… », bornes, règles, « Condition
  d'affichage »…) tiennent sur une ligne. L'autocomplétion propose clés et variables en tapant (`Ctrl+Espace` pour
  l'ouvrir) ; `$` propose les fonctions. Erreur de syntaxe soulignée en rouge, référence inconnue signalée
  (« Référence inconnue : … »). `Échap` quitte le champ.
- **Retrouver une variable par son libellé** — Dans l'autocomplétion, le libellé d'une variable de l'état du système (ou
  d'un champ de liste) est affiché à côté de la clé et de son type. Taper un mot du libellé (casse et accents ignorés :
  « connecte » trouve « Profil connecté ») propose la variable ; la choisir insère toujours la **clé** (`sys.profil`).
  Les clés qui commencent par le texte tapé sont proposées en premier.
- **Lire le libellé d'une variable dans une expression** — Survoler une référence `sys.…` (champ de liste compris,
  `sys.sinistres.nature`) : une infobulle donne la clé, le libellé et la description. Rien ne s'affiche si la variable n'a
  ni libellé ni description, ni dans une chaîne entre guillemets (`"sys.profil"`) ou un nom entre accents graves.
- **Désigner une valeur** — `cle` : réponse du questionnaire ; `structure.champ` : sous-champ ; `victimes[0].nom` : occurrence
  (à partir de 0) ; `sys.variable`, `sys.liste.champ` : état du système ; `alias.cle` : question d'un fragment appelé avec cet alias (`ident.date_naissance` ; fragment dans un fragment :
  `ident.adresse.ville`) — dans le fragment lui-même, ses questions s'écrivent sans préfixe (`date_naissance`) et celles de
  l'appelant aussi (clés attendues de l'appelant) ;
  `cle_other` : précision « Autre » ; `$$.cle` : réponse lue depuis la racine (dans un filtre).
- **Lire le groupe de l'option choisie** — `ma_question.groupe` (choix unique ou multiple, aussi `alias.cle.groupe` (fragment),
  `structure.champ.groupe`) : code du groupe, sinon son libellé dans la langue par défaut ; `AUTRE` si « Autre (préciser) »
  est choisie ; vide pour une option sans groupe. Choix multiple : liste des groupes, dans l'ordre des valeurs cochées.
  `ma_question` donne toujours la valeur seule. Ex. : `qualite_declarant.groupe = 'SC'`, `'AA' in liens.groupe`.
  `groupe` est un mot réservé : aucune clé ne peut s'appeler `groupe`.
- **Lire la valeur d'un mail, téléphone, adresse, civilité** — `ma_question` : mail normalisé, numéro `+33612345678`, ligne
  d'adresse, code de civilité (`MME`, `M`, `NP`) ; vide si non répondu. `ma_question.pays` (téléphone, adresse ; aussi
  `structure.champ.pays`) : code pays ISO (`FR`, `BE`), rangé sous `<clé>_pays`. Ex. : `souscripteur.telephone.pays != 'FR'`,
  `souscripteur.civilite = 'MME'`. Ailleurs, `.pays` est « Référence inconnue » (sauf un champ de structure nommé `pays`).
- **Tester « Ne sais pas »** — `ma_question.nsp` (aussi `alias.cle.nsp`, `structure.champ.nsp`, `victimes[0].champ.nsp`) :
  `true` si « Ne sais pas » est choisie, `false` sinon (jamais vide). `ma_question` est alors vide (`$exists` faux, liste
  vide `[]` pour un choix multiple), comme une question sans réponse : `.nsp` permet de les distinguer. `ma_question.groupe`
  vaut `NSP` (code réservé, comme `AUTRE`). Connu seulement si l'option est activée (sinon « Référence inconnue »).
  Ex. : `montant_estime > sys.plafond_expertise or montant_estime.nsp`. `nsp` est un mot réservé.
- **Écrire une expression de suggestions** — Forme attendue : une liste (réponse d'un choix multiple, variable système de
  type liste, champ d'une liste d'objets `sys.liste.champ`, littéral `["a", "b"]`, `$append(…)`). Cas limites : une valeur
  unique donne une seule suggestion ; une valeur vide ou non renseignée n'en donne aucune ; nombres et dates sont affichés
  comme dans un texte interpolé (`12`, `2024-05-06`) ; une valeur en double n'est proposée qu'une fois, à sa première
  position ; une valeur d'option d'un choix cité dans l'expression est proposée (et insérée) par son **libellé** dans la
  langue affichée (`alfa_romeo` → « Alfa Romeo » ; choix cherché dans le questionnaire ou le fragment affiché, sinon dans
  la bibliothèque), jamais `other` : pour ajouter la précision « Autre »,
  écrire `$append(marques, marques_other)`. Seules les questions posées avant le champ et les variables `sys.` sont
  permises ; une question après est signalée (« ⚠ », §15) comme dans toute expression.
- **Combiner** — `=`, `!=`, `<`, `<=`, `>`, `>=` (nombres et dates `AAAA-MM-JJ`) ; `and`, `or`, `$not(…)` ; `'x' in liste` ;
  `$exists(cle)` (est renseigné) ; `$count(…)`, `$sum(…)` ; filtre `liste[champ = 'x']` ; `&` concatène ;
  `a ? b : c` ; `+ - * / %`. Chaînes entre `'…'`.
- **Utiliser les fonctions de date** — `$today()`, `$addDays(date, n)`, `$daysBetween(d1, d2)`, `$age(date)` (âge révolu).
- **Savoir quand une condition est vraie** — Seulement si elle vaut `true`. Une réponse non posée ou vide est absente :
  `absent = 'x'` et `absent != 'x'` sont faux ; tester avec `$exists(cle)`.
- **Insérer une valeur dans un texte** — `{expression}` dans un libellé : `Bonjour {sys.nom_assure}`. C'est la valeur qui
  s'affiche, pas le libellé de l'option. Exceptions : une civilité affiche son libellé dans la langue affichée
  (`{civilite} {nom}` → « Madame Dupont »), un téléphone son format international (`+33 6 12 34 56 78`), quand
  l'expression est la seule référence à la question ; le type est celui de la question de cette clé dans le questionnaire
  ou le fragment affiché, sinon dans la bibliothèque. `{{` et `}}` donnent des accolades.
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
  12. `montant_estime.nsp` (« Ne sais pas » choisie)
  13. `souscripteur.telephone.pays = 'BE'` (pays d'un téléphone)
  14. `$append(marques, marques_other)` (suggestions : options cochées, par leur libellé, et précision « Autre »)

## 9. Contraintes et messages d'erreur

- **Ajouter une règle libre** — Section « Contraintes libres », bouton « Ajouter une règle » : expression « Règle (vraie si
  valide) » (ex. `date_sinistre <= $today()`) et « Message d’erreur » multilingue. Croix (« Supprimer ») pour la retirer.
- **Personnaliser un message d'erreur intégré** — Même section : un champ « Message d’erreur — <règle> » par règle
  applicable (`required`, `minLength`, `maxLength`, `pattern`, `min`, `max`, `numberKind`, `decimals`, `minSelected`,
  `maxSelected`, `format`, `option`, `otherDetail`, `minOccurrences`, `maxOccurrences` ; contrôles intégrés `email`, `phone`,
  `lineType`, `address`, `postalCode`, §6). Vide : message par défaut. Chaque langue du projet a sa ligne.
- **Borner une réponse** — Par les réglages du type (§6) : longueurs, motif, dates, minimum / maximum, sélections, occurrences.
- **Voir une contrainte en action** — Prévisualisation : les messages s'affichent en rouge sous la question après « Suivant ».

## 10. Bibliothèque et fragments

- **Afficher / masquer le panneau latéral de la bibliothèque** — Affiché par défaut à gauche du logigramme (questionnaire
  ou fragment). Bouton « Bibliothèque » de la barre du logigramme ou du bandeau du fragment (info-bulle « Afficher / masquer
  le panneau Bibliothèque ») ou palette. Champ « Filtrer la bibliothèque… ». `[cmd: view.libraryPanel]`
- **Insérer un fragment ou une question de la bibliothèque** — Sélectionner le nœud après lequel insérer, puis `I` (logigramme)
  ou palette « Insérer depuis la bibliothèque » ; choisir l'élément (« Insérer une question ou un fragment… »). Il est relié
  comme avec `N` (entre le nœud et son successeur unique). Aussi : palette `Ctrl+K`, entrées « Insérer : <nom> ». Un
  fragment inséré devient **un seul nœud** (« Fragment », nom, alias, « n question(s) », « bib. »), avec un alias libre
  (sa clé, suffixée si elle est prise). Dans un fragment, les fragments qui créeraient un **cycle d'appels** (lui-même, ou
  un fragment qui l'appelle déjà) ne sont pas proposés ; l'insertion est refusée (« Insertion refusée »). `[cmd: library.insert]` `[cmd: library.insertItem]`
- **Insérer depuis le panneau latéral** — Glisser l'élément sur le logigramme : il est posé à cet endroit, sans liaison ;
  ou double-clic (ou `Entrée`) : inséré à la suite du nœud sélectionné. `[cmd: library.insertItem]`
- **Créer une question de bibliothèque** — Onglet « Bibliothèque », « + » de la rubrique « Questions » (« Nouvelle question
  de bibliothèque »), ou palette. Elle se règle comme une question locale ; toute modification vaut pour tous ses usages. `[cmd: library.newQuestion]`
- **Copier une question dans la bibliothèque** — Sélectionner la question locale, bouton « Copier dans la bibliothèque »
  (section « Bibliothèque » du panneau de propriétés) ou palette. Sa définition complète (intitulé, type, aide, options et groupes,
  champs, contraintes, messages) passe en bibliothèque ; le nœud devient une référence (badge « bib. ») au même endroit, avec
  les mêmes arêtes et conditions, et garde sa clé : les expressions ne changent pas. Si la clé existe déjà dans la bibliothèque,
  un dialogue demande une « Nouvelle clé » (proposée suffixée) : « Copier » reste grisé tant que la clé est invalide ou prise
  (bibliothèque ou questionnaire) ; la question est alors renommée et la fenêtre « Copie faite : références réécrites » liste
  les expressions modifiées. Bouton et commande absents sur une référence de bibliothèque. `Ctrl+Z` annule. `[cmd: node.toLibrary]`
- **Reformuler une question de bibliothèque dans un questionnaire** — Sélectionner la référence (badge « bib. ») : seuls
  « Intitulé », « Caractère obligatoire » et, pour une structure, « Champs affichés » sont modifiables (« Intitulé surchargé localement. ») ; « Reprendre l’intitulé de la bibliothèque » annule la surcharge.
- **Surcharger le caractère obligatoire d'une question de bibliothèque** — Sélectionner la référence (badge « bib. »), dans
  un questionnaire ou dans un fragment : liste « Caractère obligatoire » : « Hérité (Obligatoire, bibliothèque) » (ou
  « Facultatif », « Obligatoire sous condition »), « Obligatoire », « Facultatif ». Dessous, « Valeur effective : … (provenance) »
  (« surcharge locale » quand elle est posée ici). Seule **cette utilisation** change : la bibliothèque et les autres
  utilisations gardent leur valeur. Le nœud porte le badge « surch. » et son badge `*` suit la valeur effective. En
  « Hérité », l'utilisation suit les modifications ultérieures de la bibliothèque ; une surcharge reste figée, même si
  elle était égale à la valeur héritée. `Ctrl+Z` annule.
- **Surcharger le caractère obligatoire d'une question d'un fragment utilisé** — Dans l'appelant (questionnaire, ou
  fragment qui en inclut un autre), sélectionner le nœud fragment : la liste « Questions du fragment : caractère obligatoire »
  montre chaque question (`alias.cle`, fragments inclus compris : `alias.sous_alias.cle`) avec le même sélecteur et sa
  valeur effective ; « Surchargé » repère celles surchargées dans cet appel, et le nœud fragment porte le badge « surch. ».
  « Hérité » affiche la valeur et sa provenance (« bibliothèque » ou « fragment <titre> » quand elle est fixée dans le
  fragment ; sa clé s'il n'a pas de titre). Règle : **le niveau le plus proche de l'utilisation l'emporte** — l'appelant le plus externe, puis chaque
  fragment intermédiaire, puis la référence dans le fragment, puis la bibliothèque. Ex. : `Q_TEL` facultative en
  bibliothèque, « Obligatoire » dans le fragment « Coordonnées » ; le formulaire « Adhésion » qui l'appelle sans surcharge
  l'exige (« Hérité (Obligatoire, fragment Coordonnées) ») ; le formulaire « Demande de rappel » la règle sur
  « Facultatif » pour lui seul. Une surcharge dont la question a disparu du fragment est ignorée.
  En prévisualisation, l'astérisque de chaque page suit la valeur après surcharge de cet appel (§12, « Voir quelles
  questions sont exigées »).
- **Revenir à la valeur héritée** — Choisir « Hérité » dans la liste, ou bouton « Revenir à la valeur héritée » (sous la
  liste d'une référence ; sous la liste des questions d'un nœud fragment, il retire **toutes** les surcharges de l'appel),
  ou palette sur la référence ou le nœud fragment sélectionné. La valeur effective redevient celle du niveau supérieur.
  `[cmd: node.resetRequired]`
- **Masquer des champs d'une structure de bibliothèque** — Sélectionner la référence d'une structure : la liste « Champs
  affichés » du panneau montre chaque champ, dans l'ordre de la bibliothèque, avec une case « affiché ». Décocher masque le
  champ **dans ce questionnaire seulement** (ni la bibliothèque ni les autres usages ne changent) ; le dernier champ affiché
  ne peut pas être décoché. Un champ masqué n'est pas présenté dans la prévisualisation, même s'il est obligatoire. Le nœud
  affiche « n / m champs ». Un champ ajouté plus tard à la structure en bibliothèque apparaît affiché partout. Si une expression
  du questionnaire utilise le champ masqué (dans un fragment, aussi une expression `alias.cle.champ` de ses appelants), la
  fenêtre « Champ masqué encore référencé : … » liste ces expressions — celles d'un appelant précédées de « appelant « … » »,
  son titre (sa clé s'il n'en a pas) —, et la
  vérification « Champ masqué « … » » les signale (§15). Recocher pour réafficher ; `Ctrl+Z` annule.
- **Ouvrir la question d'une référence** — Bouton « Ouvrir dans la bibliothèque » du panneau, ou palette. `[cmd: node.openInLibrary]`
- **Ouvrir l'objet lié depuis son badge « bib. »** — Dans le logigramme (questionnaire, fragment ou vue côte à côte),
  double-cliquer le badge « bib. » d'une question de bibliothèque ou d'un nœud fragment (info-bulle « Double-clic pour
  ouvrir dans la bibliothèque »). Une question s'ouvre dans l'onglet « Bibliothèque », sélectionnée dans la liste (déroulée
  jusqu'à elle) et affichée à droite ; un fragment s'ouvre dans son onglet. Le double-clic sur le badge n'édite pas
  l'intitulé du nœud ; ailleurs sur le nœud, il l'édite comme avant ; un simple clic sélectionne le nœud. Pas de retour
  automatique : l'onglet du questionnaire reste ouvert, ses modifications non enregistrées sont conservées. Objet
  supprimé de la bibliothèque (lien rompu) : fenêtre « Objet de bibliothèque introuvable », on reste sur le questionnaire.
  Dans l'outline de la prévisualisation (lecture seule), ce double-clic est sans effet (ni info-bulle).
  `[cmd: library.openRef]`
- **Afficher un élément de la bibliothèque** — Onglet « Bibliothèque », cliquer l'élément dans la liste de gauche (« Jeux de
  libellés », « Questions », « Fragments »). Une question s'affiche à droite (« Utilisé dans : … » liste les questionnaires
  et fragments qui l'emploient) ; un fragment s'ouvre dans son onglet. `[cmd: library.show]`
- **Supprimer un élément de la bibliothèque** — L'afficher (question) ou ouvrir son onglet (fragment), bouton « Supprimer ».
  Sans confirmation (sauf élément commenté) : ses références deviennent « Élément de bibliothèque introuvable ». `Ctrl+Z` dans l'onglet
  Bibliothèque l'annule. `[cmd: library.delete]`
- **Créer un fragment** — Onglet « Bibliothèque », « + » de la rubrique « Fragments » (« Nouveau fragment »), ou palette
  « Nouveau fragment ». Il s'ouvre dans un **onglet** (icône ambre), avec un bandeau « Fragment de la bibliothèque · n
  appelant(s) : … » (ou « aucun appelant »), et s'édite **comme un questionnaire** : mêmes touches (`N`, `Shift+N`, `I`,
  `E`, `Ctrl+D`…), même panneau de propriétés, panneau latéral de la bibliothèque, « Problèmes ». « Définir comme départ »
  et « Nouvelle fin » y sont indisponibles ; un fragment n'a pas de sous-onglet « Prévisualisation » (il se prévisualise
  dans un questionnaire qui l'appelle). `[cmd: library.newFragment]`
- **Dupliquer un élément de la bibliothèque** — Onglet « Bibliothèque », clic droit sur une question ou un fragment de la
  liste, « Dupliquer » ; pour un fragment, aussi clic droit sur son onglet ; ou palette « Dupliquer l’élément de bibliothèque »
  (question affichée ou fragment de l'onglet actif). La copie, « Copie de <nom> » (puis « Copie 2 de… »), clé suffixée,
  est placée juste après l'original et s'ouvre. Elle n'a **aucun appelant** : les questionnaires qui utilisaient l'original
  l'utilisent toujours. Un fragment dupliqué qui appelle un autre fragment appelle toujours le même (pas de copie en
  cascade). Annulable (`Ctrl+Z` dans l'onglet Bibliothèque ou un fragment). `[cmd: library.duplicate]`
- **Régler un fragment** — Sous le bandeau : « Titre du fragment », « Clé du fragment », « Description (pour l’équipe de dev) ».
- **Comprendre l'entrée et les sorties d'un fragment** — L'**entrée** est le nœud sans arête entrante (badge « Entrée ») :
  c'est la première page du fragment. Les **sorties** sont tous les nœuds sans arête sortante : après leur page, le
  parcours reprend sur les arêtes du nœud fragment dans l'appelant.
- **Définir l'entrée d'un fragment** — Utile si le fragment boucle sur son premier nœud ou a plusieurs nœuds sans arête
  entrante (« Fragment sans entrée unique »). Sélectionner le nœud, bouton « Définir comme entrée du fragment » (section
  « Entrée ») ou palette. Sur l'entrée réglée, le bouton « Revenir à l’entrée implicite » la retire (la palette aussi). `[cmd: node.setEntry]`
- **Ajouter une sortie nommée à un fragment** — Facultatif (les sorties implicites suffisent). Dans le logigramme du
  fragment, palette « Nouvelle sortie nommée » : nœud « Sortie » relié au nœud sélectionné, nommé `sortie`, `sortie_2`…
  Régler « Nom de la sortie » (snake_case ; renommer suit dans les appelants) et « Libellé (facultatif) ». Chez l'appelant,
  le nœud fragment a alors une poignée par sortie nommée (§4). `[cmd: node.newExit]`
- **Extraire une sélection en fragment** — Sélectionner des nœuds d'un questionnaire puis `Ctrl+G` (logigramme) ou palette
  « Extraire la sélection en fragment ». Crée un fragment « Nouveau fragment » et remplace la sélection par un nœud fragment
  (une sortie nommée par destination extérieure ; références de l'appelant préfixées par l'alias). Refusé si la sélection a
  plusieurs entrées, ou contient une fin, une sortie ou un nœud Renvoi (« Extraction en fragment impossible »). Annulable. `[cmd: node.group]`
- **Appeler un fragment au milieu du parcours** — L'insérer après le nœud voulu (`I`), puis continuer à la suite du nœud
  fragment (`N`, ou une liaison depuis sa poignée). Dans la prévisualisation, les questions du fragment s'enchaînent entre
  les deux comme si elles étaient saisies dans le questionnaire.
- **Commencer un questionnaire par un fragment** — Sélectionner le nœud fragment, « Définir comme départ » (§3) : la
  prévisualisation commence par la première question du fragment.
- **Lire les propriétés d'un nœud fragment** — Le sélectionner : section « Appel de fragment » : fragment référencé (nom,
  clé), « Alias », « Sorties du fragment » (clé des nœuds de sortie, `→ nom` pour une sortie nommée), « Clés attendues de
  l’appelant » (clés de l'appelant lues par le fragment ; « absente » en rouge si ce questionnaire ne les a pas), bouton
  « Ouvrir le fragment ».
- **Renommer l'alias d'un nœud fragment** — Champ « Alias » (préfixe `alias.cle`), validé en quittant le champ ou par
  `Entrée` ; propagé aux expressions de l'appelant (et des appelants de l'appelant). Un alias déjà utilisé dans le graphe
  (clé d'une question ou autre alias) est refusé : « Clé invalide : snake_case, unique. », l'ancien alias revient.
- **Ouvrir le fragment d'un nœud fragment** — Bouton « Ouvrir le fragment ↗ » sur le nœud, bouton « Ouvrir le fragment »
  du panneau, ou palette « Ouvrir le fragment ». Une modification du fragment vaut pour tous ses appelants. `[cmd: node.openFragment]`
- **Voir le contenu d'un nœud fragment** — Bouton « ▸ Déplier » sur le nœud (lecture seule : questions `alias.cle`, appels
  `alias.sous_alias`, sorties nommées) ; « Replier » pour refermer.
- **Appeler deux fois le même fragment** — L'insérer deux fois : chaque nœud reçoit un alias distinct (`assure`,
  `conjoint`) et ses propres réponses (`assure.nom`, `conjoint.nom`).
- **Faire appeler un fragment par un autre** — Dans l'onglet du fragment, l'insérer comme dans un questionnaire (`I`) ;
  ses questions sont vues `alias.cle` dans le fragment et `alias.sous_alias.cle` chez l'appelant extérieur.
- **Créer un jeu de libellés** — Onglet « Bibliothèque », entrée « Jeux de libellés », bouton « + Booléen »,
  ou palette « Nouveau jeu de libellés booléen ». Puis « Clé », « Vrai (oui) », « Faux (non) ». Pour « ne sait pas »,
  régler le libellé de l'option « Ne sais pas » de la question (§5). `[cmd: labelSet.addBoolean]`
- **Supprimer un jeu de libellés** — Bouton « Supprimer » de sa carte. Les questions qui l'utilisaient affichent les libellés
  par défaut et sont signalées « Élément de bibliothèque introuvable » : leur choisir un autre jeu. `[cmd: labelSet.delete]`

## 11. État du système et scénarios

- **Déclarer une variable de l'état du système** — Onglet « État du système », bouton « Nouvelle variable de l’état du
  système » (ou palette) : variable `variable` de type texte, nom en édition. `[cmd: system.addVariable]`
- **Renommer une variable** — Champ « Nom » (snake_case, unique), validé en quittant le champ ou par `Entrée`. Met à jour
  expressions et scénarios ; un seul `Ctrl+Z` annule tout. `[cmd: system.renameVariable]`
- **Donner un libellé à une variable** — Champ « Libellé », à côté du « Nom » sur la carte de la variable : texte libre sur
  une ligne, une seule langue (ex. « Profil connecté »). Pour une liste d'objets, chaque champ du « Schéma des objets de la
  liste » a aussi sa saisie « Libellé ». Le libellé apparaît dans l'autocomplétion des expressions, au survol de `sys.…`,
  dans l'éditeur de scénarios et le panneau « État du système » de la prévisualisation, en face de la valeur. On écrit
  toujours la clé dans les expressions. Vider le champ retire le libellé ; saisie et effacement s'annulent par `Ctrl+Z` une fois sorti du champ (ou palette « Annuler »).
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
  Une option d'un groupe s'y affiche « Groupe — Option » (ex. « Victime directe — Conjoint ») ; « Ne sais pas », par son libellé.
- **Tester un nœud Renvoi** — La page affiche le titre, le texte, puis les boutons dans l'ordre (seulement ceux sans
  condition ou dont la condition est vraie), avec les icônes des cases cochées. Un bouton en erreur (sans libellé, sans cible
  ou cible introuvable) est affiché mais ne fait rien. Bouton vers un **questionnaire** : fenêtre « Prévisualisation :
  renvoi » qui nomme la cible et les options activées (« Aucune option activée. » sinon) ; la page et les réponses restent.
  Bouton vers un **nœud** déjà passé dans ce parcours : retour à ce nœud, réponses conservées, comme depuis une synthèse,
  puis « Revenir au renvoi » ; nœud non passé : message, la page reste. Si toutes les sorties du Renvoi mènent à une fin,
  « Terminer » (ou son libellé) remplace « Suivant » et affiche la fin (sous réserve d'une réponse invalide sur le chemin) ;
  « Précédent » fonctionne comme ailleurs.
- **Comprendre un retour forcé avant la fin** — Une réponse devenue invalide (option disparue après un changement d'état du
  système…) empêche d'atteindre la fin : le wizard ramène à la question avec son message jusqu'à correction.
- **Naviguer sans saisir de valeurs** — Bouton « Contrôles de saisie » de la barre de prévisualisation (activé par défaut),
  ou palette « Activer / désactiver les contrôles de saisie de la prévisualisation ». Désactivés : un bandeau « Contrôles de
  saisie désactivés » s'affiche ; « Suivant », « Revenir à la synthèse » et la fin ne sont plus bloqués par l'obligatoire,
  les formats, bornes, longueurs, nombres de réponses ou contraintes ; aucun message d'erreur ; les valeurs saisies, même
  invalides, sont gardées. Les conditions des arêtes et d'affichage s'appliquent toujours, sur les réponses vides comprises
  (une condition non évaluable est fausse : la branche « sinon » est suivie). Réactivés : la page courante est contrôlée au
  prochain « Suivant » ; les pages déjà franchies ne sont pas revérifiées. L'état est gardé tant que l'éditeur reste ouvert
  (changement de questionnaire ou de projet compris) et n'est jamais enregistré dans le projet. `[cmd: preview.toggleChecks]`
- **Voir quelles questions sont exigées** — L'astérisque rouge reflète l'obligation **après surcharge** (§10) : une question
  obligatoire surchargée « Facultatif » s'affiche sans astérisque et peut rester vide ; une question facultative surchargée
  « Obligatoire » a son astérisque et bloque « Suivant » si elle est laissée vide ; un intitulé surchargé ne change rien ;
  sans surcharge, c'est la définition. Une même question peut donc avoir l'astérisque dans un formulaire ou un appel de
  fragment et pas dans un autre. Astérisque et blocage vont toujours ensemble (contrôles de saisie activés, hors « Ne sais pas » coché) : une question « obligatoire sous condition »
  (sans surcharge) a son astérisque dès que sa condition est vraie avec les réponses déjà données (et l'état du système),
  recalculé à chaque affichage de la page. Une question non présentée (chemin non emprunté, champ masqué) n'est jamais exigée.
- **Afficher l'outline du logigramme** — Bouton « Outline » de la barre de prévisualisation, ou palette « Afficher / masquer
  l’outline du logigramme ». Un panneau à droite du wizard montre le logigramme du questionnaire en lecture seule (rien ne
  s'y déplace ni ne s'y modifie) ; le wizard occupe la largeur restante. Masqué, la prévisualisation est inchangée. L'état
  affiché / masqué est gardé pendant la session (changement d'onglet compris), jamais enregistré dans le projet. `[cmd: preview.toggleOutline]`
- **Suivre la page dans l'outline** — À chaque changement de page (« Suivant », « Précédent », branche, saut, clic dans la synthèse), l'outline se
  recentre sur le nœud de la page affichée, entouré en vert (page d'un fragment : le nœud fragment), avec ses voisins
  immédiats visibles si possible. On peut zoomer (molette) ou déplacer la vue (glisser le fond) : le changement de page
  suivant recentre.
- **Revenir à une question depuis l'outline** — Cliquer une question active : le wizard l'affiche avec sa réponse, les
  autres réponses sont conservées et « Précédent » remonte le parcours. Sont actives les questions déjà affichées depuis
  « Recommencer » et situées sur le parcours que donnent les réponses actuelles, y compris celles qui suivent la page
  courante après un retour arrière. Les autres questions sont grisées et le clic est sans effet : jamais affichées, ou
  hors du parcours dès qu'une réponse le change (ex. « Oui » devenu « Non »). Un clic sur un nœud qui n'est pas une question
  (fragment, information, synthèse, fin) ne fait rien.
- **Retrouver le nœud d'une page** — Cliquer la page : le nœud est sélectionné dans le logigramme (visible en revenant au logigramme) ;
  pour une page d'un fragment, le nœud fragment du questionnaire.
- **Parcourir un fragment** — Ses pages s'enchaînent sans rupture avec celles du questionnaire ; « Précédent » traverse le
  fragment normalement. Sa réponse est rangée sous l'alias (`ident.nom` dans « Valeurs courantes »).
- **Afficher le débogage** — Bouton « Débogage » ou palette : « Chemin parcouru », « Conditions évaluées (page courante) »
  (arête suivie surlignée, `true` / `false` / « sinon » / « erreur »), « Valeurs courantes » (réponses et `sys` ; le groupe
  de l'option choisie apparaît sous `<clé>_group`, « Ne sais pas » sous `<clé>_nsp`, le pays d'un téléphone ou d'une adresse
  sous `<clé>_pays`, à côté de la valeur normalisée). Sur une page d'un fragment, un bandeau « Dans le fragment : »
  donne le chemin des alias et le nom du fragment ; le chemin parcouru écrit ses questions `alias.cle`. Sur la dernière page
  d'un fragment (ou quand l'arête retenue mène à une sortie nommée), « Puis, à la sortie du fragment : » liste ensuite les
  arêtes du nœud fragment de l'appelant, évaluées avec ses réponses. `[cmd: preview.toggleDebug]`
- **Changer la langue de la prévisualisation** — Liste « Langue » de la barre, ou palette « Langue de la prévisualisation
  suivante » (plusieurs langues). Un bandeau compte les textes non traduits, affichés dans la langue par défaut. `[cmd: preview.lang]`
- **Ne pas voir les commentaires** — Les commentaires de révision (§16) n'apparaissent jamais dans le wizard.
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
- **Champ masqué « … » : il ne sera jamais renseigné** — Une expression lit un champ masqué d'une structure de bibliothèque
  (§10) → recocher « affiché » sur la référence, ou retirer le champ de l'expression.
- **Clé en double « … »** — Deux questions (ou variables) avec la même clé → renommer l'une (« Clé » ou « Nom »).
- **Clé invalide « … » (snake_case attendu)** — Minuscules, chiffres et `_`, commençant par une lettre → renommer.
- **Nœud inaccessible depuis le départ** — Aucune arête n'y mène (depuis l'entrée, dans un fragment) → le relier, le supprimer ou changer le départ.
- **Nœud sans sortie qui n’est pas une fin** — Ajouter une arête sortante ou une fin (`Alt+F`). Jamais signalé dans un fragment :
  ses nœuds sans arête sortante sont ses sorties.
- **Sortie « … » du fragment non raccordée** — Tirer une liaison depuis la poignée de cette sortie nommée sur le nœud fragment.
- **Sortie « … » inconnue dans le fragment** — La sortie a été renommée ou supprimée → choisir une sortie dans « Sortie du fragment » de l'arête.
- **Sorties du fragment non raccordées : aucune arête sans nom de sortie** — Ajouter une arête sans sortie nommée (« Toute sortie »).
- **Fragment sans entrée unique (n nœuds sans arête entrante)** — Relier les nœuds isolés, ou « Définir comme entrée du
  fragment » sur le bon nœud (§10). En attendant, le parcours entre par le premier de ces nœuds.
- **Fragment sans sortie (aucun nœud sans arête sortante)** — Le fragment boucle sans fin → laisser au moins un nœud sans arête sortante.
- **Cycle d’appels : ce fragment s’appelle lui-même** — A appelle B qui appelle A → supprimer l'un des nœuds fragment.
- **Fragment inutilisé** — Aucun questionnaire ni fragment ne l'appelle → l'insérer, ou le supprimer.
- **Fin dans un fragment : le parcours s’y termine** — Hérité d'un ancien bloc → remplacer la fin par une sortie (nœud sans arête sortante).
- **Clé « … » attendue par le fragment « … » absente** — Signalé dans le questionnaire qui appelle le fragment, sur le
  nœud fragment : le fragment lit une clé de son appelant que celui-ci n'a pas → ajouter la question à l'appelant, ou
  corriger le fragment. Si aucun appelant ne la fournit, le fragment affiche aussi « Référence inconnue ».
- **Boucle sans sortie possible** — Ajouter une arête qui quitte la boucle (condition ou « sinon »).
- **Plusieurs sorties sans « sinon »** — Le parcours peut se bloquer → vider la condition d'une des arêtes ou en ajouter une sans condition.
- **Plusieurs arêtes sans condition : seule la première sert** — Donner une condition aux autres ou les supprimer.
- **« … » n’est pas posée sur tous les chemins menant ici** — Garder la référence derrière `$exists(cle)` ou revoir le graphe.
  Pour une question de bibliothèque, signalé dans chaque questionnaire et chaque fragment qui l'utilise, sur sa référence.
- **Traduction manquante (…) : …** — Saisir le texte dans la langue indiquée (§13). Vaut aussi pour le libellé d'un groupe d'options.
- **Groupe d’options en double « … »** — Deux groupes d'une question ont le même code (ou, sans code, le même libellé) →
  donner un « Code du groupe » distinct (§7).
- **Code de groupe réservé « … » (« Autre (préciser) » ou « Ne sais pas »)** — Les codes `AUTRE` (« Autre (préciser) ») et `NSP` (« Ne sais pas ») sont réservés → choisir un autre code.
- **Groupe d’options sans option « … »** — Ajouter des options sous la ligne `#` du groupe, ou supprimer le groupe.
- **Élément de bibliothèque introuvable « … »** — Référence vers un élément supprimé → supprimer le nœud ou réinsérer un élément.
- **Nœud de départ introuvable** — « Définir comme départ » sur un nœud (§3).
- **Le nœud Renvoi n'a aucun bouton.** — « Ajouter un bouton » dans son panneau (§3).
- **Le bouton n'a pas de libellé.** / **Le bouton n'a pas de cible.** — Saisir le libellé, choisir la « Cible » du bouton.
- **La cible du bouton « … » est introuvable.** — Le questionnaire ou le nœud visé a été supprimé → choisir une autre cible
  (l'ancienne reste affichée « (introuvable) »), ou supprimer le bouton.
- **Plusieurs boutons de ce nœud visent la cible « … ».** — Avertissement : changer la cible d'un des boutons, ou le supprimer.
- **Une déclaration liée doit précéder une fin : activez annule et remplace ou déplacez le nœud.** — Bouton vers un
  questionnaire, « Annule et remplace » décoché, sur un Renvoi dont les sorties ne mènent pas toutes directement à une fin.
- **La cible du bouton « … » n'est pas toujours parcourue avant ce nœud.** — Un chemin mène au Renvoi sans passer par la
  cible nœud (ou la cible est en aval) → choisir une cible commune à tous les chemins, ou revoir le graphe. La condition
  d'affichage d'un bouton est vérifiée comme toute expression (syntaxe, références, « n’est pas posée sur tous les chemins »).
- **Problèmes du dictionnaire** — Nom de variable ou de champ invalide ou en double : signalé en rouge sur la carte de la
  variable (onglet « État du système ») → la renommer.

## 16. Commentaires de révision

Un commentaire mène la revue d'une question dans l'outil : un texte initial puis des réponses successives, en texte brut
multiligne. Il est rangé dans l'objet où il a été créé (questionnaire, fragment ou question réutilisable), une question en
porte au plus un, et il est **sans effet** sur le questionnaire (expressions, vérifications, wizard). Les commentaires
d'un fragment ou d'une question réutilisable ne se voient pas depuis un questionnaire qui les utilise : seulement dans
l'objet lui-même et sur la page des commentaires.

- **Commenter une question** — Clic droit sur une question d'un questionnaire ou d'un fragment (une instance de question
  de bibliothèque comprise : le commentaire reste dans ce questionnaire), « Commenter » ; ou sélectionner la question puis
  palette « Commenter ». Un nœud commentaire apparaît à droite de la question, relié par une branche en pointillés, le
  curseur dans le texte initial. Si la question a déjà un commentaire, il est simplement affiché. Une question interne à un
  fragment se commente dans l'onglet du fragment, pas depuis l'appelant. `[cmd: comment.add]`
- **Commenter une question réutilisable** — Onglet Bibliothèque, clic droit sur la question dans la liste, « Commenter » :
  le commentaire s'affiche en tête de la vue de la question (toujours affiché, elle n'a pas de logigramme). `[cmd: comment.add]`
- **Répondre** — Bouton « Répondre » du commentaire : une nouvelle carte s'ajoute en fin de fil, en saisie. On répond au
  commentaire, pas à une réponse ; nombre de réponses illimité. `[cmd: comment.reply]`
- **Modifier le texte initial ou une réponse** — Cliquer dans le texte et le modifier, à tout moment (`Entrée` = nouvelle ligne).
  Annulable (`Ctrl+Z` hors du champ, historique de l'objet).
- **Supprimer une réponse** — Croix de la carte de la réponse : seule cette réponse disparaît. `[cmd: comment.deleteReply]`
- **Supprimer le commentaire** — Bouton « Supprimer le commentaire » (ou palette, question sélectionnée) : texte initial et
  réponses disparaissent, ainsi que l'icône de la question. Le texte initial ne se supprime pas seul. Annulable. `[cmd: comment.delete]`
- **Afficher ou masquer un commentaire** — Icône bulle de la question (palette « Afficher / masquer le commentaire », question
  sélectionnée) ; icône œil barré du nœud commentaire pour le masquer. Masquer ne supprime rien : l'icône de la question reste. `[cmd: comment.toggle]`
- **Afficher ou masquer tous les commentaires** — Bouton « Commentaires » de la barre du logigramme (bandeau d'un fragment),
  ou palette : affiche tous ceux de l'objet ouvert si l'un est masqué, sinon les masque tous. À l'ouverture du projet, tous
  sont masqués ; l'affichage n'est pas sauvegardé. `[cmd: comment.toggleAll]`
- **Placer un commentaire** — Glisser le nœud commentaire (par son en-tête) : la branche part du côté gauche ou droit de la
  question selon qu'il est à sa gauche ou à sa droite. La position est sauvegardée ; la mise en page automatique déplace le
  commentaire avec sa question. L'image du logigramme montre les commentaires affichés.
- **Ouvrir la page des commentaires** — Lien « Commentaires » à droite des onglets, ou palette « Commentaires » : tous les
  commentaires du projet, avec leur objet (questionnaire, fragment, question réutilisable) et la question commentée.
  Toutes les actions d'édition y sont disponibles ; une modification y est aussitôt visible dans le logigramme, et réciproquement. `[cmd: tab.comments]`
- **Aller au commentaire** — Bouton « Ouvrir » d'un commentaire de la page : l'objet s'ouvre (logigramme), ses commentaires
  affichés, la vue centrée sur le commentaire et sa question sélectionnée. Pour une question réutilisable, c'est sa vue
  dans l'onglet Bibliothèque qui s'ouvre, le commentaire en tête. `[cmd: comment.open]`
- **Supprimer une question commentée** — Confirmation demandée (logigramme ou bibliothèque, y compris pour un fragment
  dont des questions sont commentées) ; le commentaire est supprimé avec la question. Dupliquer ou coller des nœuds, dupliquer un questionnaire ou un fragment ne copie pas les commentaires ;
  extraire une sélection en fragment y emporte leurs commentaires.

## 17. Valider un formulaire

Un formulaire **validé** est relu et approuvé par les métiers, donc livrable aux développeurs. Il porte le marqueur
« Validé » (icône et badge) sur son onglet (et sur son bouton de réouverture s'il est fermé) et en haut à gauche du
logigramme ; le survol indique la date de validation. L'état est enregistré dans le fichier du questionnaire et exporté.
Chaque formulaire se valide indépendamment des autres. Un formulaire non validé s'affiche et se modifie comme avant.

- **Valider le formulaire** — Bouton « Valider le formulaire » de la barre du logigramme, ou palette : le formulaire
  affiché passe à l'état validé (date du jour). Annulable (`Ctrl+Z`). Refusé si sa version est vide (« Validation
  impossible : saisissez une version… », section 18). La validation mémorise la version des éléments de bibliothèque qu'il
  utilise ; s'il en utilise un **provisoire**, la fenêtre « Éléments de bibliothèque provisoires » les liste, sans
  empêcher la validation. `[cmd: questionnaire.validate]`
- **Consulter un formulaire validé** — Il est en **lecture seule** : on ne peut plus modifier ses questions, réponses,
  propriétés, expressions, ni ses nœuds et arêtes (créer, relier, déplacer, supprimer, changer le rang, le départ), ni son
  titre, sa clé, sa description ou sa version, quel que soit le moyen : panneau de propriétés (champs grisés), logigramme (nœuds
  figés, ni liaison, ni dépôt depuis la bibliothèque, ni édition en place), raccourcis, palette, collage, mise en page
  automatique, import d'un fichier de questionnaire. Une tentative affiche « Formulaire validé : modification impossible ».
  Restent possibles : sélectionner, lire les propriétés, prévisualiser, exporter, copier des nœuds vers un autre
  formulaire, dupliquer le formulaire (la copie n'est pas validée), et les **commentaires de révision** (section 16),
  toujours éditables et déplaçables.
- **Modifier un élément partagé** — La bibliothèque et l'état du système restent modifiables ; leurs changements
  s'appliquent par référence au formulaire validé. Un renommage qui réécrirait le formulaire validé (clé de bibliothèque
  ou variable qu'il utilise) est refusé en entier, avec le même message.
- **Dévalider** — Bouton « Dévalider » (à la place de « Valider le formulaire »), ou palette : une confirmation est
  demandée ; « Annuler » laisse le formulaire validé. Confirmé, le marqueur disparaît et le formulaire redevient
  modifiable. `[cmd: questionnaire.unvalidate]`
- **Annuler / rétablir autour d'une validation** — Valider et dévalider sont des étapes de l'historique du formulaire :
  `Ctrl+Z` juste après une validation la retire, `Ctrl+Shift+Z` la rétablit. Tant que le formulaire est validé, seuls les
  commentaires de révision entrent encore dans son historique : remonter plus loin les annule d'abord, puis la validation.

## 18. Versions des questionnaires et des éléments de bibliothèque

Chaque questionnaire et chaque élément de bibliothèque (question ou fragment) porte une **version** libre et un **statut**
« Validé » (final) ou « Provisoire ». L'outil n'impose ni format ni incrément (convention recommandée : `X.Y.Z`) et ne
compare pas les versions : par convention, la version en production est la plus haute qu'un questionnaire ait obtenue.
Sans version, tout fonctionne comme avant, sauf la validation (refusée) et le suffixe de statut des fichiers exportés.

- **Saisir la version d'un questionnaire** — Rien sélectionné : champ « Version » en tête du panneau de propriétés, avec
  le statut « Validé » / « Provisoire » à côté. La saisie est enregistrée telle quelle ; vide tant que le questionnaire
  est provisoire, si on veut. `Ctrl+Z` annule. `[cmd: questionnaire.setVersion]`
- **Version figée par la validation** — Tant que l'objet est validé, le champ « Version » est grisé (info-bulle
  « Désactiver la validation pour modifier la version »). Pour changer de version : dévalider, modifier la version,
  revalider. Dévalider puis revalider sans toucher à la version est permis (correction sans nouvelle livraison).
- **Saisir la version d'un élément de bibliothèque** — En tête de la question (onglet « Bibliothèque ») ou dans le
  bandeau du fragment (son onglet) : champ « Version », statut, et dessous « Questionnaires qui l’utilisent : … »
  (directement ou par un fragment, « (validé) » après ceux qui le sont), ou « Aucun questionnaire ne l’utilise. ».
  `[cmd: library.setVersion]`
- **Valider / dévalider un élément de bibliothèque** — Bouton « Valider » (« Dévalider » une fois validé) à côté du
  statut, ou palette « Valider l’élément de bibliothèque » / « Dévalider l’élément de bibliothèque » sur l'élément
  affiché. Valider sans version est refusé (« Validation impossible »). Dévalider ne demande pas de confirmation. La
  validation d'un élément ne fige que sa version : son contenu reste modifiable (et s'applique à ses usages).
  `Ctrl+Z` annule. `[cmd: library.validate]` `[cmd: library.unvalidate]`
- **Repérer un questionnaire à faire évoluer** — Quand la version d'un élément de bibliothèque utilisé par un formulaire
  **validé** change, le logigramme de ce formulaire affiche en haut à gauche l'alerte « Éléments de bibliothèque modifiés
  depuis la validation » avec une ligne par élément (« Vos coordonnées : 2.1.0 → 2.2.0 »). Elle ne bloque rien ; pour la
  lever, dévalider le formulaire, lui donner une nouvelle version, puis le revalider (la revalidation mémorise les
  nouvelles versions). Un projet antérieur (sans versions) n'affiche aucune alerte.
- **Dupliquer** — La copie d'un questionnaire ou d'un élément de bibliothèque garde sa version mais est provisoire.
- **Exporter** — Le nom des fichiers et leur contenu (version, statut, versions des éléments utilisés) : section 1,
  « Exporter les fichiers unitaires ». Les éléments de bibliothèque restent dans `bibliotheque.json`, avec leur version et
  leur statut.

## Ce que l'outil ne fait pas

- **Supprimer un questionnaire** : aucune action ; on peut seulement fermer son onglet.
- **Couper des nœuds** (`Ctrl+X`), **copier vers un autre projet**, garder un lien entre une copie et son original.
- **Changer la cible ou l'origine d'une arête** : la supprimer et la retracer.
- **Imbriquer** : pas de structure dans une structure ; une sortie nommée n'existe que dans un fragment ; un fragment ne
  peut pas s'appeler lui-même, même indirectement (un fragment peut en appeler un autre).
- **Prévisualiser un fragment seul** : il se prévisualise dans un questionnaire qui l'appelle (pas de départ ni de fin).
- **Glisser-déposer des options ou des champs** : utiliser les flèches.
- **Construire une condition à la souris** : les expressions s'écrivent en texte ; seuls la syntaxe et les noms sont vérifiés, pas les types.
- **Conserver les itérations d'une boucle** : un nouveau passage remplace la réponse ; utiliser une structure répétable.
- **Modifier plusieurs nœuds à la fois** dans le panneau de propriétés (seuls copier, dupliquer, supprimer, extraire en fragment agissent sur une sélection).
- **Rechercher / remplacer** dans les textes ; **traduire automatiquement**.
- **Exporter autre chose que du JSON et l'image PNG du logigramme** (pas de PDF, de formulaire final).
- **Exporter le logigramme en SVG** : un SVG produit par capture de l'écran n'est qu'un bloc HTML enveloppé (`foreignObject`),
  que Word, PowerPoint et la plupart des éditeurs vectoriels n'affichent pas ; seul le PNG est proposé.
- **Travailler à plusieurs** ou sur un serveur : la sauvegarde automatique reste dans le navigateur ; partager par l'export.
- **Annuler après un rechargement** de la page, ou annuler « Nouveau projet », « Ouvrir l’exemple… », l'import d'un projet.
- **Piloter le wizard au clavier** par des raccourcis dédiés (« Suivant », « Précédent », « Recommencer » sont à la souris).
- **Vérifier qu'une adresse ou un mail existe** (boîte, voie) : seuls les formats sont contrôlés ; « Adresse à vérifier »
  est un indicateur pour l'équipe de dev, aucun service n'est appelé.
- **Accepter un mail avec accents** (adresses internationalisées RFC 6531 / 6532) : refusé.
- **Importer un seul fragment ou une seule question de bibliothèque** : `bibliotheque.json` remplace toute la bibliothèque.
- **Créer un tri-state** (supprimé, EVO-018) : booléen avec « Ne sais pas » (§6) ; les expressions d'un ancien tri-state
  converti (`= "unknown"`) ne sont pas réécrites.
- **Commentaires** : ni auteur, ni date, ni statut « résolu », ni mention, ni notification ; pas de réponse à une réponse.
- **Extraire en fragment une sélection d'un fragment**, ou qui contient une fin : l'extraction part d'un questionnaire.
- **Simuler un renvoi vers un autre questionnaire** : la prévisualisation reste sur la page et affiche un message ; elle
  n'ouvre pas la cible et ne simule ni la confirmation, ni la sauvegarde, ni la suppression du questionnaire en cours
  (« Annule et remplace »), ni le pré-remplissage ; la correspondance des réponses pré-remplies n'est pas spécifiée.
  L'annulation par le déclarant relève de l'application cible. Pas de nœud Renvoi dans un fragment.

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
| Nouveau nœud Renvoi | `Alt+R` | `node.newRedirect` |
| Type : Texte | `T` | `node.type.text` |
| Type : Date | `D` | `node.type.date` |
| Type : Nombre | `R` | `node.type.number` |
| Type : Choix unique | `U` | `node.type.single` |
| Type : Choix multiple | `M` | `node.type.multiple` |
| Type : Booléen | `B` | `node.type.boolean` |
| Type : Structure | `S` | `node.type.structure` |
| Type : Mail | `Shift+E` | `node.type.email` |
| Type : Téléphone | `Shift+T` | `node.type.phone` |
| Type : Adresse | `Shift+A` | `node.type.address` |
| Type : Civilité | `Shift+C` | `node.type.civility` |
| Basculer obligatoire | `O` | `node.toggleRequired` |
| Revenir à la valeur héritée | — | `node.resetRequired` |
| Activer « Autre (préciser) » | `A` | `node.toggleOther` |
| Activer « Ne sais pas » | — | `node.toggleDontKnow` |
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
| Valider le formulaire | — | `questionnaire.validate` |
| Dévalider | — | `questionnaire.unvalidate` |
| Nom du projet | — | `project.rename` |
| Nouveau jeu de libellés booléen | — | `labelSet.addBoolean` |
| Supprimer le jeu de libellés | — | `labelSet.delete` |
| Nouvelle question de bibliothèque | — | `library.newQuestion` |
| Nouveau fragment | — | `library.newFragment` |
| Ouvrir dans la bibliothèque | — | `library.openRef` |
| Bibliothèque | — | `library.show` |
| Supprimer de la bibliothèque | — | `library.delete` |
| Insérer depuis la bibliothèque | `I` | `library.insert` |
| Insérer depuis la bibliothèque | — | `library.insertItem` |
| Afficher / masquer le panneau Bibliothèque | — | `view.libraryPanel` |
| Extraire la sélection en fragment | `Ctrl+G` | `node.group` |
| Copier dans la bibliothèque | — | `node.toLibrary` |
| Ouvrir dans la bibliothèque | — | `node.openInLibrary` |
| Ouvrir le fragment | — | `node.openFragment` |
| Définir comme entrée du fragment | — | `node.setEntry` |
| Nouvelle sortie nommée | — | `node.newExit` |
| Nouvelle variable de l’état du système | — | `system.addVariable` |
| Supprimer la variable | — | `system.deleteVariable` |
| Renommer la variable | — | `system.renameVariable` |
| Renommer le champ de liste | — | `system.renameField` |
| Nouveau scénario | — | `scenario.add` |
| Supprimer le scénario | — | `scenario.delete` |
| Enregistrer l’état du système comme nouveau scénario | — | `preview.saveScenario` |
| Afficher / masquer le panneau d’état du système | — | `preview.toggleSystem` |
| Afficher / masquer le panneau de débogage | — | `preview.toggleDebug` |
| Afficher / masquer l’outline du logigramme | — | `preview.toggleOutline` |
| Activer / désactiver les contrôles de saisie de la prévisualisation | — | `preview.toggleChecks` |
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
| Copier | `Ctrl+C` | `node.copy` |
| Coller | `Ctrl+V` | `node.paste` |
| Dupliquer le questionnaire | — | `questionnaire.duplicate` |
| Dupliquer l’élément de bibliothèque | — | `library.duplicate` |
| Commenter | — | `comment.add` |
| Afficher / masquer le commentaire | — | `comment.toggle` |
| Afficher / masquer les commentaires | — | `comment.toggleAll` |
| Répondre | — | `comment.reply` |
| Supprimer la réponse | — | `comment.deleteReply` |
| Supprimer le commentaire | — | `comment.delete` |
| Ouvrir | — | `comment.open` |
| Commentaires | — | `tab.comments` |
| Version | — | `questionnaire.setVersion` |
| Version | — | `library.setVersion` |
| Valider l’élément de bibliothèque | — | `library.validate` |
| Dévalider l’élément de bibliothèque | — | `library.unvalidate` |
| Aller au nœud suivant | `↓` | `nav.down` |
| Aller au nœud précédent | `↑` | `nav.up` |
| Aller au nœud voisin suivant | `→` | `nav.right` |
| Aller au nœud voisin précédent | `←` | `nav.left` |
| Annuler | `Ctrl+Z` | `edit.undo` |
| Rétablir | `Ctrl+Shift+Z` ou `Ctrl+Y` | `edit.redo` |
| Ajuster la vue | `F` | `view.fit` |
| Basculer logigramme ↔ prévisualisation | `P` | `view.toggle` |
<!-- fin:raccourcis -->
