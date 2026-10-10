import { describe, expect, it } from 'vitest';
import {
  checkSyntax, evaluate, evaluateCondition, extractReferences, renameReference,
  interpolate, templateReferences, renameInTemplate, resolveLabel, formatValue,
} from './index';

const env = { today: '2026-10-10' };
const ctx = {
  type_sinistre: 'vol',
  canaux: ['email', 'telephone'],
  victimes: [{ prenom: 'Ana', hospitalise: true }, { prenom: 'Léo', hospitalise: false }],
  tiers: { nom: 'Dupont' },
  sys: { sinistres: [{ id: 'S1', nature: 'Vol' }], plafond: 5000 },
};

describe('évaluation', () => {
  it('évalue égalités, contient, dénombrement, filtres, sous-champs', () => {
    expect(evaluateCondition("type_sinistre = 'vol'", ctx)).toBe(true);
    expect(evaluateCondition("'telephone' in canaux", ctx)).toBe(true);
    expect(evaluate('$count(victimes[hospitalise])', ctx)).toBe(1);
    expect(evaluate('victimes[1].prenom', ctx)).toBe('Léo');
    expect(evaluate("$count(sys.sinistres[nature = 'Vol'])", ctx)).toBe(1);
    expect(evaluate('tiers.nom', ctx)).toBe('Dupont');
    expect(evaluateCondition('$exists(inconnu)', ctx)).toBe(false);
  });
  it('fournit les fonctions de date', () => {
    expect(evaluate('$today()', {}, env)).toBe('2026-10-10');
    expect(evaluate("$addDays('2026-02-27', 3)", {})).toBe('2026-03-02');
    expect(evaluate("$daysBetween('2026-01-01', '2026-01-31')", {})).toBe(30);
    expect(evaluate("$age('2000-10-11')", {}, env)).toBe(25);
    expect(evaluate("$age('2000-10-10')", {}, env)).toBe(26);
    expect(evaluateCondition("'2026-01-01' < $today()", {}, env)).toBe(true);
  });
  it('considère une condition en erreur ou non booléenne comme fausse', () => {
    expect(evaluateCondition('a = ', ctx)).toBe(false);
    expect(evaluateCondition('inconnu.x > 3', ctx)).toBe(false);
  });
  it('signale les erreurs de syntaxe avec leur position', () => {
    expect(checkSyntax("type_sinistre = 'vol'")).toBeUndefined();
    expect(checkSyntax('a = ')).toMatchObject({ position: 4 });
  });
});

describe('références', () => {
  it('extrait les chemins racines, sans les noms relatifs des filtres', () => {
    expect(extractReferences("$count(victimes[hospitalise].nom) > 0 and sys.plafond = 1 and tiers.nom = 'x'"))
      .toEqual([['victimes', 'nom'], ['sys', 'plafond'], ['tiers', 'nom']]);
    expect(extractReferences("'t' in canaux ? a : b")).toEqual([['canaux'], ['a'], ['b']]);
    expect(extractReferences('temoins[0].nom')).toEqual([['temoins', 'nom']]);
    expect(extractReferences('a = ')).toEqual([]);
  });
  it('renomme un segment de chemin racine', () => {
    expect(renameReference("type = 'a' and $count(type) > 1 and x.type = 1", ['type'], 'nature'))
      .toBe("nature = 'a' and $count(nature) > 1 and x.type = 1");
    expect(renameReference('tiers.nom & victimes[nom = "x"].nom', ['tiers', 'nom'], 'nom_famille'))
      .toBe('tiers.nom_famille & victimes[nom = "x"].nom');
    expect(renameReference('a = ', ['a'], 'b')).toBe('a = ');
  });
});

describe('interpolation et libellés', () => {
  it('remplace les {expressions}, gère les accolades doublées', () => {
    expect(interpolate('Bonjour {tiers.nom} ({$count(victimes)}) {{x}}', ctx)).toBe('Bonjour Dupont (2) {x}');
    expect(interpolate('Vide : [{inconnu}]', ctx)).toBe('Vide : []');
    expect(interpolate('{canaux}', ctx)).toBe('email, telephone');
  });
  it('extrait et renomme les références des gabarits', () => {
    expect(templateReferences('De {tiers.nom} le {date}')).toEqual([['tiers', 'nom'], ['date']]);
    expect(renameInTemplate('De {tiers.nom} {{tiers.nom}}', ['tiers'], 'tiers2')).toBe('De {tiers2.nom} {{tiers.nom}}');
  });
  it('résout langue, variante et interpolation', () => {
    const label = {
      variants: [{ when: "type_sinistre = 'vol'", text: { fr: 'Valeur volée chez {tiers.nom}' } }],
      otherwise: { fr: 'Montant', en: 'Amount' },
    };
    expect(resolveLabel(label, { lang: 'en', defaultLang: 'fr' }, ctx)).toBe('Valeur volée chez Dupont');
    expect(resolveLabel(label, { lang: 'en', defaultLang: 'fr' }, { type_sinistre: 'x' })).toBe('Amount');
    expect(resolveLabel({ fr: 'Seul' }, { lang: 'en', defaultLang: 'fr' }, {})).toBe('Seul');
  });
  it('formate les valeurs', () => {
    expect(formatValue(null)).toBe('');
    expect(formatValue(3.5)).toBe('3.5');
    expect(formatValue({ a: 1 })).toBe('{"a":1}');
  });
});
