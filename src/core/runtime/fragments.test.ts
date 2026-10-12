import { describe, expect, it } from 'vitest';
import type { Edge, Fragment, GraphNode, Questionnaire, Workspace } from '../model';
import { back, buildContext, currentStep, next, prune, setAnswer, start, type RuntimeInput, type Session } from './index';

const q = (id: string, key = id, type: 'text' | 'boolean' = 'text'): GraphNode => ({ kind: 'question', id, key, label: { fr: key }, type }) as GraphNode;
const e = (from: string, to: string, when?: string): Edge => ({ id: `${from}_${to}`, from, to, ...(when ? { when } : {}) });
const inst = (id: string, ref: string, alias = id): GraphNode => ({ kind: 'fragment', id, ref, alias });
const end: GraphNode = { kind: 'end', id: 'fin', message: { fr: 'fin' } };

/** Fragment « identification-assure » de l'EVO : nom → prenom → majeur ─oui→ num_secu / └non→ representant_legal. */
const ident = (): Fragment => ({
  id: 'f_ident', key: 'identification_assure', title: { fr: 'Identification' },
  nodes: [q('nom'), q('prenom'), q('majeur', 'majeur', 'boolean'), q('num_secu'), q('representant_legal')],
  edges: [e('nom', 'prenom'), e('prenom', 'majeur'), e('majeur', 'num_secu', 'majeur = true'), e('majeur', 'representant_legal')],
});

function input(questionnaire: Omit<Questionnaire, 'formatVersion' | 'kind' | 'key' | 'title'>, fragments: Fragment[] = [ident()]): RuntimeInput {
  const ws: Workspace = {
    project: { formatVersion: 7, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: { formatVersion: 7, kind: 'library', questions: [], fragments, labelSets: [] },
    questionnaires: [{ formatVersion: 7, kind: 'questionnaire', key: 'q', title: { fr: 'q' }, ...questionnaire }],
    layouts: [],
  };
  return { ws, questionnaireId: questionnaire.id, sys: {} };
}

/** Répond dans l'ordre et avance ; renvoie la session et les étapes visitées. */
function play(inp: RuntimeInput, values: unknown[]): Session {
  let s = start(inp);
  for (const v of values) s = next(inp, setAnswer(inp, s, v));
  return s;
}

/** demande-remboursement : motif → ident → montant → fin (arête `ident.majeur = false` vers un avertissement). */
const remboursement = () => input({
  id: 'q_remb', start: 'motif',
  nodes: [q('motif'), inst('i', 'f_ident', 'ident'), { kind: 'info', id: 'mineur', text: { fr: 'Mineur' } }, q('montant'), end],
  edges: [e('motif', 'i'), e('i', 'mineur', 'ident.majeur = false'), e('i', 'montant'), e('mineur', 'montant'), e('montant', 'fin')],
});

describe('fragment au milieu du parcours (EVO-008)', () => {
  it('enchaîne motif, les questions du fragment, puis montant', () => {
    const inp = remboursement();
    const s = play(inp, ['perte', 'Dupont', 'Jean', true, '1 23']);
    expect(s.history).toEqual(['motif', 'i/nom', 'i/prenom', 'i/majeur', 'i/num_secu', 'montant']);
    expect(s.answers).toMatchObject({ motif: 'perte', ident: { nom: 'Dupont', prenom: 'Jean', majeur: true, num_secu: '1 23' } });
  });
  it('à une sortie du fragment (num_secu ou representant_legal), reprend sur les arêtes du nœud fragment', () => {
    const inp = remboursement();
    expect(currentStep(inp, play(inp, ['perte', 'D', 'J', true, 'x'])).id).toBe('montant');
    expect(currentStep(inp, play(inp, ['perte', 'D', 'J', false, 'tuteur'])).id).toBe('mineur');
  });
  it('l’arête `ident.majeur = false` est suivie si et seulement si la réponse du fragment vaut faux', () => {
    const inp = remboursement();
    expect(play(inp, ['p', 'D', 'J', false, 'tuteur']).history.at(-1)).toBe('mineur');
    expect(play(inp, ['p', 'D', 'J', true, '1']).history.at(-1)).toBe('montant');
  });
  it('le retour arrière traverse le fragment', () => {
    const inp = remboursement();
    let s = play(inp, ['p', 'D', 'J', true, '1']);
    s = back(s);
    expect(currentStep(inp, s).id).toBe('i/num_secu');
    s = back(back(back(back(s))));
    expect(currentStep(inp, s).id).toBe('motif');
  });
  it('dans le fragment, ses clés sont nues ; l’appelant les lit sous l’alias', () => {
    const inp = remboursement();
    const s = play(inp, ['p', 'D']);
    expect(buildContext(inp, s.answers, 'i/prenom')).toMatchObject({ nom: 'D', motif: 'p', ident: { nom: 'D' } });
  });
});

describe('départ sur un nœud fragment', () => {
  it('la prévisualisation commence par la première question du fragment', () => {
    const inp = input({ id: 'q_decl', start: 'i', nodes: [inst('i', 'f_ident', 'ident'), q('type_sinistre'), end], edges: [e('i', 'type_sinistre'), e('type_sinistre', 'fin')] });
    expect(start(inp).history).toEqual(['i/nom']);
    expect(currentStep(inp, play(inp, ['D', 'J', false, 't'])).id).toBe('type_sinistre');
  });
});

describe('plusieurs usages et imbrication', () => {
  it('deux usages du même fragment (assure, conjoint) : réponses distinctes', () => {
    const inp = input({
      id: 'q2', start: 'a', nodes: [inst('a', 'f_ident', 'assure'), inst('c', 'f_ident', 'conjoint'), end],
      edges: [e('a', 'c'), e('c', 'fin')],
    });
    const s = play(inp, ['Dupont', 'Jean', true, '1', 'Durand', 'Marie', true, '2']);
    expect(s.answers).toMatchObject({ assure: { nom: 'Dupont' }, conjoint: { nom: 'Durand' } });
    expect(currentStep(inp, s).id).toBe('fin');
  });
  it('un fragment appelant un fragment : étapes `i1/i2/nœud`, réponses `a.b.cle`, sortie remontée', () => {
    const adr: Fragment = { id: 'f_adr', key: 'adr', title: { fr: 'Adresse' }, nodes: [q('ville')], edges: [] };
    const outer: Fragment = {
      id: 'f_out', key: 'out', title: { fr: 'Out' }, nodes: [q('nom'), inst('ia', 'f_adr', 'adr')], edges: [e('nom', 'ia')],
    };
    const inp = input({ id: 'q3', start: 'o', nodes: [inst('o', 'f_out', 'ident'), q('fin_q'), end], edges: [e('o', 'fin_q', 'ident.adr.ville = "Lyon"'), e('o', 'fin')] }, [outer, adr]);
    const s = play(inp, ['D', 'Lyon']);
    expect(s.history).toEqual(['o/nom', 'o/ia/ville', 'fin_q']);
    expect(s.answers).toMatchObject({ ident: { nom: 'D', adr: { ville: 'Lyon' } } });
    expect(buildContext(inp, s.answers, 'o/ia/ville')).toMatchObject({ ville: 'Lyon', nom: 'D' });
  });
  it('fragment sans entrée implicite (boucle sur son premier nœud) : `entry`, sinon premier nœud', () => {
    const loop: Fragment = { id: 'f_l', key: 'l', title: { fr: 'L' }, nodes: [q('a'), q('b')], edges: [e('a', 'b'), e('b', 'a', 'a = "x"')] };
    const mk = (f: Fragment) => input({ id: 'q4', start: 'i', nodes: [inst('i', 'f_l', 'l'), end], edges: [e('i', 'fin')] }, [f]);
    expect(start(mk(loop)).history).toEqual(['i/a']);
    expect(start(mk({ ...loop, entry: 'b' })).history).toEqual(['i/b']);
  });
});

describe('effacement hors chemin dans un fragment', () => {
  it('changer `majeur` efface la réponse de la branche abandonnée', () => {
    const inp = remboursement();
    let s = play(inp, ['p', 'D', 'J', true, '1']);
    const answers = { ...s.answers, ident: { ...(s.answers.ident as object), majeur: false } };
    s = { ...s, answers: prune(inp, answers) };
    expect((s.answers.ident as Record<string, unknown>).num_secu).toBeUndefined();
  });
});

describe('référence, pas copie', () => {
  it('modifier une question du fragment change tous les appelants', () => {
    const inp = remboursement();
    const other = input({ id: 'q_decl', start: 'i', nodes: [inst('i', 'f_ident', 'ident'), end], edges: [e('i', 'fin')] });
    const ws = { ...inp.ws, questionnaires: [...inp.ws.questionnaires, ...other.ws.questionnaires] };
    (ws.library.fragments[0]!.nodes[0] as { label: unknown }).label = { fr: 'Nom de naissance' };
    for (const [id, step] of [['q_remb', 'i/nom'], ['q_decl', 'i/nom']] as const) {
      const s = start({ ...inp, ws, questionnaireId: id }, id === 'q_remb' ? { motif: 'p' } : {});
      const page = id === 'q_remb' ? next({ ...inp, ws, questionnaireId: id }, s) : s;
      expect(currentStep({ ...inp, ws, questionnaireId: id }, page).id).toBe(step);
      expect(currentStep({ ...inp, ws, questionnaireId: id }, page).question?.label).toEqual({ fr: 'Nom de naissance' });
    }
  });
});
