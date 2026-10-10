# app/i18n

Textes de l'interface de l'outil (dictionnaire simple, `fr` par défaut, `en`). Les textes destinés à
l'utilisateur final, eux, sont dans le modèle (`LocalizedText`) et résolus par `core/expressions`.

## API
- `MESSAGES` (`messages.ts`) : `clé → { fr, en }`. Ajouter une clé = une ligne, les deux langues.
- `makeTranslate(lang)` → `t(clé, params?)` ; `{x}` remplacé par `params.x`.
- `UI_LANGUAGES`.

Dans les composants : `useT()` (exporté par `app/store`, qui connaît la langue courante).
Dans les plugins : objets `{ fr, en }` locaux et `tr()` de `plugin-api`.
