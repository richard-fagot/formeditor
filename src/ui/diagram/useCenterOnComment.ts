import { useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import { commentOf, useStore, type GraphRef } from '../../app/store';

/** Ouverture depuis la page des commentaires (EVO-011) : centre la vue sur le commentaire demandé (`centerRequest`), puis l'efface. */
export function useCenterOnComment(graph: GraphRef) {
  const rf = useReactFlow();
  const request = useStore((s) => (s.centerRequest?.graph === graph.id ? s.centerRequest : undefined));
  useEffect(() => {
    if (!request) return;
    // Après l'ajustement initial de la vue (ouverture de l'onglet).
    const id = setTimeout(() => {
      const c = commentOf(useStore.getState().ws, { host: graph, node: request.node });
      if (c) void rf.setCenter((c.x ?? 0) + 128, (c.y ?? 0) + 60, { zoom: 1, duration: 200 });
      useStore.getState().set((s) => void (s.centerRequest = undefined));
    }, 80);
    return () => clearTimeout(id);
  }, [request, graph, rf]);
}
