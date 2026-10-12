import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import type { Question, Workspace } from '../model';
import { blockScope, collectExpressions, questionnaireScope, renameKey, resolvePath, structureScope } from './index';

const Q = { kind: 'questionnaire', id: 'q_declaration' } as const;
const decl = (w: Workspace) => w.questionnaires[0]!;
const node = (w: Workspace, id: string) => decl(w).nodes.find((n) => n.id === id) as unknown as Question & Record<string, unknown>;

/** Exemple avec « Ne sais pas » activée sur `type_sinistre`. */
function withDontKnow(): Workspace {
  const w = structuredClone(exampleWorkspace());
  node(w, 'n_type').dontKnow = { label: { fr: 'Je ne sais pas ({montant_estime})', en: 'Unknown' } };
  return w;
}

describe('référence « Ne sais pas » `.nsp` (EVO-006)', () => {
  it('acceptée seulement après une question dont l’option est activée', () => {
    const w = withDontKnow();
    const s = questionnaireScope(w, 'q_declaration');
    expect(resolvePath(s, ['type_sinistre', 'nsp'])).toMatchObject({ kind: 'dontKnow', nodeId: 'n_type', type: 'boolean' });
    node(w, 'n_type').dontKnow = undefined;
    expect(resolvePath(questionnaireScope(w, 'q_declaration'), ['type_sinistre', 'nsp'])).toBeUndefined();
  });
  it('champ de structure (préfixé ou frère) et question de bloc', () => {
    const w = withDontKnow();
    const v = node(w, 'n_victimes') as unknown as { fields: unknown[] };
    v.fields.push({ id: 'f_age', key: 'age', label: { fr: 'Âge' }, type: 'number', dontKnow: {} });
    const block = w.library.blocks[0]!;
    block.nodes.push({ kind: 'question', id: 'bn_x', key: 'x', label: { fr: 'X' }, type: 'text', dontKnow: {} });
    const s = questionnaireScope(w, 'q_declaration');
    expect(resolvePath(s, ['victimes', 'age', 'nsp'])?.kind).toBe('dontKnow');
    expect(resolvePath(structureScope(s, v as unknown as Question), ['age', 'nsp'])?.kind).toBe('dontKnow');
    expect(resolvePath(s, ['tiers', 'x', 'nsp'])).toMatchObject({ kind: 'dontKnow', alias: 'tiers' });
    expect(resolvePath(blockScope(w, block.id), ['x', 'nsp'])?.kind).toBe('dontKnow');
  });
  it('le libellé « Ne sais pas » est collecté et suit le renommage', () => {
    const w = withDontKnow();
    const found = collectExpressions(w).filter((f) => f.loc.nodeId === 'n_type').map((f) => `${f.kind}:${f.loc.property}`);
    expect(found).toContain('template:dontKnow.label');
    const r = renameKey(w, { kind: 'question', owner: Q, nodeId: 'n_montant' }, 'montant');
    expect(node(r, 'n_type').dontKnow).toEqual({ label: { fr: 'Je ne sais pas ({montant})', en: 'Unknown' } });
  });
});
