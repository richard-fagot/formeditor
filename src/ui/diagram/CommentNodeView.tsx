import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CommentThread, HideCommentButton } from '../comments';
import { useDiagram } from './DiagramContext';

export type CommentNodeData = { node: string };

/** Nœud commentaire (EVO-011) : hors du graphe métier, déplaçable, relié à sa question par une branche latérale. */
export const CommentNodeView = memo(function CommentNodeView({ data }: NodeProps & { data: CommentNodeData }) {
  const { graph } = useDiagram();
  const cref = { host: graph, node: data.node };
  return (
    <div className="w-64 cursor-grab">
      <Handle id="left" type="target" position={Position.Left} isConnectable={false} className="!size-1.5 !border-amber-400 !bg-amber-100" />
      <Handle id="right" type="target" position={Position.Right} isConnectable={false} className="!size-1.5 !border-amber-400 !bg-amber-100" />
      <CommentThread cref={cref} actions={<HideCommentButton cref={cref} />} />
    </div>
  );
});
