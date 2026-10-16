import { describe, expect, it } from 'vitest';
import type { Issue } from '../../core/validation';
import { exampleWorkspace } from '../../../tests/reference/example';
import { issuesOf, selectIssues } from './index';

const issue = (kind: Issue['owner']['kind'], id: string, code: Issue['code'], lang?: string): Issue =>
  ({ code, severity: 'warning', owner: { kind, id }, params: lang ? { lang } : {} }) as Issue;

const all = [
  issue('questionnaire', 'q1', 'missingStart'),
  issue('questionnaire', 'q1', 'missingTranslation', 'en'),
  issue('questionnaire', 'q2', 'unreachable'),
  issue('fragment', 'f1', 'missingTranslation', 'fr, en'),
  issue('system', 'x', 'invalidKey'),
];

describe('app/issues', () => {
  it('selectIssues : propriétaire (genre seul ou genre et id), code, ids, langue ; ordre conservé', () => {
    expect(selectIssues(all, {})).toEqual(all);
    expect(selectIssues(all, { owner: { kind: 'questionnaire', id: 'q1' } })).toEqual([all[0], all[1]]);
    expect(selectIssues(all, { owner: { kind: 'system' } })).toEqual([all[4]]);
    expect(selectIssues(all, { code: 'missingTranslation' })).toEqual([all[1], all[3]]);
    expect(selectIssues(all, { code: 'missingTranslation', lang: 'fr' })).toEqual([all[3]]);
    expect(selectIssues(all, { ownerIds: ['q2', 'f1'] })).toEqual([all[2], all[3]]);
    expect(selectIssues(all, { owner: { kind: 'fragment', id: 'q1' } })).toEqual([]);
  });

  it('issuesOf : mémorisé sur la référence du projet', () => {
    const ws = exampleWorkspace();
    expect(issuesOf(ws)).toBe(issuesOf(ws));
    expect(issuesOf(exampleWorkspace())).not.toBe(issuesOf(ws));
  });
});
