import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { getGraph, useStore, useT } from '../../app/store';
import { cn } from '../../ui-kit';
import { useDiagram } from './DiagramContext';

const MAX = 32;

/** Arête : condition en abrégé, rang si plusieurs arêtes sortent du même nœud, « sinon ». */
export const EdgeView = memo(function EdgeView(props: EdgeProps) {
  const { graph, readOnly } = useDiagram();
  const t = useT();
  const edge = useStore((s) => getGraph(s.ws, graph)?.edges.find((e) => e.id === props.id));
  const siblings = useStore((s) => getGraph(s.ws, graph)?.edges.filter((e) => e.from === edge?.from && e.exit === edge?.exit).map((e) => e.id).join() ?? '');
  const [path, x, y] = getBezierPath(props);
  if (!edge) return null;
  const list = siblings.split(',');
  const conditioned = list.length > 1 || edge.when !== undefined;
  const rank = list.indexOf(edge.id) + 1;
  const text = edge.when ? (edge.when.length > MAX ? edge.when.slice(0, MAX) + '…' : edge.when) : edge.when === '' ? '?' : t('edge.else');
  return (
    <>
      <BaseEdge path={path} markerEnd={props.markerEnd} style={{ stroke: props.selected ? '#6366f1' : '#94a3b8', strokeWidth: props.selected ? 2 : 1.5 }} />
      {(conditioned || edge.exit) && (
        <EdgeLabelRenderer>
          <div
            style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
            className={cn(
              'nodrag nopan pointer-events-auto absolute max-w-56 cursor-pointer truncate rounded-md border bg-white px-1.5 py-0.5 font-mono text-[10px] shadow-xs',
              props.selected ? 'border-indigo-400 text-indigo-700' : 'border-slate-200 text-slate-600',
              !edge.when && 'italic text-slate-400',
            )}
            onClick={() => !readOnly && useStore.getState().select({ graph, nodes: [], edge: edge.id })}
            title={edge.when}
          >
            {edge.exit && <span className="mr-1 text-amber-600">{edge.exit}</span>}
            {list.length > 1 && <span className="mr-1 text-slate-400">{rank}.</span>}
            {conditioned && text}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
