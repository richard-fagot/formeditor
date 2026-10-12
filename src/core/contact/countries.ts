import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/max';

/** Codes pays ISO 3166-1 alpha-2 connus (liste de `libphonenumber-js`). */
export const COUNTRIES: readonly string[] = getCountries();
const KNOWN = new Set<string>(COUNTRIES);

/** Code pays connu de la bibliothèque téléphonique, sinon `undefined`. */
export const knownCountry = (code: string | undefined): CountryCode | undefined =>
  code && KNOWN.has(code) ? (code as CountryCode) : undefined;

/** Indicatif téléphonique (`33` pour `FR`), vide si inconnu. */
export const callingCode = (code: string): string => {
  const c = knownCountry(code);
  return c ? getCountryCallingCode(c) : '';
};

const names = new Map<string, Intl.DisplayNames | null>();
/** Nom du pays dans la langue demandée (`Intl.DisplayNames` du navigateur) ; repli : le code. */
export function countryName(code: string, lang: string): string {
  if (!names.has(lang)) {
    try {
      names.set(lang, new Intl.DisplayNames([lang], { type: 'region' }));
    } catch {
      names.set(lang, null);
    }
  }
  try {
    return names.get(lang)?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Drapeau emoji (indicateurs régionaux) d'un code pays à deux lettres. */
export const flagOf = (code: string): string =>
  /^[A-Za-z]{2}$/.test(code) ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';

/** Pays proposés (autorisés, sinon tous), triés par nom dans la langue demandée. */
export function countryChoices(allowed: string[] | undefined, lang: string): { code: string; name: string }[] {
  const list = allowed?.length ? allowed : COUNTRIES;
  return list.map((code) => ({ code, name: countryName(code, lang) })).sort((a, b) => a.name.localeCompare(b.name, lang));
}
