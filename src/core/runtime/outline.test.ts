import { describe, expect, it } from 'vitest';
import type { Edge, GraphNode, Workspace } from '../model';
import { back, jumpTo, next, passedQuestions, setAnswer, start, type RuntimeInput, type Session } from './index';

const q = (id: string, type: 'text' | 'boolean' = 'text'): GraphNode =>
  ({ kind: 'question', id, key: id, label: { fr: id }, type }) as GraphNode;
const e = (from: string, to: string, when?: string): Edge => ({ id: `${from}_${to}`, from, to, ...(when ? { when } : {}) });

// Exemple de l'EVO-019 : Q1 Oui → Q2 → Q3 ; Non → Q3 ; une page d'information avant la fin.
const nodes: GraphNode[] = [q('q1', 'boolean'), q('q2'), q('q3'), { kind: 'info', id: 'i', text: { fr: 'info' } } as GraphNode, { kind: 'end', id: 'fin', message: { fr: 'fin' } }];
const edges = [e('q1', 'q2', 'q1 = true'), e('q1', 'q3'), e('q2', 'q3'), e('q3', 'i'), e('i', 'fin')];
const inp: RuntimeInput = {
  ws: {
    project: { formatVersion: 1, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: { formatVersion: 1, kind: 'library', questions: [], fragments: [], labelSets: [] },
    questionnaires: [{ formatVersion: 1, kind: 'questionnaire', id: 'q', key: 'q', title: { fr: 'q' }, start: 'q1', nodes, edges }],
    layouts: [],
  } as unknown as Workspace,
  questionnaireId: 'q',
  sys: {},
};

/** Q1 = Oui, Q2 = 2 : arrivée sur Q3 (Q3 affichée, sans réponse). Pages affichées : q1, q2, q3. */
const toQ3 = () => next(inp, setAnswer(inp, next(inp, setAnswer(inp, start(inp), true)), '2'));
const visited = ['q1', 'q2', 'q3'];
const passed = (s: Session, v: string[] = visited) => [...passedQuestions(inp, s, v)].sort();

describe('questions passées (outline, EVO-019)', () => {
  it('au départ : seule la question courante', () => {
    expect(passed(start(inp), [])).toEqual(['q1']);
  });
  it('questions affichées du parcours, question courante comprise', () => {
    expect(passed(toQ3())).toEqual(['q1', 'q2', 'q3']);
  });
  it('après un retour sans modification, les questions passées suivantes restent actives', () => {
    expect(passed(back(back(toQ3())))).toEqual(['q1', 'q2', 'q3']);
  });
  it('une réponse modifiée retire les questions sorties du parcours, sans attendre « Suivant »', () => {
    expect(passed(setAnswer(inp, back(back(toQ3())), false))).toEqual(['q1', 'q3']);
  });
  it('une question jamais affichée n’est pas active, même sur le parcours', () => {
    expect(passed(start(inp), ['q1'])).toEqual(['q1']);
    expect(passed(next(inp, setAnswer(inp, start(inp), false)), ['q1'])).toEqual(['q1', 'q3']);
  });
});

describe('saut vers une question passée (outline, EVO-019)', () => {
  it('l’historique devient le parcours jusqu’à la question, réponses conservées', () => {
    const s = toQ3();
    const j = jumpTo(inp, s, 'q1', visited);
    expect(j.history).toEqual(['q1']);
    expect(j.answers).toEqual(s.answers);
    expect(jumpTo(inp, j, 'q3', visited).history).toEqual(['q1', 'q2', 'q3']);
  });
  it('vers une question hors parcours, non passée ou un nœud qui n’est pas une question : sans effet', () => {
    const s = setAnswer(inp, back(back(toQ3())), false);
    expect(jumpTo(inp, s, 'q2', visited)).toBe(s);
    const s0 = start(inp);
    expect(jumpTo(inp, s0, 'q3', ['q1'])).toBe(s0);
    expect(jumpTo(inp, s, 'fin', [...visited, 'i', 'fin'])).toBe(s);
  });
});
