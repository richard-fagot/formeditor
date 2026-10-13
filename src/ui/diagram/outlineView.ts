/** Boîte d'un nœud dans le repère du logigramme. */
export interface Box { x: number; y: number; width: number; height: number }

/** Zoom de l'outline (EVO-019) : 1 = lisible comme le logigramme à 100 %, 0,5 = plancher de lisibilité. */
export const OUTLINE_ZOOM = { min: 0.5, max: 1 };
const PAD = 24;

/**
 * Vue de l'outline : centrée sur le nœud courant, zoom le plus fort (borné) qui laisse voir ses voisins immédiats
 * (arêtes entrantes et sortantes) dans un cadre `width` × `height`. Un voisin trop loin peut sortir du cadre.
 */
export function outlineView(current: Box, neighbors: Box[], width: number, height: number): { x: number; y: number; zoom: number } {
  const cx = current.x + current.width / 2;
  const cy = current.y + current.height / 2;
  let dx = current.width / 2;
  let dy = current.height / 2;
  for (const b of neighbors) {
    dx = Math.max(dx, Math.abs(b.x - cx), Math.abs(b.x + b.width - cx));
    dy = Math.max(dy, Math.abs(b.y - cy), Math.abs(b.y + b.height - cy));
  }
  const fit = Math.min((width / 2 - PAD) / dx, (height / 2 - PAD) / dy);
  const zoom = Math.min(OUTLINE_ZOOM.max, Math.max(OUTLINE_ZOOM.min, fit));
  return { x: cx, y: cy, zoom };
}
