// API publique du module core/contact : contrôles et normalisation des types mail, téléphone, adresse, civilité (EVO-007).
export { isEmail, normalizeEmail } from './email';
export { normalizePhone, phoneErrors, formatPhone, nationalPhone, type PhoneInput } from './phone';
export { addressErrors, ADDRESS_MIN, ADDRESS_MAX } from './address';
export { COUNTRIES, callingCode, countryName, flagOf, countryChoices } from './countries';
export { contactErrors } from './checks';
export { displayFormatters, type DisplayFormatter } from './display';
