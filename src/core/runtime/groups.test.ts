import { describe, expect, it } from 'vitest';
import type { ChoiceEntry, ChoiceGroup, MultipleChoiceQuestion, SingleChoiceQuestion, Workspace } from '../model';
import { choiceOptions, getAnswer, groupPath, next, prune, setAnswer, start, summaryEntries, type RuntimeInput } from './index';

/** Exemple d'EVO-003. */
const groups: ChoiceEntry[] = [
  { group: { fr: 'Victime directe', en: 'Direct victim' }, code: 'SC', options: [
    { value: 'conjoint', label: { fr: 'Conjoint' } }, { value: 'enfant', label: { fr: 'Enfant' } },
  ] },
  { group: { fr: 'Ayant droit', en: 'Beneficiary' }, options: [
    { value: 'conjoint', label: { fr: 'Conjoint' } }, { value: 'ascendant', label: { fr: 'Ascendant' } },
  ] },
];
const single: SingleChoiceQuestion = { id: 'n1', key: 'lien', label: { fr: 'Lien' }, type: 'single', options: groups };
const env = { defaultLang: 'fr' };
const pairs = (q: SingleChoiceQuestion | MultipleChoiceQuestion, ctx: Record<string, unknown> = {}) =>
  choiceOptions(q, ctx, env).map((o) => `${o.group?.id ?? ''}/${o.value}`);

describe('choiceOptions : groupes', () => {
  it('déploie les groupes dans l’ordre ; identifiant = code, sinon libellé dans la langue par défaut', () => {
    expect(pairs(single)).toEqual(['SC/conjoint', 'SC/enfant', 'Ayant droit/conjoint', 'Ayant droit/ascendant']);
    expect(choiceOptions(single, {}, env)[0]!.group!.label).toEqual((groups[0] as ChoiceGroup).group);
  });

  it('une même valeur dans deux groupes reste distincte ; un doublon dans un groupe est écarté', () => {
    const dup = { ...single, options: [{ group: { fr: 'G' }, options: [{ value: 'a', label: { fr: 'A' } }, { value: 'a', label: { fr: 'A2' } }] }] };
    expect(pairs(dup)).toEqual(['G/a']);
  });

  it('hors groupe avant le premier groupe ; libellé interpolé ; langue par défaut', () => {
    const q = { ...single, options: [{ value: 'x', label: { fr: 'X' } }, { group: { en: 'Group {sys.n}', fr: 'Groupe {sys.n}' }, options: [{ value: 'y', label: { fr: 'Y' } }] }] };
    expect(pairs(q, { sys: { n: 2 } })).toEqual(['/x', 'Groupe 2/y']);
  });

  it('condition du groupe et des options ; entrée dynamique dans un groupe', () => {
    const q = { ...single, options: [
      { group: { fr: 'A' }, when: 'sys.ok = true', options: [{ value: 'a', label: { fr: 'A' } }] },
      { group: { fr: 'B' }, options: [{ value: 'b', label: { fr: 'B' }, when: 'false' }, { from: 'sys.liste' }] },
    ] };
    expect(pairs(q, { sys: { ok: true, liste: ['l1'] } })).toEqual(['A/a', 'B/l1']);
    expect(pairs(q, { sys: { ok: false } })).toEqual([]);
  });
});

/** Questionnaire d'une question groupée, suivie d'une fin conditionnée par le groupe. */
function wsOf(q: SingleChoiceQuestion | MultipleChoiceQuestion): Workspace {
  return {
    project: { formatVersion: 3, kind: 'project', id: 'p', name: 'P', languages: ['fr'], defaultLanguage: 'fr', questionnaires: [], systemState: [], scenarios: [] },
    library: { formatVersion: 3, kind: 'library', questions: [], fragments: [], labelSets: [] },
    questionnaires: [{
      formatVersion: 3, kind: 'questionnaire', id: 'q', key: 'q', title: { fr: 'Q' }, start: 'n1',
      nodes: [{ kind: 'question', ...q }, { kind: 'end', id: 'sc', message: { fr: 'SC' }, outcome: 'sc' }, { kind: 'end', id: 'autre', message: { fr: 'X' }, outcome: 'autre' }],
      edges: [{ id: 'e1', from: 'n1', to: 'sc', when: "lien.groupe = 'SC' or 'SC' in lien.groupe" }, { id: 'e2', from: 'n1', to: 'autre' }],
    }],
    layouts: [],
  } as unknown as Workspace;
}

describe('réponse : valeur et groupe', () => {
  const input = (q: SingleChoiceQuestion | MultipleChoiceQuestion): RuntimeInput => ({ ws: wsOf(q), questionnaireId: 'q', sys: {}, env });

  it('le groupe est rangé sous `<clé>_group` ; `ma_question.groupe` le lit', () => {
    const inp = input(single);
    let s = setAnswer(inp, start(inp), 'conjoint', undefined, 'SC');
    expect(s.answers).toEqual({ lien: 'conjoint', lien_group: 'SC' });
    expect(groupPath(['decl', 'lien'])).toEqual(['decl', 'lien_group']);
    expect(next(inp, s).history).toEqual(['n1', 'sc']);
    s = setAnswer(inp, start(inp), 'conjoint', undefined, 'Ayant droit');
    expect(next(inp, s).history).toEqual(['n1', 'autre']);
    expect(summaryEntries(inp, next(inp, s))[0]).toMatchObject({ value: 'conjoint', group: 'Ayant droit' });
  });

  it('hors groupe : clé absente ; une nouvelle réponse remplace le groupe', () => {
    const inp = input(single);
    let s = setAnswer(inp, start(inp), 'conjoint', undefined, 'SC');
    s = setAnswer(inp, s, 'x');
    expect(getAnswer(s.answers, ['lien_group'])).toBeUndefined();
  });

  it('choix multiple : liste des groupes parallèle aux valeurs', () => {
    const multiple: MultipleChoiceQuestion = { ...single, type: 'multiple' };
    const inp = input(multiple);
    const s = setAnswer(inp, start(inp), ['conjoint', 'conjoint'], undefined, ['SC', 'Ayant droit']);
    expect(s.answers.lien_group).toEqual(['SC', 'Ayant droit']);
    expect(next(inp, s).history).toEqual(['n1', 'sc']);
  });

  it('l’effacement hors chemin efface aussi le groupe', () => {
    const inp = input(single);
    const ws = inp.ws;
    ws.questionnaires[0]!.start = 'sc';
    expect(prune(inp, { lien: 'conjoint', lien_group: 'SC' })).toEqual({});
  });
});
