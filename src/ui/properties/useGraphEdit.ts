import { getGraph, scopeOf, updateNode, useStore, type GraphRef } from '../../app/store';
import type { GraphNode, Workspace } from '../../core/model';

/** Modifications du graphe depuis le panneau (historique regroupé par champ). */
export function useGraphEdit(graph: GraphRef) {
  const edit = (key: string, recipe: (ws: Workspace) => Workspace | void) => useStore.getState().edit(scopeOf(graph), recipe, key);
  return {
    edit,
    patchNode: (nodeId: string, patch: Partial<GraphNode>, field = Object.keys(patch).join()) =>
      edit(`${nodeId}:${field}`, (ws) => updateNode(ws, graph, nodeId, patch)),
    patchEdge: (edgeId: string, patch: { when?: string; exit?: string }) =>
      edit(`${edgeId}:${Object.keys(patch).join()}`, (ws) => {
        const e = getGraph(ws, graph)?.edges.find((x) => x.id === edgeId);
        if (!e) return;
        for (const [k, v] of Object.entries(patch)) {
          if (v === undefined) delete (e as unknown as Record<string, unknown>)[k];
          else (e as unknown as Record<string, unknown>)[k] = v;
        }
      }),
  };
}
