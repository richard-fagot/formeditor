# plugins/question-types/date

Type « date » (`type: "date"`) : réponse `AAAA-MM-JJ`, bornes `min` / `max` littérales (date ISO) ou
expressions (`$today()`, une autre réponse, une variable système). Raccourci par défaut : D. Aperçu `<date>`.
Saisie : `<input type="date">` (bornes résolues passées au navigateur). Validation : `core/validation`.

« Ne sais pas » (EVO-006) : `DontKnowEditor` en fin de propriétés ; case sous le champ (`data-testid="dont-know"`), cochée :
champ vidé et désactivé (`onDontKnow`) ; aperçu « + Ne sais pas » en italique.
