import { useCallback, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useReactFlow, type Node as RFNode } from '@xyflow/react';
import { command, labelOf, runCommand, setPastePoint } from '../../app/commands';
import { formatKey, keysOf } from '../../app/shortcuts';
import { getGraph, useStore, useT, type GraphRef } from '../../app/store';
import { ContextMenu } from '../../ui-kit';

/**
 * Copier-coller au clic droit (EVO-010), « Commenter » sur une question (EVO-011), position du pointeur : le collage (Ctrl+V) place la sélection
 * au pointeur s'il est sur le logigramme ; le menu colle au point du clic.
 */
export function useDiagramMenu(graph: GraphRef, readOnly?: boolean) {
  const t = useT();
  const rf = useReactFlow();
  const [menu, setMenu] = useState<{ x: number; y: number; flow: { x: number; y: number }; node: boolean; question: boolean }>();
  const close = useCallback(() => setMenu(undefined), []);
  const open = (e: ReactMouseEvent | MouseEvent, node?: RFNode) => {
    e.preventDefault();
    if (node?.type === 'comment') return;
    if (node && !useStore.getState().selection.nodes.includes(node.id)) useStore.getState().select({ graph, nodes: [node.id] });
    if (!node) useStore.getState().select({ graph, nodes: [] });
    setMenu({ x: e.clientX, y: e.clientY, flow: rf.screenToFlowPosition({ x: e.clientX, y: e.clientY }), node: !!node,
      question: getGraph(useStore.getState().ws, graph)?.nodes.find((n) => n.id === node?.id)?.kind === 'question' });
  };
  const item = (id: string, arg?: unknown) => {
    const c = command(id)!;
    const key = keysOf(c)[0];
    return { label: labelOf(c, t), hint: key && formatKey(key), disabled: !!c.enabled && !c.enabled(), onSelect: () => runCommand(id, arg) };
  };
  if (readOnly) return { handlers: {}, pointer: {}, element: null };
  const items = menu ? [...(menu.node ? [item('node.copy')] : []), item('node.paste', { position: menu.flow }), ...(menu.node ? [item('node.duplicate')] : []),
    // Commentaire de révision (EVO-011) : question seule sélectionnée.
    ...(menu.question ? [item('comment.add')] : [])] : [];
  return {
    handlers: {
      onNodeContextMenu: (e: ReactMouseEvent, n: RFNode) => open(e, n),
      onPaneContextMenu: (e: ReactMouseEvent | MouseEvent) => open(e),
    },
    pointer: {
      onMouseMove: (e: ReactMouseEvent) => setPastePoint(graph.id, rf.screenToFlowPosition({ x: e.clientX, y: e.clientY })),
      onMouseLeave: () => setPastePoint(graph.id),
    },
    element: <ContextMenu at={menu} items={items} onClose={close} />,
  };
}
