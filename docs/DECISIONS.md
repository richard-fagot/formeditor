# Décisions

Une ligne par choix notable pris en cours de réalisation (écart à la spec, ambiguïté tranchée, librairie remplacée).

| Date | Décision | Raison |
| --- | --- | --- |
| 2026-10-10 | TypeScript 6 au lieu de 7 | dependency-cruiser ne prend pas encore en charge TypeScript 7. |
| 2026-10-10 | Les plugins peuvent importer `ui/expression-editor` en plus de `core` et `ui-kit` | Leurs panneaux de propriétés saisissent des expressions ; évite de réinjecter l'éditeur par props. |
| 2026-10-10 | Tailwind v4 (plugin Vite) ; composants Radix copiés dans `ui-kit` au besoin, sans la CLI shadcn | Moins d'outillage, même résultat. |
| 2026-10-10 | JSONata 1.8 (et non 2.x) | La 2.x n'évalue qu'en asynchrone ; la 1.8 est synchrone, ce qui simplifie moteur et interface. Même grammaire. |
| 2026-10-10 | Rang des arêtes = ordre dans `edges` ; l'arête sans condition est le « sinon » quel que soit son rang | Pas de numéro de rang à maintenir ; sémantique robuste. |
| 2026-10-10 | Le modèle en mémoire est le format JSON lui-même ; sérialisation sans tri des clés | Aller-retour identique trivial, aucun mapping à maintenir. |
| 2026-10-10 | Réponse « Autre » : valeur réservée `other`, précision sous `<cle>_other` ; tri-state : `true` / `false` / `"unknown"` | Expressions simples à écrire (`assurance_connue = true`). |
| 2026-10-10 | Bornes de date : chaîne ISO littérale ou expression ; bornes numériques : nombre ou expression | Lisible sans enveloppe `{expr}`. |
| 2026-10-10 | Schémas JSON centralisés dans `format/schemas` (pas de fragment par plugin) ; vérification des contraintes de champ dans `core/validation` | `core` et `format` ne peuvent pas dépendre des plugins ; le schéma est un livrable unique. |
| 2026-10-10 | « Autre » proposé pour booléen et tri-state ; source dynamique et options conditionnées pour les choix seulement | Une source dynamique n'a pas de sens pour un booléen. |
| 2026-10-10 | Pas de bloc dans un bloc | Simplifie moteur et références ; aucun besoin dans la spec. |
| 2026-10-10 | Import refusé si un fichier est invalide (messages détaillés) | Évite de charger un projet incohérent dans l'interface. |
| 2026-10-10 | Fonctions JSONata préfixées par `$` (`$count(temoins)`, pas `count(temoins)`) | Grammaire JSONata standard, portable côté dev. |
| 2026-10-10 | Renommer une clé de l'hôte ne réécrit pas les blocs qui y font référence | Un bloc est partagé entre hôtes ; la vérification signale la référence cassée. |
| 2026-10-10 | « Mal typée » (§4.6) limitée à la syntaxe et à l'existence des références | Inférence de types JSONata coûteuse pour un gain faible. |
| 2026-10-10 | Effacement hors chemin : projection depuis le départ ; au-delà d'une question sans réponse, on conserve tout ce qui reste atteignable | N'efface jamais une réponse qui pourrait encore servir. |
| 2026-10-10 | Module `src/plugin-api` (types du contrat des plugins) importable par plugins, registre et interface | Les plugins ne peuvent importer ni le registre ni l'interface ; le contrat doit vivre à part. |
| 2026-10-10 | Annuler/rétablir maison (instantanés par portée : questionnaire, bibliothèque, projet) au lieu de zundo | zundo gère un historique par store ; l'historique par questionnaire tient en ~80 lignes. Immer pour les modifications. |
| 2026-10-10 | `app/commands` importe `registry` | Les commandes « Type : … » sont générées depuis la liste des types. |
| 2026-10-10 | Onglet suivant/précédent : Ctrl+Tab gardé mais doublé par Alt+→ / Alt+← | Les navigateurs ne transmettent pas Ctrl+Tab à la page. |
| 2026-10-10 | Commande « Relier à un nœud… » (touche E) via la palette | La spec demande de relier au clavier sans raccourci attribué. |
| 2026-10-10 | « Nouvelle question à la suite » s'insère entre le nœud et son successeur unique (« sinon ») | Création chaînée naturelle sans arête en double. |
| 2026-10-10 | Mise en page automatique (L) reportée en phase 9 avec ELK | Le plan place ELK en phase 9 ; positions manuelles d'ici là. |
| 2026-10-10 | Réponse `null` retirée (en profondeur) du contexte d'évaluation, gardée dans `answers` | `$exists(cle)` doit être faux pour une facultative laissée vide (JSONata 1.8 le dit vrai pour `null`). |
| 2026-10-10 | Commandes paramétrées : `run(arg?)`, `runCommand(id, arg?)` ; celles qui exigent une valeur sont masquées de la palette | Onglet visé, langue choisie, valeur saisie passent par le catalogue sans dupliquer de logique. |
| 2026-10-10 | Hors catalogue : sélection, focus, glisser de nœuds, fermeture de fenêtres, simulation de la prévisualisation, saisie des champs de nœud/arête (`store.edit` regroupé) | Ce sont des états d'interface ou des frappes continues, pas des actions du catalogue (§4.4). |
| 2026-10-10 | Clé de questionnaire = nom du fichier (`<clé>.json`) ; l'entrée du projet suit l'historique `q:<id>` | Renommer puis annuler garde clé et fichier cohérents. |
| 2026-10-10 | Valeur par défaut littérale : saisie brute pour `text`/`date`/`single`, JSON pour les autres types | Champ simple commun à tous les types, sans toucher au contrat des plugins. |
| 2026-10-10 | Graphe vide : pas de `missingStart` ; le logigramme prend le focus à l'ouverture d'un graphe et propose « Ajouter une question » s'il est vide | Un questionnaire neuf est un état légitime ; après le bouton « + » le focus restait sur le bouton et N était ignoré. |
| 2026-10-10 | Raccourcis de portée graphe acceptés aussi quand le focus est sur un élément non saisissable hors dialogue et que le logigramme est affiché ; Entrée/Espace restent au bouton focalisé | Correction globale du piège de focus (panneau des problèmes, Exporter…) sans gérer le focus bouton par bouton. |
| 2026-10-10 | Choix unique et multiple dans un même dossier de plugin (`question-types/choice`, deux plugins exportés) | Ils partagent l'éditeur d'options, la source et « Autre » ; un plugin ne peut pas importer un autre plugin. |
| 2026-10-10 | Champs de structure rendus par les plugins de leur type via `env.questionType(type)` (contrat `plugin-api`) | Le plugin structure n'importe ni le registre ni les autres plugins. |
| 2026-10-10 | Options visibles calculées par `choiceOptions` (`core/runtime`) ; valeurs dynamiques converties en chaînes, doublons / vides / `other` écartés | Comportement de référence testable, transmis aux plugins par `RenderEnv.options`. |
| 2026-10-10 | Saisie rapide des options réconciliée par libellé puis par rang | Supprimer ou modifier une ligne ne décale pas les valeurs et conditions des autres options. |
| 2026-10-10 | Jeux de libellés édités dès la phase 6 dans l'onglet Bibliothèque (questions et blocs en phase 7) | Nécessaires au tri-state ; création / suppression par commandes, saisie par `store.edit('library')`. |
| 2026-10-10 | Structure répétable : occurrences vides affichées jusqu'au minimum, enregistrées à la première saisie | Pas d'écriture de réponse à l'affichage ; « Supprimer » / « Ajouter » bornés par min / max. |
| 2026-10-10 | Placeholder proposé seulement pour texte et nombre | Sans objet pour une date native, un choix ou une structure. |
| 2026-10-10 | Réponse de choix hors des options visibles refusée par `validateAnswer` (paramètre `option`) ; `core/validation` importe `core/runtime` pour `choiceOptions` | Une option devenue invisible ne peut plus valider une question obligatoire ; un seul calcul des options visibles. |
| 2026-10-10 | Structure répétable facultative laissée vide acceptée : `repeat.min` ne s'applique que si la question est obligatoire ou si une occurrence est saisie | « Facultatif » prime ; rendre la question obligatoire impose le minimum. |
| 2026-10-10 | Annuler / rétablir (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y) en portée `global` | §4.4 ne restreint au graphe que les raccourcis à une lettre ; pendant une saisie, l'annulation native du champ reste active. |
| 2026-10-10 | `questionType` ajouté à l'environnement des plugins par `ui/*` (`usePluginEnv`), pas par `app/store` | `app/store` ne dépend pas du registre (ni, indirectement, de `ui`). |
| 2026-10-10 | Éditeur des contraintes libres et des messages partagé (`ConstraintsEditor` dans `ui/expression-editor`) | Même saisie pour une question et pour un champ de structure, sans dupliquer. |
| 2026-10-10 | Regrouper en bloc (Ctrl+G) : entrée = départ s'il est sélectionné, sinon cible de la première arête entrante ; toutes les arêtes entrantes visent l'instance ; une sortie par cible extérieure, nommée d'après sa clé ; références de l'hôte préfixées par l'alias (`qualifyKeys`) | Comportement inchangé pour une sélection à entrée unique, cas courant ; règle simple et prévisible sinon. |
| 2026-10-10 | Regroupement annulable dans l'historique du questionnaire ; le bloc créé reste dans la bibliothèque, annulable depuis l'onglet Bibliothèque (point d'historique `library`) | Historiques par portée ; un bloc orphelin est inoffensif. |
| 2026-10-10 | Bloc édité dans l'onglet Bibliothèque avec le même logigramme et les mêmes commandes (`activeGraphRef` = bloc affiché) | Pas de second éditeur ; N, Suppr, Ctrl+Z… agissent dans le bloc. |
| 2026-10-10 | Instance « dépliable en lecture seule » : liste des questions (`alias.cle`) et sorties dans la forme du nœud, état local non persisté (hors catalogue) | Lecture sans quitter le logigramme ; l'édition se fait dans la bibliothèque. |
| 2026-10-10 | Sorties d'une instance : une poignée par sortie nommée ; la liaison tirée porte `exit` | §3.8 « ses sorties se raccordent comme des arêtes ». |
| 2026-10-10 | Clés des questions de bibliothèque uniques dans la bibliothèque ; commande « Placer la question dans la bibliothèque » (même clé, nœud remplacé par une référence) | Évite les homonymes entre éléments partagés ; alimente la bibliothèque sans ressaisie. |
| 2026-10-10 | Panneau latéral de la bibliothèque affiché par défaut à gauche du logigramme, masquable (`view.libraryPanel`) | §4.3 « glisser depuis la bibliothèque : panneau latéral filtrable ». |
| 2026-10-10 | `usePluginEnv` unique, exporté par `ui/properties` ; `ProblemsPanel` déplacé de `ui/shell` vers `ui/diagram` | Partagés par le questionnaire et l'éditeur de bloc (`ui/library`) sans copie ni cycle. |
| 2026-10-10 | Regroupement refusé (message) si la sélection a plusieurs entrées (`groupEntries`) | Un bloc n'a qu'un départ : rediriger plusieurs entrées changerait le parcours en silence. |
| 2026-10-10 | Regroupement : seules les expressions du questionnaire hôte sont requalifiées (`alias.cle`) ; une autre référence aux clés déplacées (bloc ou question de bibliothèque utilisés dans l'hôte) devient « référence inconnue », signalée par les vérifications | Les éléments de bibliothèque sont partagés entre hôtes : on ne les réécrit pas pour un seul hôte. |
| 2026-10-10 | Arête dont la sortie de bloc n'existe plus : dessinée depuis la première poignée, sortie inconnue proposée dans le sélecteur de l'arête, signalée par `unknownExit` | Reste visible et corrigeable. |
| 2026-10-10 | `libraryItem` (élément affiché dans la bibliothèque) et `libraryPanel` ne sont pas sauvegardés : état d'interface, comme l'onglet actif | La spec §6.3 ne demande la persistance que du projet. |
| 2026-10-10 | « Placer la question dans la bibliothèque » refusé (commande indisponible) si la clé est déjà prise dans la bibliothèque | Renommer changerait la clé vue par les expressions ; les clés restent uniques dans la bibliothèque. |
| 2026-10-10 | Structure répétable : `[]` vaut « vide » pour une question facultative (`repeat.min` ignoré) ; obligatoire, `repeat.min` s'applique | Aligne `validateAnswer` sur docs/FORMAT.md §5. |
| 2026-10-10 | Structure répétable obligatoire sans `repeat.min` (ou `min: 0`) : `[]` donne `required` | Une question obligatoire laissée vide doit être refusée ; corrige un mineur de la phase 7. |
| 2026-10-10 | Changer de scénario ou éditer l'état du système en cours de prévisualisation conserve la session ; seul « Recommencer » repart du début | §5 « changement d'état en cours de parcours, avec réévaluation immédiate ». |
| 2026-10-10 | « Revenir à la synthèse » (`resume`) après un retour pour modifier : avance sur les pages déjà vues et répondues, s'arrête à une page nouvelle ou sans réponse | Évite de re-cliquer « Suivant » page à page ; une page nouvelle du chemin est toujours montrée. |
| 2026-10-10 | Débogage : « conditions évaluées » = arêtes sortantes de la page courante avec les réponses actuelles (`edgeTrace`) | Montre ce que « Suivant » choisirait, erreurs d'évaluation comprises. |
| 2026-10-10 | Écran du dictionnaire : champs d'une liste d'objets de types simples (ni liste, ni énumération) | Le format le permet mais aucun besoin dans la spec. |
| 2026-10-10 | Renommer une variable système ou un champ de liste : transaction (`transact`) — un point lié dans chaque portée modifiée ; Ctrl+Z dans l'une annule dans toutes celles où ce point est encore en tête (une portée modifiée depuis garde ses modifications) | Un seul Ctrl+Z rend le projet cohérent, sans écraser une édition postérieure. |
| 2026-10-10 | Valeurs d'exemple et de scénario contrôlées contre le type déclaré à titre indicatif (`valueError`), sans blocage ; liste d'objets saisie en JSON | Rien n'est imposé (§3) ; JSON suffit pour des listes d'objets d'exemple. |
| 2026-10-10 | Panneaux de la prévisualisation (état du système affiché, débogage masqué par défaut) : état d'interface non sauvegardé, basculés par commandes | Comme `libraryPanel`. |
| 2026-10-10 | « Enregistrer comme scénario » sans nom : nom du scénario de départ suffixé « * » (rendu unique) | Pas de fenêtre de saisie ; renommable dans l'onglet État du système. |
| 2026-10-10 | Renommer un champ de liste système (`renameKey` cible `systemField`) : `sys.x.champ`, noms relatifs des sources dont `from` est `sys.x`, exemple et scénarios  et les noms dans un filtre (`sys.x[champ > 1]`) | §3.5. |
| 2026-10-10 | Problèmes du dictionnaire (nom de variable ou de champ invalide / en double) : propriétaire `system` (`Owner`), affichés dans l'onglet État du système | Pas de panneau Problèmes de projet ; le problème est montré là où on le corrige. |
| 2026-10-10 | « Revenir à la synthèse » revalide chaque page repassée (`resume` reçoit `accept`) et s'arrête, erreurs affichées, sur la première invalide | Une réponse devenue invalide après la modification ne passe pas en silence ; `core/runtime` ne dépend pas de `core/validation`. |
| 2026-10-10 | PLAN.md : case « Résumé de démo écrit, puis attendre la validation » scindée en « Résumé de démo écrit » (cochée par la session) et « Attendre la validation » (cochée après validation de l'utilisateur) | Distinguer ce qui est fait de ce qui attend l'utilisateur. |
| 2026-10-10 | Un nom dans le filtre d'une étape de tête prolonge le chemin filtré (`sys.x[champ > 1]` → `sys.x.champ`, `victimes[hospitalise]` → `victimes.hospitalise`) : suivi au renommage et vérifié | C'est le sens JSONata (nom relatif à l'élément filtré) ; les filtres d'une expression non nommée restent ignorés. |
