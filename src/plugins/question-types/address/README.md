# plugins/question-types/address

Type « adresse » (`type: "address"`, EVO-007) : `defaultCountry` (défaut `FR`), `countries` (pays autorisés), `minLength` /
`maxLength` (défaut 5 / 200), `verify` (adresse à vérifier par un service de normalisation : indicateur exporté, jamais exécuté).
Raccourci par défaut : Shift+A. Aperçu : icône, `<adresse>`, pays par défaut s'il n'est pas `FR`.

- Saisie : sélecteur de pays (`data-testid="address-country"`, masqué si un seul pays est autorisé) et une ligne. Valeur
  enregistrée : la ligne sans espaces de bord ; pays passé par `onChange(…, country)` (`<clé>_pays`).
- Contrôles `address` et `postalCode` (France) : `core/contact`, à la sortie du champ et à la validation de la page.
- `env.checks === false` (contrôles de saisie désactivés en prévisualisation, EVO-014) : aucun message affiché à la sortie du champ (`useBlurErrors` de `plugin-api`, `FieldErrors` de `ui-kit`, EVO-025).
