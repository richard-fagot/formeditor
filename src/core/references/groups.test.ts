import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import type { Question, Workspace } from '../model';
import { fragmentScope, collectExpressions, findUsages, questionnaireScope, renameKey, resolvePath, structureScope } from './index';

const ws = exampleWorkspace();
const Q = { kind: 'questionnaire', id: 'q_declaration' } as const;
const decl = (w: Workspace) => w.questionnaires[0]!;

describe('référence au groupe `.groupe` (EVO-003)', () => {
  const scope = questionnaireScope(ws, 'q_declaration');
  it('acceptée après une question à choix, refusée ailleurs', () => {
    expect(resolvePath(scope, ['qualite_declarant', 'groupe'])).toMatchObject({ kind: 'group', nodeId: 'n_qualite' });
    expect(resolvePath(scope, ['canaux_contact', 'groupe'])?.kind).toBe('group');
    expect(resolvePath(scope, ['date_sinistre', 'groupe'])).toBeUndefined();
    expect(resolvePath(scope, ['victimes', 'groupe'])).toBeUndefined();
    expect(resolvePath(scope, ['sys', 'type_adherent', 'groupe'])).toBeUndefined();
  });
  it('après un champ de structure (préfixé ou frère)', () => {
    const w = structuredClone(ws);
    const v = decl(w).nodes.find((n) => n.id === 'n_victimes') as unknown as { fields: unknown[] };
    v.fields.push({ id: 'f_lien', key: 'lien', label: { fr: 'Lien' }, type: 'single', options: [] });
    const s = questionnaireScope(w, 'q_declaration');
    expect(resolvePath(s, ['victimes', 'lien', 'groupe'])?.kind).toBe('group');
    expect(resolvePath(structureScope(s, v as unknown as Question), ['lien', 'groupe'])?.kind).toBe('group');
  });
  it('après une question à choix d’un bloc : `alias.cle.groupe` chez l’hôte, `cle.groupe` dans le bloc', () => {
    const w = structuredClone(ws);
    const block = w.library.fragments[0]!;
    block.nodes.push({ kind: 'question', id: 'bn_lien', key: 'lien', label: { fr: 'Lien' }, type: 'single', options: [] });
    const host = questionnaireScope(w, 'q_declaration');
    expect(resolvePath(host, ['tiers', 'lien', 'groupe'])).toMatchObject({ kind: 'group', alias: 'tiers', nodeId: 'bn_lien' });
    expect(resolvePath(host, ['tiers', 'nom', 'groupe'])).toBeUndefined();
    expect(resolvePath(fragmentScope(w, block.id), ['lien', 'groupe'])?.kind).toBe('group');
    expect(resolvePath(fragmentScope(w, block.id), ['nom', 'groupe'])).toBeUndefined();
  });
  it('les libellés et conditions des groupes sont collectés', () => {
    const w = structuredClone(ws);
    const q = decl(w).nodes.find((n) => n.id === 'n_qualite') as unknown as { options: Record<string, unknown>[] };
    q.options[0]!.when = 'sys.contrat_actif = true';
    const found = collectExpressions(w).filter((f) => f.loc.nodeId === 'n_qualite').map((f) => `${f.kind}:${f.loc.property}`);
    expect(found).toEqual(expect.arrayContaining([
      'template:options[0].group', 'expr:options[0].when', 'template:options[0].options[1].label', 'template:options[1].options[0].label',
    ]));
  });
  it('usages et renommage couvrent `.groupe` et les expressions des groupes', () => {
    expect(findUsages(ws, ['qualite_declarant']).map((f) => f.loc.edgeId ?? f.loc.nodeId)).toEqual(expect.arrayContaining(['e_qualite_ayant_droit', 'n_ayant_droit']));
    const before = structuredClone(ws);
    const q = decl(before).nodes.find((n) => n.id === 'n_qualite') as unknown as { options: Record<string, unknown>[] };
    q.options[1]!.when = "type_sinistre = 'accident'";
    q.options[1]!.group = { fr: 'Ayant droit ({type_sinistre})', en: 'Beneficiary' };
    let w = renameKey(before, { kind: 'question', owner: Q, nodeId: 'n_qualite' }, 'qualite');
    expect(decl(w).edges.find((e) => e.id === 'e_qualite_ayant_droit')!.when).toBe("qualite.groupe = 'Ayant droit'");
    expect(JSON.stringify(decl(w).nodes.find((n) => n.id === 'n_ayant_droit'))).toContain('{qualite.groupe}');
    w = renameKey(w, { kind: 'question', owner: Q, nodeId: 'n_type' }, 'nature');
    const after = decl(w).nodes.find((n) => n.id === 'n_qualite') as unknown as { options: Record<string, unknown>[] };
    expect(after.options[1]!.when).toBe("nature = 'accident'");
    expect(after.options[1]!.group).toEqual({ fr: 'Ayant droit ({nature})', en: 'Beneficiary' });
  });
});
