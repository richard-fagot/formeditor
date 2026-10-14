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
    library: { formatVersion: 1, kind: 'library', questions: [], fragments: [], labelSets: [] },
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

describe('edgeTrace : dernière page d’un fragment (écart EVO-008)', () => {
  const fnodes: GraphNode[] = [q('x', 'x'), q('y', 'y'), { kind: 'exit', id: 'ko', name: 'refus' }];
  const fedges = [e('x', 'y', 'x > 0'), e('x', 'ko')];
  const qnodes: GraphNode[] = [{ kind: 'fragment', id: 'i', ref: 'f', alias: 'al' }, q('a', 'a'), q('b', 'b'), { kind: 'end', id: 'fin', message: { fr: 'fin' } }];
  const qedges: Edge[] = [{ ...e('i', 'fin'), exit: 'refus' }, e('i', 'a', 'al.y > 5'), e('i', 'b'), e('a', 'fin'), e('b', 'fin')];
  const fin: RuntimeInput = {
    ...inp,
    ws: {
      ...inp.ws,
      library: { ...inp.ws.library, fragments: [{ id: 'f', key: 'f', title: { fr: 'f' }, nodes: fnodes, edges: fedges }] },
      questionnaires: [{ ...inp.ws.questionnaires[0]!, start: 'i', nodes: qnodes, edges: qedges }],
    } as Workspace,
  };
  const ids = (t: ReturnType<typeof edgeTrace>) => t.map((x) => [x.stepId, x.edge.id, x.result, x.chosen]);
  it('sortie implicite : arêtes de l’appelant évaluées dans son contexte', () => {
    expect(ids(edgeTrace(fin, { al: { x: 1, y: 9 } }, 'i/y'))).toEqual([
      ['i', 'i_a', true, true],
      ['i', 'i_b', 'else', false],
    ]);
  });
  it('arête vers une sortie nommée : arêtes de l’appelant de cette sortie à la suite', () => {
    expect(ids(edgeTrace(fin, { al: { x: 0 } }, 'i/x'))).toEqual([
      ['i/x', 'x_y', false, false],
      ['i/x', 'x_ko', 'else', true],
      ['i', 'i_fin', 'else', true],
      ['i', 'i_a', false, false],
      ['i', 'i_b', 'else', false],
    ]);
  });
});
