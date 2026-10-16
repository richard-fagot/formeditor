import { describe, expect, it } from 'vitest';
import type { Fragment, LabelSet, Questionnaire, Versioned, Workspace } from './documents';
import type { GraphNode } from './node';
import type { Question } from './question';
import { unusedCount, unusedLibraryItems } from './usage';

const lq = (id: string, extra: Partial<Question> & Versioned = {}): Question & Versioned => ({ id, key: id, label: { fr: id }, type: 'text', ...extra }) as Question & Versioned;
const ref = (id: string, to: string): GraphNode => ({ kind: 'question', id, ref: to });
const call = (id: string, to: string): GraphNode => ({ kind: 'fragment', id, ref: to, alias: id });
const bool = (id: string, labelSet: string): GraphNode => ({ kind: 'question', id, key: id, label: { fr: id }, type: 'boolean', labelSet });
const frg = (id: string, nodes: GraphNode[], extra: Versioned = {}): Fragment & Versioned => ({ id, key: id, title: { fr: id }, nodes, edges: [], ...extra });
const qn = (id: string, nodes: GraphNode[], extra: Partial<Questionnaire> = {}): Questionnaire => ({
  formatVersion: 15, kind: 'questionnaire', id, key: id, title: { fr: id }, start: nodes[0]?.id ?? '', nodes, edges: [], ...extra,
});
const ls = (id: string): LabelSet => ({ id, key: id, kind: 'boolean', yes: { fr: 'Oui' }, no: { fr: 'Non' } });

function ws(questionnaires: Questionnaire[], questions: Question[], fragments: Fragment[], labelSets: LabelSet[] = []): Workspace {
  return {
    project: { formatVersion: 15, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [] },
    library: { formatVersion: 15, kind: 'library', labelSets, questions, fragments },
    questionnaires,
    layouts: [],
  };
}

describe('éléments de bibliothèque inutilisés (EVO-028)', () => {
  it('EVO-028-001 — question inutilisée quand aucun questionnaire ni fragment ne la référence', () => {
    const w = ws([qn('q', [ref('n1', 'a')])], [lq('a'), lq('b'), lq('c')], [frg('f', [ref('m1', 'c')]), frg('g', [call('m2', 'f')])]);
    expect(unusedLibraryItems(w).questions).toEqual(['b']);
  });

  it('EVO-028-002 — fragment inutilisé quand aucun questionnaire ni fragment ne l’appelle (un appel de lui-même compte)', () => {
    const w = ws([qn('q', [call('n1', 'f')])], [], [frg('f', [call('m1', 'g')]), frg('g', []), frg('h', []), frg('s', [call('m2', 's')])]);
    expect(unusedLibraryItems(w).fragments).toEqual(['h']);
  });

  it('EVO-028-003 — jeu de libellés inutilisé quand aucune question booléenne (locale, de bibliothèque, champ de structure) ne l’utilise', () => {
    const structure = (id: string, labelSet: string) => lq(id, { type: 'structure', fields: [{ id: `${id}_b`, key: 'b', label: { fr: 'b' }, type: 'boolean', labelSet }] } as Partial<Question>);
    const localStructure: GraphNode = { kind: 'question', ...(structure('st', 'l4') as Question) } as GraphNode;
    const w = ws(
      [qn('q', [bool('n1', 'l1'), localStructure])],
      [lq('bq', { type: 'boolean', labelSet: 'l2' } as Partial<Question>), structure('sb', 'l3')],
      [frg('f', [bool('m1', 'l5')])],
      [ls('l1'), ls('l2'), ls('l3'), ls('l4'), ls('l5'), ls('l6')],
    );
    expect(unusedLibraryItems(w).labelSets).toEqual(['l6']);
  });

  it('EVO-028-004 — seul l’usage direct compte : un élément référencé par un fragment inutilisé est utilisé', () => {
    const w = ws([], [lq('a', { type: 'boolean', labelSet: 'l1' } as Partial<Question>)], [frg('f', [ref('m1', 'a'), call('m2', 'g'), bool('m3', 'l2')]), frg('g', [])], [ls('l1'), ls('l2')]);
    expect(unusedLibraryItems(w)).toEqual({ questions: [], fragments: ['f'], labelSets: [] });
  });

  it('EVO-028-005 — le statut validé ou provisoire n’entre pas dans la définition', () => {
    const w = ws(
      [qn('q', [ref('n1', 'a'), call('n2', 'f')], { status: 'validated' })],
      [lq('a', { status: 'validated' }), lq('b', { status: 'validated' }), lq('c', { status: 'draft' })],
      [frg('f', [], { status: 'draft' }), frg('g', [], { status: 'validated' })],
    );
    expect(unusedLibraryItems(w)).toEqual({ questions: ['b', 'c'], fragments: ['g'], labelSets: [] });
  });

  it('EVO-028-011 — compte total ; nul quand tout est utilisé', () => {
    expect(unusedCount(unusedLibraryItems(ws([], [lq('a')], [frg('f', [])], [ls('l')])))).toBe(3);
    expect(unusedCount(unusedLibraryItems(ws([qn('q', [ref('n1', 'a')])], [lq('a')], [])))).toBe(0);
  });
});
