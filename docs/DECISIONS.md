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
