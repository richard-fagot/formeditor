import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import { checkWorkspace } from '../../core/validation';
import { start, next, setAnswer, currentStep } from '../../core/runtime';
import type { FragmentNode, Questionnaire, Workspace } from '../../core/model';
import {
  addFragment, addLibraryQuestion, blankWorkspace, canMoveToLibrary, deleteLibraryItem, groupEntries, groupIntoFragment, insertNode, moveToLibrary,
  referenceNode, removeNodes, renameExit, setLibraryQuestionLabel, type GraphRef,
} from './index';

const Q = (ws: Workspace): Questionnaire => ws.questionnaires[0]!;
const ref = (ws: Workspace): GraphRef => ({ kind: 'questionnaire', id: Q(ws).id });

describe('éléments de bibliothèque', () => {
  it('crée une question et un fragment avec des clés uniques, puis les supprime', () => {
    const ws = blankWorkspace();
    const a = addLibraryQuestion(ws, { fr: 'Date du sinistre' });
    const b = addLibraryQuestion(ws, { fr: 'Date du sinistre' });
    expect(ws.library.questions.map((q) => q.key)).toEqual(['date_sinistre', 'date_sinistre_2']);
    const blk = addFragment(ws, { fr: 'Identité du tiers' });
    expect(ws.library.fragments[0]).toEqual({ id: blk, key: 'identite_tiers', title: { fr: 'Identité du tiers' }, nodes: [], edges: [] });
    deleteLibraryItem(ws, { kind: 'question', id: a });
    deleteLibraryItem(ws, { kind: 'fragment', id: blk });
    expect(ws.library.questions.map((q) => q.id)).toEqual([b]);
    expect(ws.library.fragments).toEqual([]);
  });

  it('insère une référence de question et un appel de fragment avec un alias libre', () => {
    const ws = exampleWorkspace();
    const r = ref(ws);
    const q = referenceNode(ws, r, { kind: 'question', id: ws.library.questions[0]!.id }, 'n1');
    expect(q).toEqual({ kind: 'question', id: 'n1', ref: ws.library.questions[0]!.id });
    const b = referenceNode(ws, r, { kind: 'fragment', id: 'blk_identite_tiers' }, 'n2') as FragmentNode;
    insertNode(ws, r, b);
    expect(b).toEqual({ kind: 'fragment', id: 'n2', ref: 'blk_identite_tiers', alias: 'identite_tiers' });
    const b2 = referenceNode(ws, r, { kind: 'fragment', id: 'blk_identite_tiers' }, 'n3') as FragmentNode;
    expect(b2.alias).toBe('identite_tiers_2');
  });

  it('refuse l’insertion d’un fragment qui créerait un cycle d’appels (A appelle B qui appelle A)', () => {
    const ws = blankWorkspace();
    const a = addFragment(ws, { fr: 'A' });
    const b = addFragment(ws, { fr: 'B' });
    const ra: GraphRef = { kind: 'fragment', id: a };
    const rb: GraphRef = { kind: 'fragment', id: b };
    expect(referenceNode(ws, ra, { kind: 'fragment', id: a }, 'x')).toBeUndefined();
    const call = referenceNode(ws, ra, { kind: 'fragment', id: b }, 'ab')!;
    insertNode(ws, ra, call);
    expect(call).toMatchObject({ kind: 'fragment', ref: b });
    expect(referenceNode(ws, rb, { kind: 'fragment', id: a }, 'ba')).toBeUndefined();
    expect(ws.library.fragments[1]!.nodes).toEqual([]);
  });

  it('n’attribue pas de départ à un fragment ; supprimer son entrée réglée la retire', () => {
    const ws = blankWorkspace();
    const a = addFragment(ws, { fr: 'A' });
    const ra: GraphRef = { kind: 'fragment', id: a };
    insertNode(ws, ra, { kind: 'info', id: 'i1', text: { fr: 'x' } });
    insertNode(ws, ra, { kind: 'info', id: 'i2', text: { fr: 'y' } }, 'i1');
    expect(ws.library.fragments[0]).not.toHaveProperty('start');
    ws.library.fragments[0]!.entry = 'i2';
    removeNodes(ws, ra, ['i2']);
    expect(ws.library.fragments[0]).not.toHaveProperty('entry');
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
    const blk = ws.library.fragments[0]!;
    const exit = blk.nodes.find((n) => n.kind === 'exit')!;
    const old = (exit as { name: string }).name;
    const uses = Q(ws).edges.filter((e) => e.exit === old).length;
    renameExit(ws, blk.id, exit.id, 'suite');
    expect(Q(ws).edges.filter((e) => e.exit === 'suite').length).toBe(uses);
    expect(Q(ws).edges.filter((e) => e.exit === old).length).toBe(0);
  });
});

describe('extraction d’une sélection en fragment', () => {
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

  it('crée le fragment, ses sorties, l’appel, et requalifie les références de l’appelant', () => {
    const ws0 = chain();
    const res = groupIntoFragment(ws0, ref(ws0), ['a', 'b'], { fr: 'Début' })!;
    const ws = res.ws;
    const g = Q(ws);
    const block = ws.library.fragments.find((b) => b.id === res.fragmentId)!;
    expect(block.key).toBe('debut');
    expect(block).not.toHaveProperty('entry');
    expect(block.nodes.filter((n) => n.kind === 'exit').map((n) => (n as { name: string }).name).sort()).toEqual(['c', 'fin']);
    const inst = g.nodes.find((n) => n.id === res.instanceId) as FragmentNode;
    expect(inst).toMatchObject({ kind: 'fragment', ref: block.id, alias: 'debut' });
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
    const res = groupIntoFragment(ws0, ref(ws0), ['a', 'b'], { fr: 'Début' })!;
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
    expect(groupIntoFragment(ws, ref(ws), ['b', 'c'], { fr: 'X' })).toBeUndefined();
    expect(ws.library.fragments).toEqual([]);
    expect(groupEntries(ws, ref(ws), ['a', 'b'])).toEqual(['a']);
  });

  it('refuse une sélection vide ou qui contient une fin ; accepte un appel de fragment (imbrication)', () => {
    const ws = chain();
    expect(groupIntoFragment(ws, ref(ws), ['c', 'fin'], { fr: 'X' })).toBeUndefined();
    expect(groupIntoFragment(ws, ref(ws), [], { fr: 'X' })).toBeUndefined();
    const ex = exampleWorkspace();
    const inst = Q(ex).nodes.find((n) => n.kind === 'fragment')!;
    const res = groupIntoFragment(ex, ref(ex), [inst.id], { fr: 'Englobant' })!;
    const outer = res.ws.library.fragments.find((f) => f.id === res.fragmentId)!;
    expect(outer.nodes.some((n) => n.kind === 'fragment' && n.ref === 'blk_identite_tiers')).toBe(true);
    // Les références de l'appelant à `tiers.…` passent par le nouvel alias.
    expect(JSON.stringify(Q(res.ws))).toContain('englobant.tiers.');
  });
});
