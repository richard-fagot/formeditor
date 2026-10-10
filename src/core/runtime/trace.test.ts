import { describe, expect, it } from 'vitest';
import type { Edge, GraphNode, Workspace } from '../model';
import { edgeTrace, type RuntimeInput } from './index';

const q = (id: string, key: string): GraphNode => ({ kind: 'question', id, key, label: { fr: key }, type: 'number' }) as GraphNode;
const e = (from: string, to: string, when?: string): Edge => ({ id: `${from}_${to}`, from, to, ...(when ? { when } : {}) });

const nodes: GraphNode[] = [q('a', 'a'), q('b', 'b'), q('c', 'c'), { kind: 'end', id: 'fin', message: { fr: 'fin' } }];
const edges = [e('a', 'fin'), e('a', 'b', 'a > sys.seuil'), e('a', 'c', 'a >'), e('b', 'c')];
const inp: RuntimeInput = {
  ws: {
    project: { formatVersion: 1, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: { formatVersion: 1, kind: 'library', questions: [], blocks: [], labelSets: [] },
    questionnaires: [{ formatVersion: 1, kind: 'questionnaire', id: 'q', key: 'q', title: { fr: 'q' }, start: 'a', nodes, edges }],
    layouts: [],
  } as Workspace,
  questionnaireId: 'q',
  sys: { seuil: 10 },
};

describe('edgeTrace', () => {
  it('évalue les arêtes sortantes dans l’ordre et désigne celle retenue', () => {
    const t = edgeTrace(inp, { a: 20 }, 'a');
    expect(t.map((x) => [x.edge.id, x.result, x.chosen])).toEqual([
      ['a_fin', 'else', false],
      ['a_b', true, true],
      ['a_c', 'error', false],
    ]);
  });
  it('« sinon » retenu quand aucune condition n’est vraie', () => {
    const t = edgeTrace(inp, { a: 1 }, 'a');
    expect(t.map((x) => [x.edge.id, x.result, x.chosen])).toEqual([
      ['a_fin', 'else', true],
      ['a_b', false, false],
      ['a_c', 'error', false],
    ]);
  });
  it('aucune arête pour une fin ou une étape inconnue', () => {
    expect(edgeTrace(inp, {}, 'fin')).toEqual([]);
    expect(edgeTrace(inp, {}, 'zz')).toEqual([]);
  });
});
