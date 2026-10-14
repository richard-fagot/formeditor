# plugins/question-types/text

Type « texte » (`type: "text"`) : `multiline`, `minLength`, `maxLength`, `pattern`, `suggestions` (EVO-016).
Raccourci par défaut : T. Aperçu `<texte>` / `<texte long>`. Validation des contraintes : `core/validation`.

« Ne sais pas » (EVO-006) : `DontKnowEditor` en fin de propriétés ; case sous le champ (`data-testid="dont-know"`), cochée :
champ vidé et désactivé (`onDontKnow`) ; aperçu « + Ne sais pas » en italique.

Suggestions (EVO-016) : case « Suggestions » (`suggestions: ''` cochée, retirée décochée) et `ExpressionInput`
(`data-testid="suggestions-editor"`) ; aperçu : icône `ListFilter` (`data-testid="suggestions-indicator"`). Saisie :
`suggestionList(env.evaluate(expr), libellé)` (`core/runtime`) — valeurs d'options des choix référencés
(`referencedChoices(ws, expr, env.graph)` : graphe de la page d'abord, puis bibliothèque) remplacées par leur libellé (`env.options`, `env.label`) — recalculée à chaque rendu ; liste non vide → `SuggestBox`
(`suggest-box.tsx`, combobox ARIA : liste `role="listbox"` `data-testid="suggestions"` ouverte au focus, filtrée par
`filterSuggestions`, flèches / Entrée / clic, Échap ferme) ; vide → saisie simple. Test : `tests/smoke/evo-016.spec.ts`.
