import { useEffect, type RefObject } from 'react';
import { useReactFlow, useStore as useFlowStore } from '@xyflow/react';
import type { Graph } from '../../core/model';
import { outlineView, type Box } from './outlineView';

/** Options de l'outline de la prévisualisation (EVO-019) : logigramme en lecture seule piloté par le wizard. */
export interface OutlineOptions {
  /** Nœud du questionnaire de la page affichée (le nœud fragment pour une page d'un fragment) : mis en évidence et centré. */
  current?: string;
  /** Change à chaque changement de page (ou clic) : la vue est recentrée, même après un zoom ou un déplacement manuel. */
  focusKey: string;
  /** Nœuds question actifs (cliquables) ; les autres questions sont grisées. */
  active: Set<string>;
  /** Clic sur un nœud question actif. */
  onQuestionClick(nodeId: string): void;
}

/** Recentre l'outline sur le nœud courant (zoom : `outlineView`) à chaque `focusKey`, une fois les nœuds mesurés. */
export function useOutlineCenter(outline: OutlineOptions | undefined, g: Graph | undefined, container: RefObject<HTMLDivElement | null>) {
  const rf = useReactFlow();
  // Nœud courant mesuré et zoom de React Flow prêt (sinon `setCenter` est ignoré).
  const current = outline?.current;
  const measured = useFlowStore((s) => !!current && !!s.nodeLookup.get(current)?.measured.width);
  const ready = useFlowStore((s) => !!s.panZoom && s.width > 0);
  useEffect(() => {
    const id = outline?.current;
    const rect = container.current?.getBoundingClientRect();
    if (!id || !measured || !ready || !g || !rect) return;
    const boxOf = (nodeId: string): Box | undefined => {
      const n = rf.getInternalNode(nodeId);
      return n && { ...n.internals.positionAbsolute, width: n.measured.width ?? 240, height: n.measured.height ?? 100 };
    };
    const cur = boxOf(id);
    if (!cur) return;
    const near = g.edges.flatMap((e) => (e.from === id ? [e.to] : e.to === id ? [e.from] : []));
    const v = outlineView(cur, near.flatMap((n) => boxOf(n) ?? []), rect.width, rect.height);
    void rf.setCenter(v.x, v.y, { zoom: v.zoom, duration: 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outline?.focusKey, outline?.current, measured, ready]);
}
