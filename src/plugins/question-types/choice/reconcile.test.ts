import { describe, expect, it } from 'vitest';
import type { ChoiceOption } from '../../../core/model';
import type { EditorEnv } from '../../../plugin-api';
import { reconcile } from './options-editor';

const env = { contentLang: 'fr', defaultLang: 'fr' } as EditorEnv;
const opts: ChoiceOption[] = [
  { value: 'vol', label: { fr: 'Vol', en: 'Theft' } },
  { value: 'incendie', label: { fr: 'Incendie' }, when: 'sys.x' },
  { value: 'autre_cas', label: { fr: 'Autre cas' } },
];

describe('saisie rapide des options', () => {
  it('crée une option par ligne (collage multi-lignes), valeur dérivée du libellé', () => {
    expect(reconcile(['Bleu', '', ' Vert clair ', 'Autre'], [], env)).toEqual([
      { value: 'bleu', label: { fr: 'Bleu' } },
      { value: 'vert_clair', label: { fr: 'Vert clair' } },
      { value: 'autre', label: { fr: 'Autre' } },
    ]);
  });
  it('garde valeur, condition et traductions des lignes inchangées, même après suppression d’une ligne', () => {
    expect(reconcile(['Vol', 'Autre cas'], opts, env)).toEqual([opts[0], opts[2]]);
  });
  it('une ligne modifiée garde l’option de même rang', () => {
    expect(reconcile(['Vol simple', 'Incendie', 'Autre cas'], opts, env)[0]).toEqual({ value: 'vol', label: { fr: 'Vol simple', en: 'Theft' } });
  });
  it('n’attribue jamais la valeur réservée « other »', () => {
    expect(reconcile(['Other'], [], env)[0]!.value).not.toBe('other');
  });
});
