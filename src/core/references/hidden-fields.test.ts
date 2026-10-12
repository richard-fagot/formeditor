import { describe, expect, it } from 'vitest';
import type { GraphNode, Question, Workspace } from '../model';
import { hiddenFieldPaths, questionnaireScope, questionOfNode, renameKey } from './index';

const field = (key: string) => ({ id: `f_${key}`, key, label: { fr: key }, type: 'text' as const });
const identite = { id: 'lq_identite', key: 'identite', label: { fr: 'Identité' }, type: 'structure', fields: ['nom', 'prenom', 'mail', 'telephone'].map(field) } as Question;

function ws(hidden?: string[]): Workspace {
  const inst: GraphNode = { kind: 'question', id: 'n_id', ref: 'lq_identite', ...(hidden ? { hiddenFields: hidden } : {}) };
  return {
    project: { formatVersion: 8, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: {
      formatVersion: 8, kind: 'library', questions: [identite], labelSets: [],
      fragments: [{ id: 'f', key: 'f', title: { fr: 'F' }, nodes: [{ ...inst, id: 'fn' }], edges: [] }],
    },
    questionnaires: [
      { formatVersion: 8, kind: 'questionnaire', id: 'qa', key: 'qa', title: { fr: 'A' }, start: 'n_id', nodes: [inst, { kind: 'fragment', id: 'nf', ref: 'f', alias: 'contact' }], edges: [] },
    ],
    layouts: [],
  };
}

describe('champs masqués d’une instance (EVO-009)', () => {
  it('questionOfNode et la portée ne présentent pas les champs masqués', () => {
    const w = ws(['telephone']);
    const q = questionOfNode(w, w.questionnaires[0]!.nodes[0]!)!;
    expect(q.type === 'structure' && q.fields.map((f) => f.key)).toEqual(['nom', 'prenom', 'mail']);
    const scope = questionnaireScope(w, 'qa');
    expect(scope.has('identite.mail')).toBe(true);
    expect(scope.has('identite.telephone')).toBe(false);
  });
  it('hiddenFieldPaths : chemins masqués du graphe, fragments appelés compris', () => {
    const w = ws(['telephone', 'inconnu']);
    expect(hiddenFieldPaths(w, w.questionnaires[0]!)).toEqual(['identite.telephone', 'contact.identite.telephone']);
  });
  it('renommer un champ en bibliothèque renomme son masquage dans les instances', () => {
    const w = renameKey(ws(['telephone']), { kind: 'question', owner: { kind: 'libraryQuestion', id: 'lq_identite' }, nodeId: 'lq_identite', fieldId: 'f_telephone' }, 'tel');
    const n = w.questionnaires[0]!.nodes[0] as { hiddenFields?: string[] };
    expect(n.hiddenFields).toEqual(['tel']);
    expect((w.library.fragments[0]!.nodes[0] as { hiddenFields?: string[] }).hiddenFields).toEqual(['tel']);
  });
});
