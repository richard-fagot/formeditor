# Existant — fonctionnalités réellement implémentées

État au commit `a4bed4c` (2026-10-16), jusqu'à EVO-028. Format JSON : version 15.

Inventaire **factuel**, établi par lecture du code source (et non de la spec, du guide ou des fiches EVO).
Il décrit ce que fait le code, y compris quand cela diffère de la spec ; les différences avec les fiches
sont regroupées à la fin. Aucune suggestion d'évolution. Les chemins sont relatifs à la racine du dépôt ;
les numéros de ligne valent pour le commit indiqué. Tenu à jour par l'agent `inventoriste`
(`.claude/agents/inventoriste.md`) à chaque évolution.

Abréviations : « cmd » = commande du catalogue `app/commands` (palette, raccourcis) ; « historique » = portée
d'annulation (`q:<id>` pour un questionnaire, `library` pour la bibliothèque et les fragments, `project`).

## Parties

L'inventaire est réparti en un fichier par zone ; ce fichier est l'index (CLAUDE.md, « Documents volumineux »).
L'en-tête « État au commit » ci-dessus vaut pour toutes les parties. Sous-titres (`###`) inchangés.

| Zone | Fichier |
| --- | --- |
| 1. Coque, commandes et transverse | [`docs/existant/1-coque-commandes.md`](existant/1-coque-commandes.md) |
| 2. Édition : logigramme, propriétés, commentaires, bibliothèque | [`docs/existant/2-edition.md`](existant/2-edition.md) |
| 3. Types de questions et de nœuds | [`docs/existant/3-types.md`](existant/3-types.md) |
| 4. Parcours : prévisualisation, moteur, validation, état du système, expressions | [`docs/existant/4-parcours.md`](existant/4-parcours.md) |
| 5. Format JSON d'export (schéma réel) | [`docs/existant/5-format-json.md`](existant/5-format-json.md) |
| 6. Non implémenté / limites | [`docs/existant/6-limites.md`](existant/6-limites.md) |
| 7. EVO réalisées par zone | [`docs/existant/7-evo-realisees.md`](existant/7-evo-realisees.md) |
| 8. Écarts code ↔ fiches EVO | [`docs/existant/8-ecarts.md`](existant/8-ecarts.md) |
