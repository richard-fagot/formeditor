# Existant — 6. Non implémenté / limites

Partie de l'inventaire : index, état au commit et conventions dans `docs/EXISTANT.md`.


### 1. Coque, commandes et transverse

- **Suppression d'un questionnaire** (EVO-027) : un seul à la fois ; aucune suppression en cascade dans la bibliothèque ;
  annulable depuis tout onglet seulement « juste après » (`store.ts:225-264` ; la fenêtre n'est pas refermée par un Annuler /
  Rétablir sans effet ou refusé) ; au-delà, annulée par l'historique `project` elle remet le questionnaire à son rang
  (`travel.ts:59`) et son rétablissement, y compris d'un questionnaire validé, est possible.
- **Annuler / rétablir** limité à 500 entrées par portée (`history.ts:27`), non persistant, et dépendant de l'onglet
  affiché : une modification de portée `project` (nom, langues, variables) ne s'annule pas depuis un onglet de questionnaire
  (`nav-commands.ts:30`), sauf la suppression d'un questionnaire juste après (EVO-027). Remplacement de projet (nouveau,
  ouverture projet/bundle) non annulable. Un questionnaire qui réapparaît par un annuler / rétablir ordinaire (ex. rétablir
  une duplication) reprend le rang de son entrée dans le projet (`travel.ts:59-68`).
- **Ctrl+Tab / Ctrl+Shift+Tab** déclarés par défaut mais généralement interceptés par le navigateur (doublés par Alt+→/←).
- La **palette** n'affiche que le premier raccourci d'une commande (`Palette.tsx:54`).
- Libellés dynamiques « (actuelle : fr) » de `lang.content` / `lang.ui` ; libellés partagés entre commandes (`tab.open`/`tab.show`,
  `node.connect`/`node.connectTo`/`edge.create`, `tab.library`/`library.show`, `library.setVersion`/`questionnaire.setVersion`).
- Pas de raccourci par défaut pour : définir le départ, copier dans la bibliothèque, nouvelle sortie, vue côte à côte,
  valider/dévalider, onglets Paramètres/Commentaires.
- Le bouton de la barre de projet affiche « Ctrl+K » en dur, même si le raccourci est personnalisé (`TopBar.tsx:47`).
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
- Éléments inutilisés (EVO-028) : indicateurs et compteurs seulement ; pas de panneau des problèmes dans l'onglet Bibliothèque,
  pas de suppression groupée ; l'indicateur d'un jeu de libellés n'est visible que dans la liste des jeux (vue de droite).
- Mise en page automatique : sorties nommées (poignées) et libellés d'arêtes ignorés par ELK.
- Recentrage de la sélection calculé sur une taille fixe de 240 × 100.
- Typage des expressions limité à la syntaxe et à l'existence des références.
- Nœud Renvoi (EVO-024) : boutons réordonnés par Monter / Descendre seulement ; une cible nœud qui n'est plus en amont (aval, fin, le Renvoi lui-même, après une modification des arêtes ou un collage) n'est pas une erreur (seul `buttonTargetNotGuaranteed` la signale) ; un nœud Renvoi d'un fragment importé n'est ni vérifié ni écarté.
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
- Nœuds sortie et fragment : pas de page de prévisualisation propre ; synthèse et Renvoi : pages rendues hors plugin (`ui/preview`).

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
- Nœud Renvoi (EVO-024) : la prévisualisation n'exécute ni le renvoi vers un autre questionnaire, ni le pré-remplissage, ni l'annulation-remplacement (message seulement) ; « Terminer » ne se distingue de « Suivant » que par son libellé ; « juste avant une fin » ignore les conditions des arêtes.

### 5. Format JSON

- Pas de schéma pour les fichiers `chemins/*.json` (décrits seulement par FORMAT.md §15), alors qu'ils sont livrés dans le kit.
- Les expressions (`expression`) ne sont que des chaînes pour le schéma : syntaxe, références et mots réservés relèvent des vérifications de l'éditeur, non de l'import.
- L'intégrité référentielle (`start`, `from`/`to`, `ref`, `labelSet`, `entry`, `exit`, clés de `requiredOverrides`, `libraryVersions`, `graph` d'un layout, `questionnaires[].id`) n'est pas vérifiée à l'import : un fichier conforme au schéma mais incohérent est chargé.
- `default`, `example`, `scenarios[].values` et les clés de `messages` ne sont pas typés par le schéma.
- `dateBound` sans pattern ; `version` texte libre sans format.
- Nœud `redirect` : le schéma l'accepte aussi dans les nœuds d'un fragment (définition `node` commune) ; existence des cibles (`questionnaire`, `node`) non vérifiée à l'import.
- La migration 12 → 13 ne réécrit pas les expressions qui testaient `"unknown"` (documenté, FORMAT.md l.990).
- Import sans `projet.json` : les fichiers sont fusionnés dans l'espace courant ; un questionnaire nouveau prend comme `file` le nom du fichier importé.
- Aucun export ne produit un unique fichier « livrable développeurs » : le tri des fichiers (exclusion des layouts, questionnaires validés seulement) est laissé à l'utilisateur ou au kit (qui ne travaille que sur l'exemple du dépôt, pas sur le projet de l'utilisateur).
