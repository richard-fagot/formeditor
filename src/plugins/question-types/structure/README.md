# plugins/question-types/structure

Type « structure » (`type: "structure"`) : groupe de champs (questions de tout type sauf structure, avec
`when?` évaluée sur les clés sœurs de l'occurrence). `repeat: { min?, max?, addLabel? }` la rend répétable.
Raccourci par défaut : S.

- `fields-editor.tsx` : répétition, liste des champs (ajout, ordre, suppression), intitulé, clé (renommage
  propagé via `renameField` fourni par le panneau), type, obligatoire, condition, aide, paramètres du type du
  champ (plugin obtenu par `env.questionType`, jamais importé). Contraintes libres et messages : `ConstraintsEditor`. Portée des expressions : `structureScope`.
- `occurrences.tsx` : saisie en prévisualisation. Occurrences complétées jusqu'au minimum ; boutons
  « Ajouter » (libellé `addLabel`) et « Supprimer » bornés par `min` / `max` ; libellés et conditions évalués
  avec `env.scoped(occurrence)`. Erreurs par chemin `cle[i].champ` (`core/validation`). Précision « Autre » et groupe
  de la sélection d'un champ à choix rangés dans l'occurrence (`champ_other`, `champ_group`), ainsi que le marqueur « Ne sais pas »
  (`champ_nsp`, réponse de `dontKnowAnswer`) ; synthèse : libellé « Ne sais pas » du champ. Pas d'option « Ne sais pas » sur la structure elle-même.
- Aperçu : miniature des champs tronquée par « … », mention « × n » si répétable.
