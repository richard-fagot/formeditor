import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import type { Question, Workspace } from '../model';
import { checkWorkspace, describeIssue, messageParams, validateAnswer, type Issue } from './index';

const env = { today: '2026-10-10' };
const params = (q: Question, value: unknown, ctx: Record<string, unknown> = {}, other?: string) =>
  validateAnswer(q, value, { ...ctx, [q.key]: value }, env, other).map((e) => `${e.path}:${e.param}`);

describe('validateAnswer', () => {
  const text: Question = { id: 't', key: 't', label: { fr: 'T' }, type: 'text', required: true, minLength: 3, pattern: '^[a-z]+$' };
  it('obligatoire, longueur, motif', () => {
    expect(params(text, '')).toEqual([':required']);
    expect(params(text, 'ab')).toEqual([':minLength']);
    expect(params(text, 'ABC')).toEqual([':pattern']);
    expect(params(text, 'abc')).toEqual([]);
    expect(params({ ...text, required: 'sys.x = 1' }, '', { sys: { x: 2 } })).toEqual([]);
  });
  it('dates : bornes littérales et calculées, message personnalisé', () => {
    const d: Question = { id: 'd', key: 'd', label: { fr: 'D' }, type: 'date', min: '2020-01-01', max: '$today()', messages: { max: { fr: 'Pas dans le futur' } } };
    expect(params(d, '2019-12-31')).toEqual([':min']);
    expect(params(d, '2026-10-11')).toEqual([':max']);
    expect(validateAnswer(d, '2026-10-11', {}, env)[0]!.message).toEqual({ fr: 'Pas dans le futur' });
    expect(params(d, '2026-02-30')).toEqual([':format']);
  });
  it('nombres : nature, bornes, décimales', () => {
    const n: Question = { id: 'n', key: 'n', label: { fr: 'N' }, type: 'number', numberKind: 'natural', max: 'sys.max', decimals: 0 };
    expect(params(n, -1, { sys: { max: 10 } })).toEqual([':numberKind']);
    expect(params(n, 11, { sys: { max: 10 } })).toEqual([':max']);
    expect(params({ ...n, numberKind: 'real', decimals: 1 }, 1.25, { sys: { max: 10 } })).toEqual([':decimals']);
  });
  it('choix multiple et « Autre »', () => {
    const m: Question = { id: 'm', key: 'm', label: { fr: 'M' }, type: 'multiple', options: [{ value: 'a', label: { fr: 'A' } }], minSelected: 2, other: { detailRequired: true } };
    expect(params(m, ['a'])).toEqual([':minSelected']);
    expect(params(m, ['a', 'other'])).toEqual([':otherDetail']);
    expect(params(m, ['a', 'other'], {}, 'précision')).toEqual([]);
  });
  it('structure répétable : occurrences, champs visibles seulement', () => {
    const s: Question = {
      id: 's', key: 'v', label: { fr: 'V' }, type: 'structure', repeat: { min: 1, max: 2 },
      fields: [
        { id: 'a', key: 'h', label: { fr: 'H' }, type: 'boolean', required: true },
        { id: 'b', key: 'j', label: { fr: 'J' }, type: 'number', required: true, when: 'h = true' },
      ],
    };
    // Facultative laissée vide (`[]`) : `repeat.min` ne s'applique pas ; obligatoire : il s'applique.
    expect(params(s, [])).toEqual([]);
    expect(params({ ...s, required: true }, [])).toEqual([':minOccurrences']);
    expect(params(s, [{ h: false }, { h: true }])).toEqual(['v[1].j:required']);
    expect(params(s, [{ h: false }, { h: false }, { h: false }])).toEqual([':maxOccurrences']);
  });
  it('contrainte libre', () => {
    const q: Question = { id: 'x', key: 'x', label: { fr: 'X' }, type: 'number', constraints: [{ rule: 'x < y' }] };
    expect(params(q, 5, { y: 3 })).toEqual([':constraints[0]']);
    expect(params(q, 1, { y: 3 })).toEqual([]);
  });
});

describe('checkWorkspace', () => {
  const ws = exampleWorkspace();
  const codes = (w: Workspace) => checkWorkspace(w).map((i) => `${i.code}@${i.nodeId ?? i.edgeId ?? ''}`);
  const mutate = (f: (w: Workspace) => void) => {
    const w = structuredClone(ws);
    f(w);
    return w;
  };
  const decl = (w: Workspace) => w.questionnaires[0]!;

  it('ne signale rien sur l’exemple', () => {
    expect(checkWorkspace(ws).map((i) => describeIssue(i, 'fr'))).toEqual([]);
  });
  it('référence inconnue, expression invalide', () => {
    const w = mutate((x) => {
      decl(x).edges.find((e) => e.id === 'e_date_victimes')!.when = "type_sinistr = 'accident'";
      decl(x).edges.find((e) => e.id === 'e_lien_victimes')!.when = 'type_sinistre = ';
    });
    expect(codes(w)).toEqual(expect.arrayContaining(['unknownReference@e_date_victimes', 'invalidExpression@e_lien_victimes']));
  });
  it('clé en double, nœud inaccessible, sans sortie, sans « sinon »', () => {
    const w = mutate((x) => {
      const q = decl(x);
      (q.nodes.find((n) => n.id === 'n_canaux') as { key: string }).key = 'circonstances';
      q.edges = q.edges.filter((e) => !['e_intro_type', 'e_tel_synthese', 'e_date_montant'].includes(e.id));
    });
    expect(codes(w)).toEqual(expect.arrayContaining([
      'duplicateKey@n_canaux', 'unreachable@n_type', 'deadEnd@n_tel', 'noElse@n_date',
    ]));
  });
  it('questionnaire vide : aucun problème', () => {
    const empty = mutate((x) => Object.assign(decl(x), { start: '', nodes: [], edges: [] }));
    expect(checkWorkspace(empty).filter((i) => i.owner.kind === 'questionnaire')).toEqual([]);
  });
  it('départ absent signalé dès qu’il y a des nœuds', () => {
    const noStart = mutate((x) => void (decl(x).start = ''));
    expect(codes(noStart)).toContain('missingStart@');
  });
  it('boucle sans sortie possible', () => {
    const w = mutate((x) => {
      decl(x).edges = decl(x).edges.filter((e) => e.id !== 'e_confirmation_fin');
      decl(x).edges.find((e) => e.id === 'e_confirmation_retour')!.when = undefined;
    });
    expect(codes(w)).toContain('loopWithoutExit@n_type');
  });
  it('référence pas garantie d’avoir été posée', () => {
    const w = mutate((x) => {
      decl(x).edges.find((e) => e.id === 'e_montant_tiers')!.when = "sinistre_lie = 'aucun'";
      decl(x).edges.splice(11, 0, { id: 'e_montant_tiers_sinon', from: 'n_montant', to: 'n_tiers' });
    });
    expect(codes(w)).toContain('notGuaranteed@e_montant_tiers');
  });
  it('traduction manquante, élément de bibliothèque introuvable', () => {
    const w = mutate((x) => {
      (decl(x).nodes.find((n) => n.id === 'n_tiers') as { label: Record<string, string> }).label = { fr: 'Tiers ?' };
      (decl(x).nodes.find((n) => n.id === 'n_bloc_tiers') as { ref: string }).ref = 'blk_absent';
    });
    expect(codes(w)).toEqual(expect.arrayContaining(['missingTranslation@n_tiers', 'libraryMissing@n_bloc_tiers']));
  });
  it('décrit chaque problème en français et en anglais', () => {
    const issue: Issue = { code: 'unknownReference', severity: 'error', owner: { kind: 'questionnaire', id: 'q' }, params: { ref: 'x' } };
    expect(describeIssue(issue, 'fr')).toContain('x');
    expect(describeIssue(issue, 'en')).toContain('x');
  });
});

describe('options visibles et messages paramétrables', () => {
  const choice = {
    id: 'c', key: 'c', label: { fr: 'c' }, type: 'single', required: true,
    options: [{ value: 'a', label: { fr: 'A' } }, { value: 'b', label: { fr: 'B' }, when: 'sys.x = 1' }],
    source: { from: 'sys.l' }, other: {},
  } as Question;
  it('refuse une valeur qui n’est plus parmi les options visibles (statiques, dynamiques, « Autre »)', () => {
    const ctx = { sys: { x: 2, l: ['d'] } };
    expect(validateAnswer(choice, 'a', ctx)).toEqual([]);
    expect(validateAnswer(choice, 'd', ctx)).toEqual([]);
    expect(validateAnswer(choice, 'other', ctx, {}, 'précision')).toEqual([]);
    expect(validateAnswer(choice, 'b', ctx).map((e) => e.param)).toEqual(['option']);
    expect(validateAnswer(choice, 'b', { sys: { x: 1 } })).toEqual([]);
    const multiple = { ...choice, type: 'multiple' } as Question;
    expect(validateAnswer(multiple, ['a', 'b'], ctx).map((e) => e.param)).toEqual(['option']);
  });
  it('liste les paramètres dont le message est personnalisable, selon la question', () => {
    expect(messageParams({ id: 't', key: 't', label: {}, type: 'text', maxLength: 3 } as Question)).toEqual(['required', 'maxLength']);
    expect(messageParams({ ...choice, other: { detailRequired: true } } as Question)).toEqual(['required', 'option', 'otherDetail']);
    expect(messageParams({ id: 'd', key: 'd', label: {}, type: 'date' } as Question)).toEqual(['required', 'format']);
    expect(messageParams({ id: 's', key: 's', label: {}, type: 'structure', fields: [], repeat: { min: 1 } } as Question)).toEqual(['required', 'minOccurrences']);
  });
  it('applique contraintes libres et messages d’un champ de structure', () => {
    const s = {
      id: 's', key: 'v', label: { fr: 'v' }, type: 'structure', fields: [{
        id: 'f', key: 'age', label: { fr: 'âge' }, type: 'number', min: 0, messages: { min: { fr: 'Âge positif' } },
        constraints: [{ rule: 'age < 150', message: { fr: 'Trop vieux' } }],
      }],
    } as Question;
    expect(validateAnswer(s, { age: -1 }, {}).map((e) => [e.path, e.message.fr])).toEqual([['v.age', 'Âge positif']]);
    expect(validateAnswer(s, { age: 200 }, {}).map((e) => [e.path, e.message.fr])).toEqual([['v.age', 'Trop vieux']]);
  });
});
