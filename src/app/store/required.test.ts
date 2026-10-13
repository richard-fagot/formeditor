import { describe, expect, it } from 'vitest';
import { resolveRequired, type FragmentNode, type QuestionNode } from '../../core/model';
import { addFragment, addLibraryQuestion, blankWorkspace, hasRequiredOverride, resetRequired, setRequiredOverride, type GraphRef } from './index';

/** Bibliothèque : Q_TEL facultative ; fragment F_COORDONNEES qui l'utilise ; questionnaire avec une référence et un appel. */
function setup() {
  const ws = blankWorkspace();
  const tel = addLibraryQuestion(ws, { fr: 'Téléphone' });
  const f = addFragment(ws, { fr: 'Coordonnées' });
  ws.library.fragments[0]!.nodes.push({ kind: 'question', id: 'n_tel', ref: tel });
  const q = ws.questionnaires[0]!;
  q.nodes.push({ kind: 'question', id: 'r', ref: tel }, { kind: 'fragment', id: 'c', ref: f, alias: 'coord' });
  const graph: GraphRef = { kind: 'questionnaire', id: q.id };
  const frag: GraphRef = { kind: 'fragment', id: f };
  const inFragment = () => ws.library.fragments[0]!.nodes[0] as QuestionNode;
  const call = () => q.nodes[1] as FragmentNode;
  return { ws, graph, frag, inFragment, call, ref: () => q.nodes[0] as QuestionNode };
}

describe('édition des surcharges du caractère obligatoire (EVO-012)', () => {
  it('surcharge dans le fragment, puis dans le formulaire via l’appel ; la bibliothèque ne change pas', () => {
    const { ws, graph, frag, inFragment, call } = setup();
    expect(setRequiredOverride(ws, frag, 'n_tel', true)).toBe(true);
    expect(resolveRequired(ws, inFragment(), [call()]).value).toBe(true);
    expect(setRequiredOverride(ws, graph, 'c', false, 'n_tel')).toBe(true);
    expect(call().requiredOverrides).toEqual({ n_tel: false });
    expect(resolveRequired(ws, inFragment(), [call()]).value).toBe(false);
    expect(resolveRequired(ws, inFragment(), []).value).toBe(true);
    expect(ws.library.questions[0]!.required).toBeUndefined();
  });
  it('surcharge d’une référence directe ; refus sur une question locale', () => {
    const { ws, graph, ref } = setup();
    expect(setRequiredOverride(ws, graph, 'r', false)).toBe(true);
    expect(ref()).toMatchObject({ required: false });
    expect(hasRequiredOverride(ws, graph, 'r')).toBe(true);
    ws.questionnaires[0]!.nodes.push({ kind: 'question', id: 'loc', key: 'loc', label: { fr: 'l' }, type: 'text' });
    expect(setRequiredOverride(ws, graph, 'loc', true)).toBe(false);
  });
  it('« Hérité » retire la surcharge ; « Revenir à la valeur héritée » retire tout', () => {
    const { ws, graph, ref, call } = setup();
    setRequiredOverride(ws, graph, 'c', true, 'n_tel');
    setRequiredOverride(ws, graph, 'c', undefined, 'n_tel');
    expect(call()).not.toHaveProperty('requiredOverrides');
    setRequiredOverride(ws, graph, 'c', true, 'n_tel');
    setRequiredOverride(ws, graph, 'c', true, 'disparu');
    expect(resetRequired(ws, graph, 'c')).toBe(true);
    expect(call()).not.toHaveProperty('requiredOverrides');
    setRequiredOverride(ws, graph, 'r', true);
    expect(resetRequired(ws, graph, 'r')).toBe(true);
    expect(ref()).not.toHaveProperty('required');
    expect(hasRequiredOverride(ws, graph, 'r')).toBe(false);
    expect(resetRequired(ws, graph, 'r')).toBe(false);
  });
});
