import { describe, expect, it } from 'vitest';
import { instanceQuestion, visibleFieldKeys } from './instance';
import type { LibraryQuestionNode } from './node';
import type { StructureQuestion } from './question';

const field = (key: string, required = false) => ({ id: `f_${key}`, key, label: { fr: key }, type: 'text' as const, required });
const identite: StructureQuestion = {
  id: 'lq_identite', key: 'identite', label: { fr: 'Identité' }, type: 'structure',
  fields: ['civilite', 'nom', 'prenom', 'date_naissance', 'adresse', 'mail', 'telephone'].map((k) => field(k, true)),
};
const node = (hiddenFields?: string[]): LibraryQuestionNode => ({ kind: 'question', id: 'n', ref: 'lq_identite', ...(hiddenFields ? { hiddenFields } : {}) });

describe('instance d’une question de bibliothèque (EVO-009)', () => {
  it('sans masquage : la définition telle quelle', () => {
    expect(instanceQuestion(identite, node())).toBe(identite);
  });
  it('retire les champs masqués, dans l’ordre de la bibliothèque', () => {
    const q = instanceQuestion(identite, node(['telephone', 'civilite', 'adresse', 'date_naissance'])) as StructureQuestion;
    expect(q.fields.map((f) => f.key)).toEqual(['nom', 'prenom', 'mail']);
    expect(identite.fields).toHaveLength(7);
  });
  it('un champ ajouté ensuite en bibliothèque apparaît ; une clé disparue est ignorée', () => {
    const def = { ...identite, fields: [...identite.fields.filter((f) => f.key !== 'adresse'), field('pays')] };
    const q = instanceQuestion(def, node(['adresse', 'telephone'])) as StructureQuestion;
    expect(q.fields.map((f) => f.key)).toEqual(['civilite', 'nom', 'prenom', 'date_naissance', 'mail', 'pays']);
  });
  it('tous les champs masqués : masquage ignoré', () => {
    const def = { ...identite, fields: [field('nom')] };
    expect((instanceQuestion(def, node(['nom'])) as StructureQuestion).fields).toHaveLength(1);
  });
  it('libellé surchargé ; masquage sans effet sur une question qui n’est pas une structure', () => {
    const text = { id: 'lq', key: 'tel', label: { fr: 'Tél' }, type: 'text' as const };
    expect(instanceQuestion(text, { ...node(['x']), label: { fr: 'Mobile' } }).label).toEqual({ fr: 'Mobile' });
  });
  it('visibleFieldKeys : clés affichées', () => {
    expect(visibleFieldKeys(identite, node(['mail']))).toHaveLength(6);
  });
});
