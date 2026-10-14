import { describe, expect, it } from 'vitest';
import type { Question } from '../model';
import { isRequired, validateAnswer } from './index';

const q = (required?: Question['required']): Question => ({ id: 'q', key: 'tel', label: { fr: 'Téléphone' }, type: 'text', ...(required === undefined ? {} : { required }) });

describe('caractère obligatoire effectif : une seule résolution (EVO-021)', () => {
  it('booléen ou absent : valeur telle quelle', () => {
    expect(isRequired(q(true), {})).toBe(true);
    expect(isRequired(q(false), {})).toBe(false);
    expect(isRequired(q(), {})).toBe(false);
  });

  it('« obligatoire si » : évalué dans le contexte (non évaluable : faux)', () => {
    expect(isRequired(q('contact = "tel"'), { contact: 'tel' })).toBe(true);
    expect(isRequired(q('contact = "tel"'), { contact: 'mail' })).toBe(false);
    expect(isRequired(q('contact = "tel"'), {})).toBe(false);
  });

  it('réponse vide : `validateAnswer` bloque si et seulement si `isRequired`', () => {
    for (const [r, ctx] of [[true, {}], [false, {}], [undefined, {}], ['contact = "tel"', { contact: 'tel' }], ['contact = "tel"', {}]] as const) {
      const blocked = validateAnswer(q(r), '', ctx).some((e) => e.param === 'required');
      expect(blocked).toBe(isRequired(q(r), ctx));
    }
  });
});
