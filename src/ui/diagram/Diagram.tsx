import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background, Controls, MarkerType, ReactFlow, ReactFlowProvider, useReactFlow,
  type Edge as RFEdge, type Node as RFNode, type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { Issue } from '../../core/validation';
import { command, runCommand } from '../../app/commands';
import { formatKey, isTyping } from '../../app/shortcuts';
import { getGraph, layoutOf, scopeOf, useStore, useT, type GraphRef } from '../../app/store';
import { Button, Kbd } from '../../ui-kit';
import { DiagramContext } from './DiagramContext';
import { useAutoLayout } from './useAutoLayout';
import { NodeView, type NodeData } from './NodeView';
import { EdgeView } from './EdgeView';

const nodeTypes = { graphNode: NodeView };

/** Type MIME des éléments de bibliothèque glissés sur le logigramme (`{ kind, id }`). */
export const LIBRARY_MIME = 'application/x-questionnaire-library';
const edgeTypes = { condition: EdgeView };

interface DiagramProps {
  graph: GraphRef;
  issues: Issue[];
  /** Lecture seule (vue côte à côte) : ni sélection, ni déplacement, ni liaison, ni dépôt ; ne prend pas le focus. */
  readOnly?: boolean;
}

/** Logigramme d'un graphe (questionnaire ou bloc) : React Flow piloté par le store. */
export function Diagram(props: DiagramProps) {
  return (
    <ReactFlowProvider>
      <DiagramInner {...props} />
    </ReactFlowProvider>
  );
}

function DiagramInner({ graph, issues, readOnly }: DiagramProps) {
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
        selected: !readOnly && selection.nodes.includes(n.id),
      })),
    [g?.nodes, layout, selection.nodes, readOnly],
  );
  const blocks = useStore((s) => s.ws.library.blocks);
  const edges: RFEdge[] = useMemo(() => {
    // Sortie inconnue (renommée, supprimée) : l'arête part de la poignée par défaut, reste visible et corrigeable.
    const exitsOf = (nodeId: string) => {
      const n = g?.nodes.find((x) => x.id === nodeId);
      const b = n?.kind === 'block' ? blocks.find((x) => x.id === n.ref) : undefined;
      return b?.nodes.flatMap((x) => (x.kind === 'exit' ? [x.name] : [])) ?? [];
    };
    return (g?.edges ?? []).map((e) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        sourceHandle: e.exit && exitsOf(e.from).includes(e.exit) ? e.exit : null,
        type: 'condition',
        selected: !readOnly && selection.edge === e.id,
        markerEnd: { type: MarkerType.ArrowClosed, color: !readOnly && selection.edge === e.id ? '#6366f1' : '#94a3b8' },
      }));
  }, [g?.edges, g?.nodes, blocks, selection.edge, readOnly]);

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

  useAutoLayout(graph, readOnly);

  // Garde le nœud sélectionné visible (navigation au clavier, création chaînée).
  useEffect(() => {
    const id = !readOnly && selection.nodes.length === 1 ? selection.nodes[0] : undefined;
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

  // À l'ouverture d'un graphe (nouveau questionnaire, changement d'onglet), le logigramme prend le focus
  // pour que les raccourcis à une lettre (N…) agissent aussitôt, sauf si une saisie est en cours.
  useEffect(() => {
    if (!readOnly && !isTyping(document.activeElement, { dialog: true })) focusGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.id]);

  return (
    <DiagramContext.Provider value={{ graph, issuesByNode, readOnly }}>
      <div ref={container} tabIndex={readOnly ? undefined : 0} data-graph-focus={readOnly ? undefined : ''} data-testid={readOnly ? 'diagram-compare' : 'diagram'}
        className="relative h-full w-full outline-none"
        onDragOver={(e) => {
          if (!readOnly && e.dataTransfer.types.includes(LIBRARY_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          const raw = e.dataTransfer.getData(LIBRARY_MIME);
          if (!raw || readOnly) return;
          e.preventDefault();
          const position = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
          runCommand('library.insertItem', { ...(JSON.parse(raw) as object), graph, position });
          focusGraph();
        }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          {...(readOnly ? { nodesDraggable: false, nodesConnectable: false, elementsSelectable: false } : {
            onNodesChange,
            onNodeDragStart: () => useStore.getState().checkpoint(scopeOf(graph)),
            onNodeClick: focusGraph,
            onEdgeClick: (_: unknown, e: RFEdge) => {
              useStore.getState().select({ graph, nodes: [], edge: e.id });
              focusGraph();
            },
            onPaneClick: () => {
              useStore.getState().select({ graph, nodes: [] });
              focusGraph();
            },
            onNodeDoubleClick: (_: unknown, n: RFNode) => useStore.getState().requestFocus('label', n.id),
            onConnect: (c: { source: string | null; target: string | null; sourceHandle?: string | null }) =>
              c.source && c.target && runCommand('edge.create', { graph, from: c.source, to: c.target, exit: c.sourceHandle ?? undefined }),
          })}
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
        {g && g.nodes.length === 0 && !readOnly && <EmptyHint />}
      </div>
    </DiagramContext.Provider>
  );
}

/** Invitation affichée sur un graphe vide : la première question, à la souris ou par N. */
function EmptyHint() {
  const t = useT();
  const custom = useStore((s) => s.keymap['node.newQuestion']);
  const key = (custom ?? command('node.newQuestion')?.keys ?? [])[0];
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" data-testid="diagram-empty">
      <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white/90 px-6 py-4 text-sm text-slate-500">
        <span>{t('diagram.empty')}</span>
        <Button size="sm" onClick={() => runCommand('node.newQuestion')}>{t('diagram.firstQuestion')}{key && <Kbd>{formatKey(key)}</Kbd>}</Button>
      </div>
    </div>
  );
}
