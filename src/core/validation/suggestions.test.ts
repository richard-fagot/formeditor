import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import { collectExpressions, findUsages, renameKey } from '../references';
import type { Workspace } from '../model';
import { checkWorkspace } from './index';

/** Expression des suggestions d'un champ texte (EVO-016) : vérifiée, parcourue et renommée comme les autres. */
const Q = { kind: 'questionnaire', id: 'q_declaration' } as const;
const node = (w: Workspace, id: string) => w.questionnaires[0]!.nodes.find((n) => n.id === id) as unknown as Record<string, unknown>;
const codes = (w: Workspace) =>
  checkWorkspace(w).filter((i) => i.nodeId === 'n_circonstances').map((i) => `${i.code}:${i.property ?? ''}${i.params.ref ? `:${i.params.ref}` : ''}`);
const withSuggestions = (expr: string) => {
  const w = structuredClone(exampleWorkspace());
  node(w, 'n_circonstances').suggestions = expr;
  return w;
};

describe('vérifications de l’expression des suggestions (EVO-016)', () => {
  it('question située avant le champ : aucun problème', () => {
    expect(codes(withSuggestions('type_sinistre'))).toEqual([]);
  });
  it('question située après le champ : signalée comme pour les autres expressions', () => {
    expect(codes(withSuggestions('canaux_contact'))).toContain('notGuaranteed:suggestions:canaux_contact');
  });
  it('référence inconnue et syntaxe invalide signalées', () => {
    expect(codes(withSuggestions('marques_inconnues'))).toContain('unknownReference:suggestions:marques_inconnues');
    expect(codes(withSuggestions('type_sinistre ='))[0]).toMatch(/^invalidExpression:suggestions/);
  });
  it('option cochée sans expression : rien à vérifier', () => {
    expect(codes(withSuggestions(''))).toEqual([]);
  });
});

describe('références de l’expression des suggestions (EVO-016)', () => {
  it('parcourue (dépendances, usages) et renommée avec la clé', () => {
    const w = withSuggestions('$append(type_sinistre, sys.sinistres.nature)');
    expect(collectExpressions(w).some((e) => e.loc.nodeId === 'n_circonstances' && e.loc.property === 'suggestions')).toBe(true);
    expect(findUsages(w, ['type_sinistre']).some((u) => u.loc.nodeId === 'n_circonstances')).toBe(true);
    const renamed = renameKey(w, { kind: 'question', owner: Q, nodeId: 'n_type' }, 'nature_sinistre');
    expect(node(renamed, 'n_circonstances').suggestions).toBe('$append(nature_sinistre, sys.sinistres.nature)');
  });
});
