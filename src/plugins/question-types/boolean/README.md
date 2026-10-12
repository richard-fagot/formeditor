# plugins/question-types/boolean

Type « booléen » (`type: "boolean"`) : réponse `true` / `false` (ou `"other"` avec l'option « Autre »).
Libellés « Oui / Non » par défaut, ou `labelSet` (jeu de libellés `kind: "boolean"` de la bibliothèque).
Raccourci par défaut : B.

« Ne sais pas » (EVO-006) : `DontKnowEditor` après « Autre » ; dernière option (radio), cochée si `dontKnow`, `onDontKnow(true)` ;
aperçu : libellé en italique, en dernier.
