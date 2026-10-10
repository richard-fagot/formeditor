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
