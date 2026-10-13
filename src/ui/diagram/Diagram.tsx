import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Background, Controls, MarkerType, ReactFlow, ReactFlowProvider, useReactFlow,
  type Edge as RFEdge, type Node as RFNode, type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { isValidated } from '../../core/model';
import type { Issue } from '../../core/validation';
import { runCommand } from '../../app/commands';
import { isTyping } from '../../app/shortcuts';
import { getGraph, layoutOf, moveComment, scopeOf, useStore, type GraphRef } from '../../app/store';
import { DiagramContext } from './DiagramContext';
import { useAutoLayout } from './useAutoLayout';
import { useImageExport } from './useImageExport';
import { useKeepSelectionVisible } from './useKeepSelectionVisible';
import { useDiagramMenu } from './useDiagramMenu';
import { EmptyHint } from './EmptyHint';
import { ImageDialog } from './ImageDialog';
import { NodeView, type NodeData } from './NodeView';
import { EdgeView } from './EdgeView';
import { CommentNodeView } from './CommentNodeView';
import { COMMENT_PREFIX, useCommentNodes } from './useCommentNodes';
import { useCenterOnComment } from './useCenterOnComment';

const nodeTypes = { graphNode: NodeView, comment: CommentNodeView };

/** Type MIME des éléments de bibliothèque glissés sur le logigramme (`{ kind, id }`). */
export const LIBRARY_MIME = 'application/x-questionnaire-library';
const edgeTypes = { condition: EdgeView };

interface DiagramProps {
  graph: GraphRef;
  issues: Issue[];
  /** Lecture seule (vue côte à côte) : ni sélection, ni déplacement, ni liaison, ni dépôt ; ne prend pas le focus. */
  readOnly?: boolean;
}

/** Logigramme d'un graphe (questionnaire ou fragment) : React Flow piloté par le store. */
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
  // Formulaire validé (EVO-015) : nœuds du graphe figés ; les commentaires restent déplaçables.
  const locked = useStore((s) => graph.kind === 'questionnaire' && isValidated(s.ws.questionnaires.find((q) => q.id === graph.id)));

  // Mesures reprises de React Flow : sans elles, un nœud recréé (changement de sélection, déplacement) est masqué
  // (`visibility: hidden`) jusqu'à sa remesure et le logigramme disparaît brièvement.
  const graphNodes: RFNode<NodeData>[] = useMemo(
    () =>
      (g?.nodes ?? []).map((n) => ({
        id: n.id,
        type: 'graphNode',
        position: layout?.nodes[n.id] ?? { x: 0, y: 0 },
        data: { nodeId: n.id },
        draggable: !locked,
        selected: !readOnly && selection.nodes.includes(n.id),
        measured: rf.getInternalNode(n.id)?.measured,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [g?.nodes, layout, selection.nodes, readOnly, locked],
  );
  const fragments = useStore((s) => s.ws.library.fragments);
  const graphEdges: RFEdge[] = useMemo(() => {
    // Sortie inconnue (renommée, supprimée) : l'arête part de la poignée par défaut, reste visible et corrigeable.
    const exitsOf = (nodeId: string) => {
      const n = g?.nodes.find((x) => x.id === nodeId);
      const f = n?.kind === 'fragment' ? fragments.find((x) => x.id === n.ref) : undefined;
      return f?.nodes.flatMap((x) => (x.kind === 'exit' ? [x.name] : [])) ?? [];
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
  }, [g?.edges, g?.nodes, fragments, selection.edge, readOnly]);

  // Commentaires de révision affichés (EVO-011) : nœuds hors graphe et branches latérales.
  const shown = useStore((s) => s.shownComments);
  const comments = useCommentNodes(graph, g, layout, shown, rf, readOnly);
  const nodes = useMemo(() => [...graphNodes, ...comments.nodes] as RFNode[], [graphNodes, comments.nodes]);
  const edges = useMemo(() => [...graphEdges, ...comments.edges], [graphEdges, comments.edges]);
  useCenterOnComment(graph);

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
        for (const c of moves) {
          if (c.type !== 'position' || !c.position) continue;
          if (c.id.startsWith(COMMENT_PREFIX)) moveComment(ws, { host: graph, node: c.id.slice(COMMENT_PREFIX.length) }, c.position.x, c.position.y);
          else l[c.id] = { ...l[c.id], x: Math.round(c.position.x), y: Math.round(c.position.y) };
        }
      });
    },
    [graph],
  );

  useEffect(() => {
    void rf.fitView({ padding: 0.2, maxZoom: 1.1, duration: fitRequest ? 250 : 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequest, graph.id]);

  useAutoLayout(graph, readOnly);
  // Export en image : logigramme modifiable d'un questionnaire seulement (ni bloc, ni vue côte à côte).
  const exportable = !readOnly && graph.kind === 'questionnaire';
  useImageExport(graph, container, exportable);

  useKeepSelectionVisible(container, layout?.nodes, readOnly);

  const focusGraph = () => container.current?.focus({ preventScroll: true });
  const menu = useDiagramMenu(graph, readOnly);

  // À l'ouverture d'un graphe (nouveau questionnaire, changement d'onglet), le logigramme prend le focus
  // pour que les raccourcis à une lettre (N…) agissent aussitôt, sauf si une saisie est en cours.
  useEffect(() => {
    if (!readOnly && !isTyping(document.activeElement, { dialog: true })) focusGraph();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.id]);

  return (
    <DiagramContext.Provider value={{ graph, issuesByNode, readOnly, locked }}>
      <div ref={container} tabIndex={readOnly ? undefined : 0} data-graph-focus={readOnly ? undefined : ''} data-testid={readOnly ? 'diagram-compare' : 'diagram'}
        className="relative h-full w-full outline-none" {...menu.pointer}
        onDragOver={(e) => {
          if (!readOnly && !locked && e.dataTransfer.types.includes(LIBRARY_MIME)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          const raw = e.dataTransfer.getData(LIBRARY_MIME);
          if (!raw || readOnly || locked) return;
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
            nodesConnectable: !locked,
            onNodeDragStart: () => useStore.getState().checkpoint(scopeOf(graph)),
            // Nœud commentaire : la saisie garde le focus.
            onNodeClick: (_: unknown, n: RFNode) => n.type !== 'comment' && focusGraph(),
            ...menu.handlers,
            onEdgeClick: (_: unknown, e: RFEdge) => {
              useStore.getState().select({ graph, nodes: [], edge: e.id });
              focusGraph();
            },
            onPaneClick: () => {
              useStore.getState().select({ graph, nodes: [] });
              focusGraph();
            },
            onNodeDoubleClick: (_: unknown, n: RFNode) => n.type !== 'comment' && !locked && useStore.getState().requestFocus('label', n.id),
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
        {g && g.nodes.length === 0 && !readOnly && !locked && <EmptyHint />}
        {exportable && <ImageDialog graph={graph} />}
        {menu.element}
      </div>
    </DiagramContext.Provider>
  );
}
