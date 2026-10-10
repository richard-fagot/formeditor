# ui/expression-editor

Saisie d'expressions JSONata et de libellés multilingues. Dépend de `core/expressions`, `core/references`, `ui-kit`.

## API
- `ExpressionInput` : CodeMirror 6 sur une ligne ; coloration (`language.ts`), autocomplétion des clés de
  la portée et des fonctions (`completion.ts`), diagnostics en direct (syntaxe, référence inconnue).
  Entrée → `onSubmit`, Échap → quitte le champ.
- `LabelEditor` : libellé multilingue (une saisie par langue) avec variantes conditionnelles `{variants, otherwise}`.
- `ExpressionEnvProvider` / `useExpressionEnv` : portée (`Scope` de `core/references`) et langues, fournies
  par le panneau de propriétés.

## Pièges
- La valeur est synchronisée depuis les props seulement si elle diffère du document (pas de boucle).
- Utilisable par les plugins (décision DECISIONS.md).
