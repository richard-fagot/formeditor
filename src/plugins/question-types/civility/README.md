# plugins/question-types/civility

Type « civilité » (`type: "civility"`, EVO-007) : choix unique prédéfini, codes fixes `MME`, `M` et `NP` (« Ne se prononce pas »,
`undisclosed`, désactivée par défaut, en dernier). `labels` : libellés modifiés par code (multilingues ; sinon libellés par
défaut longs, ou courts avec `short`, en français et en anglais : `CIVILITY_LABELS`, `core/model`). Raccourci par défaut : Shift+C.

- Saisie : boutons radio sur une ligne (`data-testid="civility"`), puis « Ne sais pas » si activée.
- Aperçu : icône et libellés (« Madame / Monsieur »). Synthèse et interpolation (`{civilite}`) : le libellé affiché.
