import { describe, expect, it } from 'vitest';
import { OUTLINE_ZOOM, outlineView } from './outlineView';

const box = (x: number, y: number) => ({ x, y, width: 240, height: 100 });

describe('vue de l’outline (EVO-019)', () => {
  it('centrée sur le nœud courant, zoom 1 si les voisins tiennent', () => {
    expect(outlineView(box(0, 0), [], 600, 800)).toEqual({ x: 120, y: 50, zoom: 1 });
  });
  it('zoom réduit pour montrer les voisins immédiats', () => {
    const v = outlineView(box(0, 160), [box(0, 0), box(-320, 320), box(320, 320)], 448, 800);
    expect(v.x).toBe(120);
    expect(v.y).toBe(210);
    expect(v.zoom).toBeLessThan(1);
    // Le voisin le plus à droite (bord à 560) tient dans la demi-largeur.
    expect((560 - v.x) * v.zoom).toBeLessThanOrEqual(448 / 2);
  });
  it('logigramme très large : zoom borné au plancher de lisibilité', () => {
    expect(outlineView(box(0, 0), [box(5000, 200)], 448, 800).zoom).toBe(OUTLINE_ZOOM.min);
  });
});
