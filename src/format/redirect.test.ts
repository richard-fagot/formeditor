import { describe, expect, it } from 'vitest';
import { FORMAT_VERSION, type Questionnaire, type RedirectNode, type Workspace } from '../core/model';
import { validateDocument } from './validate';
import { exportBundle, exportFiles, importFiles } from './files';
import { newWorkspace } from './workspace';

const redirect: RedirectNode = {
  kind: 'redirect', id: 'n2', title: { fr: 'Mauvais questionnaire', en: 'Wrong form' }, text: { fr: 'Le bien vous appartient.', en: 'You own it.' },
  buttons: [
    { label: { fr: 'Déclarer un dommage', en: 'Report damage' }, target: { questionnaire: 'q2', prefill: true, replace: true } },
    { label: { fr: 'Rectifier', en: 'Correct' }, target: { node: 'n1' }, when: 'proprio = true' },
    { label: { fr: '' } },
  ],
  finishLabel: { fr: 'Fermer', en: 'Close' },
};

function workspace(): Workspace {
  const ws = newWorkspace('p', 'fr');
  const q = (id: string, key: string, extra: Partial<Questionnaire> = {}): Questionnaire =>
    ({ formatVersion: FORMAT_VERSION, kind: 'questionnaire', id, key, title: { fr: key }, start: '', nodes: [], edges: [], ...extra });
  ws.questionnaires.push(
    q('q1', 'rc', {
      start: 'n1',
      nodes: [{ kind: 'question', id: 'n1', key: 'proprio', label: { fr: 'Propriétaire ?' }, type: 'boolean' }, redirect, { kind: 'end', id: 'n3', message: { fr: 'Fin' } }],
      edges: [{ id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n2', to: 'n3' }],
    }),
    q('q2', 'dommage'),
  );
  ws.project.questionnaires.push({ id: 'q1', file: 'rc.json' }, { id: 'q2', file: 'dommage.json' });
  return ws;
}

describe('nœud Renvoi : format (EVO-024, version 15)', () => {
  it('EVO-024-056, EVO-024-004 — export puis réimport : nœud Renvoi et boutons restitués à l’identique (titre, texte, Terminer, libellé, cible, toggles, condition, ordre)', () => {
    const ws = workspace();
    const files = exportFiles(ws);
    for (const f of files) expect(validateDocument(JSON.parse(f.text)), f.name).toEqual([]);
    const back = importFiles(files);
    expect(back.errors).toEqual([]);
    expect(back.workspace!.questionnaires[0]!.nodes[1]).toEqual(redirect);
    expect(exportFiles(back.workspace!)).toEqual(files);
    const bundle = importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }]);
    expect(bundle.workspace!.questionnaires[0]!.nodes[1]).toEqual(redirect);
  });

  it('EVO-024-056 — le schéma refuse un toggle sur une cible nœud et une cible sans désignation', () => {
    const doc = JSON.parse(exportFiles(workspace()).find((f) => f.name.startsWith('rc'))!.text);
    doc.nodes[1].buttons[1].target = { node: 'n1', prefill: true };
    expect(validateDocument(doc)).not.toEqual([]);
    doc.nodes[1].buttons[1].target = {};
    expect(validateDocument(doc)).not.toEqual([]);
  });

  it('EVO-024-057 — un projet version 14 se charge sans erreur et passe en version 15', () => {
    const ws = workspace();
    ws.questionnaires[0]!.nodes.splice(1, 1);
    ws.questionnaires[0]!.edges = [];
    const bundle = JSON.parse(exportBundle(ws));
    for (const d of [bundle, bundle.library, bundle.project, ...bundle.questionnaires, ...bundle.layouts]) d.formatVersion = 14;
    const back = importFiles([{ name: 'p.bundle.json', text: JSON.stringify(bundle) }]);
    expect(back.errors).toEqual([]);
    expect(FORMAT_VERSION).toBe(15);
    expect(back.workspace!.questionnaires.map((q) => q.formatVersion)).toEqual([15, 15]);
    expect(back.workspace!.questionnaires[0]!.nodes).toEqual(ws.questionnaires[0]!.nodes);
  });
});
