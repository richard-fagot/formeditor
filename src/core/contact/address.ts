import { DEFAULT_COUNTRY, type AddressQuestion } from '../model';

/** Bornes de longueur par défaut d'une adresse. */
export const ADDRESS_MIN = 5;
export const ADDRESS_MAX = 200;

/**
 * Contrôles d'une adresse sur une ligne : `address` (longueur hors bornes, aucune lettre, caractère de contrôle ou
 * retour à la ligne), puis `postalCode` (France : code postal à 5 chiffres). Toutes lettres acceptées (accents, autres alphabets).
 */
export function addressErrors(q: AddressQuestion, value: string, country: string | undefined): string[] {
  const s = value.trim();
  const length = [...s].length;
  if (length < (q.minLength ?? ADDRESS_MIN) || length > (q.maxLength ?? ADDRESS_MAX) || !/\p{L}/u.test(s) || /\p{Cc}/u.test(s)) {
    return ['address'];
  }
  if ((country ?? q.defaultCountry ?? DEFAULT_COUNTRY) === 'FR' && !/(^|\D)\d{5}(?!\d)/.test(s)) return ['postalCode'];
  return [];
}
