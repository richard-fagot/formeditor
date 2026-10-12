import { describe, expect, it } from 'vitest';
import type { Edge, GraphNode, Workspace } from '../model';
import {
  back, buildContext, currentStep, goTo, next, resume, setAnswer, start, summaryEntries, type RuntimeInput,
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

describe('libellés d’arêtes (EVO-005)', () => {
  it('un libellé ne change pas le chemin suivi : seuls la condition et le rang comptent', () => {
    const nodes = [q('a', 'a', 'number'), q('b', 'b'), q('c', 'c'), end];
    const edges = [e('a', 'fin'), e('a', 'b', 'a > sys.seuil'), e('a', 'c', 'a > 5'), e('b', 'c'), e('c', 'fin')];
    const captions = ['Sinon', 'Au-delà du seuil', 'b est vrai', 'Toujours', 'Fin'];
    const plain = input(nodes, edges);
    const captioned = input(nodes, edges.map((x, i) => ({ ...x, caption: captions[i] })));
    for (const a of [1, 7, 20]) {
      const run = (inp: RuntimeInput) => next(inp, setAnswer(inp, start(inp), a));
      expect(run(captioned).history).toEqual(run(plain).history);
      expect(currentStep(captioned, run(captioned)).id).toBe(currentStep(plain, run(plain)).id);
    }
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

describe('question facultative laissée vide', () => {
  const inp = input(
    [q('a', 'a'), q('b', 'b'), q('oui', 'oui'), q('non', 'non'), end],
    [e('a', 'b'), e('b', 'oui', '$exists(a)'), e('b', 'non'), e('oui', 'fin'), e('non', 'fin')],
  );
  it('a la réponse null mais n’est pas « renseignée » pour $exists', () => {
    let s = next(inp, start(inp));
    expect(s.answers.a).toBeNull();
    expect(buildContext(inp, s.answers)).not.toHaveProperty('a');
    s = next(inp, setAnswer(inp, s, 'x'));
    expect(currentStep(inp, s).id).toBe('non');
  });
  it('retire les null en profondeur sans toucher aux réponses', () => {
    const answers = { a: 'x', tiers: { nom: null, age: 3 }, liste: [{ v: null, w: 1 }] };
    expect(buildContext(inp, answers)).toMatchObject({ a: 'x', tiers: { age: 3 }, liste: [{ w: 1 }] });
    expect(buildContext(inp, answers).tiers).not.toHaveProperty('nom');
    expect(answers.tiers.nom).toBeNull();
  });
});

describe('retour à la synthèse après modification', () => {
  const sum: GraphNode = { kind: 'summary', id: 'sum' };
  const inp = input(
    [q('a', 'a'), q('b', 'b'), sum, end],
    [e('a', 'b', "a = 'b'"), e('a', 'sum'), e('b', 'sum'), e('sum', 'fin')],
  );
  it('revient à la synthèse si le chemin ne change pas', () => {
    let s = next(inp, setAnswer(inp, start(inp), 'x'));
    s = goTo(s, 'a');
    s = resume(inp, setAnswer(inp, s, 'y'), 'sum');
    expect(currentStep(inp, s).id).toBe('sum');
    expect(s.answers.a).toBe('y');
  });
  it('s’arrête à la première question sans réponse du nouveau chemin', () => {
    let s = next(inp, setAnswer(inp, start(inp), 'x'));
    s = resume(inp, setAnswer(inp, goTo(s, 'a'), 'b'), 'sum');
    expect(currentStep(inp, s).id).toBe('b');
    s = resume(inp, setAnswer(inp, s, 'z'), 'sum');
    expect(currentStep(inp, s).id).toBe('sum');
    expect(summaryEntries(inp, s).map((x) => x.stepId)).toEqual(['a', 'b']);
  });
  it('efface la réponse d’une question sortie du chemin', () => {
    let s = next(inp, setAnswer(inp, start(inp), 'b'));
    s = next(inp, setAnswer(inp, s, 'z'));
    expect(s.answers.b).toBe('z');
    s = resume(inp, setAnswer(inp, goTo(s, 'a'), 'x'), 'sum');
    expect(currentStep(inp, s).id).toBe('sum');
    expect(s.answers.b).toBeUndefined();
  });
  it('s’arrête sur une page déjà répondue que `accept` refuse (revalidation)', () => {
    let s = next(inp, setAnswer(inp, start(inp), 'b'));
    s = next(inp, setAnswer(inp, s, 'z'));
    const refuseB = (x: typeof s) => x.history.at(-1) !== 'b';
    s = resume(inp, goTo(s, 'a'), 'sum', refuseB);
    expect(currentStep(inp, s).id).toBe('b');
  });
});
