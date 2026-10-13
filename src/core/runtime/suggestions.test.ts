import { describe, expect, it } from 'vitest';
import { evaluate } from '../expressions';
import { filterSuggestions, suggestionList } from './suggestions';

/** Suggestions d'un champ texte (EVO-016) : résultat de l'expression mis en liste de textes. */
const of = (expr: string, ctx: Record<string, unknown> = {}) => suggestionList(evaluate(expr, ctx));

describe('suggestionList (EVO-016)', () => {
  const ctx = { marques: ['Peugeot', 'Toyota'], sys: { villes: ['Lyon', 'Paris'], sinistres: [{ date: '2024-01-02' }, { date: '2024-03-04' }] } };

  it('réponse d’un choix multiple : ses valeurs, dans l’ordre', () => {
    expect(of('marques', ctx)).toEqual(['Peugeot', 'Toyota']);
  });

  it('variable système de type liste, champ d’une liste d’objets, littéral de liste', () => {
    expect(of('sys.villes', ctx)).toEqual(['Lyon', 'Paris']);
    expect(of('sys.sinistres.date', ctx)).toEqual(['2024-01-02', '2024-03-04']);
    expect(of('["a", "b"]')).toEqual(['a', 'b']);
  });

  it('valeur unique → liste d’un élément', () => {
    expect(of('marque', { marque: 'Renault' })).toEqual(['Renault']);
    expect(suggestionList('Renault')).toEqual(['Renault']);
  });

  it('vide, non renseigné ou erreur → aucune suggestion', () => {
    expect(of('absente', ctx)).toEqual([]);
    expect(of('[]')).toEqual([]);
    expect(suggestionList(undefined)).toEqual([]);
    expect(suggestionList(null)).toEqual([]);
    expect(of('$inconnue(')).toEqual([]);
  });

  it('nombres, booléens et dates convertis en texte', () => {
    expect(suggestionList([12, 3.5, true, '2024-05-06'])).toEqual(['12', '3.5', 'true', '2024-05-06']);
  });

  it('doublons supprimés, ordre de l’expression conservé (première occurrence)', () => {
    expect(suggestionList(['Toyota', 'Peugeot', 'Toyota', 'Peugeot', 'Dacia'])).toEqual(['Toyota', 'Peugeot', 'Dacia']);
    expect(suggestionList([1, '1'])).toEqual(['1']);
  });

  it('« Autre (préciser) » : la valeur réservée `other` est écartée, la précision s’ajoute par l’expression', () => {
    const autre = { marques: ['Peugeot', 'other'], marques_other: 'Dacia' };
    expect(of('marques', autre)).toEqual(['Peugeot']);
    expect(of('$append(marques, marques_other)', autre)).toEqual(['Peugeot', 'Dacia']);
  });

  it('objets, éléments vides et chaînes vides écartés', () => {
    expect(suggestionList(['a', '', '  ', null, { x: 1 }, ['b']])).toEqual(['a', 'b']);
  });
});

describe('filterSuggestions (EVO-016)', () => {
  const list = ['Peugeot', 'Toyota', 'Renault'];
  it('saisie vide : toute la liste', () => {
    expect(filterSuggestions(list, '')).toEqual(list);
  });
  it('« contient », casse ignorée', () => {
    expect(filterSuggestions(list, 'toy')).toEqual(['Toyota']);
    expect(filterSuggestions(list, 'EU')).toEqual(['Peugeot']);
    expect(filterSuggestions(list, 'o')).toEqual(['Peugeot', 'Toyota']);
    expect(filterSuggestions(list, 'Dacia')).toEqual([]);
  });
});
