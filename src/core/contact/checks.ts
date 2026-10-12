import { civilityCodes, DEFAULT_COUNTRY, type Question, type StructureField } from '../model';
import { addressErrors } from './address';
import { isEmail } from './email';
import { phoneErrors } from './phone';

/**
 * Contrôles de format intégrés des types mail, téléphone, adresse et civilité (EVO-007), sur une réponse non vide.
 * Renvoie les paramètres en échec (`email`, `phone`, `lineType`, `address`, `postalCode`, `option`) ; `[]` pour les autres types.
 * `country` : pays rangé à côté de la réponse (`<clé>_pays`), sinon le pays par défaut de la question.
 */
export function contactErrors(q: Question | StructureField, value: unknown, country?: unknown): string[] {
  const s = typeof value === 'string' ? value.trim() : String(value);
  const c = typeof country === 'string' && country ? country : undefined;
  switch (q.type) {
    case 'email':
      return isEmail(s) ? [] : ['email'];
    case 'phone':
      return phoneErrors(q, s, c ?? q.defaultCountry ?? DEFAULT_COUNTRY);
    case 'address':
      return addressErrors(q, s, c);
    case 'civility':
      return (civilityCodes(q) as string[]).includes(s) ? [] : ['option'];
    default:
      return [];
  }
}
