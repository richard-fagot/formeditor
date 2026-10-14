import { describe, expect, it } from 'vitest';
import { FORMAT_VERSION, versionAlerts, type Questionnaire, type Workspace } from '../core/model';
import { validateDocument } from './validate';
import { exportBundle, exportFiles, importFiles, questionnaireFileName } from './files';
import { newWorkspace } from './workspace';

const qn = (id: string, key: string, extra: Partial<Questionnaire> = {}): Questionnaire => ({
  formatVersion: FORMAT_VERSION, kind: 'questionnaire', id, key, title: { fr: key }, start: 'n1',
  nodes: [{ kind: 'question', id: 'n1', ref: 'lq_identite' }], edges: [], ...extra,
});

/** `blessure` 1.0.5 provisoire et `dc` 1.0.4 validé utilisent « identite » (2.1.0, validée). */
function workspace(): Workspace {
  const ws = newWorkspace('p', 'fr');
  ws.library.questions.push({ id: 'lq_identite', key: 'identite', label: { fr: 'Identité assuré' }, type: 'text', version: '2.1.0', status: 'validated' });
  ws.library.fragments.push({ id: 'frg', key: 'frg', title: { fr: 'F' }, nodes: [], edges: [], version: '1', status: 'draft' });
  ws.questionnaires.push(
    qn('q1', 'blessure', { version: '1.0.5' }),
    qn('q2', 'dc', { version: '1.0.4', status: 'validated', validatedAt: '2026-10-14', libraryVersions: { lq_identite: { version: '2.1.0', status: 'validated' } } }),
  );
  ws.project.questionnaires.push({ id: 'q1', file: 'blessure.json' }, { id: 'q2', file: 'dc.json' });
  ws.layouts.push({ formatVersion: FORMAT_VERSION, kind: 'layout', graph: 'q1', nodes: { n1: { x: 0, y: 0 } } });
  return ws;
}
const v13 = () => {
  const ws = workspace();
  for (const q of ws.questionnaires) { delete q.version; delete q.libraryVersions; }
  for (const x of [...ws.library.questions, ...ws.library.fragments]) { delete x.version; delete x.status; }
  const bundle = JSON.parse(exportBundle(ws));
  for (const d of [bundle, bundle.library, bundle.project, ...bundle.questionnaires, ...bundle.layouts]) d.formatVersion = 13;
  return bundle;
};
const json = (ws: Workspace, name: string) => JSON.parse(exportFiles(ws).find((f) => f.name === name)!.text);

describe('versionning (EVO-022, version 14)', () => {
  it('le format courant est la version 14', () => {
    expect(FORMAT_VERSION).toBe(14);
  });

  it('un projet version 13 se charge sans erreur : versions vides, statuts conservés, aucune alerte de dépendance', () => {
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(v13()) }]);
    expect(back.errors).toEqual([]);
    const ws = back.workspace!;
    expect(ws.questionnaires.map((q) => [q.version, q.status])).toEqual([[undefined, undefined], [undefined, 'validated']]);
    expect(ws.library.questions[0]).not.toHaveProperty('version');
    expect(ws.questionnaires.flatMap((q) => versionAlerts(ws.library, q))).toEqual([]);
  });

  it('schéma : version et versions de référence d’un questionnaire, version et statut d’un élément ; refusés mal formés', () => {
    expect(validateDocument(qn('q', 'q', { version: '1.0', libraryVersions: { a: { version: '', status: 'draft' } } }))).toEqual([]);
    expect(validateDocument(qn('q', 'q', { version: 2 as unknown as string })).length).toBeGreaterThan(0);
    expect(validateDocument(qn('q', 'q', { libraryVersions: { a: { version: '1' } } as never })).length).toBeGreaterThan(0);
    const lib = workspace().library;
    expect(validateDocument(lib as never)).toEqual([]);
    expect(validateDocument({ ...lib, questions: [{ ...lib.questions[0], status: 'final' }] } as never).length).toBeGreaterThan(0);
    expect(validateDocument({ ...lib, fragments: [{ ...lib.fragments[0], version: 1 }] } as never).length).toBeGreaterThan(0);
  });

  it('nom de fichier : <clé> - <version> - <final|provisoire>.json, version vide omise, caractères interdits remplacés', () => {
    expect(questionnaireFileName({ key: 'blessure', version: '1.0.5' })).toBe('blessure - 1.0.5 - provisoire.json');
    expect(questionnaireFileName({ key: 'dc', version: '1.0.4', status: 'validated' })).toBe('dc - 1.0.4 - final.json');
    expect(questionnaireFileName({ key: 'blessure' })).toBe('blessure - provisoire.json');
    expect(questionnaireFileName({ key: 'blessure', version: '  ' })).toBe('blessure - provisoire.json');
    expect(questionnaireFileName({ key: 'b', version: '1/2:3*' })).toBe('b - 1_2_3_ - provisoire.json');
  });

  it('export en fichiers : noms versionnés (projet aligné), version, statut et versions des éléments utilisés', () => {
    const ws = workspace();
    const names = exportFiles(ws).map((f) => f.name);
    expect(names).toEqual(['projet.json', 'bibliotheque.json', 'blessure - 1.0.5 - provisoire.json', 'blessure - 1.0.5 - provisoire.layout.json', 'dc - 1.0.4 - final.json']);
    expect(json(ws, 'projet.json').questionnaires.map((e: { file: string }) => e.file)).toEqual(['blessure - 1.0.5 - provisoire.json', 'dc - 1.0.4 - final.json']);
    const blessure = json(ws, 'blessure - 1.0.5 - provisoire.json');
    expect([blessure.version, blessure.status]).toEqual(['1.0.5', 'draft']);
    expect(blessure.libraryVersions).toEqual({ lq_identite: { version: '2.1.0', status: 'validated' } });
    // Questionnaire validé : versions de référence, même si l'élément a changé depuis.
    ws.library.questions[0]!.version = '2.2.0';
    expect(json(ws, 'dc - 1.0.4 - final.json').libraryVersions).toEqual({ lq_identite: { version: '2.1.0', status: 'validated' } });
    expect(json(ws, 'blessure - 1.0.5 - provisoire.json').libraryVersions.lq_identite.version).toBe('2.2.0');
    expect(json(ws, 'bibliotheque.json').questions[0]).toMatchObject({ version: '2.2.0', status: 'validated' });
    // Sans élément utilisé : pas de `libraryVersions`.
    ws.questionnaires[0]!.nodes = [{ kind: 'info', id: 'n1', text: { fr: 'x' } }];
    expect(json(ws, 'blessure - 1.0.5 - provisoire.json')).not.toHaveProperty('libraryVersions');
  });

  it('export puis réimport : versions, statuts et versions de référence identiques', () => {
    const ws = workspace();
    for (const back of [importFiles(exportFiles(ws)), importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }])]) {
      expect(back.errors).toEqual([]);
      const w = back.workspace!;
      expect(w.questionnaires.map((q) => [q.version, q.status ?? 'draft'])).toEqual([['1.0.5', 'draft'], ['1.0.4', 'validated']]);
      expect(w.questionnaires[1]!.libraryVersions).toEqual(ws.questionnaires[1]!.libraryVersions);
      expect([...w.library.questions, ...w.library.fragments].map((x) => [x.version, x.status])).toEqual([['2.1.0', 'validated'], ['1', 'draft']]);
    }
    const files = exportFiles(ws);
    expect(exportFiles(importFiles(files).workspace!)).toEqual(files);
  });
});
