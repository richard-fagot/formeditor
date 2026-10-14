import { describe, expect, it } from 'vitest';
import type { LocalizedText, Question } from '../core/model';
import { formatErrors } from '../core/validation';

/**
 * EVO-025 — tests de caractérisation de la règle « erreur à la sortie du champ » des types mail, téléphone, adresse.
 * La règle est reproduite ici telle qu'écrite dans chaque plugin ; le refactoring la remplacera par la logique pure
 * de `plugin-api` (`useBlurErrors`), sans changer les valeurs attendues :
 * - sortie du champ : `formatErrors(question, stored || null, pays).map(env.label)` —
 *   email/index.tsx:34, phone/phone-field.tsx:43 (pays : `country ?? picked`), address/index.tsx:49 (pays : `picked`) ;
 * - saisie (ou changement de pays) : messages remis à zéro — email/index.tsx:29, phone-field.tsx:35, address/index.tsx:44 ;
 * - affichage : seulement si `env.checks !== false` et sans erreur de validation sur la question (`errors['']`) —
 *   email/index.tsx:42, phone-field.tsx:63, address/index.tsx:69.
 */

const q = (type: string, extra: Record<string, unknown> = {}) => ({ id: 'n', key: 'champ', label: { fr: 'Champ' }, type, ...extra }) as Question;
/** `env.label` réduit au texte dans la langue (sans interpolation d'expressions, absente des messages par défaut). */
const labelIn = (lang: string) => (t: LocalizedText | undefined) => t?.[lang] ?? t?.fr ?? '';

/** Messages calculés à la sortie du champ. */
const onBlur = (question: Question, stored: string, country: string | undefined, lang = 'fr') =>
  formatErrors(question, stored || null, country).map((e) => labelIn(lang)(e.message));
/** Messages affichés. */
const shown = (blur: string[], checks: boolean | undefined, errors: Record<string, string[]>) =>
  checks !== false && !(errors[''] ?? []).length ? blur : [];

describe('EVO-025 — erreurs à la sortie du champ (mail, téléphone, adresse)', () => {
  it('mail : adresse invalide → message ; valide ou vide → aucun', () => {
    expect(onBlur(q('email'), 'jean@@exemple.fr', undefined)).toEqual(['Adresse mail invalide.']);
    expect(onBlur(q('email'), 'jean@@exemple.fr', undefined, 'en')).toEqual(['Invalid email address.']);
    expect(onBlur(q('email'), 'jean.dupont@exemple.fr', undefined)).toEqual([]);
    expect(onBlur(q('email'), '', undefined)).toEqual([]);
  });

  it('mail : message surchargé par la question', () => {
    const messages = { email: { fr: 'Mail incorrect', en: 'Wrong email' } };
    expect(onBlur(q('email', { messages }), 'x', undefined)).toEqual(['Mail incorrect']);
    expect(onBlur(q('email', { messages }), 'x', undefined, 'en')).toEqual(['Wrong email']);
  });

  it('téléphone : numéro contrôlé dans le pays du champ ; type de ligne', () => {
    expect(onBlur(q('phone'), '02 512 34 56', 'BE')).toEqual([]);
    expect(onBlur(q('phone'), '0470', 'BE')).toEqual(['Numéro de téléphone invalide.']);
    expect(onBlur(q('phone'), '0470', 'BE', 'en')).toEqual(['Invalid phone number.']);
    expect(onBlur(q('phone', { lineType: 'mobile' }), '+33561123456', 'FR')).toEqual(['Numéro mobile attendu.']);
    expect(onBlur(q('phone', { lineType: 'mobile' }), '+33561123456', 'FR', 'en')).toEqual(['Mobile number expected.']);
    expect(onBlur(q('phone'), '', 'FR')).toEqual([]);
  });

  it('adresse : code postal selon le pays choisi', () => {
    expect(onBlur(q('address'), '12 rue des Lilas Toulouse', 'FR')).toEqual(['Code postal manquant.']);
    expect(onBlur(q('address'), '12 rue des Lilas Toulouse', 'FR', 'en')).toEqual(['Postal code missing.']);
    expect(onBlur(q('address'), '12 rue des Lilas Toulouse', 'DE')).toEqual([]);
    expect(onBlur(q('address'), '12345', 'DE')).toEqual(['Adresse invalide : une ligne de 5–200 caractères, avec au moins une lettre.']);
    expect(onBlur(q('address'), '', 'FR')).toEqual([]);
  });

  it('affichage : masqué si les contrôles sont désactivés ou si la question a déjà une erreur de validation', () => {
    const blur = onBlur(q('email'), 'x', undefined);
    expect(shown(blur, undefined, {})).toEqual(['Adresse mail invalide.']);
    expect(shown(blur, true, { '': [] })).toEqual(['Adresse mail invalide.']);
    expect(shown(blur, false, {})).toEqual([]);
    expect(shown(blur, undefined, { '': ['Réponse obligatoire.'] })).toEqual([]);
    expect(shown(blur, undefined, { 'autre': ['x'] })).toEqual(['Adresse mail invalide.']);
  });
});
