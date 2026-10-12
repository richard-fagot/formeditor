import { describe, expect, it } from 'vitest';
import type { Question, Workspace } from '../model';
import { checkWorkspace } from './index';

const field = (key: string) => ({ id: `f_${key}`, key, label: { fr: key }, type: 'text' as const });
const identite = { id: 'lq_identite', key: 'identite', label: { fr: 'Identité' }, type: 'structure', fields: ['nom', 'mail', 'telephone'].map(field) } as Question;
const ws = (hidden?: string[]): Workspace => ({
  project: { formatVersion: 8, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
  library: { formatVersion: 8, kind: 'library', questions: [identite], fragments: [], labelSets: [] },
  questionnaires: [{
    formatVersion: 8, kind: 'questionnaire', id: 'qb', key: 'qb', title: { fr: 'B' }, start: 'n_id',
    nodes: [
      { kind: 'question', id: 'n_id', ref: 'lq_identite', ...(hidden ? { hiddenFields: hidden } : {}) },
      { kind: 'end', id: 'n_fin', message: { fr: 'Fin {identite.telephone}' } },
      { kind: 'end', id: 'n_fin2', message: { fr: 'Fin' } },
    ],
    edges: [{ id: 'e1', from: 'n_id', to: 'n_fin', when: 'identite.telephone != ""' }, { id: 'e2', from: 'n_id', to: 'n_fin2' }],
  }],
  layouts: [],
});
const refIssues = (w: Workspace) => checkWorkspace(w).filter((i) => i.code === 'hiddenField' || i.code === 'unknownReference')
  .map((i) => `${i.code}@${i.nodeId ?? i.edgeId}:${i.params.ref}`);

describe('vérification : référence à un champ masqué (EVO-009)', () => {
  it('sans masquage : rien', () => {
    expect(refIssues(ws())).toEqual([]);
  });
  it('champ masqué référencé dans une condition et un libellé : erreur hiddenField', () => {
    const issues = checkWorkspace(ws(['telephone'])).filter((i) => i.code === 'hiddenField');
    expect(issues.map((i) => i.severity)).toEqual(['error', 'error']);
    expect(refIssues(ws(['telephone'])).sort()).toEqual(['hiddenField@e1:identite.telephone', 'hiddenField@n_fin:identite.telephone']);
  });
});
