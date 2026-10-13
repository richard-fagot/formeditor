import { useMemo } from 'react';
import type { Edge as RFEdge, Node as RFNode, ReactFlowInstance } from '@xyflow/react';
import type { Graph, Layout } from '../../core/model';
import { commentKey, type GraphRef } from '../../app/store';
import type { CommentNodeData } from './CommentNodeView';

/** Préfixe des ids React Flow des nœuds commentaire (`comment:<id du nœud question>`). */
export const COMMENT_PREFIX = 'comment:';
const COMMENT_WIDTH = 256;
const QUESTION_WIDTH = 240;

/**
 * Nœuds et branches des commentaires affichés du graphe (EVO-011). La branche part du côté gauche ou droit de la question
 * selon que le centre du commentaire est à gauche ou à droite du centre de la question.
 */
export function useCommentNodes(graph: GraphRef, g: Graph | undefined, layout: Layout | undefined, shown: string[], rf: ReactFlowInstance, readOnly?: boolean) {
  return useMemo(() => {
    const nodes: RFNode<CommentNodeData>[] = [];
    const edges: RFEdge[] = [];
    if (readOnly || !g) return { nodes, edges };
    for (const c of layout?.comments ?? []) {
      if (!shown.includes(commentKey({ host: graph, node: c.node })) || !g.nodes.some((n) => n.id === c.node)) continue;
      const id = COMMENT_PREFIX + c.node;
      const position = { x: c.x ?? 0, y: c.y ?? 0 };
      const q = layout?.nodes[c.node] ?? { x: 0, y: 0 };
      const qWidth = rf.getInternalNode(c.node)?.measured?.width ?? QUESTION_WIDTH;
      const left = position.x + COMMENT_WIDTH / 2 < q.x + qWidth / 2;
      nodes.push({ id, type: 'comment', position, data: { node: c.node }, selectable: false, draggable: true, measured: rf.getInternalNode(id)?.measured });
      edges.push({
        id: `${id}:edge`, source: c.node, sourceHandle: left ? 'comment-left' : 'comment-right', target: id, targetHandle: left ? 'right' : 'left',
        selectable: false, focusable: false, type: 'straight', data: { side: left ? 'left' : 'right' },
        style: { stroke: '#f59e0b', strokeDasharray: '4 3' },
      });
    }
    return { nodes, edges };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, g?.nodes, layout, shown, readOnly]);
}
