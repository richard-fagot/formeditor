import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background, Controls, MarkerType, ReactFlow, ReactFlowProvider, useReactFlow,
  type Edge as RFEdge, type Node as RFNode, type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Issue } from '../../core/validation';
import { connect, getGraph, layoutOf, scopeOf, useStore, type GraphRef } from '../../app/store';
import { DiagramContext } from './DiagramContext';
import { NodeView, type NodeData } from './NodeView';
import { EdgeView } from './EdgeView';

const nodeTypes = { graphNode: NodeView };
const edgeTypes = { condition: EdgeView };

/** Logigramme d'un graphe (questionnaire ou bloc) : React Flow piloté par le store. */
export function Diagram({ graph, issues }: { graph: GraphRef; issues: Issue[] }) {
  return (
    <ReactFlowProvider>
      <DiagramInner graph={graph} issues={issues} />
    </ReactFlowProvider>
  );
}

function DiagramInner({ graph, issues }: { graph: GraphRef; issues: Issue[] }) {
  const g = useStore((s) => getGraph(s.ws, graph));
  const layout = useStore((s) => s.ws.layouts.find((l) => l.graph === graph.id));
  const selection = useStore((s) => s.selection);
  const fitRequest = useStore((s) => s.fitRequest);
  const container = useRef<HTMLDivElement>(null);
  const rf = useReactFlow();

  const nodes: RFNode<NodeData>[] = useMemo(
    () =>
      (g?.nodes ?? []).map((n) => ({
        id: n.id,
        type: 'graphNode',
        position: layout?.nodes[n.id] ?? { x: 0, y: 0 },
        data: { nodeId: n.id },
        selected: selection.nodes.includes(n.id),
      })),
    [g?.nodes, layout, selection.nodes],
  );
  const edges: RFEdge[] = useMemo(
    () =>
      (g?.edges ?? []).map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        type: 'condition',
        selected: selection.edge === e.id,
        markerEnd: { type: MarkerType.ArrowClosed, color: selection.edge === e.id ? '#6366f1' : '#94a3b8' },
      })),
    [g?.edges, selection.edge],
  );

  const issuesByNode = useMemo(() => {
    const m = new Map<string, Issue[]>();
    for (const i of issues) if (i.nodeId) m.set(i.nodeId, [...(m.get(i.nodeId) ?? []), i]);
    return m;
  }, [issues]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const selects = changes.filter((c) => c.type === 'select');
      if (selects.length) {
        const cur = new Set(useStore.getState().selection.nodes);
        for (const c of selects) if (c.type === 'select') (c.selected ? cur.add(c.id) : cur.delete(c.id));
        const ids = [...cur];
        if (ids.join() !== useStore.getState().selection.nodes.join()) useStore.getState().select({ graph, nodes: ids });
      }
      const moves = changes.filter((c) => c.type === 'position' && c.position);
      if (!moves.length) return;
      useStore.getState().silent((ws) => {
        const l = layoutOf(ws, graph.id).nodes;
        for (const c of moves) if (c.type === 'position' && c.position) l[c.id] = { ...l[c.id], x: Math.round(c.position.x), y: Math.round(c.position.y) };
      });
    },
    [graph],
  );

  useEffect(() => {
    void rf.fitView({ padding: 0.2, maxZoom: 1.1, duration: fitRequest ? 250 : 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequest, graph.id]);

  // Garde le nœud sélectionné visible (navigation au clavier, création chaînée).
  useEffect(() => {
    const id = selection.nodes.length === 1 ? selection.nodes[0] : undefined;
    const p = id ? layout?.nodes[id] : undefined;
    const box = container.current?.getBoundingClientRect();
    if (!p || !box) return;
    const { x, y, zoom } = rf.getViewport();
    const sx = p.x * zoom + x;
    const sy = p.y * zoom + y;
    if (sx < 0 || sy < 0 || sx + 240 * zoom > box.width || sy + 100 * zoom > box.height) {
      void rf.setCenter(p.x + 120, p.y + 50, { zoom, duration: 200 });
    }
  }, [selection.nodes, layout, rf]);

  const focusGraph = () => container.current?.focus({ preventScroll: true });

  return (
    <DiagramContext.Provider value={{ graph, issuesByNode }}>
      <div ref={container} tabIndex={0} data-graph-focus data-testid="diagram" className="h-full w-full outline-none">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStart={() => useStore.getState().checkpoint(scopeOf(graph))}
          onNodeClick={focusGraph}
          onEdgeClick={(_, e) => {
            useStore.getState().select({ graph, nodes: [], edge: e.id });
            focusGraph();
          }}
          onPaneClick={() => {
            useStore.getState().select({ graph, nodes: [] });
            focusGraph();
          }}
          onNodeDoubleClick={(_, n) => useStore.getState().requestFocus('label', n.id)}
          onConnect={(c) => c.source && c.target && useStore.getState().edit(scopeOf(graph), (ws) => void connect(ws, graph, c.source, c.target))}
          deleteKeyCode={null}
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Shift"
          disableKeyboardA11y
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </DiagramContext.Provider>
  );
}
