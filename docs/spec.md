# Éditeur de questionnaires — Spécification

Oct 9, 2026 · @Richard

## 1. Objectifs

L'outil sert à **spécifier** des questionnaires métier (déclarations de sinistre, demandes de prestation…), pas à les produire. Il tient dans une page HTML, sans serveur.

- Représenter un questionnaire sous forme de logigramme : un graphe orienté, avec des arêtes conditionnées, des convergences et des boucles.
- Spécifier chaque question : type, valeurs proposées, contraintes, conditions, libellés multilingues.
- Produire un **format JSON propre et documenté**, destiné à une équipe de développement qui génère les formulaires avec l'IA. Il est livré avec un JSON Schema et une documentation lisible par une IA.
- Rouvrir un projet pour le poursuivre : le JSON est le format de sauvegarde. La mise en page du logigramme est stockée à part.
- Réutiliser des questions et des blocs entre questionnaires d'un même projet via une bibliothèque, par référence.

**Bonus, mais attendu.** Une prévisualisation en wizard (une question par page), claire et moderne, avec pages d'information, de synthèse et de fin. Elle sert aux démonstrations métier pour obtenir une validation fonctionnelle sur une base plus concrète qu'un logigramme. L'état du système y est simulable par saisie libre ou par scénarios nommés.

**Hors périmètre.** Le choix des composants d'affichage (UX/UI du formulaire final) reste à l'équipe de développement et à l'équipe UX. La prévisualisation n'est qu'une projection de démonstration. La forme des données produites par un questionnaire rempli relève aussi de l'équipe de dev.

## 2. Glossaire

| Terme | Définition |
| --- | --- |
| Projet | Conteneur de tout le reste : questionnaires, bibliothèque unique, dictionnaire de l'état du système, jeux de libellés, scénarios, langues. |
| Questionnaire | Graphe orienté de nœuds reliés par des arêtes conditionnées. Peut converger et boucler. |
| Nœud | Élément du graphe : question, instance de bloc, page d'information, page de synthèse, fin de parcours. Chaque nœud correspond à une ou plusieurs pages du wizard. |
| Arête | Transition d'un nœud vers un autre. Elle porte une condition facultative, un ordre d'évaluation et un libellé facultatif de lecture (EVO-005). |
| Question | Élément de saisie : intitulé, type, clé, caractère obligatoire, options, contraintes. |
| Bloc | Sous-graphe de nœuds réutilisable, défini dans la bibliothèque et référencé dans les questionnaires par une instance nommée (alias). |
| Bibliothèque | Unique par projet. Contient les questions, blocs et jeux de libellés réutilisables. Les questionnaires y font **référence** (pas de copie). |
| État du système | Variables fournies par le logiciel hôte (profil connecté, résultats de services…). Déclarées une fois au niveau du projet et partagées par tous les questionnaires. Typées, éventuellement listes d'objets. Chaque variable (et chaque champ d'une liste d'objets) peut porter un libellé facultatif de lecture (EVO-005). |
| Référence | Désignation d'une valeur : réponse à une question, sous-champ, variable système. Utilisable dans les conditions, les libellés et les sources de valeurs. Remplace le « champ paramétré » de la version initiale. |
| Expression | Formule booléenne ou calculée, écrite en texte, qui combine des références. |
| Scénario | Jeu de valeurs nommé de l'état du système, utilisé pour la prévisualisation. |
| Jeu de libellés | Libellés personnalisés d'un booléen ou d'un tri-state (ex. « Oui / Non / Ne sait pas »), partagés via la bibliothèque. |

## 3. Spécifications fonctionnelles

Principe directeur : **rien n'est imposé au créateur**. L'ordre des nœuds est libre. On peut enchaîner des questions après une synthèse, placer plusieurs synthèses ou plusieurs fins. L'outil signale les incohérences (§4.6) sans bloquer.

### 3.1 Le graphe

- Un questionnaire a un **nœud de départ** unique.
- Chaque nœud a zéro ou plusieurs arêtes sortantes. Chacune porte une condition facultative et un rang.
- **Libellé d'arête** (EVO-005) : toute arête, conditionnée ou non, issue ou non d'une sortie de bloc, peut porter un libellé facultatif qui dit l'intention métier (« Ayant droit adhérent », « Sinon »). Texte libre sur une ligne, sans interpolation, en une seule langue : il sert à la lecture de la spécification et n'est jamais affiché à l'utilisateur final. Il n'a **aucun effet sur la navigation** (seuls la condition et le rang comptent) et ne s'utilise pas dans les expressions.
- Navigation : les arêtes sortantes sont évaluées par rang ; la première dont la condition est vraie est suivie. Une arête sans condition joue le rôle de « sinon ».
- **Convergence** : plusieurs arêtes peuvent pointer vers le même nœud.
- **Boucle** : une arête peut pointer vers un nœud déjà visité. Lors d'un nouveau passage, la réponse remplace la précédente : aucune itération n'est conservée. Pour saisir plusieurs victimes, on utilise une structure répétable (§3.4), pas une boucle.
- Une condition peut porter sur toute réponse déjà donnée et sur l'état du système.

### 3.2 Types de nœuds

| Nœud | Rôle |
| --- | --- |
| Question | Une page du wizard, une saisie. |
| Instance de bloc | Référence à un bloc de la bibliothèque, avec un alias. Se déplie en plusieurs pages. |
| Information | Page de texte sans saisie (introduction, avertissement, consigne). Texte conditionnable et interpolable. |
| Synthèse | Récapitulatif automatique des réponses du parcours effectif jusqu'ici. Chaque réponse est modifiable par retour à la question concernée. Plusieurs synthèses possibles, à n'importe quel endroit. |
| Fin | Terminaison du parcours avec un message conditionnable (soumission, non-éligibilité, réorientation…). Plusieurs fins possibles. |

### 3.3 Question

Une question comporte :

- un **intitulé** multilingue, interpolable et conditionnable (§3.6) ;
- un **type** (§3.4) ;
- une **clé** (§3.5) ;
- un caractère **obligatoire** ou facultatif, éventuellement conditionné par une expression ;
- facultativement : texte d'aide, placeholder, valeur par défaut (littérale ou expression) ;
- facultativement, l'option **« Ne sais pas »** (EVO-006, tous types sauf structure) ;
- des **contraintes** (§3.7) selon le type.

### 3.4 Types de questions

| Type | Paramètres |
| --- | --- |
| Texte | Court ou long, longueur min/max, motif (expression régulière). |
| Date | Bornes min/max, littérales ou calculées (aujourd'hui, une autre réponse, une variable système). |
| Nombre | Réel, entier naturel ou entier relatif. Bornes, nombre de décimales, unité affichée. |
| Choix unique | Liste d'options. |
| Choix multiple | Liste d'options, nombre de sélections min et max. |
| Booléen | « Oui / Non » par défaut, ou un jeu de libellés de la bibliothèque. |
| Tri-state | Booléen avec une troisième valeur (« Ne sait pas »…), via un jeu de libellés. |
| Mail (EVO-007) | Aucun. Contrôle intégré : adresse conforme à la RFC 5322 (`addr-spec`) restreinte par la RFC 5321 (`Mailbox`) : partie locale en `dot-atom` ou entre guillemets, domaine en noms de domaine (labels de 63 caractères au plus, sans tiret en bord) ou littéral IP (`[192.0.2.1]`, `[IPv6:2001:db8::1]`), 64 octets pour la partie locale et 254 caractères au total, ni commentaire ni espace repliable ; ASCII seulement (RFC 6531 / 6532 refusées). Valeur : domaine en minuscules, partie locale telle que saisie. |
| Téléphone (EVO-007) | Pays par défaut (France), pays autorisés (tous par défaut), type de ligne attendu (indifférent, mobile, fixe). Saisie : sélecteur d'indicatif (drapeau, pays, indicatif) et numéro ; espaces, points, tirets, parenthèses acceptés ; un numéro en `+` ou `00` fixe le pays et prime sur le sélecteur. Contrôles intégrés : numéro valide pour le pays (plan de numérotation) et pays autorisé ; type de ligne si exigé. Valeur : E.164 (`+33612345678`), réaffichée au format national à la sortie du champ. |
| Adresse (EVO-007) | Pays par défaut (France), pays autorisés, longueur min/max (5 / 200), indicateur « adresse à vérifier par un service de normalisation » (exporté, jamais exécuté : l'outil n'appelle aucun service). Saisie : sélecteur de pays (masqué si un seul pays est autorisé) et une seule ligne. Contrôles intégrés : au moins une lettre, longueur dans les bornes, ni retour à la ligne ni caractère de contrôle (tous alphabets acceptés) ; en France, un code postal à 5 chiffres. Valeur : la ligne saisie. |
| Civilité (EVO-007) | Choix unique prédéfini, codes fixes : Madame (`MME`), Monsieur (`M`), « Ne se prononce pas » (`NP`, facultative, désactivée par défaut, en dernier). Libellés longs ou courts (« Mme », « M. »), modifiables et multilingues. Pas de « Autre (préciser) », d'option ajoutée ni de source dynamique. Saisie : boutons radio sur une ligne. |
| Structure | Groupe de champs de tous types sauf structure. Chaque champ a sa clé, ses contraintes et sa condition d'affichage. Peut être **répétable** (min/max d'occurrences, ex. plusieurs victimes ou témoins), avec un bouton « Ajouter » pour créer une occurrence et la possibilité d'en supprimer une. |

**Autre (préciser)**, applicable au choix unique, au choix multiple, au booléen et au tri-state : ajoute une option qui ouvre un champ texte. Libellé éditable, précision obligatoire ou facultative. Elle est toujours affichée en dernier.

**Ne sais pas** (EVO-006), applicable à toute question sauf la structure elle-même (ses champs peuvent l'avoir), désactivée par défaut : permet de répondre explicitement « je ne sais pas », distinct de « pas de réponse ». Son libellé (« Ne sais pas » par défaut) se comporte exactement comme celui d'une option : multilingue, interpolé, à variantes, traductions manquantes signalées. Choix unique ou multiple, booléen, tri-state : dernière option, après « Autre (préciser) », hors de tout groupe. Texte, date, nombre : case à cocher sous le champ ; cochée, le champ est vidé et désactivé ; décochée, il revient vide. Elle est **exclusive** (la cocher décoche les autres options ; cocher une autre option ou saisir la décoche), **satisfait** une question obligatoire, et aucune contrainte (intégrée ou libre) ne s'applique quand elle est cochée. Ce n'est pas une option de la liste : absente de la saisie rapide, non réordonnable, non conditionnable. Réglée dans le panneau de propriétés juste après « Autre (préciser) » (en fin de section du type pour les saisies), ou par la palette (« Activer « Ne sais pas » », sans raccourci par défaut). L'outil n'a pas de table de décision : rien n'y est généré.

**Options d'un choix unique ou multiple** : une suite ordonnée d'**entrées**, affichées strictement dans l'ordre saisi. Chaque entrée est :

- une **option statique** (valeur, libellé multilingue) ;
- ou une **entrée dynamique** (ex-« champ paramétré ») : une référence qui fournit zéro, une ou plusieurs options, déployées **à sa position**, dans l'ordre de la source. Exemples : une réponse précédente (« Bleu » réapparaît dans une liste), une liste d'objets de l'état du système (dates des sinistres de la personne). Pour une liste d'objets, on définit dans le panneau de propriétés l'expression du libellé affiché et celle de la valeur retenue. Plusieurs entrées dynamiques peuvent coexister, à n'importe quelle position.

Toute entrée peut être déplacée (boutons du panneau de propriétés ou ordre des lignes de la saisie rapide ; pas de glisser-déposer ni de raccourci dédié, comme pour les options statiques), supprimée, dupliquée et porter une **condition d'affichage** ; une entrée dynamique dont la condition est fausse n'affiche aucune valeur. Une valeur déjà proposée plus haut dans la liste n'est pas répétée.

**Groupes d'options** (EVO-003) : les entrées peuvent être regroupées sous des intitulés de groupe. Le libellé d'un groupe se comporte exactement comme celui d'une option (multilingue, interpolation, variantes conditionnelles). Un groupe a en plus un **code** facultatif et une **condition d'affichage** facultative. Il contient des options statiques et des entrées dynamiques (pas de groupe dans un groupe). Les entrées placées avant le premier groupe n'appartiennent à aucun groupe. Un groupe dont la condition est fausse, ou dont aucune option n'est visible, n'est pas affiché. Une valeur est unique dans son groupe mais peut se répéter d'un groupe à l'autre : la réponse identifie l'option **et** son groupe. L'identifiant d'un groupe est son code s'il est défini, sinon son libellé dans la langue par défaut ; il est unique dans la question, et `AUTRE` est réservé. « Autre (préciser) » reste en dernier, hors de tout groupe. Dans la prévisualisation, chaque groupe est une section titrée ; dans le panneau de propriétés, chaque groupe a sa ligne de paramétrage (libellé, code, condition, traductions) juste avant celles de ses options ; monter ou descendre un groupe déplace ses options, le supprimer supprime ses options.

Saisie rapide (§4.3) : `# Libellé` ouvre un groupe (la ligne ne contient que le libellé) ; `* option` ou `- option` ajoute une option au groupe courant (une ligne sans puce reste acceptée) ; les lignes vides sont ignorées ; `\#`, `\*`, `\-` écrivent une option qui commence par ce caractère. Une ligne `$<référence>` (ex. `$sys.sinistres`, `$couleur_preferee`) crée une entrée dynamique ; toute autre ligne crée une option statique (une option qui commence par `$` s'écrit `\$…`). Une référence inconnue ou mal écrite est signalée par les vérifications (§4.6).

**Mail, téléphone, adresse, civilité** (EVO-007) : utilisables comme question et comme champ de structure. Les espaces de début et de fin de saisie sont retirés avant contrôle ; une saisie invalide est conservée telle quelle pour être corrigée. Une question facultative laissée vide n'est pas contrôlée. Obligatoire, contraintes libres, conditions d'affichage et « Ne sais pas » s'appliquent comme aux autres types. Dans le logigramme, le nœud affiche une icône du type, et pour le téléphone et l'adresse le pays par défaut s'il n'est pas la France et le type de ligne exigé. Dans la prévisualisation, les contrôles s'appliquent à la sortie du champ et à la validation de la page ; le panneau de débogage montre la valeur normalisée et le pays.

Le booléen et le tri-state n'ont pas d'entrées : leurs libellés viennent du jeu de libellés (EVO-001, arbitrage A).

### 3.5 Clés et références (proposition)

Réponse à ta question ouverte. Chaque question a deux identifiants :

- un **id technique** immuable, généré, invisible à l'usage. Il sert au lien avec la mise en page et à la stabilité des références ;
- une **clé lisible** en snake\_case, proposée automatiquement à partir de l'intitulé (« Date du sinistre » → `date_sinistre`) et modifiable. C'est elle qu'on lit et qu'on écrit partout.

Le **renommage d'une clé est propagé** automatiquement à toutes les expressions qui l'utilisent. On peut donc choisir une clé parlante sans craindre de casser le questionnaire. Dans le JSON, les expressions sont écrites avec les clés lisibles : c'est ce qui les rend compréhensibles par l'IA de l'équipe de dev.

Portée et espaces de noms :

| Écriture | Désigne |
| --- | --- |
| `date_sinistre` | Réponse à une question du questionnaire courant. |
| `victime.nom` | Sous-champ d'une structure. |
| `temoins[0].nom`, `count(temoins)` | Occurrences d'une structure répétable. |
| `ma_question.groupe` | Groupe de la sélection d'un choix unique ou multiple (EVO-003) : code du groupe, sinon son libellé (langue par défaut) ; `AUTRE` pour « Autre (préciser) » ; vide hors groupe. Choix multiple : liste des groupes des options sélectionnées, dans l'ordre des valeurs. `groupe` est un mot réservé (aucune clé ne peut s'appeler `groupe`). |
| `ma_question.nsp` | « Ne sais pas » choisie (EVO-006) : `true` si oui, `false` sinon (jamais vide). `ma_question` est alors vide (absent ; liste vide pour un choix multiple), comme une question sans réponse ; `ma_question.groupe` vaut le code réservé `NSP`. Connu seulement sur une question dont l'option est activée (aussi `alias.cle.nsp`, `structure.champ.nsp`). `nsp` est un mot réservé. |
| `ma_question.pays` | Pays d'un téléphone ou d'une adresse (EVO-007) : code ISO 3166-1 alpha-2 (`FR`, `BE`), rangé à côté de la réponse ; vide si non répondu. Aussi `alias.cle.pays`, `structure.champ.pays`. Inconnu sur les autres types ; un champ de structure nommé `pays` reste désigné par `structure.pays` (`pays` n'est pas réservé). |
| `sys.profil` | Variable de l'état du système. |
| `decl.date_sinistre` | Question d'un bloc instancié avec l'alias `decl`, vue depuis le questionnaire. À l'intérieur du bloc, sa clé s'écrit sans préfixe. |

Unicité : une clé est unique dans son questionnaire, et unique dans son bloc pour les questions d'un bloc.

### 3.6 Conditions et expressions

- Une condition est une expression booléenne qui combine des réponses et des variables système.
- Opérateurs attendus : égalité, comparaisons numériques et de dates, ET / OU / NON, « contient » (choix multiple, listes), « est renseigné », dénombrement (nombre d'éléments cochés, nombre d'occurrences), accès aux sous-champs, filtrage d'une liste d'objets.
- Les expressions s'écrivent **en texte**, avec autocomplétion des clés et des variables, coloration et validation en direct. Pas de constructeur visuel : l'utilisateur est seul et à l'aise avec une syntaxe.
- **Libellés des variables système** (EVO-005) : l'autocomplétion affiche le libellé d'une variable (ou d'un champ de liste d'objets) à côté de sa clé, et sa recherche porte sur la clé **et** sur le libellé (taper « connecté » propose `sys.profil` libellée « Profil connecté » ; casse et accents ignorés) ; choisir la proposition insère la clé. Le survol d'une référence `sys.…` dans un éditeur d'expression affiche son libellé (et sa description) ; rien dans une chaîne littérale (`"sys.profil"`). Le libellé ne s'écrit jamais dans une expression : on écrit toujours la clé.
- **Libellés** (intitulé, aide, texte d'information, option, message de fin) : interpolation de valeurs (`Quelle est la date de naissance de {victime.prenom} ?`) et variantes conditionnelles (texte A si condition, sinon texte B).

### 3.7 Contraintes

- Chaque contrainte associe une **règle** et un **message d'erreur facultatif**, multilingue. Sans message, un message par défaut est généré.
- Les bornes peuvent être littérales ou des expressions : date postérieure à aujourd'hui, antérieure à une autre réponse ou à une variable système, etc.
- Une contrainte libre, sous forme d'expression booléenne, couvre les règles croisées entre plusieurs réponses.
- **Contrôles intégrés** (EVO-007) des types mail, téléphone, adresse et civilité : ce ne sont pas des contraintes à écrire. Chacun a un message par défaut, multilingue et surchargeable comme les autres : `email` (« Adresse mail invalide. »), `phone` (« Numéro de téléphone invalide. », aussi pour un pays non autorisé), `lineType` (« Numéro mobile attendu. » / « Numéro fixe attendu. »), `address` (« Adresse invalide : une ligne de 5–200 caractères, avec au moins une lettre. »), `postalCode` (« Code postal manquant. »).

### 3.8 Bibliothèque et blocs

- Une seule bibliothèque par projet. Elle contient des questions, des blocs et des jeux de libellés.
- Un questionnaire utilise un élément de bibliothèque **par référence** : une modification dans la bibliothèque s'applique partout. L'utilisateur reste garant de la cohérence. Le libellé est surchargeable localement, ex. « Date du sinistre » reformulée en « Date du décès » : la question, sa clé et son sens restent ceux de la bibliothèque, seule la formulation est adaptée.
- Un **bloc** est un sous-graphe avec un nœud d'entrée et une ou plusieurs **sorties nommées**. Dans le questionnaire, l'instance de bloc apparaît comme un nœud. Ses sorties se raccordent comme des arêtes. Il est dépliable en lecture seule et éditable dans la bibliothèque.
- Un même bloc peut être instancié plusieurs fois dans un questionnaire, avec des alias différents.
- Les expressions d'un bloc accèdent librement à ses propres questions, à toutes les questions du questionnaire qui l'accueille (par leur clé) et à l'état du système. Proposition : en cas de clé identique, la question du bloc prime. Comme un même bloc peut être placé dans plusieurs questionnaires, ses références sont vérifiées dans chacun d'eux (§4.6).

### 3.9 Internationalisation

- Le projet déclare ses langues et une langue par défaut.
- Tout texte destiné à l'utilisateur final est multilingue : intitulés, options, aides, messages, pages.
- L'éditeur signale les traductions manquantes. La prévisualisation permet de changer de langue.
- Civilité (EVO-007) : libellés par défaut fournis en français et en anglais ; dans les autres langues du projet, ils sont signalés comme traductions manquantes. L'interpolation d'une civilité (`{civilite} {nom}`) affiche son libellé dans la langue courante, celle d'un téléphone son format international lisible (`+33 6 12 34 56 78`) ; pour les autres types (choix unique compris), la valeur. Noms de pays : fournis par le navigateur (`Intl.DisplayNames`) dans la langue affichée, sans donnée embarquée.
- L'interface de l'outil lui-même est aussi internationalisable (français par défaut).

## 4. IHM et ergonomie

Objectif : pas de clicodrome. Chaque action courante doit se faire au clavier ou en un geste, sans quitter le logigramme.

### 4.1 Structure de l'écran

- **Barre de projet** : nouveau projet, ouvrir, importer (projet, questionnaire, bibliothèque), exporter, langue, paramètres.
- **Onglets de questionnaires** : plusieurs questionnaires ouverts en même temps. On passe de l'un à l'autre par onglet ou par raccourci. La bibliothèque et le dictionnaire de l'état du système ont aussi leur onglet.
- **Vue côte à côte** (souhaitable) : deux questionnaires affichés en parallèle pour comparer.
- Dans un onglet de questionnaire, deux sous-onglets : **Logigramme** et **Prévisualisation**.
- Le logigramme est divisé en deux zones : à gauche le graphe, à droite le **panneau de propriétés** de l'objet sélectionné (question, arête, bloc, champ de structure, page). Un panneau « Problèmes », repliable, liste les avertissements (§4.6).
- **Barre du logigramme** : mise en page automatique, ajuster la vue, **exporter le logigramme en image** (§6.4).

### 4.2 Représentation des nœuds

Une question est un rectangle : intitulé en gras en haut, clé en discret, puis un aperçu du type, aligné à gauche.

| Type | Aperçu |
| --- | --- |
| Booléen / tri-state | Les libellés (« Oui / Non / Ne sait pas »). |
| Texte | `<texte>`, ou `<texte long>`. |
| Date | `<date>`. |
| Nombre | `<entier naturel>`, `<réel>`, etc. |
| Choix unique | Options avec boutons radio, tronquées par « … » si trop longues. |
| Choix multiple | Options avec cases à cocher, tronquées par « … ». |
| Groupe d'options (choix) | Intitulé du groupe en gras, ses options dessous ; même troncature « … ». |
| Entrée dynamique (choix) | La référence affichée **à sa position** parmi les options, ex. `<sys.sinistres : date>` ou `<couleur_preferee>`. |
| Structure | Miniature des champs, tronquée par « … ». Mention « × n » si répétable. |
| « Ne sais pas » (EVO-006) | Choix, booléen, tri-state : son libellé en italique, en dernier. Texte, date, nombre : « + Ne sais pas » en italique après l'aperçu du type. |

Badges discrets : obligatoire, « Autre », condition, référence bibliothèque, traduction manquante. Les autres nœuds (bloc, information, synthèse, fin) ont chacun une forme distincte. Les arêtes affichent leur condition en abrégé et leur rang si plusieurs sortent d'un nœud.

**Libellé d'arête** (EVO-005) : saisi dans le panneau de propriétés de l'arête, au-dessus de la condition. Avec libellé, l'arête affiche le libellé **à la place** de la condition (rang et nom de sortie de bloc conservés), y compris pour une arête seule sans condition ; tronqué par « … » s'il dépasse la largeur de l'étiquette. Le survol de l'étiquette affiche le libellé complet et la condition telle que l'étiquette l'afficherait sans libellé (« ? » si elle est encore vide, « sinon » si elle n'en a pas parmi plusieurs sorties, rien pour une arête seule sans condition). Sans libellé, affichage inchangé. L'export en image (§6.4) montre l'étiquette telle qu'affichée. Saisie et effacement sont annulables.

### 4.3 Édition rapide

- **Création chaînée** : depuis le nœud sélectionné, un raccourci crée une nouvelle question reliée à la suite et ouvre directement la saisie de l'intitulé. Un second raccourci crée une branche (arête conditionnée) avec focus sur la condition.
- **Type au clavier** : un raccourci par type, appliqué au nœud sélectionné.
- **Édition en place** de l'intitulé (double-clic ou Entrée) ; la clé est dérivée automatiquement.
- **Saisie rapide des options** : une option par ligne, collage multi-lignes accepté ; `# Libellé` ouvre un groupe, `* ` ou `- ` en tête est une puce facultative (§3.4).
- **Palette de commandes** (Ctrl+K) : toutes les actions, la recherche de nœud par clé ou intitulé, l'insertion depuis la bibliothèque.
- **Glisser depuis la bibliothèque** : panneau latéral filtrable.
- **Mise en page automatique** à la demande, positions manuelles conservées sinon. Environ 30 nœuds par questionnaire.
- **Annuler / rétablir** illimité, par questionnaire.
- Duplication, copier/coller de nœuds entre questionnaires, regroupement d'une sélection en bloc.

### 4.4 Raccourcis

Tous les raccourcis sont **paramétrables** dans un écran dédié. Chaque action est déclarée une seule fois, et la palette, les menus et les raccourcis s'appuient tous sur cette déclaration. Proposition par défaut :

| Action | Défaut |
| --- | --- |
| Palette de commandes | Ctrl+K |
| Nouvelle question à la suite | N |
| Nouvelle branche conditionnée | Shift+N |
| Insérer depuis la bibliothèque | I |
| Nouvelle page d'information / synthèse / fin | Alt+I / Alt+S / Alt+F |
| Type : texte, date, nombre, choix unique, choix multiple, booléen, tri-state, structure | T, D, R, U, M, B, 3, S |
| Type : mail, téléphone, adresse, civilité (EVO-007) | Shift+E, Shift+T, Shift+A, Shift+C |
| Basculer obligatoire | O |
| Activer « Autre (préciser) » | A |
| Éditer l'intitulé | Entrée |
| Éditer la condition de l'arête | C |
| Naviguer entre nœuds reliés | flèches |
| Grouper la sélection en bloc | Ctrl+G |
| Dupliquer | Ctrl+D |
| Annuler / rétablir | Ctrl+Z / Ctrl+Shift+Z |
| Mise en page auto / ajuster la vue | L / F |
| Basculer logigramme ↔ prévisualisation | P |
| Exporter le logigramme en image | X |
| Onglet suivant / précédent | Ctrl+Tab / Ctrl+Shift+Tab |
| Exporter | Ctrl+S |

Les raccourcis à une lettre ne sont actifs que lorsque le focus est sur le graphe, jamais pendant une saisie.

### 4.5 Dictionnaire de l'état du système

C'est un écran de projet. On y déclare chaque variable : nom, libellé, type (texte, nombre, date, booléen, énumération, liste d'objets avec son schéma), description, valeur d'exemple. L'autocomplétion des expressions s'appuie dessus.

**Libellé** (EVO-005) : facultatif, saisi à côté du nom (clé) de la variable, et à côté du nom de chaque champ d'une liste d'objets. Texte libre sur une ligne, en une seule langue, pour savoir de quoi il s'agit sans revenir à la documentation du logiciel hôte ; distinct de la description, qui explique. Il apparaît dans le dictionnaire, dans l'autocomplétion et au survol des expressions (§3.6), et dans l'éditeur de scénarios (ainsi que dans le panneau d'état du système de la prévisualisation) en face de chaque valeur à saisir. Jamais affiché à l'utilisateur final, sans effet sur le comportement. Saisie et effacement sont annulables.

### 4.6 Vérifications (non bloquantes)

- Référence inconnue ou cassée, clé en double.
- Groupes d'options : identifiant de groupe en double dans une question, code `AUTRE` ou `NSP` (réservés), groupe sans option.
- Nœud inaccessible, nœud sans sortie qui n'est pas une fin, boucle sans sortie possible.
- Nœud avec plusieurs sorties sans « sinon ».
- Référence à une question **qui n'est pas garantie d'avoir été posée** sur tous les chemins menant au nœud.
- Expression invalide ou mal typée, traduction manquante, élément de bibliothèque introuvable.

## 5. Prévisualisation

La prévisualisation exécute le questionnaire avec le même moteur de parcours que celui décrit pour l'équipe de dev. Elle sert de référence comportementale, pas de maquette UX.

- **Wizard** : une question par page, barre de progression indicative, boutons précédent / suivant. Pages d'information, de synthèse et de fin rendues selon leur type.
- **Validation** des contraintes à la saisie, avec les messages spécifiés. « Ne sais pas » cochée : question considérée comme répondue, aucune contrainte vérifiée (EVO-006).
- **Synthèse** : récapitulatif automatique ; un clic sur une réponse ramène à la question. Si la modification change le parcours, les réponses des questions qui n'appartiennent plus au chemin sont effacées. Une réponse du chemin devenue invalide (ex. valeur dynamique disparue après un changement de réponse ou d'état du système) est conservée, mais le parcours ne peut pas atteindre une fin : le wizard ramène à la première question concernée, avec son message d'erreur, jusqu'à ce qu'elle soit corrigée.
- **Panneau d'état du système**, repliable, à côté du wizard :
  - choix d'un **scénario nommé** (« UD avec 2 sinistres », « Amicale sans sinistre ») ;
  - **édition libre** des valeurs, avec possibilité d'enregistrer le résultat comme nouveau scénario ;
  - changement d'état en cours de parcours, avec réévaluation immédiate.
- **Panneau de débogage** (facultatif) : chemin parcouru, valeurs courantes, conditions évaluées.
- Changement de langue.
- Un clic sur une page de la prévisualisation sélectionne le nœud correspondant dans le logigramme.

## 6. Format d'échange et livrables

Un format propre est retenu par défaut. Aucun standard existant (SurveyJS, Form.io, JSON Forms…) ne gère nativement un graphe à arêtes conditionnées avec boucles.

### 6.1 Fichiers

| Fichier | Contenu | Destinataire |
| --- | --- | --- |
| `projet.json` | Métadonnées, langues, dictionnaire de l'état du système, scénarios, liste des questionnaires. | Outil et dev |
| `bibliotheque.json` | Questions, blocs, jeux de libellés réutilisables. | Outil et dev |
| `<questionnaire>.json` | Nœuds, arêtes, questions locales, références à la bibliothèque. | Outil et dev |
| `<questionnaire>.layout.json` | Positions, tailles, état de repli. Séparé pour ne pas polluer la spec. | Outil seulement |
| `<projet>.bundle.json` | Tous les fichiers ci-dessus dans un seul fichier, pour sauvegarde et partage. | Outil |

L'import accepte un bundle ou des fichiers unitaires. L'export propose les deux.

### 6.2 Propriétés du format

- **Versionné** (`formatVersion`). L'outil migre automatiquement les anciennes versions à l'ouverture.
- **Lisible par une IA** : clés lisibles, expressions écrites avec les clés, descriptions facultatives sur chaque élément, aucune donnée de présentation.
- **Libellés de lecture** (EVO-005) : propriété facultative `caption` (chaîne simple sur une ligne, non traduite) sur l'arête, la variable de l'état du système et le champ d'une liste d'objets ; exportée pour l'équipe de dev, sans effet sur le comportement. Format version 4 ; un fichier antérieur se migre sans transformation.
- **« Ne sais pas »** (EVO-006) : propriété facultative `dontKnow` (`{}` ou `{ "label": … }`) d'une question ou d'un champ de structure ; réponse « Ne sais pas » = valeur vide et marqueur `<clé>_nsp: true` (groupe `NSP` pour un choix). Format version 5 ; un fichier antérieur se migre sans transformation (propriété absente = désactivée).
- **Livré avec** :
  - un **JSON Schema** par type de fichier ;
  - un document **FORMAT.md** qui explique le modèle, la sémantique de navigation, la grammaire des expressions et l'interpolation, avec des exemples ;
  - un **questionnaire d'exemple** complet (ex. déclaration de sinistre) qui sert aussi de jeu de test.
- Facultatif à étudier : une implémentation de référence du moteur de parcours et de l'évaluateur d'expressions, réutilisable par l'équipe de dev.

### 6.3 Persistance

- **Sauvegarde automatique** dans le navigateur (IndexedDB), en continu.
- **Export** manuel en fichiers, qui reste la source de vérité partageable.
- Signalement des modifications non exportées.

### 6.4 Image du logigramme

Le logigramme d'un questionnaire s'exporte en **image PNG**, pour l'insérer dans des documents et le partager hors de l'outil.

- **Commande** « Exporter le logigramme en image » (palette, raccourci X, bouton de la barre du logigramme). Disponible dans la vue Logigramme d'un questionnaire non vide.
- **Dialogue d'options** : périmètre (logigramme entier, ou sélection seule si des nœuds sont sélectionnés : nœuds sélectionnés et arêtes entre eux), titre du questionnaire en en-tête (coché par défaut). Les derniers choix sont retenus dans le navigateur ; `Entrée` lance l'export.
- **Contenu** : tout le logigramme quels que soient le zoom et la portion visible, tel qu'affiché (aperçus, conditions abrégées, blocs repliés ou dépliés, badges), **sans** mini-carte, contrôles, fond quadrillé, poignées ni surbrillance de sélection.
- **Rendu** : fond blanc, thème clair, marge autour du contenu, résolution au moins 2× la taille à 100 %.
- **Fichier** téléchargé : `<projet> - <questionnaire> - AAAAMMJJ.png` ; les caractères interdits dans un nom de fichier sont remplacés par `_`.
- **Pas de SVG** : un SVG produit par capture du HTML n'est qu'un `foreignObject`, que les outils bureautiques n'affichent pas.

## 7. Contraintes

- **Livrable** : une page HTML unique, ouverte sans serveur (double-clic, `file://`). Les librairies sont intégrées au fichier par le build : l'outil fonctionne aussi hors ligne.
- **Sources** : très modularisées, en autant de fichiers que nécessaire. Comme un navigateur refuse de charger des modules ES locaux en `file://`, une étape de build assemble les sources en un seul HTML. Cette étape concilie les deux exigences.
- **Moins de code possible** : une librairie existante est préférée dès qu'elle couvre un besoin. La pile est fixée au §8.1 ; tout écart est tracé en une ligne dans docs/DECISIONS.md.
- **Interface** claire, aérée, moderne, conforme à l'état de l'art de l'ergonomie, sans clicodrome.
- Plusieurs questionnaires ouverts en même temps, nombre illimité de questionnaires par projet.
- Volumétrie cible : environ 30 nœuds par questionnaire, sans dégradation jusqu'à une centaine.
- **Navigateurs cibles** : versions récentes de Firefox (obligatoire), Chrome et Edge. Uniquement des API web standard, aucun code propre à un navigateur. Chrome et Edge partageant le même moteur, on teste sur deux moteurs : Firefox et Chromium.
- **Maintenance par IA** : le code doit pouvoir être modifié par une IA en lisant peu de fichiers (§8).

## 8. Architecture technique

L'architecture combine un **noyau métier pur**, sans interface et testé en TDD, et des **plugins verticaux**, un dossier par type de question et par type de nœud. Ajouter ou corriger un type ne touche alors qu'un seul dossier. Une **cartographie** maintenue et vérifiée automatiquement indique à une IA quels fichiers lire.

### 8.1 Pile retenue (alternative si la librairie retenue bloque)

| Besoin | Candidat principal | Alternatives | Argument |
| --- | --- | --- | --- |
| Langage | TypeScript | — | Types partagés entre modèle, format et UI ; erreurs détectées tôt. |
| Build mono-fichier | Vite + vite-plugin-singlefile | esbuild | Sources multiples, sortie en un seul `index.html`. |
| UI | React | Preact, Svelte | Écosystème de l'éditeur de graphe ; c'est ce qu'une IA maîtrise le mieux. |
| Éditeur de graphe | React Flow (@xyflow/react) | AntV X6, Drawflow, JointJS | Nœuds en HTML libre, arêtes étiquetées, cycles, clavier, sélection, minimap. |
| Mise en page auto | ELK.js | dagre | Gère les cycles et les graphes orientés en couches. |
| Expressions | JSONata | Jexl, JSONLogic | Filtres et agrégats sur listes d'objets, dates ; implémentations Java, .NET et Python disponibles côté dev. |
| État et annuler | Zustand + zundo | Redux Toolkit | Peu de code ; historique annuler/rétablir natif. |
| Éditeur d'expression | CodeMirror 6 | Monaco | Léger ; autocomplétion et coloration extensibles. |
| Validation du format | Ajv | — | Validation par JSON Schema, réutilisable par l'équipe de dev. |
| Image du logigramme | html-to-image | modern-screenshot | Méthode d'export documentée par React Flow ; fonctionne en `file://`. |
| Persistance | idb-keyval | Dexie | IndexedDB en quelques lignes. |
| Téléphones (EVO-007) | libphonenumber-js (métadonnées `max`) | contrôle E.164 générique + règles France | Validation par pays et type de ligne, hors ligne, données embarquées (≈ 160 ko). |
| Raccourcis | tinykeys | hotkeys-js | Minuscule ; liaisons reconfigurables. |
| Kit graphique | Tailwind + Radix UI (via shadcn/ui) | Mantine | Moderne, accessible, composants copiés dans le dépôt donc maîtrisés. |
| i18n de l'outil | Dictionnaires simples | i18next | Peu de chaînes ; i18next seulement si le besoin grandit. |
| Tests | Vitest + Playwright | — | Tests du noyau ; test de fumée du fichier final dans Firefox et Chromium (§8.4). |

### 8.2 Modules

| Module | Responsabilité | Dépend de |
| --- | --- | --- |
| `core/model` | Types du domaine (projet, questionnaire, nœud, arête, question, bloc, variable, scénario). Aucun import externe. | — |
| `core/expressions` | Analyse, évaluation, extraction des références, interpolation des libellés. Adaptateur JSONata isolé ici. | model |
| `core/references` | Résolution des clés et espaces de noms, index des usages, renommage propagé. | model, expressions |
| `core/runtime` | Moteur de parcours : arêtes, boucles, répétitions, historique, retour arrière. | model, expressions |
| `core/contact` | Contrôles et normalisation des types mail, téléphone, adresse, civilité ; pays (EVO-007). | model |
| `core/validation` | Contraintes de champs et vérifications de graphe (§4.6). | model, expressions, references, contact |
| `format` | Sérialisation, JSON Schema, migrations, import/export, bundle. | model |
| `plugins/question-types/<type>` | Pour chaque type : modèle, valeurs par défaut, contraintes, aperçu logigramme, panneau de propriétés, rendu wizard, fragment de schéma, doc. | core, ui-kit |
| `plugins/node-kinds/<kind>` | Même découpage pour question, bloc, information, synthèse, fin. | core, ui-kit |
| `registry` | Enregistrement des plugins ; seul point de connaissance de la liste des types. | plugins |
| `app/store` | État applicatif : projet, onglets, sélection, annuler/rétablir. | core |
| `app/commands` | Catalogue unique des actions (id, libellé, gestionnaire). | store |
| `app/shortcuts` | Liaisons clavier configurables vers les commandes. | commands |
| `app/persistence` | Sauvegarde automatique IndexedDB. | format |
| `app/i18n` | Langues des contenus et de l'interface. | model |
| `ui-kit` | Composants graphiques génériques. | — |
| `ui/shell` | Barre de projet, onglets, import/export, paramètres. | app |
| `ui/diagram` | Intégration de l'éditeur de graphe, mise en page auto. Délègue le rendu des nœuds au registre. | app, registry |
| `ui/properties` | Cadre du panneau de propriétés ; le contenu vient des plugins. | app, registry |
| `ui/expression-editor` | Saisie d'expression avec autocomplétion. | expressions, references |
| `ui/library` | Bibliothèque, blocs, jeux de libellés. | app |
| `ui/system-state` | Dictionnaire des variables et scénarios. | app |
| `ui/preview` | Wizard, panneau d'état du système, débogage. Délègue le rendu des champs au registre. | runtime, registry |

**Règle de dépendance** : `core` n'importe rien de `app`, `ui` ou `plugins`. Les plugins n'importent pas les autres plugins. Chaque module expose une API publique unique (`index.ts`) ; tout import interne d'un autre module est interdit. Ces règles sont vérifiées par dependency-cruiser dans npm run check (§8.4).

### 8.3 Cartographie pour l'IA

Objectif : pour une évolution ou une correction, une IA lit d'abord une carte d'environ 200 lignes, puis seulement les modules concernés.

- **`CLAUDE.md`** (racine) : conventions, commandes, règles de dépendance, et l'instruction « lire `docs/MAP.md` avant toute modification ».
- **`docs/MAP.md`** : la carte. Elle contient :
  - une ligne par module : responsabilité, chemin, API publique, dépendances ;
  - une **matrice fonctionnalité → modules** (« ajouter un type de question », « modifier la navigation », « changer un raccourci », « faire évoluer le format »…) ;
  - les **invariants** transverses (ex. tout changement du format → migration + schéma + FORMAT.md).
- **`README.md` par module** de 20 à 40 lignes : rôle, API, invariants, pièges, tests. Le code n'est lu qu'après.
- **Génération partielle** : un script produit la partie factuelle de la carte (modules, exports, graphe de dépendances). La partie rédigée (matrice, invariants) est mise à jour en fin de phase.
- **Pas d'ADR.** `docs/DECISIONS.md` : une ligne par choix notable (date, choix, raison).
- Fichiers courts (≤ 200 lignes visés), un concept par fichier, noms explicites.
- **`docs/GUIDE.md`** : guide utilisateur, catalogue concis des actions (une entrée par action : verbe à l'infinitif, tous les chemins — raccourci, palette, souris, panneau —, préconditions et effets non évidents ; balise `[cmd: identifiant]` pour chaque action du catalogue de commandes). Il suffit seul à répondre aux questions « comment faire… ? » sans accès au code. Son **index des raccourcis** est généré depuis le catalogue de commandes par `npm run guide`. Un **contrôle** intégré à `npm run check` échoue si une commande n'a pas d'entrée balisée, si une balise ne correspond à aucune commande, ou si l'index est périmé. Toute action ajoutée, modifiée ou supprimée met à jour le guide.

### 8.4 Harnais de non-régression

Une seule commande, `npm run check`, dit si quelque chose est cassé. Elle enchaîne :

- `tsc --noEmit` (typage) ;
- **Vitest** : tests unitaires de `core` et `format`, écrits avant le code ;
- **tests de référence** sur le questionnaire d'exemple : validation par le schéma, aller-retour import/export à l'identique, et pour chaque scénario un chemin de parcours attendu stocké dans un fichier ;
- **dependency-cruiser** : règles du §8.2 ;
- **contrôle du guide** (`docs/GUIDE.md` ↔ catalogue de commandes, voir §8.3) ;
- **build** du fichier unique ;
- **test de fumée Playwright** sur `dist/index.html` ouvert en `file://`, dans Firefox et Chromium : ouvrir, créer deux questions au clavier, relier, prévisualiser, exporter.

Un hook pre-commit lance la partie rapide (typage + Vitest). Les navigateurs Playwright sont installés dans l'image du dev container.

## 9. Plan d'action

On construit le noyau et le format testés sans interface, puis une tranche verticale de bout en bout, puis on élargit type par type. Chaque phase se termine par `npm run check` vert, la carte à jour et un commit. Le suivi se fait dans `docs/PLAN.md`.

1. **Socle** : Vite + singlefile, TypeScript strict, Vitest, Playwright, dependency-cruiser, `npm run check`, hook pre-commit, squelette des modules avec README, `docs/MAP.md` et son script. Sortie : `dist/index.html` vide qui passe le test de fumée.
2. **Modèle, format et exemple** : types, JSON Schema, sérialisation, migrations, bundle, `docs/FORMAT.md`, questionnaire d'exemple (déclaration de sinistre) avec deux ou trois scénarios. Sortie : tests de référence d'aller-retour verts.
3. **Expressions et références** : évaluation JSONata, extraction des références, espaces de noms, renommage propagé, interpolation.
4. **Moteur de parcours et vérifications** : navigation, convergence, boucles, structures répétables, retour arrière, effacement hors chemin, vérifications du §4.6. Sortie : chemins attendus de chaque scénario verts.
5. **Tranche verticale UI** : shell et onglets, logigramme, propriétés, commandes, raccourcis, annuler/rétablir, sauvegarde automatique, import/export ; types booléen et texte ; prévisualisation minimale. Sortie : **démo n°1**.
6. **Types restants**, un plugin à la fois : date, nombre, choix unique et multiple (Autre, sources dynamiques), tri-state et jeux de libellés, structure répétable.
7. **Bibliothèque et blocs** : références, surcharge de libellé, sorties nommées, alias, insertion par palette et glisser.
8. **Prévisualisation complète** : pages d'information, de synthèse et de fin, état du système, scénarios, débogage. Sortie : **démo n°2**.
9. **i18n, paramètres et finitions** : langues des contenus, traductions manquantes, écran des raccourcis, vue côte à côte, mise en page auto.
10. **Livraison à l'équipe de dev** : `FORMAT.md` relu, schémas, exemple.

## 10. Comment procéder

Claude Code réalise le plan en autonomie, dans le dev container, sans demander de confirmation. Tu interviens surtout aux deux démos.

1. **Mise en place** : dépôt GitHub, kit (dev container, `CLAUDE.md`, `docs/spec.md`, `docs/PLAN.md`, `docs/DECISIONS.md`), ouverture dans le conteneur, connexion à Claude Code.
2. **Lancement** : `claude --dangerously-skip-permissions`, puis un prompt unique qui demande de dérouler `docs/PLAN.md`.
3. **Autonomie** : en cas d'ambiguïté, Claude Code choisit l'option la plus simple compatible avec la spec, la note en une ligne dans `docs/DECISIONS.md` et continue. Il ne s'arrête que si la spec se contredit ou si une action est irréversible hors du dépôt.
4. **Reprise** : `docs/PLAN.md` et `docs/MAP.md` portent l'état du projet. Une nouvelle session, ou une session après `/clear`, reprend à la première case non cochée.
5. **Points de contrôle** : arrêt après la démo n°1 pour valider l'ergonomie (le seul aspect difficile à spécifier), puis après la démo n°2.
6. **Sécurité** : une branche par phase, fusion après `npm run check` vert. Le pare-feu du conteneur limite ce qu'une session sans confirmation peut atteindre.

## 11. Points ouverts

Tous les points ont été tranchés le 9 octobre 2026.

- [x] **Réponses en boucle** : tranché. Pas d'itération en boucle : une nouvelle réponse remplace la précédente. La saisie de plusieurs occurrences passe par une structure répétable avec un bouton « Ajouter » (§3.4).
- [x] **Plusieurs questions par page** : tranché. La spécification ne fixe pas la mise en page du formulaire final, qui reste au choix de l'équipe de dev et UX. La prévisualisation affiche une question par page (§5).
- [x] **Surcharge locale** d'un élément de bibliothèque référencé : tranché, le libellé est surchargeable localement (§3.8).
- [x] **Blocs et contexte** : tranché, accès libre à toutes les questions du questionnaire hôte et à l'état du système (§3.8).
- [x] **Retour depuis la synthèse** : tranché, les réponses des questions qui sortent du chemin sont effacées (§5).
- [x] **Sortie du formulaire final** : tranché, la forme des données soumises est du ressort de l'équipe de dev.
- [x] **Navigateurs cibles** : tranché, Firefox obligatoire, Chrome et Edge visés (§7).
