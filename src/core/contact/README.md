# core/contact

Contrôles et normalisation des types mail, téléphone, adresse et civilité (EVO-007), noms de pays. Pur (pas d'interface).
Dépend de `core/model` et de `libphonenumber-js` (métadonnées `max`, embarquées : aucun accès réseau).

## API
- Mail (`email.ts`) : `isEmail(s)` (RFC 5322 `addr-spec` restreinte par RFC 5321 `Mailbox` : `dot-atom` ou chaîne entre
  guillemets ; nom de domaine ou littéral IPv4 / `IPv6:` ; 64 / 254 caractères ; ASCII seulement), `normalizeEmail(s)`
  (`{ value, valid }` : espaces de bord retirés, nom de domaine en minuscules).
- Téléphone (`phone.ts`) : `normalizePhone(saisie, pays)` (`{ value, country, valid, display }` : E.164 si valide, sinon la
  saisie ; `+` ou `00` en tête fixe le pays ; `display` au format national), `phoneErrors(q, valeur, pays)` (`phone` : invalide
  ou pays non autorisé ; `lineType` : `FIXED_LINE_OR_MOBILE` accepté pour les deux), `formatPhone` (international lisible),
  `nationalPhone`.
- Adresse (`address.ts`) : `addressErrors(q, valeur, pays)` (`address` : longueur `ADDRESS_MIN`–`ADDRESS_MAX` par défaut
  5–200 en caractères, au moins une lettre `\p{L}`, aucun caractère de contrôle ; `postalCode` : 5 chiffres en France).
- `contactErrors(q, valeur, pays?)` (`checks.ts`) : paramètres en échec pour les quatre types (civilité : `option` si le code
  n'est pas proposé) ; `[]` pour les autres types. Utilisé par `core/validation` (`validateAnswer`, `formatErrors`).
- Pays (`countries.ts`) : `COUNTRIES` (codes ISO 3166-1 alpha-2 de la bibliothèque), `callingCode`, `countryName(code, langue)`
  (`Intl.DisplayNames`, repli : le code), `flagOf` (emoji calculé), `countryChoices(autorisés, langue)` (triés par nom).
- `displayFormatters(ws)` (`display.ts`) : mises en forme de l'interpolation par clé (civilité → libellé multilingue,
  téléphone → format international), passées à `EvalEnv.display` par `ui/preview`.

## Tests
`contact.test.ts` (cas limites des RFC, critères d'acceptation de l'EVO-007).
