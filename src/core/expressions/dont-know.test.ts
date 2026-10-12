import { describe, expect, it } from 'vitest';
import { checkSyntax, evaluate, evaluateCondition, extractReferences, interpolate, renameReference } from './index';

describe('référence « Ne sais pas » (EVO-006)', () => {
  const ctx = {
    date_nsp: true,
    liens: [], liens_nsp: true, liens_group: 'NSP',
    montant: 12,
    decl: { lien_nsp: true },
    victime: { age_nsp: true },
    temoins: [{ nom: 'a', nom_nsp: true }, { nom: 'b' }],
    autre: { nsp: { x: 1 } },
  };
  it('`cle.nsp` vaut vrai si « Ne sais pas » est choisie, faux sinon (jamais vide)', () => {
    expect(evaluate('date.nsp', ctx)).toBe(true);
    expect(evaluate('montant.nsp', ctx)).toBe(false);
    expect(evaluate('inconnue.nsp', ctx)).toBe(false);
    expect(evaluateCondition('$not(montant.nsp)', ctx)).toBe(true);
    expect(evaluateCondition('date.nsp and $not($exists(date))', ctx)).toBe(true);
    expect(evaluate('liens.nsp', ctx)).toBe(true);
    expect(evaluate('$count(liens)', ctx)).toBe(0);
    expect(evaluate('liens.groupe', ctx)).toBe('NSP');
  });
  it('alias de bloc, champ de structure, occurrences, `$$`, filtre', () => {
    expect(evaluate('decl.lien.nsp', ctx)).toBe(true);
    expect(evaluate('victime.age.nsp', ctx)).toBe(true);
    expect(evaluate('temoins[0].nom.nsp', ctx)).toBe(true);
    expect(evaluate('temoins[1].nom.nsp', ctx)).toBe(false);
    expect(evaluate('$count(temoins[nom.nsp])', ctx)).toBe(1);
    expect(evaluate('$$.date.nsp', ctx)).toBe(true);
    expect(evaluate('date.nsp = false', ctx)).toBe(false);
  });
  it('seule une étape finale `nsp` est réécrite', () => {
    expect(evaluate('autre.nsp.x', ctx)).toBe(1);
  });
  it('interpolation, références et renommage gardent l’écriture `.nsp`', () => {
    expect(interpolate('NSP : {date.nsp}', ctx)).toBe('NSP : true');
    expect(extractReferences('date.nsp')).toEqual([['date', 'nsp']]);
    expect(renameReference('date.nsp or date = "x"', ['date'], 'jour')).toBe('jour.nsp or jour = "x"');
    expect(checkSyntax('date.nsp')).toBeUndefined();
  });
});
