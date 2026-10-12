import { describe, expect, it } from 'vitest';
import type { Question, StructureQuestion, Workspace } from '../model';
import { checkWorkspace, formatErrors, messageParams, validateAnswer } from './index';

const q = (type: string, extra: Record<string, unknown> = {}) => ({ id: 'n', key: 'champ', label: { fr: 'Champ' }, type, ...extra }) as Question;
const params = (question: Question, value: unknown, ctx: Record<string, unknown> = {}) =>
  validateAnswer(question, value, { ...ctx, [question.key]: value }).map((e) => e.param);

describe('contrôles intégrés des types mail, téléphone, adresse, civilité (EVO-007)', () => {
  it('mail : message par défaut du contrôle ; la page ne peut pas être validée', () => {
    const errors = validateAnswer(q('email'), 'jean@@exemple.fr', {});
    expect(errors).toEqual([{ path: '', param: 'email', message: { fr: 'Adresse mail invalide.', en: 'Invalid email address.' } }]);
    expect(params(q('email'), ' Jean.Dupont@Exemple.FR ')).toEqual([]);
  });
  it('téléphone : pays lu à côté de la réponse (`<clé>_pays`), sinon pays par défaut', () => {
    expect(params(q('phone'), '02 512 34 56', { champ_pays: 'BE' })).toEqual([]);
    expect(params(q('phone'), '02 512 34 56')).toEqual(['phone']);
    expect(params(q('phone', { defaultCountry: 'BE' }), '02 512 34 56')).toEqual([]);
    expect(params(q('phone', { lineType: 'mobile' }), '+33561123456', { champ_pays: 'FR' })).toEqual(['lineType']);
  });
  it('type de ligne : message selon le type exigé', () => {
    const [e] = validateAnswer(q('phone', { lineType: 'mobile' }), '+33561123456', {});
    expect(e!.message).toEqual({ fr: 'Numéro mobile attendu.', en: 'Mobile number expected.' });
  });
  it('adresse : code postal manquant en France, acceptée en Allemagne', () => {
    const [e] = validateAnswer(q('address'), '12 rue des Lilas Toulouse', { champ_pays: 'FR' });
    expect(e!.message.fr).toBe('Code postal manquant.');
    expect(params(q('address'), '12 rue des Lilas Toulouse', { champ_pays: 'DE' })).toEqual([]);
    expect(params(q('address'), '12345', { champ_pays: 'DE' })).toEqual(['address']);
  });
  it('civilité : seuls les codes proposés', () => {
    expect(params(q('civility'), 'MME')).toEqual([]);
    expect(params(q('civility'), 'NP')).toEqual(['option']);
    expect(params(q('civility', { undisclosed: true }), 'NP')).toEqual([]);
  });
  it('message surchargé, dans chaque langue traduite', () => {
    const messages = { email: { fr: 'Mail incorrect', en: 'Wrong email' } };
    expect(validateAnswer(q('email', { messages }), 'x', {})[0]!.message).toEqual(messages.email);
    expect(formatErrors(q('email', { messages }), 'x')[0]!.message).toEqual(messages.email);
  });
  it('facultative et vide : aucun contrôle ; obligatoire et vide : réponse obligatoire', () => {
    for (const t of ['email', 'phone', 'address', 'civility']) {
      expect(params(q(t), null)).toEqual([]);
      expect(params(q(t), '')).toEqual([]);
      expect(formatErrors(q(t), null)).toEqual([]);
      expect(params(q(t, { required: true }), null)).toEqual(['required']);
    }
  });
  it('contraintes libres appliquées comme ailleurs ; « Ne sais pas » sans contrôle', () => {
    expect(params(q('email', { constraints: [{ rule: "$contains(champ, '.fr')" }] }), 'a@b.com')).toEqual(['constraints[0]']);
    expect(validateAnswer(q('email', { dontKnow: {}, required: true }), null, {}, {}, undefined, '', undefined, true)).toEqual([]);
  });
  it('champ de structure : pays lu dans l’occurrence', () => {
    const s = { id: 's', key: 'souscripteur', label: { fr: 'S' }, type: 'structure', fields: [q('phone', { key: 'telephone' })] } as StructureQuestion;
    expect(params(s, { telephone: '02 512 34 56', telephone_pays: 'BE' })).toEqual([]);
    expect(validateAnswer(s, { telephone: '0470' }, {}).map((e) => e.path)).toEqual(['souscripteur.telephone']);
  });
  it('messages personnalisables par type', () => {
    expect(messageParams(q('email'))).toEqual(['required', 'email']);
    expect(messageParams(q('phone', { lineType: 'fixed' }))).toEqual(['required', 'phone', 'lineType']);
    expect(messageParams(q('address', { maxLength: 100 }))).toEqual(['required', 'address', 'postalCode']);
    expect(messageParams(q('civility'))).toEqual(['required']);
  });
});

describe('vérifications du projet (EVO-007)', () => {
  const ws = (languages: string[], nodes: unknown[], edgeWhen: string) => ({
    project: { formatVersion: 6, kind: 'project', id: 'p', name: 'P', languages, defaultLanguage: 'fr', questionnaires: [], systemState: [], scenarios: [] },
    library: { formatVersion: 6, kind: 'library', questions: [], blocks: [], labelSets: [] },
    questionnaires: [{
      formatVersion: 6, kind: 'questionnaire', id: 'q', key: 'q', title: Object.fromEntries(languages.map((l) => [l, 'Q'])), start: 'n1',
      nodes: [...nodes, { kind: 'end', id: 'fin', message: Object.fromEntries(languages.map((l) => [l, 'Fin'])) }],
      edges: [{ id: 'e1', from: 'n1', to: 'n2', when: edgeWhen }, { id: 'e2', from: 'n1', to: 'fin' }, { id: 'e3', from: 'n2', to: 'fin' }],
    }],
    layouts: [],
  }) as unknown as Workspace;
  const label = (languages: string[]) => Object.fromEntries(languages.map((l) => [l, 'X']));
  it('`cle.pays` connu pour un téléphone ou une adresse, inconnu ailleurs', () => {
    const nodes = (type: string) => [
      { kind: 'question', id: 'n1', key: 'tel', label: { fr: 'T' }, type },
      { kind: 'question', id: 'n2', key: 'c', label: { fr: 'C' }, type: 'civility' },
    ];
    const codes = (type: string) => checkWorkspace(ws(['fr'], nodes(type), "tel.pays = 'BE'")).map((i) => i.code);
    expect(codes('phone')).not.toContain('unknownReference');
    expect(codes('address')).not.toContain('unknownReference');
    expect(codes('email')).toContain('unknownReference');
  });
  it('civilité : libellés par défaut en français et en anglais, autres langues signalées', () => {
    const nodes = [
      { kind: 'question', id: 'n1', key: 'tel', label: label(['fr', 'en', 'de']), type: 'phone' },
      { kind: 'question', id: 'n2', key: 'c', label: label(['fr', 'en', 'de']), type: 'civility', labels: { M: { fr: 'M.', en: 'Mr', de: 'Herr' } } },
    ];
    const missing = (langs: string[]) => checkWorkspace(ws(langs, nodes, 'true')).filter((i) => i.code === 'missingTranslation').map((i) => i.params.property);
    expect(missing(['fr', 'en'])).toEqual([]);
    expect(missing(['fr', 'en', 'de'])).toEqual(['labels.MME']);
  });
});
