import { describe, expect, it } from 'vitest';
import type { Question, Workspace } from '../model';
import { buildContext, dontKnowAnswer, dontKnowPath, getAnswer, next, prune, setAnswer, start, summaryEntries, type RuntimeInput } from './index';

/** Une question, puis une fin si « Ne sais pas » est choisie, une autre sinon ; `apres` hors chemin selon la réponse. */
function inputOf(q: Question): RuntimeInput {
  const ws = {
    project: { formatVersion: 5, kind: 'project', id: 'p', name: 'P', languages: ['fr'], defaultLanguage: 'fr', questionnaires: [], systemState: [], scenarios: [] },
    library: { formatVersion: 5, kind: 'library', questions: [], fragments: [], labelSets: [] },
    questionnaires: [{
      formatVersion: 5, kind: 'questionnaire', id: 'q', key: 'q', title: { fr: 'Q' }, start: 'n1',
      nodes: [
        { kind: 'question', ...q },
        { kind: 'question', id: 'n2', key: 'apres', label: { fr: 'Après' }, type: 'text' },
        { kind: 'end', id: 'nsp', message: { fr: 'NSP' }, outcome: 'nsp' },
        { kind: 'end', id: 'connu', message: { fr: 'Connu' }, outcome: 'connu' },
      ],
      edges: [
        { id: 'e1', from: 'n1', to: 'nsp', when: `${q.key}.nsp` },
        { id: 'e2', from: 'n1', to: 'n2' },
        { id: 'e3', from: 'n2', to: 'connu' },
      ],
    }],
    layouts: [],
  } as unknown as Workspace;
  return { ws, questionnaireId: 'q', sys: {}, env: { defaultLang: 'fr' } };
}
const date: Question = { id: 'n1', key: 'date', label: { fr: 'Date' }, type: 'date', required: true, dontKnow: {} };
const multiple: Question = { id: 'n1', key: 'liens', label: { fr: 'Liens' }, type: 'multiple', options: [{ value: 'a', label: { fr: 'A' } }], dontKnow: {} };

describe('réponse « Ne sais pas » (EVO-006)', () => {
  it('valeur et groupe d’une réponse « Ne sais pas » selon le type', () => {
    expect(dontKnowAnswer(date)).toEqual({ value: null });
    expect(dontKnowAnswer({ ...multiple, type: 'single' } as Question)).toEqual({ value: null, group: 'NSP' });
    expect(dontKnowAnswer(multiple)).toEqual({ value: [], group: 'NSP' });
    expect(dontKnowPath(['decl', 'date'])).toEqual(['decl', 'date_nsp']);
  });

  it('marqueur `<clé>_nsp` à côté d’une valeur vide ; `cle` vide et `cle.nsp` vrai ; le parcours avance', () => {
    const inp = inputOf(date);
    const s = setAnswer(inp, start(inp), null, undefined, undefined, true);
    expect(s.answers).toEqual({ date: null, date_nsp: true });
    expect(buildContext(inp, s.answers)).toEqual({ date_nsp: true, sys: {} });
    const n = next(inp, s);
    expect(n.history).toEqual(['n1', 'nsp']);
    expect(summaryEntries(inp, n)[0]).toMatchObject({ value: null, dontKnow: true });
  });

  it('choix multiple : liste vide, groupe `NSP`', () => {
    const inp = inputOf(multiple);
    const a = dontKnowAnswer(multiple);
    const s = setAnswer(inp, start(inp), a.value, undefined, a.group, true);
    expect(s.answers).toEqual({ liens: [], liens_group: 'NSP', liens_nsp: true });
    expect(next(inp, s).history).toEqual(['n1', 'nsp']);
  });

  it('une autre réponse efface le marqueur ; `cle.nsp` est alors faux', () => {
    const inp = inputOf(date);
    let s = setAnswer(inp, start(inp), null, undefined, undefined, true);
    s = setAnswer(inp, s, '2026-01-01');
    expect(getAnswer(s.answers, ['date_nsp'])).toBeUndefined();
    expect(next(inp, s).history).toEqual(['n1', 'n2']);
  });

  it('le marqueur est effacé avec la réponse hors chemin', () => {
    const inp = inputOf(date);
    const answers = prune(inp, { date: '2026-01-01', apres: null, apres_nsp: true });
    expect(answers).toEqual({ date: '2026-01-01', apres: null, apres_nsp: true });
    expect(prune(inp, { date: null, date_nsp: true, apres: null, apres_nsp: true })).toEqual({ date: null, date_nsp: true });
  });
});
