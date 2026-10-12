import { useEffect, type RefObject } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useStore } from '../../app/store';

/** Recentre la vue si le nœud sélectionné seul sort du cadre (navigation au clavier, création chaînée). */
export function useKeepSelectionVisible(
  container: RefObject<HTMLDivElement | null>,
  positions: Record<string, { x: number; y: number }> | undefined,
  readOnly?: boolean,
) {
  const rf = useReactFlow();
  const selection = useStore((s) => s.selection);
  useEffect(() => {
    const id = !readOnly && selection.nodes.length === 1 ? selection.nodes[0] : undefined;
    const p = id ? positions?.[id] : undefined;
    const box = container.current?.getBoundingClientRect();
    if (!p || !box) return;
    const { x, y, zoom } = rf.getViewport();
    const sx = p.x * zoom + x;
    const sy = p.y * zoom + y;
    if (sx < 0 || sy < 0 || sx + 240 * zoom > box.width || sy + 100 * zoom > box.height) {
      void rf.setCenter(p.x + 120, p.y + 50, { zoom, duration: 200 });
    }
  }, [selection.nodes, positions, rf, readOnly, container]);
}
