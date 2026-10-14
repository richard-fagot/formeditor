import { describe, expect, it } from 'vitest';
import { resolveLabel } from '../expressions';
import { civilityCodes, civilityLabel, type AddressQuestion, type CivilityQuestion, type PhoneQuestion, type Workspace } from '../model';
import { addressErrors, contactErrors, countryChoices, countryName, displayFormatters, flagOf, formatPhone, normalizeEmail, normalizePhone, phoneErrors } from './index';

const phone = (extra: Partial<PhoneQuestion> = {}): PhoneQuestion => ({ id: 'p', key: 'tel', label: { fr: 'Tél' }, type: 'phone', ...extra });
const address = (extra: Partial<AddressQuestion> = {}): AddressQuestion => ({ id: 'a', key: 'adr', label: { fr: 'Adresse' }, type: 'address', ...extra });

describe('mail (RFC 5321 / 5322)', () => {
  it('normalise le domaine en minuscules, garde la partie locale', () => {
    expect(normalizeEmail('  Jean.Dupont@Exemple.FR ')).toEqual({ value: 'Jean.Dupont@exemple.fr', valid: true });
  });
  it.each([
    'jean dupont@exemple.fr', 'jean@@exemple.fr', '.jean@exemple.fr', 'jean.@exemple.fr', 'jean..dupont@exemple.fr',
    `${'a'.repeat(65)}@exemple.fr`, 'jean@-exemple.fr', 'jean@exemple-.fr', `jean@${'a'.repeat(64)}.fr`, 'jean@exemple..fr',
    'jean(commentaire)@exemple.fr', 'jean@[300.0.0.1]', 'jean@[IPv6:2001:db8::1::2]', 'jéan@exemple.fr', 'jean@exémple.fr',
    'jean', '@exemple.fr', 'jean@', '"jean"dupont"@exemple.fr', `${'a'.repeat(64)}@${'b'.repeat(60)}.${'c'.repeat(60)}.${'d'.repeat(60)}.${'e'.repeat(10)}.fr`,
  ])('refuse %s', (s) => {
    expect(normalizeEmail(s).valid).toBe(false);
  });
  it.each([
    'jean+test@exemple.fr', '"jean dupont"@exemple.fr', 'jean@[192.0.2.1]', 'jean@[IPv6:2001:db8::1]', '"a@b"@exemple.fr',
    "o'brien@exemple.fr", 'jean@localhost', `${'a'.repeat(64)}@exemple.fr`, 'jean@[IPv6:::ffff:192.0.2.1]', '"\\"x\\""@exemple.fr',
  ])('accepte %s', (s) => {
    expect(normalizeEmail(s).valid).toBe(true);
  });
});

describe('téléphone', () => {
  it('FR : saisie nationale → E.164, affichage national', () => {
    const n = normalizePhone('06 12 34 56 78', 'FR');
    expect(n).toMatchObject({ value: '+33612345678', country: 'FR', valid: true, display: '06 12 34 56 78' });
    expect(normalizePhone('0612345678', 'FR').value).toBe('+33612345678');
  });
  it('un numéro en + fixe le pays et prime sur le sélecteur', () => {
    expect(normalizePhone('+32 470 12 34 56', 'FR')).toMatchObject({ value: '+32470123456', country: 'BE', valid: true });
  });
  it('00 en tête vaut +', () => {
    expect(normalizePhone('0044 20 7946 0958', 'FR')).toMatchObject({ value: '+442079460958', country: 'GB', valid: true });
    expect(normalizePhone('0044 20 7946 0958', 'US')).toMatchObject({ country: 'GB', valid: true });
  });
  it('accepte espaces, points, tirets, parenthèses ; refuse le reste', () => {
    expect(normalizePhone('(06).12-34 56.78', 'FR').valid).toBe(true);
    expect(normalizePhone('06 12 34 56 7a', 'FR')).toMatchObject({ valid: false, value: '06 12 34 56 7a' });
  });
  it('trop court ou trop long → contrôle téléphone', () => {
    expect(phoneErrors(phone(), '0612', 'FR')).toEqual(['phone']);
    expect(phoneErrors(phone(), '061234567890', 'FR')).toEqual(['phone']);
    expect(phoneErrors(phone(), '+33612345678', 'FR')).toEqual([]);
  });
  it('type de ligne exigé', () => {
    expect(phoneErrors(phone({ lineType: 'mobile' }), '+33561123456', 'FR')).toEqual(['lineType']);
    expect(phoneErrors(phone({ lineType: 'fixed' }), '+33561123456', 'FR')).toEqual([]);
    expect(phoneErrors(phone({ lineType: 'fixed' }), '+33612345678', 'FR')).toEqual(['lineType']);
  });
  it('pays autorisés : un numéro d’un autre pays est refusé', () => {
    const q = phone({ countries: ['FR', 'BE'] });
    expect(phoneErrors(q, '+442079460958', 'FR')).toEqual(['phone']);
    expect(phoneErrors(q, '+32470123456', 'BE')).toEqual([]);
  });
  it('format international lisible', () => {
    expect(formatPhone('+33612345678')).toBe('+33 6 12 34 56 78');
    expect(formatPhone('pas un numéro')).toBe('pas un numéro');
  });
});

describe('adresse', () => {
  it('FR avec code postal : acceptée', () => {
    expect(addressErrors(address(), '12 rue des Lilas 31000 Toulouse', 'FR')).toEqual([]);
  });
  it('FR sans code postal : code postal manquant ; DE : acceptée', () => {
    expect(addressErrors(address(), '12 rue des Lilas Toulouse', 'FR')).toEqual(['postalCode']);
    expect(addressErrors(address(), '12 rue des Lilas Toulouse', 'DE')).toEqual([]);
  });
  it('chiffres seuls, trop longue, trop courte, retour à la ligne : contrôle adresse', () => {
    expect(addressErrors(address(), '12345', 'DE')).toEqual(['address']);
    expect(addressErrors(address(), `12 rue ${'a'.repeat(200)}`, 'DE')).toEqual(['address']);
    expect(addressErrors(address(), 'ab', 'DE')).toEqual(['address']);
    expect(addressErrors(address(), '12 rue\nParis', 'DE')).toEqual(['address']);
  });
  it('bornes paramétrables', () => {
    expect(addressErrors(address({ maxLength: 10 }), '12 rue des Lilas', 'DE')).toEqual(['address']);
  });
  it('alphabets non latins acceptés', () => {
    expect(addressErrors(address(), '東京都千代田区1-1', 'JP')).toEqual([]);
  });
});

describe('pays', () => {
  it('nom localisé, drapeau', () => {
    expect(countryName('BE', 'fr')).toBe('Belgique');
    expect(countryName('BE', 'en')).toBe('Belgium');
    expect(flagOf('FR')).toBe('🇫🇷');
  });
});

describe('interpolation : mises en forme par clé (EVO-007)', () => {
  const ws = {
    questionnaires: [{ nodes: [
      { kind: 'question', id: 'n1', key: 'souscripteur', label: { fr: 'S' }, type: 'structure', fields: [
        { id: 'f1', key: 'civilite', label: { fr: 'Civilité' }, type: 'civility', undisclosed: true, labels: { MME: { fr: 'Mme' } } },
        { id: 'f2', key: 'telephone', label: { fr: 'Tél' }, type: 'phone' },
      ] },
      { kind: 'question', id: 'n2', key: 'nom', label: { fr: 'Nom' }, type: 'text' },
    ] }],
    library: { questions: [{ id: 'l1', key: 'civ', label: { fr: 'C' }, type: 'civility' }], fragments: [] },
  } as unknown as Workspace;
  const display = displayFormatters(ws, ws.questionnaires[0]);
  it('civilité : libellé (modifié ou par défaut) ; téléphone : format international ; autres types : rien', () => {
    expect(display.civilite!('MME')).toEqual({ fr: 'Mme' });
    expect(display.civilite!('NP')).toEqual({ fr: 'Ne se prononce pas', en: 'Prefer not to say' });
    expect(display.civ!('MME')).toEqual({ fr: 'Madame', en: 'Madam' });
    expect(display.telephone!('+33612345678')).toBe('+33 6 12 34 56 78');
    expect(display.nom).toBeUndefined();
  });
  it('« Madame Dupont » en français par le libellé interpolé', () => {
    const label = { fr: '{civ} {nom}' };
    expect(resolveLabel(label, { lang: 'fr', defaultLang: 'fr' }, { civ: 'MME', nom: 'Dupont' }, { display })).toBe('Madame Dupont');
  });
});

describe('interpolation : questionnaire ou fragment courant d’abord, puis bibliothèque (écart EVO-007)', () => {
  const civ = (id: string, key: string) => ({ kind: 'question', id, key, label: { fr: 'C' }, type: 'civility' });
  const text = (id: string, key: string) => ({ kind: 'question', id, key, label: { fr: 'T' }, type: 'text' });
  const ws = {
    questionnaires: [{ id: 'q1', nodes: [text('a', 'civilite')] }, { id: 'q2', nodes: [civ('b', 'civilite'), { kind: 'question', id: 'r', ref: 'l1' }] }],
    library: { questions: [{ id: 'l1', key: 'tel', label: { fr: 'T' }, type: 'phone' }, { id: 'l2', key: 'civilite', label: { fr: 'C' }, type: 'civility' }],
      fragments: [{ id: 'f1', nodes: [civ('c', 'genre')] }] },
  } as unknown as Workspace;
  it('une question texte homonyme du graphe courant n’est pas reformatée', () => {
    expect(displayFormatters(ws, ws.questionnaires[0]).civilite).toBeUndefined();
    expect(displayFormatters(ws, ws.questionnaires[1]).civilite!('MME')).toEqual({ fr: 'Madame', en: 'Madam' });
  });
  it('référence de bibliothèque du graphe, puis bibliothèque (questions et fragments)', () => {
    const d = displayFormatters(ws, ws.questionnaires[0]);
    expect(d.tel!('+33612345678')).toBe('+33 6 12 34 56 78');
    expect(d.genre!('M')).toEqual({ fr: 'Monsieur', en: 'Mister' });
  });
});

describe('civilité et pays proposés (EVO-007)', () => {
  const civ = (extra: Partial<CivilityQuestion> = {}): CivilityQuestion => ({ id: 'c', key: 'civilite', label: { fr: 'Civilité' }, type: 'civility', ...extra });
  it('Madame et Monsieur ; « Ne se prononce pas » en dernier si activée', () => {
    expect(civilityCodes(civ())).toEqual(['MME', 'M']);
    expect(civilityCodes(civ({ undisclosed: true }))).toEqual(['MME', 'M', 'NP']);
    expect(contactErrors(civ({ undisclosed: true }), 'NP')).toEqual([]);
  });
  it('libellé modifié : le code reste le même ; libellés courts', () => {
    const q = civ({ labels: { MME: { fr: 'Mme' } } });
    expect(civilityLabel(q, 'MME')).toEqual({ fr: 'Mme' });
    expect(contactErrors(q, 'MME')).toEqual([]);
    expect(civilityLabel(civ({ short: true }), 'M')).toEqual({ fr: 'M.', en: 'Mr' });
    expect(civilityLabel(civ(), 'MME')).toEqual({ fr: 'Madame', en: 'Madam' });
  });
  it('sélecteur limité aux pays autorisés', () => {
    expect(countryChoices(['FR', 'BE'], 'fr').map((c) => c.code)).toEqual(['BE', 'FR']);
    expect(countryChoices(undefined, 'fr').length).toBeGreaterThan(200);
  });
});
