import { describe, expect, it } from 'vitest';
import type { Workspace } from '../model';
import { buildContext, countryPath, next, prune, setAnswer, start, withAnswer, type RuntimeInput } from './index';

/** Téléphone, puis une fin belge si `telephone.pays = 'BE'`, sinon une question `apres`. */
function input(): RuntimeInput {
  const ws = {
    project: { formatVersion: 6, kind: 'project', id: 'p', name: 'P', languages: ['fr'], defaultLanguage: 'fr', questionnaires: [], systemState: [], scenarios: [] },
    library: { formatVersion: 6, kind: 'library', questions: [], fragments: [], labelSets: [] },
    questionnaires: [{
      formatVersion: 6, kind: 'questionnaire', id: 'q', key: 'q', title: { fr: 'Q' }, start: 'n1',
      nodes: [
        { kind: 'question', id: 'n1', key: 'telephone', label: { fr: 'Tél' }, type: 'phone' },
        { kind: 'question', id: 'n2', key: 'apres', label: { fr: 'Après' }, type: 'text' },
        { kind: 'end', id: 'be', message: { fr: 'BE' } },
      ],
      edges: [{ id: 'e1', from: 'n1', to: 'be', when: "telephone.pays = 'BE'" }, { id: 'e2', from: 'n1', to: 'n2' }],
    }],
    layouts: [],
  } as unknown as Workspace;
  return { ws, questionnaireId: 'q', sys: {}, env: { defaultLang: 'fr' } };
}

describe('pays d’un téléphone ou d’une adresse (EVO-007)', () => {
  it('rangé sous `<clé>_pays`, lu par `cle.pays` dans la navigation', () => {
    const inp = input();
    const s = setAnswer(inp, start(inp), '+32470123456', undefined, undefined, undefined, 'BE');
    expect(s.answers).toEqual({ telephone: '+32470123456', telephone_pays: 'BE' });
    expect(countryPath(['souscripteur', 'telephone'])).toEqual(['souscripteur', 'telephone_pays']);
    expect(next(inp, s).history.at(-1)).toBe('be');
    expect(buildContext(inp, s.answers).telephone_pays).toBe('BE');
  });
  it('effacé par une réponse sans pays et avec la réponse hors chemin', () => {
    const inp = input();
    const s = setAnswer(inp, start(inp), '+32470123456', undefined, undefined, undefined, 'BE');
    expect(setAnswer(inp, s, null).answers).toEqual({ telephone: null });
    const orphan = withAnswer(withAnswer({}, ['apres'], 'x'), ['apres_pays'], 'FR');
    expect(prune(inp, { ...orphan, telephone: '+32470123456', telephone_pays: 'BE' })).toEqual({ telephone: '+32470123456', telephone_pays: 'BE' });
  });
});
