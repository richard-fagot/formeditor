import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import type { Question, Workspace } from '../model';
import { checkWorkspace, describeIssue, validateAnswer } from './index';

const env = { defaultLang: 'fr' };
const lien = {
  id: 'n1', key: 'lien', label: { fr: 'Lien' }, type: 'single', other: {},
  options: [
    { value: 'seul', label: { fr: 'Seul' } },
    { group: { fr: 'Victime directe' }, code: 'SC', options: [{ value: 'conjoint', label: { fr: 'Conjoint' } }, { value: 'enfant', label: { fr: 'Enfant' } }] },
    { group: { fr: 'Ayant droit' }, options: [{ value: 'conjoint', label: { fr: 'Conjoint' } }, { value: 'ascendant', label: { fr: 'Ascendant' } }] },
  ],
} as Question;
const check = (q: Question, value: unknown, group?: unknown, other?: string) =>
  validateAnswer(q, value, { lien: value }, env, other, '', group).map((e) => e.param);

describe('validateAnswer : réponse = (valeur, groupe) (EVO-003)', () => {
  it('accepte une option de son groupe, refuse une option hors de ce groupe', () => {
    expect(check(lien, 'conjoint', 'SC')).toEqual([]);
    expect(check(lien, 'conjoint', 'Ayant droit')).toEqual([]);
    expect(check(lien, 'enfant', 'Ayant droit')).toEqual(['option']);
    expect(check(lien, 'conjoint', 'XX')).toEqual(['option']);
  });
  it('hors groupe, « Autre » (AUTRE) et groupe non renseigné', () => {
    expect(check(lien, 'seul')).toEqual([]);
    expect(check(lien, 'other', 'AUTRE', 'précision')).toEqual([]);
    expect(check(lien, 'conjoint')).toEqual([]);
  });
  it('choix multiple : liste des groupes parallèle aux valeurs', () => {
    const m = { ...lien, type: 'multiple' } as Question;
    expect(check(m, ['conjoint', 'conjoint'], ['SC', 'Ayant droit'])).toEqual([]);
    expect(check(m, ['seul', 'conjoint'], ['', 'SC'])).toEqual([]);
    expect(check(m, ['enfant', 'ascendant'], ['SC', 'SC'])).toEqual(['option']);
  });
});

describe('validateAnswer : le groupe vient de la réponse elle-même, pas du contexte fusionné', () => {
  it('question : `<clé>_group` du contexte ignoré, groupe passé avec la réponse', () => {
    expect(validateAnswer(lien, 'conjoint', { lien: 'conjoint', lien_group: 'XX' }, env, undefined, '', 'SC')).toEqual([]);
    expect(validateAnswer(lien, 'enfant', { lien: 'enfant', lien_group: 'SC' }, env, undefined, '', 'Ayant droit').map((e) => e.param)).toEqual(['option']);
  });
  it('champ de structure : groupe lu dans l’occurrence, même si le contexte a une clé homonyme', () => {
    const s = { id: 's', key: 'victimes', label: { fr: 'V' }, type: 'structure', repeat: {}, fields: [{ ...lien, id: 'f' }] } as Question;
    const outer = { lien: 'x', lien_group: 'XX' };
    expect(validateAnswer(s, [{ lien: 'conjoint', lien_group: 'SC' }, { lien: 'seul' }], outer, env)).toEqual([]);
    expect(validateAnswer(s, [{ lien: 'enfant', lien_group: 'Ayant droit' }], outer, env).map((e) => `${e.path}:${e.param}`)).toEqual(['victimes[0].lien:option']);
  });
});

describe('vérifications des groupes d’options (§4.6)', () => {
  const ws = exampleWorkspace();
  const codes = (w: Workspace) => checkWorkspace(w).map((i) => `${i.code}@${i.nodeId ?? i.edgeId ?? ''}${i.property ? `:${i.property}` : ''}`);
  const mutate = (f: (q: { options: Record<string, unknown>[] }, w: Workspace) => void) => {
    const w = structuredClone(ws);
    f(w.questionnaires[0]!.nodes.find((n) => n.id === 'n_qualite') as unknown as { options: Record<string, unknown>[] }, w);
    return w;
  };

  it('l’exemple (question groupée, `.groupe` dans une arête et un libellé) ne signale rien', () => {
    expect(checkWorkspace(ws).map((i) => describeIssue(i, 'fr'))).toEqual([]);
  });
  it('identifiant de groupe en double (code, ou libellé sans code)', () => {
    expect(codes(mutate((q) => void (q.options[1]!.code = 'SC')))).toContain('duplicateGroup@n_qualite:options[1]');
    expect(codes(mutate((q) => void (q.options[0] = { ...q.options[0], code: undefined, group: { fr: 'Ayant droit', en: 'x' } })))).toContain('duplicateGroup@n_qualite:options[1]');
  });
  it('code AUTRE réservé, groupe sans option', () => {
    expect(codes(mutate((q) => void (q.options[0]!.code = 'AUTRE')))).toContain('reservedGroupCode@n_qualite:options[0]');
    expect(codes(mutate((q) => void (q.options[1]!.options = [])))).toContain('emptyGroup@n_qualite:options[1]');
  });
  it('traduction manquante d’un libellé de groupe', () => {
    expect(codes(mutate((q) => void (q.options[1]!.group = { fr: 'Ayant droit' })))).toContain('missingTranslation@n_qualite:options[1].group');
  });
  it('`.groupe` après une question qui n’est pas un choix : référence inconnue', () => {
    const w = mutate((_q, x) => void (x.questionnaires[0]!.edges.find((e) => e.id === 'e_qualite_ayant_droit')!.when = "date_sinistre.groupe = 'SC'"));
    expect(checkWorkspace(w).find((i) => i.edgeId === 'e_qualite_ayant_droit')?.params.ref).toBe('date_sinistre.groupe');
  });
  it('vérifie aussi les groupes d’un champ de structure', () => {
    const w = structuredClone(ws);
    const v = w.questionnaires[0]!.nodes.find((n) => n.id === 'n_victimes') as unknown as { fields: Record<string, unknown>[] };
    v.fields.push({ id: 'f_g', key: 'lien', label: { fr: 'Lien', en: 'Link' }, type: 'single', options: [{ group: { fr: 'G', en: 'G' }, code: 'AUTRE', options: [] }] });
    expect(codes(w)).toEqual(expect.arrayContaining(['reservedGroupCode@n_victimes:fields.lien.options[0]', 'emptyGroup@n_victimes:fields.lien.options[0]']));
  });
});
