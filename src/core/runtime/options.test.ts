import { describe, expect, it } from 'vitest';
import type { ChoiceEntry, SingleChoiceQuestion } from '../model';
import { choiceOptions } from './index';

const base: SingleChoiceQuestion = {
  id: 'q', key: 'q', label: { fr: 'q' }, type: 'single',
  options: [
    { value: 'a', label: { fr: 'A' } },
    { value: 'b', label: { fr: 'B' }, when: 'sys.profil = "ud"' },
  ],
};
const withEntries = (options: ChoiceEntry[]): SingleChoiceQuestion => ({ ...base, options });
const values = (q: SingleChoiceQuestion, ctx: Record<string, unknown>) => choiceOptions(q, ctx).map((o) => o.value);

/** Exemple d'EVO-001 : entrée dynamique en tête, puis deux options statiques. */
const evo = withEntries([
  { from: 'sys.champ_dynamique' },
  { value: 'amicale', label: { fr: 'Une de ses amicales' } },
  { value: 'tiers', label: { fr: 'Un tiers' } },
]);

describe('choiceOptions', () => {
  it('filtre les options statiques par leur condition', () => {
    expect(values(base, { sys: { profil: 'ud' } })).toEqual(['a', 'b']);
    expect(values(base, { sys: { profil: 'x' } })).toEqual(['a']);
  });

  it('déploie une entrée dynamique à sa position, dans l’ordre de la source', () => {
    expect(values(evo, { sys: { champ_dynamique: ['A', 'B'] } })).toEqual(['A', 'B', 'amicale', 'tiers']);
    const middle = withEntries([evo.options[1]!, evo.options[0]!, evo.options[2]!]);
    expect(values(middle, { sys: { champ_dynamique: ['A', 'B'] } })).toEqual(['amicale', 'A', 'B', 'tiers']);
    const last = withEntries([evo.options[1]!, evo.options[2]!, evo.options[0]!]);
    expect(values(last, { sys: { champ_dynamique: ['A', 'B'] } })).toEqual(['amicale', 'tiers', 'A', 'B']);
  });

  it('source vide ou absente : seules les options statiques, sans ligne vide ni erreur', () => {
    expect(values(evo, { sys: { champ_dynamique: [] } })).toEqual(['amicale', 'tiers']);
    expect(values(evo, { sys: {} })).toEqual(['amicale', 'tiers']);
    expect(values(evo, {})).toEqual(['amicale', 'tiers']);
  });

  it('une entrée dynamique dont la condition est fausse ne donne aucune valeur', () => {
    const q = withEntries([{ from: 'sys.champ_dynamique', when: 'sys.profil = "ud"' }, evo.options[1]!]);
    expect(values(q, { sys: { profil: 'x', champ_dynamique: ['A'] } })).toEqual(['amicale']);
    expect(values(q, { sys: { profil: 'ud', champ_dynamique: ['A'] } })).toEqual(['A', 'amicale']);
  });

  it('liste d’objets : libellé et valeur calculés sur chaque objet, à la position de l’entrée', () => {
    const q = withEntries([
      { value: 'aucun', label: { fr: 'Aucun' } },
      { from: 'sys.sinistres', label: "date & ' — ' & nature", value: 'id' },
      { value: 'autre_sinistre', label: { fr: 'Un autre' } },
    ]);
    const ctx = { sys: { sinistres: [{ id: 's1', date: '2025-01-02', nature: 'Vol' }, { id: 7, date: '2025-03-04', nature: 'Incendie' }] } };
    expect(choiceOptions(q, ctx)).toEqual([
      { value: 'aucun', label: { fr: 'Aucun' } },
      { value: 's1', label: '2025-01-02 — Vol', dynamic: true },
      { value: '7', label: '2025-03-04 — Incendie', dynamic: true },
      { value: 'autre_sinistre', label: { fr: 'Un autre' } },
    ]);
  });

  it('accepte une réponse précédente (valeur simple ou liste) comme source', () => {
    const q = withEntries([{ from: 'couleurs' }]);
    expect(choiceOptions(q, { couleurs: ['Bleu', 'Vert'] }).map((o) => [o.value, o.label])).toEqual([['Bleu', 'Bleu'], ['Vert', 'Vert']]);
    expect(values(q, { couleurs: 'Bleu' })).toEqual(['Bleu']);
    expect(choiceOptions(q, {})).toEqual([]);
    expect(choiceOptions(withEntries([{ from: 'couleurs', label: '$uppercase($)' }]), { couleurs: ['Bleu'] })[0]!.label).toBe('BLEU');
  });

  it('plusieurs entrées dynamiques coexistent', () => {
    const q = withEntries([{ from: 'x' }, { value: 'm', label: { fr: 'M' } }, { from: 'y' }]);
    expect(values(q, { x: ['x1'], y: ['y1', 'y2'] })).toEqual(['x1', 'm', 'y1', 'y2']);
  });

  it('ignore les doublons d’une valeur déjà proposée plus haut, les valeurs vides et « other »', () => {
    const q = withEntries([{ value: 'a', label: { fr: 'A' } }, { from: 'l' }]);
    expect(values(q, { l: ['a', 'other', null, '', 'c', 'c'] })).toEqual(['a', 'c']);
    // Une option statique placée après une valeur dynamique identique n'est pas répétée non plus.
    const after = withEntries([{ from: 'l' }, { value: 'a', label: { fr: 'A' } }]);
    expect(values(after, { l: ['a', 'b'] })).toEqual(['a', 'b']);
  });
});
