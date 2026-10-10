import { describe, expect, it } from 'vitest';
import type { Edge, GraphNode, Workspace } from '../model';
import {
  back, buildContext, currentStep, goTo, next, setAnswer, start, summaryEntries, type RuntimeInput,
} from './index';

const q = (id: string, key: string, type: 'text' | 'boolean' | 'number' = 'text', extra = {}): GraphNode =>
  ({ kind: 'question', id, key, label: { fr: key }, type, ...extra }) as GraphNode;
const e = (from: string, to: string, when?: string, exit?: string): Edge =>
  ({ id: `${from}_${to}`, from, to, ...(when ? { when } : {}), ...(exit ? { exit } : {}) });

function input(nodes: GraphNode[], edges: Edge[], extra: Partial<Workspace['library']> = {}): RuntimeInput {
  const ws = {
    project: { formatVersion: 1, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: { formatVersion: 1, kind: 'library', questions: [], blocks: [], labelSets: [], ...extra },
    questionnaires: [{ formatVersion: 1, kind: 'questionnaire', id: 'q', key: 'q', title: { fr: 'q' }, start: nodes[0]!.id, nodes, edges }],
    layouts: [],
  } as Workspace;
  return { ws, questionnaireId: 'q', sys: { seuil: 10 }, env: { today: '2026-10-10' } };
}

const end: GraphNode = { kind: 'end', id: 'fin', message: { fr: 'fin' } };

describe('navigation', () => {
  const inp = input(
    [q('a', 'a', 'number'), q('b', 'b'), q('c', 'c'), end],
    [e('a', 'fin'), e('a', 'b', 'a > sys.seuil'), e('a', 'c', 'a > 5'), e('b', 'c'), e('c', 'fin')],
  );
  const run = (a: number) => next(inp, setAnswer(inp, start(inp), a));
  it('suit la première arête conditionnée vraie dans l’ordre, le « sinon » sinon', () => {
    expect(currentStep(inp, run(20)).id).toBe('b');
    expect(currentStep(inp, run(7)).id).toBe('c');
    expect(currentStep(inp, run(1)).id).toBe('fin');
  });
  it('converge et revient en arrière', () => {
    let s = run(20);
    s = next(inp, setAnswer(inp, s, 'x'));
    expect(s.history).toEqual(['a', 'b', 'c']);
    s = back(s);
    expect(currentStep(inp, s).id).toBe('b');
    expect(s.answers.b).toBe('x');
  });
  it('reste sur place si aucune arête ne s’applique', () => {
    const blocked = input([q('a', 'a'), end], [e('a', 'fin', 'false')]);
    const s = next(blocked, setAnswer(blocked, start(blocked), 'x'));
    expect(s.history).toEqual(['a']);
    expect(s.blocked).toBe(true);
  });
});

describe('boucle et effacement hors chemin', () => {
  const inp = input(
    [q('a', 'a'), q('b', 'b'), q('c', 'c'), q('ok', 'ok', 'boolean'), end],
    [e('a', 'b', "a = 'b'"), e('a', 'c'), e('b', 'ok'), e('c', 'ok'), e('ok', 'a', 'ok = false'), e('ok', 'fin')],
  );
  it('repasse par un nœud déjà visité et remplace la réponse', () => {
    let s = start(inp);
    for (const v of ['b', 'x', false]) s = next(inp, setAnswer(inp, s, v));
    expect(currentStep(inp, s).id).toBe('a');
    expect(s.history).toEqual(['a', 'b', 'ok', 'a']);
    s = next(inp, setAnswer(inp, s, 'c'));
    expect(s.answers.a).toBe('c');
  });
  it('efface les réponses des questions sorties du chemin', () => {
    let s = start(inp);
    for (const v of ['b', 'x']) s = next(inp, setAnswer(inp, s, v));
    s = back(back(s));
    s = next(inp, setAnswer(inp, s, 'c'));
    expect(currentStep(inp, s).id).toBe('c');
    expect(s.answers.b).toBeUndefined();
  });
  it('garde les réponses encore atteignables au-delà d’une question sans réponse', () => {
    let s = start(inp);
    for (const v of ['b', 'x', true]) s = next(inp, setAnswer(inp, s, v));
    s = goTo(s, 'a');
    s = next(inp, setAnswer(inp, s, 'c'));
    expect(s.answers).toMatchObject({ a: 'c', ok: true });
    expect(s.answers.b).toBeUndefined();
  });
  it('la synthèse liste les réponses du chemin effectif, dans l’ordre', () => {
    let s = start(inp);
    for (const v of ['b', 'x']) s = next(inp, setAnswer(inp, s, v));
    expect(summaryEntries(inp, s).map((x) => [x.stepId, x.value])).toEqual([['a', 'b'], ['b', 'x']]);
  });
});

describe('blocs', () => {
  const block = {
    id: 'blk', key: 'blk', title: { fr: 'B' }, start: 'bn',
    nodes: [q('bn', 'nom'), q('bc', 'connu', 'boolean'), { kind: 'exit', id: 'x1', name: 'oui' }, { kind: 'exit', id: 'x2', name: 'non' }] as GraphNode[],
    edges: [e('bn', 'bc'), e('bc', 'x1', 'connu = true and type = 1'), e('bc', 'x2')],
  };
  const inp = input(
    [q('t', 'type', 'number'), { kind: 'block', id: 'i', ref: 'blk', alias: 'tiers' }, q('apres', 'apres'), end],
    [e('t', 'i'), e('i', 'apres', undefined, 'oui'), e('i', 'fin', undefined, 'non'), e('apres', 'fin')],
    { blocks: [block] },
  );
  it('déroule le bloc, range ses réponses sous l’alias, sort par la sortie nommée', () => {
    let s = start(inp);
    s = next(inp, setAnswer(inp, s, 1));
    expect(currentStep(inp, s).id).toBe('i/bn');
    s = next(inp, setAnswer(inp, s, 'Dupont'));
    s = next(inp, setAnswer(inp, s, true));
    expect(currentStep(inp, s).id).toBe('apres');
    expect(s.answers).toMatchObject({ type: 1, tiers: { nom: 'Dupont', connu: true } });
    expect(buildContext(inp, s.answers, 'i/bc')).toMatchObject({ nom: 'Dupont', type: 1, tiers: { nom: 'Dupont' } });
  });
  it('prend la sortie « non »', () => {
    let s = start(inp);
    for (const v of [2, 'X', true]) s = next(inp, setAnswer(inp, s, v));
    expect(currentStep(inp, s).id).toBe('fin');
  });
});

describe('valeurs par défaut', () => {
  it('pré-remplit à l’arrivée sur la question (littérale ou calculée)', () => {
    const inp = input([q('a', 'a'), q('b', 'b', 'text', { defaultExpr: "a & '!'" }), end], [e('a', 'b'), e('b', 'fin')]);
    const s = next(inp, setAnswer(inp, start(inp), 'x'));
    expect(s.answers.b).toBe('x!');
  });
});
