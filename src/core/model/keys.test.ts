import { describe, expect, it } from 'vitest';
import { deriveKey, uniqueKey, isValidKey } from './keys';

describe('deriveKey', () => {
  it('produit une clé snake_case sans mots vides ni accents', () => {
    expect(deriveKey('Date du sinistre')).toBe('date_sinistre');
    expect(deriveKey("Quelle est l'adresse de l'assuré ?")).toBe('quelle_est_adresse_assure');
    expect(deriveKey('Montant estimé (€)')).toBe('montant_estime');
  });
  it('ne commence jamais par un chiffre et n’est jamais vide', () => {
    expect(deriveKey('3 témoins')).toBe('q_3_temoins');
    expect(deriveKey('  ?! ')).toBe('question');
  });
  it('tronque les intitulés longs', () => {
    expect(deriveKey('un deux trois quatre cinq six sept huit neuf dix onze').split('_').length).toBeLessThanOrEqual(5);
  });
});

describe('uniqueKey', () => {
  it('suffixe en cas de collision', () => {
    expect(uniqueKey('nom', ['nom', 'nom_2'])).toBe('nom_3');
    expect(uniqueKey('nom', [])).toBe('nom');
  });
});

describe('mot réservé « groupe » (EVO-003)', () => {
  it('aucune clé ne peut s’appeler groupe ; la dérivation l’évite', () => {
    expect(isValidKey('groupe')).toBe(false);
    expect(isValidKey('groupe_age')).toBe(true);
    expect(deriveKey('Groupe')).toBe('q_groupe');
  });
});

describe('isValidKey', () => {
  it('accepte le snake_case et refuse le reste et les mots réservés', () => {
    expect(isValidKey('date_sinistre')).toBe(true);
    expect(isValidKey('Date')).toBe(false);
    expect(isValidKey('1a')).toBe(false);
    expect(isValidKey('sys')).toBe(false);
  });
});
