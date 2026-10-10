import { describe, expect, it } from 'vitest';
import type { SingleChoiceQuestion } from '../model';
import { choiceOptions } from './index';

const base: SingleChoiceQuestion = {
  id: 'q', key: 'q', label: { fr: 'q' }, type: 'single',
  options: [
    { value: 'a', label: { fr: 'A' } },
    { value: 'b', label: { fr: 'B' }, when: 'sys.profil = "ud"' },
  ],
};

describe('choiceOptions', () => {
  it('filtre les options statiques par leur condition', () => {
    expect(choiceOptions(base, { sys: { profil: 'ud' } }).map((o) => o.value)).toEqual(['a', 'b']);
    expect(choiceOptions(base, { sys: { profil: 'x' } }).map((o) => o.value)).toEqual(['a']);
  });

  it('ajoute les options d’une liste d’objets après les statiques (libellé et valeur calculés)', () => {
    const q = { ...base, source: { from: 'sys.sinistres', label: "date & ' — ' & nature", value: 'id' } };
    const ctx = { sys: { profil: 'x', sinistres: [{ id: 's1', date: '2025-01-02', nature: 'Vol' }, { id: 7, date: '2025-03-04', nature: 'Incendie' }] } };
    expect(choiceOptions(q, ctx)).toEqual([
      { value: 'a', label: { fr: 'A' } },
      { value: 's1', label: '2025-01-02 — Vol', dynamic: true },
      { value: '7', label: '2025-03-04 — Incendie', dynamic: true },
    ]);
  });

  it('accepte une réponse précédente (valeur simple ou liste) comme source', () => {
    const q = { ...base, options: [], source: { from: 'couleurs' } };
    expect(choiceOptions(q, { couleurs: ['Bleu', 'Vert'] }).map((o) => [o.value, o.label])).toEqual([['Bleu', 'Bleu'], ['Vert', 'Vert']]);
    expect(choiceOptions(q, { couleurs: 'Bleu' }).map((o) => o.value)).toEqual(['Bleu']);
    expect(choiceOptions(q, {})).toEqual([]);
    expect(choiceOptions({ ...q, source: { from: 'couleurs', label: '$uppercase($)' } }, { couleurs: ['Bleu'] })[0]!.label).toBe('BLEU');
  });

  it('ignore les doublons, les valeurs vides et la valeur réservée « other »', () => {
    const q = { ...base, options: [{ value: 'a', label: { fr: 'A' } }], source: { from: 'l' } };
    expect(choiceOptions(q, { l: ['a', 'other', null, 'c', 'c'] }).map((o) => o.value)).toEqual(['a', 'c']);
  });
});
