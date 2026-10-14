# app/i18n

Textes de l'interface de l'outil (dictionnaire simple, `fr` par défaut, `en`). Les textes destinés à
l'utilisateur final, eux, sont dans le modèle (`LocalizedText`) et résolus par `core/expressions`.

## API
- `MESSAGES` (`messages.ts`, complété par `messages-settings.ts` : paramètres, vue côte à côte, mise en page, export d’image ; `messages-clipboard.ts` : copier-coller, duplication ; `messages-comments.ts` : commentaires de révision, EVO-011 ; `messages-required.ts` : surcharge du caractère obligatoire, EVO-012 ; `messages-validation.ts` : validation d’un formulaire, EVO-015 ; `messages-version.ts` : versions, EVO-022) :
  `clé → { fr, en }`. Ajouter une clé = une ligne, les deux langues.
- `makeTranslate(lang)` → `t(clé, params?)` ; `{x}` remplacé par `params.x`.
- `UI_LANGUAGES`.

Dans les composants : `useT()` (exporté par `app/store`, qui connaît la langue courante).
Dans les plugins : objets `{ fr, en }` locaux et `tr()` de `plugin-api`.
