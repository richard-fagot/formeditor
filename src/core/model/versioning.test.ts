import { describe, expect, it } from 'vitest';
import type { Fragment, Questionnaire, Workspace } from './documents';
import type { GraphNode } from './node';
import type { Question } from './question';
import {
  isItemValidated, itemUsers, libraryItemOf, provisionalItems, usedLibraryItems, versionAlerts, versionSnapshot, type Versioned,
} from './versioning';

const lq = (id: string, extra: Versioned = {}): Question & Versioned => ({ id, key: id, label: { fr: id }, type: 'text', ...extra }) as Question & Versioned;
const ref = (id: string, to: string): GraphNode => ({ kind: 'question', id, ref: to });
const call = (id: string, to: string): GraphNode => ({ kind: 'fragment', id, ref: to, alias: id });
const frg = (id: string, nodes: GraphNode[], extra: Versioned = {}): Fragment & Versioned => ({ id, key: id, title: { fr: id }, nodes, edges: [], ...extra });
const qn = (id: string, nodes: GraphNode[], extra: Partial<Questionnaire> = {}): Questionnaire => ({
  formatVersion: 14, kind: 'questionnaire', id, key: id, title: { fr: id }, start: nodes[0]?.id ?? '', nodes, edges: [], ...extra,
});

/** `identite` (question, 2.1.0 validée), `tel` (question provisoire), fragment `ident` (1.0.0) qui utilise `tel`. */
function workspace(): Workspace {
  const qs = [
    qn('dc', [ref('n1', 'identite'), call('n2', 'ident')], { status: 'validated', version: '1.0.4', libraryVersions: {
      identite: { version: '2.1.0', status: 'validated' }, ident: { version: '1.0.0', status: 'validated' }, tel: { version: '', status: 'draft' },
    } }),
    qn('blessure', [ref('m1', 'identite')], { version: '1.0.5' }),
    qn('autre', [{ kind: 'info', id: 'i1', text: { fr: 'x' } }]),
  ];
  return {
    project: { formatVersion: 14, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: {
      formatVersion: 14, kind: 'library', labelSets: [],
      questions: [lq('identite', { version: '2.1.0', status: 'validated' }), lq('tel')],
      fragments: [frg('ident', [ref('f1', 'tel'), call('f2', 'ident')], { version: '1.0.0', status: 'validated' })],
    },
    questionnaires: qs,
    layouts: [],
  };
}
const dc = (ws: Workspace) => ws.questionnaires[0]!;

describe('versionning (EVO-022)', () => {
  it('éléments utilisés : directs puis indirects (fragments imbriqués), sans doublon ni boucle', () => {
    const ws = workspace();
    expect(usedLibraryItems(ws.library, dc(ws))).toEqual([
      { kind: 'question', id: 'identite' }, { kind: 'fragment', id: 'ident' }, { kind: 'question', id: 'tel' },
    ]);
    expect(usedLibraryItems(ws.library, ws.questionnaires[2]!)).toEqual([]);
    expect(libraryItemOf(ws.library, { kind: 'fragment', id: 'ident' })?.key).toBe('ident');
    expect(libraryItemOf(ws.library, { kind: 'question', id: 'absent' })).toBeUndefined();
  });

  it('versions de référence : version (vide si absente) et statut de chaque élément utilisé', () => {
    const ws = workspace();
    expect(versionSnapshot(ws.library, dc(ws))).toEqual({
      identite: { version: '2.1.0', status: 'validated' }, ident: { version: '1.0.0', status: 'validated' }, tel: { version: '', status: 'draft' },
    });
    expect(isItemValidated(ws.library.questions[0])).toBe(true);
    expect(isItemValidated(ws.library.questions[1])).toBe(false);
  });

  it('alerte « ancienne → nouvelle » sur un questionnaire validé quand la version d’un élément utilisé change', () => {
    const ws = workspace();
    expect(versionAlerts(ws.library, dc(ws))).toEqual([]);
    ws.library.questions[0]!.version = '2.2.0';
    expect(versionAlerts(ws.library, dc(ws))).toEqual([{ kind: 'question', id: 'identite', key: 'identite', from: '2.1.0', to: '2.2.0' }]);
    // Revalidation : nouvelles versions de référence, plus d'alerte.
    dc(ws).libraryVersions = versionSnapshot(ws.library, dc(ws));
    expect(versionAlerts(ws.library, dc(ws))).toEqual([]);
  });

  it('pas d’alerte sur un questionnaire provisoire ; élément absent des références = référence vide (projet antérieur)', () => {
    const ws = workspace();
    ws.library.questions[0]!.version = '9';
    expect(versionAlerts(ws.library, ws.questionnaires[1]!)).toEqual([]);
    delete dc(ws).libraryVersions;
    ws.library.questions[0]!.version = undefined;
    ws.library.fragments[0]!.version = undefined;
    expect(versionAlerts(ws.library, dc(ws))).toEqual([]);
    ws.library.questions[1]!.version = '1.0';
    expect(versionAlerts(ws.library, dc(ws))).toEqual([{ kind: 'question', id: 'tel', key: 'tel', from: '', to: '1.0' }]);
  });

  it('questionnaires qui utilisent un élément, directement ou par un fragment', () => {
    const ws = workspace();
    expect(itemUsers(ws, { kind: 'question', id: 'identite' }).map((q) => q.id)).toEqual(['dc', 'blessure']);
    expect(itemUsers(ws, { kind: 'question', id: 'tel' }).map((q) => q.id)).toEqual(['dc']);
    expect(itemUsers(ws, { kind: 'fragment', id: 'ident' }).map((q) => q.id)).toEqual(['dc']);
  });

  it('éléments provisoires utilisés', () => {
    const ws = workspace();
    expect(provisionalItems(ws.library, dc(ws)).map((i) => i.id)).toEqual(['tel']);
    expect(provisionalItems(ws.library, ws.questionnaires[1]!)).toEqual([]);
  });
});
