import { describe, expect, it } from 'vitest';
import type { Fragment, FragmentNode, GraphNode, LibraryQuestionNode, QuestionNode, Workspace } from './index';
import { activeOverrides, fragmentQuestions, inheritedRequired, instanceQuestion, resolveRequired } from './index';

const tel = { id: 'lq_tel', key: 'tel', label: { fr: 'Téléphone' }, type: 'text' as const };
const ref = (id: string, required?: boolean): LibraryQuestionNode => ({ kind: 'question', id, ref: 'lq_tel', ...(required === undefined ? {} : { required }) });
const call = (id: string, f: string, overrides?: Record<string, boolean>): FragmentNode =>
  ({ kind: 'fragment', id, ref: f, alias: id, ...(overrides ? { requiredOverrides: overrides } : {}) });
const frag = (id: string, nodes: GraphNode[]): Fragment => ({ id, key: id, title: { fr: id }, nodes, edges: [] });

function ws(fragments: Fragment[], libRequired?: boolean): Workspace {
  return {
    project: { formatVersion: 10, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: { formatVersion: 10, kind: 'library', questions: [{ ...tel, ...(libRequired === undefined ? {} : { required: libRequired }) }], fragments, labelSets: [] },
    questionnaires: [],
    layouts: [],
  };
}

/** F_COORDONNEES : Q_TEL surchargée « obligatoire » ; option : sans surcharge. */
const coord = (required?: boolean) => frag('f_coord', [ref('n_tel', required), { kind: 'question', id: 'n_loc', key: 'loc', label: { fr: 'l' }, type: 'text' }]);
const nodeTel = (w: Workspace) => w.library.fragments[0]!.nodes[0] as QuestionNode;

describe('surcharge du caractère obligatoire (EVO-012)', () => {
  it('surcharge dans le fragment : obligatoire dans le fragment et ses appelants sans surcharge, facultative en bibliothèque', () => {
    const w = ws([coord(true)], false);
    expect(resolveRequired(w, nodeTel(w), [])).toEqual({ value: true, override: true, holder: 0 });
    expect(resolveRequired(w, nodeTel(w), [call('adhesion', 'f_coord')])).toEqual({ value: true, override: true, holder: 1 });
    expect(w.library.questions[0]!.required).toBe(false);
  });
  it('surcharge dans un formulaire via le fragment : seule cette utilisation change', () => {
    const w = ws([coord(true)], false);
    expect(resolveRequired(w, nodeTel(w), [call('rappel', 'f_coord', { n_tel: false })])).toEqual({ value: false, override: true, holder: 0 });
    expect(resolveRequired(w, nodeTel(w), [call('adhesion', 'f_coord')]).value).toBe(true);
    expect(resolveRequired(w, nodeTel(w), []).value).toBe(true);
  });
  it('référence directe dans un formulaire : seule cette utilisation est affectée', () => {
    const w = ws([], false);
    expect(resolveRequired(w, ref('a', true), [])).toEqual({ value: true, override: true, holder: 0 });
    expect(resolveRequired(w, ref('b'), [])).toEqual({ value: false, override: false, holder: 'library' });
    expect(instanceQuestion(tel, ref('a', true)).required).toBe(true);
  });
  it('« Hérité » suit la bibliothèque et le fragment ; une surcharge reste figée, même égale à la valeur héritée', () => {
    const w = ws([coord()], false);
    const inherited = call('c', 'f_coord');
    const frozen = call('c', 'f_coord', { n_tel: false });
    expect(resolveRequired(w, nodeTel(w), [inherited]).value).toBe(false);
    w.library.questions[0]!.required = true;
    expect(resolveRequired(w, nodeTel(w), [inherited]).value).toBe(true);
    expect(resolveRequired(w, nodeTel(w), [frozen]).value).toBe(false);
    (w.library.fragments[0]!.nodes[0] as LibraryQuestionNode).required = false;
    expect(resolveRequired(w, nodeTel(w), [inherited]).value).toBe(false);
  });
  it('retour à l’hérité : sans surcharge, la valeur redevient celle du niveau supérieur', () => {
    const w = ws([coord(true)], false);
    expect(inheritedRequired(w, nodeTel(w), [call('c', 'f_coord', { n_tel: false })])).toEqual({ value: true, override: true, holder: 1 });
    expect(inheritedRequired(w, ref('a', true), [])).toEqual({ value: false, override: false, holder: 'library' });
  });
  it('fragments imbriqués : la surcharge la plus proche du formulaire l’emporte', () => {
    const outer = frag('f_outer', [call('n_in', 'f_coord', { n_tel: false })]);
    const w = ws([coord(true), outer], undefined);
    const inner = outer.nodes[0] as FragmentNode;
    expect(resolveRequired(w, nodeTel(w), [call('q', 'f_outer'), inner])).toEqual({ value: false, override: true, holder: 1 });
    expect(resolveRequired(w, nodeTel(w), [call('q', 'f_outer', { 'n_in/n_tel': true }), inner])).toEqual({ value: true, override: true, holder: 0 });
    expect(fragmentQuestions(w, 'f_outer').map((q) => q.path)).toEqual(['n_in/n_tel', 'n_in/n_loc']);
  });
  it('question locale d’un fragment surchargeable depuis l’appelant ; surcharge orpheline ignorée', () => {
    const w = ws([coord()], false);
    const loc = w.library.fragments[0]!.nodes[1] as QuestionNode;
    expect(resolveRequired(w, loc, [call('c', 'f_coord', { n_loc: true })]).value).toBe(true);
    expect(resolveRequired(w, loc, [call('c', 'f_coord')])).toEqual({ value: undefined, override: false, holder: 1 });
    expect(activeOverrides(w, call('c', 'f_coord', { n_loc: true, disparu: true }))).toBe(1);
  });
  it('sans surcharge : valeur de la définition, comme avant', () => {
    const w = ws([coord()], true);
    expect(resolveRequired(w, nodeTel(w), [call('c', 'f_coord')])).toEqual({ value: true, override: false, holder: 'library' });
  });
});
