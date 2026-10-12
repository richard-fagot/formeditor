import { describe, expect, it } from 'vitest';
import type { Question, Workspace } from '../model';
import { currentStep, next, setAnswer, start, type RuntimeInput } from './index';

const field = (key: string) => ({ id: `f_${key}`, key, label: { fr: key }, type: 'text' as const, required: true });
const identite = { id: 'lq_identite', key: 'identite', label: { fr: 'Identité' }, type: 'structure', fields: ['civilite', 'nom', 'prenom', 'date_naissance', 'adresse', 'mail', 'telephone'].map(field) } as Question;
const questionnaire = (id: string, hidden?: string[]) => ({
  formatVersion: 8, kind: 'questionnaire' as const, id, key: id, title: { fr: id }, start: 'n_id',
  nodes: [{ kind: 'question' as const, id: 'n_id', ref: 'lq_identite', ...(hidden ? { hiddenFields: hidden } : {}) }, { kind: 'end' as const, id: 'n_fin', message: { fr: 'Fin' } }],
  edges: [{ id: 'e', from: 'n_id', to: 'n_fin' }],
});
const ws: Workspace = {
  project: { formatVersion: 8, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
  library: { formatVersion: 8, kind: 'library', questions: [identite], fragments: [], labelSets: [] },
  questionnaires: [questionnaire('qa'), questionnaire('qb', ['civilite', 'date_naissance', 'adresse', 'telephone'])],
  layouts: [],
};
const fields = (qid: string) => {
  const input: RuntimeInput = { ws, questionnaireId: qid, sys: {} };
  const q = currentStep(input, start(input)).question!;
  return q.type === 'structure' ? q.fields.map((f) => f.key) : [];
};

describe('moteur : champs masqués (EVO-009)', () => {
  it('B ne présente que nom, prénom, mail ; A présente les 7 champs', () => {
    expect(fields('qb')).toEqual(['nom', 'prenom', 'mail']);
    expect(fields('qa')).toHaveLength(7);
  });
  it('un champ obligatoire masqué n’est pas exigé', () => {
    const input: RuntimeInput = { ws, questionnaireId: 'qb', sys: {} };
    let s = setAnswer(input, start(input), { nom: 'Morel', prenom: 'Lou', mail: 'lou@example.org' });
    s = next(input, s);
    expect(s.blocked).toBeFalsy();
    expect(currentStep(input, s).node.id).toBe('n_fin');
  });
});
