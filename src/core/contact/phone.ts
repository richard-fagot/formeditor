import { parsePhoneNumberFromString, type PhoneNumber } from 'libphonenumber-js/max';
import type { PhoneQuestion } from '../model';
import { knownCountry } from './countries';

/** Caractères acceptés : chiffres, espaces, points, tirets, parenthèses, `+` en tête. */
const ALLOWED = /^\+?[\d\s.\-()]+$/;

function parse(input: string, country: string | undefined): PhoneNumber | undefined {
  let s = input.trim();
  if (!ALLOWED.test(s)) return undefined;
  if (s.startsWith('00')) s = `+${s.slice(2)}`;
  return parsePhoneNumberFromString(s, knownCountry(country));
}

export interface PhoneInput {
  /** E.164 si le numéro est valide, sinon la saisie sans espaces de bord. */
  value: string;
  /** Pays du numéro (`+` ou `00` en tête), sinon le pays choisi. */
  country: string;
  valid: boolean;
  /** Affichage après saisie : format national du pays du numéro, sinon la saisie. */
  display: string;
}

/** Normalise une saisie : un numéro commençant par `+` ou `00` fixe le pays et prime sur le pays choisi. */
export function normalizePhone(input: string, country: string): PhoneInput {
  const s = input.trim();
  const p = parse(s, country);
  if (!p || !p.isValid()) return { value: s, country: p?.country ?? country, valid: false, display: s };
  return { value: p.number, country: p.country ?? country, valid: true, display: p.formatNational() };
}

/** Contrôles d'un téléphone : `phone` (invalide pour le pays, ou pays non autorisé), `lineType` (type de ligne). */
export function phoneErrors(q: PhoneQuestion, value: string, country: string): string[] {
  const p = parse(value, country);
  if (!p || !p.isValid()) return ['phone'];
  if (q.countries?.length && (!p.country || !q.countries.includes(p.country))) return ['phone'];
  if (q.lineType) {
    const type = p.getType();
    const expected = q.lineType === 'mobile' ? 'MOBILE' : 'FIXED_LINE';
    if (type !== expected && type !== 'FIXED_LINE_OR_MOBILE') return ['lineType'];
  }
  return [];
}

/** Format international lisible (`+33 6 12 34 56 78`) ; valeur inchangée si ce n'est pas un numéro valide. */
export function formatPhone(value: string): string {
  const p = parse(value, undefined);
  return p?.isValid() ? p.formatInternational() : value;
}

/** Affichage national d'une valeur enregistrée (`06 12 34 56 78`) ; valeur inchangée si invalide. */
export function nationalPhone(value: string, country: string): string {
  const p = parse(value, country);
  return p?.isValid() ? p.formatNational() : value;
}
