import { describe, expect, it } from 'vitest';
import { QUESTION_TYPES, type Question } from '../core/model';
import { commonQuestionFields } from '../plugin-api';
import { QUESTION_TYPE_PLUGINS, questionType } from './index';

describe('registre des types de questions', () => {
  it('fournit les huit types de la spec avec leurs raccourcis par défaut (§4.4)', () => {
    expect(QUESTION_TYPE_PLUGINS.map((p) => p.type)).toEqual([...QUESTION_TYPES]);
    expect(QUESTION_TYPE_PLUGINS.map((p) => p.shortcut)).toEqual(['t', 'd', 'r', 'u', 'm', 'b', '3', 's']);
  });

  it('crée des questions conformes au modèle et garde options et « Autre » d’un choix à l’autre', () => {
    const single = { id: 'q', key: 'q', label: { fr: 'Q' }, type: 'single', options: [{ value: 'a', label: { fr: 'A' } }], other: {} } as Question;
    const multiple = questionType('multiple')!.create(commonQuestionFields(single), single);
    expect(multiple).toMatchObject({ type: 'multiple', options: [{ value: 'a' }], other: {} });
    expect(questionType('tristate')!.create(commonQuestionFields(single), single)).toMatchObject({ type: 'tristate', other: {} });
    expect(questionType('structure')!.create(commonQuestionFields(single), single)).toMatchObject({ type: 'structure', fields: [] });
    expect(questionType('single')!.create(commonQuestionFields(single))).toMatchObject({ type: 'single', options: [] });
  });
});
