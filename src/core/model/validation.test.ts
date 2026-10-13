import { describe, expect, it } from 'vitest';
import type { Questionnaire, Workspace } from './documents';
import { isValidated, lockedChanges } from './validation';

const q = (id: string, extra: Partial<Questionnaire> = {}): Questionnaire => ({
  formatVersion: 11, kind: 'questionnaire', id, key: id, title: { fr: id }, start: 'n1',
  nodes: [{ kind: 'info', id: 'n1', text: { fr: 'Bonjour' } }], edges: [], ...extra,
});
const ws = (...qs: Questionnaire[]): Workspace => ({
  project: { formatVersion: 11, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: qs.map((x) => ({ id: x.id, file: `${x.key}.json` })) },
  library: { formatVersion: 11, kind: 'library', questions: [], fragments: [], labelSets: [] },
  questionnaires: qs,
  layouts: qs.map((x) => ({ formatVersion: 11, kind: 'layout', graph: x.id, nodes: { n1: { x: 0, y: 0 } } })),
});
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
const validated = { status: 'validated' as const, validatedAt: '2026-10-13' };

describe('état de validation (EVO-015)', () => {
  it('absent ou « draft » = non validé ; « validated » = validé', () => {
    expect(isValidated(q('a'))).toBe(false);
    expect(isValidated(q('a', { status: 'draft' }))).toBe(false);
    expect(isValidated(q('a', validated))).toBe(true);
    expect(isValidated(undefined)).toBe(false);
  });

  it('aucun verrou sur un formulaire non validé', () => {
    const a = ws(q('a'));
    const b = clone(a);
    b.questionnaires[0]!.nodes = [];
    expect(lockedChanges(a, b)).toEqual([]);
  });

  it('contenu, mise en page, entrée du projet ou suppression d’un formulaire validé : verrou', () => {
    const a = ws(q('a', validated), q('b'));
    const content = clone(a);
    content.questionnaires[0]!.title = { fr: 'Autre' };
    expect(lockedChanges(a, content)).toEqual(['a']);
    const moved = clone(a);
    moved.layouts[0]!.nodes.n1 = { x: 10, y: 0 };
    expect(lockedChanges(a, moved)).toEqual(['a']);
    const file = clone(a);
    file.project.questionnaires[0]!.file = 'x.json';
    expect(lockedChanges(a, file)).toEqual(['a']);
    const removed = clone(a);
    removed.questionnaires.shift();
    expect(lockedChanges(a, removed)).toEqual(['a']);
  });

  it('les autres formulaires restent modifiables', () => {
    const a = ws(q('a', validated), q('b'));
    const b = clone(a);
    b.questionnaires[1]!.nodes = [];
    b.layouts[1]!.nodes = {};
    expect(lockedChanges(a, b)).toEqual([]);
  });

  it('dévalider (seul l’état change) et commentaires de révision : hors verrou', () => {
    const a = ws(q('a', validated));
    const un = clone(a);
    delete un.questionnaires[0]!.status;
    delete un.questionnaires[0]!.validatedAt;
    expect(lockedChanges(a, un)).toEqual([]);
    const commented = clone(a);
    commented.layouts[0]!.comments = [{ node: 'n1', x: 1, y: 2, text: 'À revoir', replies: [] }];
    expect(lockedChanges(a, commented)).toEqual([]);
  });

  it('dévalider en modifiant le contenu dans la même opération : verrou', () => {
    const a = ws(q('a', validated));
    const b = clone(a);
    delete b.questionnaires[0]!.status;
    b.questionnaires[0]!.nodes = [];
    expect(lockedChanges(a, b)).toEqual(['a']);
  });
});
