import { describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import { computeLayout } from './autoLayout';

describe('mise en page automatique (ELK)', () => {
  it('place chaque nœud du questionnaire d’exemple sans chevauchement, le départ en haut', async () => {
    const q = exampleWorkspace().questionnaires[0]!;
    const pos = await computeLayout(q);
    expect(Object.keys(pos).sort()).toEqual(q.nodes.map((n) => n.id).sort());
    const boxes = Object.values(pos);
    for (const [i, a] of boxes.entries()) {
      for (const b of boxes.slice(i + 1)) expect(Math.abs(a.x - b.x) >= 240 || Math.abs(a.y - b.y) >= 100).toBe(true);
    }
    expect(pos[q.start]!.y).toBe(Math.min(...boxes.map((p) => p.y)));
  });
  it('gère les cycles et un graphe vide', async () => {
    const pos = await computeLayout({ start: 'a', nodes: [{ id: 'a' }, { id: 'b' }] as never, edges: [
      { id: 'e1', from: 'a', to: 'b' }, { id: 'e2', from: 'b', to: 'a' },
    ] });
    expect(pos.a!.y).toBeLessThan(pos.b!.y);
    expect(await computeLayout({ start: '', nodes: [], edges: [] })).toEqual({});
  });
});
