import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import { checkWorkspace } from '../../core/validation';
import { start, next, setAnswer, currentStep } from '../../core/runtime';
import type { BlockNode, Questionnaire, Workspace } from '../../core/model';
import {
  addBlock, addLibraryQuestion, blankWorkspace, canMoveToLibrary, deleteLibraryItem, groupEntries, groupIntoBlock, insertNode, moveToLibrary,
  referenceNode, renameExit, setLibraryQuestionLabel, type GraphRef,
} from './index';

const Q = (ws: Workspace): Questionnaire => ws.questionnaires[0]!;
const ref = (ws: Workspace): GraphRef => ({ kind: 'questionnaire', id: Q(ws).id });

describe('éléments de bibliothèque', () => {
  it('crée une question et un bloc avec des clés uniques, puis les supprime', () => {
    const ws = blankWorkspace();
    const a = addLibraryQuestion(ws, { fr: 'Date du sinistre' });
    const b = addLibraryQuestion(ws, { fr: 'Date du sinistre' });
    expect(ws.library.questions.map((q) => q.key)).toEqual(['date_sinistre', 'date_sinistre_2']);
    const blk = addBlock(ws, { fr: 'Identité du tiers' });
    expect(ws.library.blocks[0]).toMatchObject({ id: blk, key: 'identite_tiers', nodes: [], edges: [] });
    deleteLibraryItem(ws, { kind: 'question', id: a });
    deleteLibraryItem(ws, { kind: 'block', id: blk });
    expect(ws.library.questions.map((q) => q.id)).toEqual([b]);
    expect(ws.library.blocks).toEqual([]);
  });

  it('insère une référence de question et une instance de bloc avec un alias libre', () => {
    const ws = exampleWorkspace();
    const r = ref(ws);
    const q = referenceNode(ws, Q(ws), { kind: 'question', id: ws.library.questions[0]!.id }, 'n1');
    expect(q).toEqual({ kind: 'question', id: 'n1', ref: ws.library.questions[0]!.id });
    const b = referenceNode(ws, Q(ws), { kind: 'block', id: 'blk_identite_tiers' }, 'n2') as BlockNode;
    insertNode(ws, r, b);
    expect(b.alias).toBe('identite_tiers');
    const b2 = referenceNode(ws, Q(ws), { kind: 'block', id: 'blk_identite_tiers' }, 'n3') as BlockNode;
    expect(b2.alias).toBe('identite_tiers_2');
    // Pas de bloc dans un bloc.
    expect(referenceNode(ws, ws.library.blocks[0]!, { kind: 'block', id: 'blk_identite_tiers' }, 'n4')).toBeUndefined();
  });

  it('place une question locale dans la bibliothèque sans changer sa clé ni les expressions', () => {
    const ws = exampleWorkspace();
    const before = checkWorkspace(ws).length;
    const node = Q(ws).nodes.find((n) => n.kind === 'question' && !('ref' in n))!;
    const key = (node as { key: string }).key;
    const id = moveToLibrary(ws, ref(ws), node.id)!;
    expect(Q(ws).nodes.find((n) => n.id === node.id)).toEqual({ kind: 'question', id: node.id, ref: id });
    expect(ws.library.questions.find((q) => q.id === id)).toMatchObject({ key, id });
    expect(checkWorkspace(ws).length).toBe(before);
    // Clé déjà prise dans la bibliothèque : refusé.
    const other = Q(ws).nodes.find((n) => n.kind === 'question' && !('ref' in n))!;
    ws.library.questions.push({ id: 'x', key: (other as { key: string }).key, label: {}, type: 'text' });
    expect(canMoveToLibrary(ws, ref(ws), other.id)).toBe(false);
    expect(moveToLibrary(ws, ref(ws), other.id)).toBeUndefined();
  });

  it('change l’intitulé d’une question de bibliothèque et redérive la clé si elle était dérivée', () => {
    const ws = blankWorkspace();
    const id = addLibraryQuestion(ws, { fr: 'Date' });
    const out = setLibraryQuestionLabel(ws, id, { fr: 'Date du décès' }, 'fr');
    expect(out.library.questions[0]).toMatchObject({ key: 'date_deces', label: { fr: 'Date du décès' } });
  });

  it('renomme une sortie et les arêtes des instances qui la visent', () => {
    const ws = exampleWorkspace();
    const blk = ws.library.blocks[0]!;
    const exit = blk.nodes.find((n) => n.kind === 'exit')!;
    const old = (exit as { name: string }).name;
    const uses = Q(ws).edges.filter((e) => e.exit === old).length;
    renameExit(ws, blk.id, exit.id, 'suite');
    expect(Q(ws).edges.filter((e) => e.exit === 'suite').length).toBe(uses);
    expect(Q(ws).edges.filter((e) => e.exit === old).length).toBe(0);
  });
});

describe('regroupement d’une sélection en bloc', () => {
  /** a → b → c → fin, b conditionnel vers fin ; on regroupe a et b. */
  function chain(): Workspace {
    const ws = blankWorkspace();
    const r = ref(ws);
    const q = (id: string, required = true) => ({ kind: 'question' as const, id, key: id, label: { fr: id }, type: 'text' as const, required });
    insertNode(ws, r, q('a'));
    insertNode(ws, r, q('b'), 'a');
    insertNode(ws, r, q('c'), 'b');
    insertNode(ws, r, { kind: 'end', id: 'fin', message: { fr: 'Fin' } }, 'c');
    const g = Q(ws);
    g.edges.unshift({ id: 'e_b_fin', from: 'b', to: 'fin', when: "b = 'stop'" });
    g.edges.push({ id: 'e_c', from: 'c', to: 'fin', when: "a = 'x'" });
    return ws;
  }

  it('crée le bloc, ses sorties, l’instance, et requalifie les références de l’hôte', () => {
    const ws0 = chain();
    const res = groupIntoBlock(ws0, ref(ws0), ['a', 'b'], { fr: 'Début' })!;
    const ws = res.ws;
    const g = Q(ws);
    const block = ws.library.blocks.find((b) => b.id === res.blockId)!;
    expect(block.key).toBe('debut');
    expect(block.start).toBe('a');
    expect(block.nodes.filter((n) => n.kind === 'exit').map((n) => (n as { name: string }).name).sort()).toEqual(['c', 'fin']);
    const inst = g.nodes.find((n) => n.id === res.instanceId) as BlockNode;
    expect(inst).toMatchObject({ kind: 'block', ref: block.id, alias: 'debut' });
    expect(g.start).toBe(inst.id);
    expect(g.nodes.map((n) => n.id)).toEqual(expect.not.arrayContaining(['a', 'b']));
    expect(g.edges.filter((e) => e.from === inst.id).map((e) => e.exit).sort()).toEqual(['c', 'fin']);
    // La condition de l'hôte vise désormais la question du bloc par son alias.
    expect(g.edges.find((e) => e.id === 'e_c')!.when).toBe("debut.a = 'x'");
    // La condition déplacée dans le bloc garde sa clé nue.
    expect(block.edges.find((e) => e.id === 'e_b_fin')!.when).toBe("b = 'stop'");
    expect(checkWorkspace(ws).filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('garde le même parcours après regroupement', () => {
    const before = chain();
    const ws0 = chain();
    const res = groupIntoBlock(ws0, ref(ws0), ['a', 'b'], { fr: 'Début' })!;
    const walk = (ws: Workspace, answers: string[]) => {
      const input = { ws, questionnaireId: Q(ws).id, sys: {} };
      let s = start(input);
      for (const v of answers) s = next(input, setAnswer(input, s, v));
      return s.history.map((id) => currentStep(input, { ...s, history: [id] }).node.id);
    };
    // Mêmes nœuds visités dans le même ordre (les ids des pages du bloc sont préfixés par l'instance).
    expect(walk(res.ws, ['x', 'y', 'z'])).toEqual(walk(before, ['x', 'y', 'z']));
    expect(walk(res.ws, ['x', 'stop'])).toEqual(walk(before, ['x', 'stop']));
  });

  it('refuse une sélection à plusieurs entrées (le parcours changerait)', () => {
    const ws = chain();
    // a → b → c, plus un saut a → c : la sélection { b, c } a deux entrées.
    Q(ws).edges.push({ id: 'e_a_c', from: 'a', to: 'c', when: "a = 'saut'" });
    expect(groupEntries(ws, ref(ws), ['b', 'c']).sort()).toEqual(['b', 'c']);
    expect(groupIntoBlock(ws, ref(ws), ['b', 'c'], { fr: 'X' })).toBeUndefined();
    expect(ws.library.blocks).toEqual([]);
    expect(groupEntries(ws, ref(ws), ['a', 'b'])).toEqual(['a']);
  });

  it('refuse une sélection vide ou qui contient une instance de bloc', () => {
    const ws = exampleWorkspace();
    const inst = Q(ws).nodes.find((n) => n.kind === 'block')!;
    expect(groupIntoBlock(ws, ref(ws), [inst.id], { fr: 'X' })).toBeUndefined();
    expect(groupIntoBlock(ws, ref(ws), [], { fr: 'X' })).toBeUndefined();
  });
});
