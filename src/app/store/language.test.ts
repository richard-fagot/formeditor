import { describe, expect, it } from 'vitest';
import { addLanguage, blankWorkspace, isLanguageCode, removeLanguage, setDefaultLanguage } from './index';

describe('langues des contenus', () => {
  it('ajoute une langue valide une seule fois', () => {
    const ws = blankWorkspace();
    expect(isLanguageCode('en')).toBe(true);
    expect(isLanguageCode('pt-BR')).toBe(true);
    expect(isLanguageCode('Anglais')).toBe(false);
    expect(isLanguageCode('zh-Hant-TW')).toBe(false);
    expect(addLanguage(ws, ' en ')).toBe(true);
    expect(addLanguage(ws, 'en')).toBe(false);
    expect(addLanguage(ws, 'x y')).toBe(false);
    expect(ws.project.languages).toEqual(['fr', 'en']);
  });
  it('change la langue par défaut et ne retire jamais celle-ci', () => {
    const ws = blankWorkspace();
    addLanguage(ws, 'en');
    expect(removeLanguage(ws, 'fr')).toBe(false);
    expect(setDefaultLanguage(ws, 'de')).toBe(false);
    expect(setDefaultLanguage(ws, 'en')).toBe(true);
    expect(removeLanguage(ws, 'fr')).toBe(true);
    expect(ws.project).toMatchObject({ languages: ['en'], defaultLanguage: 'en' });
  });
});
