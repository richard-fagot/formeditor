import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import { FORMAT_VERSION, type GraphNode, type Questionnaire, type Workspace } from '../../core/model';
import { exportBundle, exportFiles, importFiles, newWorkspace } from '../../format';
import { projectedSteps, withAnswer, type RuntimeInput } from '../../core/runtime';
import { answerErrors, requiredAt } from './path-check';

const end: GraphNode = { kind: 'end', id: 'n_fin', message: { fr: 'Fin' } };

/** Questionnaire linéaire : les nœuds donnés, puis une fin. */
function questionnaire(id: string, nodes: GraphNode[]): Questionnaire {
  const all = [...nodes, end];
  return {
    formatVersion: FORMAT_VERSION, kind: 'questionnaire', id, key: id, title: { fr: id }, start: all[0]!.id, nodes: all,
    edges: all.slice(1).map((n, i) => ({ id: `e${i}`, from: all[i]!.id, to: n.id })),
  };
}

/** « Date de naissance » obligatoire, « Téléphone » facultatif ; fragment « Ayant droit » qui les utilise. */
function workspace(...qs: Questionnaire[]): Workspace {
  const ws = newWorkspace('p', 'fr');
  ws.library.questions.push(
    { id: 'lq_ddn', key: 'ddn', label: { fr: 'Date de naissance' }, type: 'date', required: true },
    { id: 'lq_tel', key: 'tel', label: { fr: 'Téléphone' }, type: 'text' },
    { id: 'lq_mail', key: 'mail', label: { fr: 'Mail' }, type: 'text', required: 'contact = "mail"' },
  );
  ws.library.fragments.push({
    id: 'f_ad', key: 'ayant_droit', title: { fr: 'Ayant droit' }, entry: 'fn_ddn',
    nodes: [{ kind: 'question', id: 'fn_ddn', ref: 'lq_ddn' }, { kind: 'question', id: 'fn_tel', ref: 'lq_tel' }],
    edges: [{ id: 'fe', from: 'fn_ddn', to: 'fn_tel' }],
  });
  for (const q of qs) {
    ws.questionnaires.push(q);
    ws.project.questionnaires.push({ id: q.id, file: `${q.key}.json` });
  }
  return ws;
}

const input = (ws: Workspace, questionnaireId: string): RuntimeInput => ({ ws, questionnaireId, sys: {} });
/** Astérisque et blocage d'une page laissée vide : toujours égaux, renvoyés ensemble. */
function shown(i: RuntimeInput, stepId: string, answers = {}) {
  const star = requiredAt(i, answers, stepId);
  expect(answerErrors(i, answers, stepId).some((e) => e.param === 'required')).toBe(star);
  return star;
}

describe('astérisque de la prévisualisation = obligation effective après surcharge (EVO-021)', () => {
  const souscripteur = questionnaire('souscripteur', [
    { kind: 'question', id: 'n_ddn', ref: 'lq_ddn', required: false },
    { kind: 'question', id: 'n_tel', ref: 'lq_tel', required: true },
    { kind: 'question', id: 'n_ddn2', ref: 'lq_ddn', label: { fr: 'Date de naissance du souscripteur' } },
    { kind: 'question', id: 'n_tel2', ref: 'lq_tel' },
    { kind: 'question', id: 'n_local', key: 'nom', label: { fr: 'Nom' }, type: 'text', required: true },
  ]);
  const ws = workspace(souscripteur);
  const i = input(ws, 'souscripteur');

  it('obligatoire surchargée en facultative : sans astérisque, peut rester vide', () => {
    expect(shown(i, 'n_ddn')).toBe(false);
  });

  it('facultative surchargée en obligatoire : astérisque, ne peut pas rester vide', () => {
    expect(shown(i, 'n_tel')).toBe(true);
  });

  it('surcharge du libellé seul : astérisque de la définition', () => {
    expect(shown(i, 'n_ddn2')).toBe(true);
  });

  it('question non surchargée : comportement d’origine (bibliothèque et locale)', () => {
    expect(shown(i, 'n_tel2')).toBe(false);
    expect(shown(i, 'n_local')).toBe(true);
  });

  it('même question surchargée différemment dans deux contextes : chacun son astérisque', () => {
    const call = (o?: Record<string, boolean>): GraphNode => ({ kind: 'fragment', id: 'c', ref: 'f_ad', alias: 'ad', ...(o ? { requiredOverrides: o } : {}) });
    const ws2 = workspace(questionnaire('a', [call({ fn_ddn: false, fn_tel: true })]), questionnaire('b', [call()]));
    expect([shown(input(ws2, 'a'), 'c/fn_ddn'), shown(input(ws2, 'a'), 'c/fn_tel')]).toEqual([false, true]);
    expect([shown(input(ws2, 'b'), 'c/fn_ddn'), shown(input(ws2, 'b'), 'c/fn_tel')]).toEqual([true, false]);
  });

  it('surcharge modifiée puis supprimée : l’astérisque suit', () => {
    const node = (w: Workspace) => w.questionnaires[0]!.nodes[0] as { required?: boolean };
    const w = structuredClone(ws);
    node(w).required = true;
    expect(shown(input(w, 'souscripteur'), 'n_ddn')).toBe(true);
    delete node(w).required;
    expect(shown(input(w, 'souscripteur'), 'n_ddn')).toBe(true);
    node(w).required = false;
    expect(shown(input(w, 'souscripteur'), 'n_ddn')).toBe(false);
  });

  it('« obligatoire si » hérité : astérisque évalué avec les réponses ; une surcharge le remplace', () => {
    const w = workspace(questionnaire('q', [
      { kind: 'question', id: 'n_contact', key: 'contact', label: { fr: 'Contact' }, type: 'text' },
      { kind: 'question', id: 'n_mail', ref: 'lq_mail' },
      { kind: 'question', id: 'n_mail2', ref: 'lq_mail', required: false },
    ]));
    const iq = input(w, 'q');
    expect(shown(iq, 'n_mail', {})).toBe(false);
    expect(shown(iq, 'n_mail', withAnswer({}, ['contact'], 'mail'))).toBe(true);
    expect(shown(iq, 'n_mail2', withAnswer({}, ['contact'], 'mail'))).toBe(false);
  });

  it('export puis réimport (fichiers et paquet) : mêmes astérisques sur toutes les pages', () => {
    const star = (w: Workspace) => Array.from(projectedSteps(input(w, 'souscripteur'), {}), (id) => requiredAt(input(w, 'souscripteur'), {}, id));
    for (const back of [importFiles(exportFiles(ws)), importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }])]) {
      expect(back.errors).toEqual([]);
      expect(star(back.workspace!)).toEqual(star(ws));
    }
    expect(star(ws)).toEqual([false, true, true, false, true, false]);
  });
});

describe('projet antérieur (EVO-021)', () => {
  it('l’exemple se charge et ses surcharges existantes règlent l’astérisque', () => {
    const ws = exampleWorkspace();
    const i = input(ws, 'q_remboursement');
    expect(shown(i, 'n_ident/fn_num_secu')).toBe(false);
    expect(ws.library.fragments.find((f) => f.id === 'frg_identification_assure')!.nodes.find((n) => n.id === 'fn_num_secu')).toMatchObject({ required: true });
  });

  it('un paquet version 10 avec surcharges se charge sans erreur, astérisques conformes', () => {
    const ws = workspace(questionnaire('souscripteur', [
      { kind: 'question', id: 'n_ddn', ref: 'lq_ddn', required: false },
      { kind: 'question', id: 'n_tel', ref: 'lq_tel', required: true },
    ]));
    const bundle = JSON.parse(exportBundle(ws));
    for (const d of [bundle, bundle.library, bundle.project, ...bundle.questionnaires]) d.formatVersion = 10;
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(bundle) }]);
    expect(back.errors).toEqual([]);
    const i = input(back.workspace!, 'souscripteur');
    expect([shown(i, 'n_ddn'), shown(i, 'n_tel')]).toEqual([false, true]);
  });
});
