import { describe, expect, it } from 'vitest';
import type { ChoiceEntry, ChoiceGroup } from '../../../core/model';
import type { EditorEnv } from '../../../plugin-api';
import { linesOf, moveEntry, normalizeQuick, reconcile } from './entries';

const env = { contentLang: 'fr', defaultLang: 'fr' } as EditorEnv;
const EXAMPLE = ['# Victime directe', '* Conjoint', '* Enfant', '', '# Ayant droit', '* Conjoint', '* Ascendant'];
const example = (): ChoiceEntry[] => [
  { group: { fr: 'Victime directe' }, options: [{ value: 'conjoint', label: { fr: 'Conjoint' } }, { value: 'enfant', label: { fr: 'Enfant' } }] },
  { group: { fr: 'Ayant droit' }, options: [{ value: 'conjoint', label: { fr: 'Conjoint' } }, { value: 'ascendant', label: { fr: 'Ascendant' } }] },
];

describe('saisie rapide : groupes d’options (EVO-003)', () => {
  it('l’exemple donne deux groupes de deux options, dans l’ordre ; même valeur dans deux groupes', () => {
    expect(reconcile(EXAMPLE, [], env)).toEqual(example());
  });

  it('`- ` est aussi une puce ; options avant le premier groupe hors groupe ; lignes vides ignorées', () => {
    expect(reconcile(['Aucun', '', '#   G', '- Ami', 'B', '* $sys.liste'], [], env)).toEqual([
      { value: 'aucun', label: { fr: 'Aucun' } },
      { group: { fr: 'G' }, options: [{ value: 'ami', label: { fr: 'Ami' } }, { value: 'b', label: { fr: 'B' } }, { from: 'sys.liste' }] },
    ]);
  });

  it('sans `#` : comportement inchangé (puce retirée)', () => {
    expect(reconcile(['Bleu', '* Vert', '-5 €'], [], env)).toEqual([
      { value: 'bleu', label: { fr: 'Bleu' } },
      { value: 'vert', label: { fr: 'Vert' } },
      { value: 'q_5', label: { fr: '-5 €' } },
    ]);
  });

  it('échappements `\\#`, `\\*`, `\\-`, `\\$` ; réaffichage échappé', () => {
    const entries = reconcile(['\\# 1', '\\* étoile', '\\- tiret', '\\$100'], [], env);
    expect(entries.map((e) => (e as unknown as { label: { fr: string } }).label.fr)).toEqual(['# 1', '* étoile', '- tiret', '$100']);
    expect(linesOf(entries, env)).toEqual(['\\# 1', '\\* étoile', '\\- tiret', '\\$100']);
  });

  it('réaffichage : `# groupe`, puis ses options avec une puce', () => {
    expect(linesOf([{ value: 'x', label: { fr: 'X' } }, ...example()], env)).toEqual([
      'X', '# Victime directe', '* Conjoint', '* Enfant', '# Ayant droit', '* Conjoint', '* Ascendant',
    ]);
    expect(normalizeQuick('# Victime directe\nConjoint\n\n- Enfant')).toBe('# Victime directe\n* Conjoint\n* Enfant');
  });

  it('un groupe garde ses réglages (code, condition, traductions) : ligne identique ou modifiée au même rang', () => {
    const entries = example();
    const g = entries[0] as ChoiceGroup;
    g.code = 'SC';
    g.when = 'sys.x';
    g.group = { fr: 'Victime directe', en: 'Direct victim' };
    expect(reconcile(EXAMPLE, entries, env)).toEqual(entries);
    const renamed = reconcile(['# Victime', ...EXAMPLE.slice(1)], entries, env);
    expect(renamed[0]).toMatchObject({ group: { fr: 'Victime', en: 'Direct victim' }, code: 'SC', when: 'sys.x' });
  });

  it('une option déplacée vers un autre groupe garde ses réglages', () => {
    const entries = example();
    (entries[0] as ChoiceGroup).options[1]!.when = 'sys.y';
    const moved = reconcile(['# Victime directe', '* Conjoint', '# Ayant droit', '* Enfant', '* Conjoint', '* Ascendant'], entries, env);
    expect((moved[1] as ChoiceGroup).options[0]).toEqual({ value: 'enfant', label: { fr: 'Enfant' }, when: 'sys.y' });
  });

  it('déplacer un groupe déplace ses options', () => {
    const moved = moveEntry(example(), 1, 0);
    expect(linesOf(moved, env)).toEqual(['# Ayant droit', '* Conjoint', '* Ascendant', '# Victime directe', '* Conjoint', '* Enfant']);
  });
});
