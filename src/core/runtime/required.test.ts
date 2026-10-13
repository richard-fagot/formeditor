import { describe, expect, it } from 'vitest';
import type { GraphNode, Workspace } from '../model';
import { currentStep, next, start, type RuntimeInput } from './index';

const tel = { id: 'lq_tel', key: 'tel', label: { fr: 'Téléphone' }, type: 'text' as const };
const end: GraphNode = { kind: 'end', id: 'n_fin', message: { fr: 'Fin' } };
const questionnaire = (id: string, call: GraphNode) => ({
  formatVersion: 10, kind: 'questionnaire' as const, id, key: id, title: { fr: id }, start: 'c',
  nodes: [call, end], edges: [{ id: 'e', from: 'c', to: 'n_fin' }],
});
const ws: Workspace = {
  project: { formatVersion: 10, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
  library: {
    formatVersion: 10, kind: 'library', questions: [tel], labelSets: [],
    fragments: [{ id: 'f_coord', key: 'coordonnees', title: { fr: 'Coordonnées' }, nodes: [{ kind: 'question', id: 'n_tel', ref: 'lq_tel', required: true }], edges: [] }],
  },
  questionnaires: [
    questionnaire('adhesion', { kind: 'fragment', id: 'c', ref: 'f_coord', alias: 'coord' }),
    questionnaire('rappel', { kind: 'fragment', id: 'c', ref: 'f_coord', alias: 'coord', requiredOverrides: { n_tel: false } }),
  ],
  layouts: [],
};

describe('moteur : caractère obligatoire effectif (EVO-012)', () => {
  it('le wizard exige Q_TEL dans « Adhésion » (hérité du fragment), pas dans « Demande de rappel » (surchargée)', () => {
    const adhesion: RuntimeInput = { ws, questionnaireId: 'adhesion', sys: {} };
    const qa = currentStep(adhesion, start(adhesion)).question!;
    expect(qa.required).toBe(true);
    const rappel: RuntimeInput = { ws, questionnaireId: 'rappel', sys: {} };
    const qr = currentStep(rappel, start(rappel)).question!;
    expect(qr.required).toBe(false);
    expect(currentStep(rappel, next(rappel, start(rappel))).node.id).toBe('n_fin');
  });
});
