import { describe, expect, it } from 'vitest';
import type { ChoiceItem, ChoiceOption } from '../../../core/model';
import type { EditorEnv } from '../../../plugin-api';
import { duplicateEntry, lineOf, moveEntry, reconcile } from './entries';

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
    expect((reconcile(['Other'], [], env)[0] as ChoiceOption).value).not.toBe('other');
  });
});

describe('entrées dynamiques dans la saisie rapide (EVO-001)', () => {
  it('`$référence` crée une entrée dynamique, à sa position (exemple de l’évolution)', () => {
    expect(reconcile(['$sys.champ_dynamique', 'Une de ses amicales', 'Un tiers'], [], env)).toEqual([
      { from: 'sys.champ_dynamique' },
      { value: 'amicales', label: { fr: 'Une de ses amicales' } },
      { value: 'tiers', label: { fr: 'Un tiers' } },
    ]);
  });
  it('une ligne qui commence par `<` reste une option statique ; `\\$` écrit une option qui commence par `$`', () => {
    expect(reconcile(['<sys.champ>', '\\$100'], [], env)).toEqual([
      { value: 'sys_champ', label: { fr: '<sys.champ>' } },
      { value: 'q_100', label: { fr: '$100' } },
    ]);
    expect(lineOf({ value: 'q_100', label: { fr: '$100' } }, env)).toBe('\\$100');
    expect(lineOf({ value: 'x', label: { fr: '<x>' } }, env)).toBe('<x>');
  });
  it('conserve les réglages d’une entrée dynamique (libellé, valeur, condition) et suit son déplacement', () => {
    const entries: ChoiceItem[] = [{ from: 'sys.sinistres', label: 'nature', value: 'id', when: 'sys.x' }, opts[0]!];
    expect(lineOf(entries[0]!, env)).toBe('$sys.sinistres');
    expect(reconcile(['Vol', '$sys.sinistres'], entries, env)).toEqual([entries[1], entries[0]]);
    // Référence modifiée sur la même ligne : réglages gardés.
    expect(reconcile(['$sys.autres', 'Vol'], entries, env)[0]).toEqual({ from: 'sys.autres', label: 'nature', value: 'id', when: 'sys.x' });
    // Une ligne statique à la place d'une entrée dynamique : nouvelle option.
    expect(reconcile(['Tiers', 'Vol'], entries, env)[0]).toEqual({ value: 'tiers', label: { fr: 'Tiers' } });
  });
  it('déplacer, dupliquer', () => {
    const entries: ChoiceItem[] = [{ from: 'sys.l' }, ...opts];
    expect(moveEntry(entries, 0, 3).map((e) => lineOf(e, env))).toEqual(['Vol', 'Incendie', 'Autre cas', '$sys.l']);
    expect(moveEntry(entries, 0, -1)).toBe(entries);
    const dup = duplicateEntry(entries, 0);
    expect(dup).toEqual([entries[0], entries[0], ...opts]);
    const dupStatic = duplicateEntry(entries, 1);
    expect(dupStatic[2]).toEqual({ value: 'vol_2', label: { fr: 'Vol', en: 'Theft' } });
  });
});
