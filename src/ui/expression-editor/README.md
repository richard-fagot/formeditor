# ui/expression-editor

Saisie d'expressions JSONata et de libellés multilingues. Dépend de `core/expressions`, `core/references`, `ui-kit`.

## API
- `ExpressionInput` : CodeMirror 6 sur une ligne ; coloration (`language.ts`), autocomplétion des clés de
  la portée et des fonctions (`completion.ts` : clé par préfixe **ou** libellé `caption` contenant le mot tapé, casse et
  accents ignorés, clés d'abord, filtrage maison `filter: false` ; libellé en `detail`, description en `info`),
  infobulle au survol d'une référence `sys.…` (`hover.ts` : clé, libellé, description ; rien sans l'un ni l'autre, ni dans un littéral : chaîne,
  nom entre accents graves, commentaire ; motif de chaîne `STRING_LITERAL` partagé avec `language.ts`),
  diagnostics en direct (syntaxe, référence inconnue).
  Entrée → `onSubmit`, Échap → quitte le champ.
- `LabelEditor` : libellé multilingue (une saisie par langue) avec variantes conditionnelles `{variants, otherwise}`.
- `ConstraintsEditor` : contraintes libres (règle + message) et messages des contraintes intégrées ;
  utilisé par `ui/properties` et par les champs de structure.
- `DontKnowEditor` : option « Ne sais pas » (EVO-006) : case d'activation et libellé (`LabelEditor`), partagé par les plugins.
- `ExpressionEnvProvider` / `useExpressionEnv` : portée (`Scope` de `core/references`) et langues, fournies
  par le panneau de propriétés ; `readOnly` (EVO-015, formulaire validé) : `ExpressionInput` non éditable (lu au montage).

## Pièges
- Le motif du mot tapé est Unicode (`\p{L}`, drapeau `u`) pour reconnaître « connecté » ; pas de `validFor` :
  la source est rappelée à chaque frappe (CodeMirror ne refiltre pas, `filter: false`).
- La valeur est synchronisée depuis les props seulement si elle diffère du document (pas de boucle).
- Utilisable par les plugins (décision DECISIONS.md).

## Tests
`completion.test.ts` (autocomplétion et repérage de la référence survolée).
