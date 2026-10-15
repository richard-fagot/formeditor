import { describe, expect, it } from 'vitest';
import type { LocalizedText } from '../core/model';
import { blurMessages, shownBlurErrors } from './index';

const label = (l: LocalizedText) => l.fr ?? '';

describe('plugin-api — erreurs à la sortie du champ (logique pure)', () => {
  it('blurMessages : un message par erreur, dans l’ordre, via env.label', () => {
    expect(blurMessages([{ message: { fr: 'A' } }, { message: { fr: 'B' } }], label)).toEqual(['A', 'B']);
    expect(blurMessages([], label)).toEqual([]);
  });

  it('shownBlurErrors : masqués si contrôles désactivés ou erreur de validation sur la question', () => {
    expect(shownBlurErrors(['A'], undefined, {})).toEqual(['A']);
    expect(shownBlurErrors(['A'], false, {})).toEqual([]);
    expect(shownBlurErrors(['A'], true, { '': ['obligatoire'] })).toEqual([]);
    expect(shownBlurErrors(['A'], true, { champ: ['x'] })).toEqual(['A']);
  });
});
