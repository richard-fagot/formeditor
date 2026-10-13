# plugins/question-types/phone

Type « téléphone » (`type: "phone"`, EVO-007) : `defaultCountry` (défaut `FR`), `countries` (pays autorisés, défaut : tous),
`lineType` (`mobile` | `fixed`, défaut : indifférent). Raccourci par défaut : Shift+T. Aperçu : icône, `<téléphone>`, pays par
défaut s'il n'est pas `FR`, « mobile » / « fixe » si un type de ligne est exigé.

- `phone-field.tsx` : sélecteur d'indicatif (drapeau, nom du pays par `Intl.DisplayNames`, indicatif ; `data-testid="phone-country"`,
  limité aux pays autorisés) et numéro. À chaque frappe : valeur E.164 si le numéro est valide (sinon la saisie), pays du numéro
  (`+` ou `00` en tête, prime sur le sélecteur, qui le suit s'il le propose) ou du sélecteur, passé par `onChange(…, country)`
  (`<clé>_pays`). À la sortie du champ : format national et contrôle (`formatErrors`, messages `phone` / `lineType`).
- Synthèse : format international lisible (`+33 6 12 34 56 78`).
- Contrôles, normalisation et pays : `core/contact` (`libphonenumber-js`, métadonnées `max`).
- `env.checks === false` (contrôles de saisie désactivés en prévisualisation, EVO-014) : aucun message affiché à la sortie du champ.
