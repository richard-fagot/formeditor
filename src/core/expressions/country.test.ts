import { describe, expect, it } from 'vitest';
import { evaluate, extractReferences, interpolate, renameReference, resolveLabel } from './index';

describe('référence au pays `cle.pays` (EVO-007)', () => {
  const ctx = {
    telephone: '+32470123456', telephone_pays: 'BE',
    souscripteur: { adresse: '12 rue des Lilas 31000 Toulouse', adresse_pays: 'FR' },
    souscripteurs: [{ telephone: '+33612345678', telephone_pays: 'FR' }, { telephone: '+32470123456', telephone_pays: 'BE' }],
    decl: { tel_pays: 'GB' },
    lieu: { pays: 'Italie' },
  };
  it('renvoie le pays rangé à côté de la réponse', () => {
    expect(evaluate('telephone.pays', ctx)).toBe('BE');
    expect(evaluate('souscripteur.adresse.pays', ctx)).toBe('FR');
    expect(evaluate('souscripteurs[1].telephone.pays', ctx)).toBe('BE');
    expect(evaluate('$count(souscripteurs[telephone.pays = "FR"])', ctx)).toBe(1);
    expect(evaluate('decl.tel.pays', ctx)).toBe('GB');
    expect(evaluate("telephone.pays = 'BE' and $exists(telephone)", ctx)).toBe(true);
  });
  it('vide si non répondu ; un champ de structure nommé `pays` reste lisible', () => {
    expect(evaluate('fax.pays', ctx)).toBeUndefined();
    expect(evaluate('lieu.pays', ctx)).toBe('Italie');
  });
  it('références et renommage voient l’écriture d’origine', () => {
    expect(extractReferences('telephone.pays = "FR"')).toEqual([['telephone', 'pays']]);
    expect(renameReference('telephone.pays = "FR"', ['telephone'], 'tel')).toBe('tel.pays = "FR"');
  });
});

describe('interpolation des types civilité et téléphone (EVO-007)', () => {
  const display = {
    civilite: (v: unknown) => (v === 'MME' ? { fr: 'Madame', en: 'Madam' } : undefined),
    telephone: (v: unknown) => `<${String(v)}>`,
  };
  const ctx = { civilite: 'MME', nom: 'Dupont', telephone: '+33612345678', souscripteur: { civilite: 'MME' } };
  it('libellé de la civilité dans la langue courante, téléphone mis en forme', () => {
    expect(resolveLabel({ fr: '{civilite} {nom}', en: '{civilite} {nom}' }, { lang: 'fr', defaultLang: 'fr' }, ctx, { display })).toBe('Madame Dupont');
    expect(resolveLabel({ fr: '{civilite} {nom}', en: '{civilite} {nom}' }, { lang: 'en', defaultLang: 'fr' }, ctx, { display })).toBe('Madam Dupont');
    expect(interpolate('{souscripteur.civilite}', ctx, { display, lang: 'fr' })).toBe('Madame');
    expect(interpolate('{telephone}', ctx, { display })).toBe('<+33612345678>');
  });
  it('expression non réduite à une référence : valeur brute', () => {
    expect(interpolate('{civilite & ""}', ctx, { display })).toBe('MME');
    expect(interpolate('{civilite}', ctx)).toBe('MME');
  });
});
