import { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';
import { getGraph, layoutOf, scopeOf, useStore, type GraphRef } from '../../app/store';
import { computeLayout } from './autoLayout';

/**
 * Mise en page automatique à la demande (commande `view.layout`, compteur `layoutRequest`) : ELK avec les tailles
 * mesurées par React Flow, positions écrites en un point d'historique, puis la vue est ajustée.
 */
export function useAutoLayout(graph: GraphRef, readOnly?: boolean) {
  const rf = useReactFlow();
  const request = useStore((s) => s.layoutRequest);
  const handled = useRef(request);
  useEffect(() => {
    if (readOnly || request === handled.current) return;
    handled.current = request;
    const current = getGraph(useStore.getState().ws, graph);
    if (!current) return;
    const sizes = Object.fromEntries(rf.getNodes().map((n) => [n.id, { width: n.measured?.width ?? 240, height: n.measured?.height ?? 100 }]));
    void computeLayout(current, sizes).then((pos) => {
      useStore.getState().edit(scopeOf(graph), (ws) => {
        const layout = layoutOf(ws, graph.id);
        const l = layout.nodes;
        // Commentaires de révision (EVO-011) : déplacés avec leur question (même décalage).
        for (const c of layout.comments ?? []) {
          const before = l[c.node], after = pos[c.node];
          if (before && after && c.x !== undefined && c.y !== undefined) Object.assign(c, { x: c.x + after.x - before.x, y: c.y + after.y - before.y });
        }
        for (const [id, p] of Object.entries(pos)) l[id] = { ...l[id], ...p };
      });
      setTimeout(() => void rf.fitView({ padding: 0.2, maxZoom: 1.1, duration: 250 }), 30);
    });
  }, [request, readOnly, graph, rf]);
}
