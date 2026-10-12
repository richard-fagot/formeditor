import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import type { Questionnaire, Workspace } from '../model';
import { fragmentScope, collectExpressions, findUsages, qualifyKeys, questionnaireScope, renameKey, resolvePath } from './index';

const ws = exampleWorkspace();
const decl = (w: Workspace) => w.questionnaires[0]!;
const node = (q: Questionnaire, id: string) => q.nodes.find((n) => n.id === id) as unknown as Record<string, unknown>;
const edge = (q: Questionnaire, id: string) => q.edges.find((e) => e.id === id)!;
const Q = { kind: 'questionnaire', id: 'q_declaration' } as const;

describe('portée', () => {
  const scope = questionnaireScope(ws, 'q_declaration');
  it('contient réponses, sous-champs, précisions « Autre », alias de bloc et variables système', () => {
    for (const p of ['type_sinistre', 'type_sinistre_other', 'date_sinistre', 'victimes.prenom', 'tiers', 'tiers.nom', 'tiers.compagnie', 'sys.sinistres.nature', 'sys.plafond_expertise']) {
      expect(scope.has(p), p).toBe(true);
    }
    expect(scope.get('tiers.nom')?.alias).toBe('tiers');
  });
  it('décrit les variables système : type, description, valeurs d’une énumération (autocomplétion)', () => {
    expect(scope.get('sys.type_adherent')).toMatchObject({ type: 'enum', values: ['ud', 'amicale', 'particulier'], description: 'Catégorie de l\'adhérent.' });
    expect(scope.get('sys.sinistres.date')).toMatchObject({ kind: 'system', type: 'date' });
  });
  it('porte le libellé d’une variable et d’un champ de liste (EVO-005), absent sinon', () => {
    expect(scope.get('sys.type_adherent')?.caption).toBe('Catégorie d\'adhérent');
    expect(scope.get('sys.sinistres.nature')?.caption).toBe('Nature du sinistre');
    expect(scope.get('sys.sinistres.date')?.caption).toBeUndefined();
    expect(scope.get('sys.nom_assure')).not.toHaveProperty('caption');
  });
  it('le libellé n’est ni une expression collectée ni touché par un renommage', () => {
    expect(collectExpressions(ws).some((f) => f.text === 'Déclarant ayant droit' || f.text === 'Catégorie d\'adhérent')).toBe(false);
    const renamed = renameKey(ws, { kind: 'system', name: 'type_adherent' }, 'categorie');
    expect(renamed.project.systemState.find((v) => v.name === 'categorie')?.caption).toBe('Catégorie d\'adhérent');
  });
  it('résout les chemins connus et refuse les inconnus', () => {
    expect(resolvePath(scope, ['victimes', 'prenom'])?.kind).toBe('field');
    expect(resolvePath(scope, ['inconnu'])).toBeUndefined();
    expect(resolvePath(scope, ['sys', 'sinistres', 'montant'])).toBeUndefined();
  });
  it('dans un fragment : ses clés sans préfixe et celles de l’appelant', () => {
    const b = fragmentScope(ws, 'blk_identite_tiers');
    expect(b.has('nom') && b.has('assurance_connue') && b.has('type_sinistre')).toBe(true);
  });
});

describe('collecte et usages', () => {
  it('collecte les expressions des arêtes, libellés, bornes, sources', () => {
    const all = collectExpressions(ws);
    expect(all.some((f) => f.loc.edgeId === 'e_date_lien')).toBe(true);
    expect(all.some((f) => f.loc.property === 'options[0].label' && f.loc.relative && f.loc.source === 'sys.sinistres')).toBe(true);
    expect(all.some((f) => f.loc.property === 'options[0].from' && !f.loc.relative)).toBe(true);
    expect(all.some((f) => f.loc.owner.kind === 'libraryQuestion' && f.loc.property === 'min')).toBe(true);
    expect(all.some((f) => f.loc.structure === 'victimes' && f.text === 'hospitalise = true')).toBe(true);
  });
  it('trouve les usages d’une clé', () => {
    const ids = findUsages(ws, ['type_sinistre']).map((f) => f.loc.edgeId ?? f.loc.nodeId);
    expect(ids).toEqual(expect.arrayContaining(['e_date_victimes', 'e_lien_victimes', 'n_montant']));
  });
});

describe('renommage propagé', () => {
  it('question locale : arêtes, variantes de libellé, précision « Autre »', () => {
    const w = renameKey(ws, { kind: 'question', owner: Q, nodeId: 'n_type' }, 'nature_sinistre');
    expect(node(decl(w), 'n_type').key).toBe('nature_sinistre');
    expect(edge(decl(w), 'e_date_victimes').when).toBe("nature_sinistre = 'accident'");
    expect(JSON.stringify(node(decl(w), 'n_montant').label)).toContain("nature_sinistre = 'vol'");
    expect(findUsages(w, ['type_sinistre'])).toEqual([]);
  });
  it('champ de structure : expressions sœurs sans préfixe', () => {
    const w = renameKey(ws, { kind: 'question', owner: Q, nodeId: 'n_victimes', fieldId: 'f_hospitalise' }, 'hospitalisee');
    const fields = node(decl(w), 'n_victimes').fields as { key: string; when?: string }[];
    expect(fields.map((f) => f.key)).toContain('hospitalisee');
    expect(fields.find((f) => f.key === 'duree_hospitalisation')?.when).toBe('hospitalisee = true');
  });
  it('question de fragment : `alias.cle` chez les appelants, clé nue dans le fragment', () => {
    const w = renameKey(ws, { kind: 'question', owner: { kind: 'fragment', id: 'blk_identite_tiers' }, nodeId: 'bn_nom' }, 'nom_tiers');
    const block = w.library.fragments[0]!;
    expect(JSON.stringify(block.nodes.find((n) => n.id === 'bn_assurance_connue'))).toContain('{nom_tiers}');
    expect(JSON.stringify(node(decl(w), 'n_tiers_inconnu').text)).toContain('{tiers.nom_tiers}');
  });
  it('question de bibliothèque : utilisée sans préfixe chez les hôtes', () => {
    const w = renameKey(ws, { kind: 'question', owner: { kind: 'libraryQuestion', id: 'lq_date_sinistre' }, nodeId: '' }, 'date_evenement');
    expect(w.library.questions[0]!.key).toBe('date_evenement');
    expect(edge(decl(w), 'e_date_lien').when).toBe('$count(sys.sinistres[date <= $$.date_evenement]) > 0');
  });
  it('alias de fragment et variable système (scénarios compris)', () => {
    let w = renameKey(ws, { kind: 'alias', owner: Q, nodeId: 'n_bloc_tiers' }, 'partie_adverse');
    expect(JSON.stringify(node(decl(w), 'n_fin').message)).toContain('partie_adverse.compagnie');
    w = renameKey(w, { kind: 'system', name: 'sinistres' }, 'historique');
    expect(edge(decl(w), 'e_date_lien').when).toBe('$count(sys.historique[date <= $$.date_sinistre]) > 0');
    expect(w.project.scenarios[0]!.values.historique).toBeDefined();
    expect((node(decl(w), 'n_lien').options as { from?: string; label: unknown }[])[0]).toMatchObject({ from: 'sys.historique', label: "date & ' — ' & nature" });
  });
  it('entrées dynamiques d’un choix : `from` et `when` suivis au renommage, libellé statique intact', () => {
    const base = structuredClone(ws);
    const lien = node(decl(base), 'n_lien') as { options: Record<string, unknown>[] };
    lien.options.splice(1, 0, { from: 'type_sinistre', when: "type_sinistre != 'vol'" });
    const w = renameKey(base, { kind: 'question', owner: Q, nodeId: 'n_type' }, 'nature_sinistre');
    const options = node(decl(w), 'n_lien').options as Record<string, unknown>[];
    expect(options[1]).toEqual({ from: 'nature_sinistre', when: "nature_sinistre != 'vol'" });
    expect(options.map((o) => ('from' in o ? 'dyn' : o.value))).toEqual(lien.options.map((o) => ('from' in o ? 'dyn' : o.value)));
  });
  it('champ d’une liste système : expressions absolues et relatives (entrée dynamique), exemple, scénarios', () => {
    const base = structuredClone(ws);
    edge(decl(base), 'e_date_lien').when = "$count(sys.sinistres.date) > 0 and sys.sinistres.nature = 'Vol'";
    edge(decl(base), 'e_lien_victimes').when = "$count(sys.sinistres[date > '2025-01-01']) > 0";
    const w = renameKey(base, { kind: 'systemField', variable: 'sinistres', field: 'date' }, 'date_survenance');
    const v = w.project.systemState.find((x) => x.name === 'sinistres')!;
    expect(v.fields!.map((f) => f.name)).toEqual(['id', 'date_survenance', 'nature']);
    expect(v.example).toEqual([{ id: 'S-001', date_survenance: '2025-03-12', nature: 'Dégât des eaux' }]);
    expect(Object.keys((w.project.scenarios[0]!.values.sinistres as object[])[0]!)).toEqual(['id', 'date_survenance', 'nature']);
    expect(edge(decl(w), 'e_date_lien').when).toBe("$count(sys.sinistres.date_survenance) > 0 and sys.sinistres.nature = 'Vol'");
    expect(edge(decl(w), 'e_lien_victimes').when).toBe("$count(sys.sinistres[date_survenance > '2025-01-01']) > 0");
    expect((node(decl(w), 'n_lien').options as unknown[])[0]).toEqual({ from: 'sys.sinistres', label: "date_survenance & ' — ' & nature", value: 'id' });
    // Nom invalide, déjà pris, champ inconnu : projet inchangé.
    expect(renameKey(base, { kind: 'systemField', variable: 'sinistres', field: 'date' }, 'nature')).toBe(base);
    expect(renameKey(base, { kind: 'systemField', variable: 'sinistres', field: 'date' }, 'Pas Valide')).toBe(base);
    expect(renameKey(base, { kind: 'systemField', variable: 'sinistres', field: 'zz' }, 'yy')).toBe(base);
  });
  it('ne modifie rien d’autre que les références concernées', () => {
    const w = renameKey(ws, { kind: 'question', owner: Q, nodeId: 'n_canaux' }, 'canaux');
    const diff = JSON.stringify(w).length - JSON.stringify(ws).length;
    expect(diff).toBe(-'_contact'.length * 2);
  });
});

describe('qualification de clés (regroupement en bloc)', () => {
  it('préfixe par l’alias les références du propriétaire, précisions « Autre » comprises', () => {
    const out = qualifyKeys(ws, Q, ['type_sinistre'], 'decl');
    expect(edge(decl(out), 'e_date_victimes').when).toBe("decl.type_sinistre = 'accident'");
    const before = collectExpressions(ws).filter((f) => f.loc.owner.kind === 'questionnaire' && /type_sinistre_other/.test(f.text));
    const after = collectExpressions(out).filter((f) => f.loc.owner.kind === 'questionnaire' && /decl\.type_sinistre_other/.test(f.text));
    expect(after.length).toBe(before.length);
    // Les blocs et questions de bibliothèque ne sont pas touchés.
    expect(out.library).toEqual(ws.library);
    expect(ws).toEqual(exampleWorkspace());
  });
});
