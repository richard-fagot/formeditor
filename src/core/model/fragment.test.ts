import { describe, expect, it } from 'vitest';
import type { Fragment, GraphNode, Workspace } from './index';
import { calledFragments, createsCycle, fragmentCallers, fragmentEntry, fragmentExits, fragmentRoots, graphStart } from './index';

const q = (id: string): GraphNode => ({ kind: 'question', id, key: id, label: { fr: id }, type: 'text' });
const e = (from: string, to: string) => ({ id: `${from}_${to}`, from, to });
const frag = (id: string, nodes: GraphNode[], edges = [] as ReturnType<typeof e>[], entry?: string): Fragment =>
  ({ id, key: id, title: { fr: id }, nodes, edges, ...(entry ? { entry } : {}) });
const inst = (id: string, ref: string, alias = id): GraphNode => ({ kind: 'fragment', id, ref, alias });

function ws(fragments: Fragment[], questionnaireNodes: GraphNode[] = []): Workspace {
  return {
    project: { formatVersion: 7, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: { formatVersion: 7, kind: 'library', questions: [], fragments, labelSets: [] },
    questionnaires: [{ formatVersion: 7, kind: 'questionnaire', id: 'q', key: 'q', title: { fr: 'q' }, start: '', nodes: questionnaireNodes, edges: [] }],
    layouts: [],
  };
}

describe('entrée d’un fragment (EVO-008)', () => {
  it('implicite : l’unique nœud sans arête entrante', () => {
    const f = frag('f', [q('b'), q('a')], [e('a', 'b')]);
    expect(fragmentRoots(f)).toEqual(['a']);
    expect(fragmentEntry(f)).toBe('a');
  });
  it('ambiguë ou absente : premier candidat dans l’ordre des nœuds, sinon le premier nœud', () => {
    expect(fragmentEntry(frag('f', [q('a'), q('b')]))).toBe('a');
    const loop = frag('f', [q('a'), q('b')], [e('a', 'b'), e('b', 'a')]);
    expect(fragmentRoots(loop)).toEqual([]);
    expect(fragmentEntry(loop)).toBe('a');
    expect(fragmentEntry(frag('f', []))).toBeUndefined();
  });
  it('explicite : la propriété `entry` prime si le nœud existe', () => {
    const loop = frag('f', [q('a'), q('b')], [e('a', 'b'), e('b', 'a')], 'b');
    expect(fragmentEntry(loop)).toBe('b');
    expect(fragmentEntry(frag('f', [q('a')], [], 'disparu'))).toBe('a');
  });
  it('graphStart : départ d’un questionnaire, entrée d’un fragment', () => {
    const w = ws([frag('f', [q('a'), q('b')], [e('a', 'b')])]);
    expect(graphStart({ ...w.questionnaires[0]!, start: 'x' })).toBe('x');
    expect(graphStart(w.library.fragments[0]!)).toBe('a');
  });
});

describe('sorties d’un fragment', () => {
  it('tout nœud sans arête sortante', () => {
    const f = frag('f', [q('a'), q('b'), q('c')], [e('a', 'b'), e('a', 'c')]);
    expect(fragmentExits(f).map((n) => n.id)).toEqual(['b', 'c']);
  });
});

describe('appels entre fragments', () => {
  const w = ws(
    [frag('a', [inst('ib', 'b')]), frag('b', [inst('ic', 'c')]), frag('c', [q('x')])],
    [inst('ia', 'a', 'ident')],
  );
  it('calledFragments : appels directs et indirects', () => {
    expect([...calledFragments(w, 'a')].sort()).toEqual(['b', 'c']);
    expect([...calledFragments(w, 'c')]).toEqual([]);
  });
  it('createsCycle : insérer A dans C (A → B → C) ou un fragment dans lui-même', () => {
    expect(createsCycle(w, 'c', 'a')).toBe(true);
    expect(createsCycle(w, 'a', 'a')).toBe(true);
    expect(createsCycle(w, 'a', 'c')).toBe(false);
  });
  it('fragmentCallers : questionnaires et fragments qui l’instancient', () => {
    expect(fragmentCallers(w, 'a')).toEqual([{ kind: 'questionnaire', id: 'q' }]);
    expect(fragmentCallers(w, 'c')).toEqual([{ kind: 'fragment', id: 'b' }]);
  });
});
