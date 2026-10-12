import { describe, expect, it } from 'vitest';
import { evaluate, resolveLabel } from '../../../core/expressions';
import type { MultipleChoiceQuestion, Question, SingleChoiceQuestion } from '../../../core/model';
import { choiceOptions } from '../../../core/runtime';
import type { RenderEnv } from '../../../plugin-api';
import { itemsOf, pickedAnswer, sectionsOf, selectedOf } from './selection';

/** Exemple d'EVO-003, les deux groupes codés (SC, AA). */
const single: SingleChoiceQuestion = {
  id: 'n1', key: 'lien', label: { fr: 'Lien' }, type: 'single', other: {},
  options: [
    { group: { fr: 'Victime directe', en: 'Direct victim' }, code: 'SC', options: [{ value: 'conjoint', label: { fr: 'Conjoint', en: 'Spouse' } }, { value: 'enfant', label: { fr: 'Enfant' } }] },
    { group: { fr: 'Ayant droit', en: 'Beneficiary' }, code: 'AA', options: [{ value: 'conjoint', label: { fr: 'Conjoint', en: 'Spouse' } }, { value: 'ascendant', label: { fr: 'Ascendant' } }] },
  ],
};
const multiple: MultipleChoiceQuestion = { ...single, type: 'multiple' };

/** Environnement de rendu minimal : options du moteur, libellés résolus dans `lang`. */
function envOf(lang: string, ctx: Record<string, unknown> = {}): RenderEnv {
  const langs = { lang, defaultLang: 'fr' };
  return {
    label: (l) => resolveLabel(l, langs, ctx),
    options: (q: Question) => (q.type === 'single' || q.type === 'multiple' ? choiceOptions(q, ctx, { defaultLang: 'fr' }) : []),
  } as RenderEnv;
}
const indexOf = (items: ReturnType<typeof itemsOf>, title: string, text: string) => items.findIndex((c) => c.title === title && c.text === text);

describe('saisie d’un choix groupé (EVO-003)', () => {
  it('choix multiple : une option cochée dans chaque groupe → valeurs et groupes parallèles [SC, AA]', () => {
    const items = itemsOf(multiple, envOf('fr'));
    const answer = pickedAnswer(items, [indexOf(items, 'Victime directe', 'Conjoint'), indexOf(items, 'Ayant droit', 'Conjoint')])!;
    expect(answer).toEqual({ values: ['conjoint', 'conjoint'], groups: ['SC', 'AA'] });
    expect(evaluate('lien.groupe', { lien: answer.values, lien_group: answer.groups })).toEqual(['SC', 'AA']);
    // Réaffichée : les deux options cochées, chacune dans son groupe.
    expect(selectedOf(items, answer.values, answer.groups)).toEqual([0, 2]);
    // Hors groupe et « Autre » ; rien de coché.
    expect(pickedAnswer([{ value: 'x', text: 'X' }, ...items], [0, items.length])).toEqual({ values: ['x', 'other'], groups: ['', 'AUTRE'] });
    expect(pickedAnswer(items, [])).toBeNull();
  });

  it('choix unique : « Conjoint » dans « Ayant droit » → valeur conjoint, `lien.groupe` = AA', () => {
    const items = itemsOf(single, envOf('fr'));
    const c = items[indexOf(items, 'Ayant droit', 'Conjoint')]!;
    expect(c).toMatchObject({ value: 'conjoint', group: 'AA' });
    const answers = { lien: c.value, lien_group: c.group };
    expect(evaluate('lien', answers)).toBe('conjoint');
    expect(evaluate('lien.groupe', answers)).toBe('AA');
    expect(selectedOf(items, ['conjoint'], ['AA'])).toEqual([2]);
    expect(selectedOf(items, ['conjoint'], ['SC'])).toEqual([0]);
  });

  it('titre de section : libellé du groupe traduit et interpolé, comme celui d’une option', () => {
    const q: SingleChoiceQuestion = { ...single, options: [{ group: { fr: 'Victimes ({sys.n})', en: 'Victims ({sys.n})' }, options: [{ value: 'a', label: { fr: 'A {sys.n}', en: 'A {sys.n} (en)' } }] }] };
    const ctx = { sys: { n: 2 } };
    expect(sectionsOf(itemsOf(q, envOf('en', ctx)))).toEqual([{ key: 'Victimes (2)', title: 'Victims (2)', indexes: [0] }, { title: undefined, indexes: [1] }]);
    expect(itemsOf(q, envOf('en', ctx))[0]).toMatchObject({ text: 'A 2 (en)', group: 'Victimes (2)', title: 'Victims (2)' });
    expect(itemsOf(q, envOf('fr', ctx))[0]!.title).toBe('Victimes (2)');
    // Traduction absente : langue par défaut, comme une option.
    const missing: SingleChoiceQuestion = { ...q, options: [{ group: { fr: 'Seulement fr' }, options: [{ value: 'a', label: { fr: 'A' } }] }] };
    expect(itemsOf(missing, envOf('en'))[0]!.title).toBe('Seulement fr');
  });
});
