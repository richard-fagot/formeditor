import { useEffect, useRef, type RefObject } from 'react';
import { useReactFlow, type Rect } from '@xyflow/react';
import { toCanvas } from 'html-to-image';
import { download, imageFileName, imageTitle } from '../../app/commands';
import { getGraph, useStore, useT, type GraphRef } from '../../app/store';

const MARGIN = 40;
const RATIO = 2;
/** Côté maximal d'un canvas, prudent pour Firefox et Chromium. */
const MAX_SIDE = 16384;
const HEADER = 48;

const nextFrame = () => new Promise<void>((r) => setTimeout(() => requestAnimationFrame(() => r()), 0));

/** Éléments conservés en mode « sélection seulement » (nœuds sélectionnés, arêtes entre eux). */
interface Keep {
  nodes: Set<string>;
  edges: Set<string>;
}

/** Écarte les éléments d'interface (poignées, rectangle de sélection) et, pour une sélection, le reste du graphe. */
function filterFor(keep?: Keep) {
  return (n: HTMLElement) => {
    if (!(n instanceof Element)) return true;
    const c = n.classList;
    if (c.contains('react-flow__handle') || c.contains('react-flow__nodesselection') || c.contains('react-flow__selection')) return false;
    if (!keep) return true;
    if (c.contains('react-flow__node')) return keep.nodes.has(n.getAttribute('data-id') ?? '');
    if (c.contains('react-flow__edge')) return keep.edges.has(n.getAttribute('data-id') ?? '');
    const label = n.getAttribute('data-edge-label');
    return label === null || keep.edges.has(label);
  };
}

/** Boîte englobante des nœuds et des tracés d'arêtes (une arête de retour peut sortir de la boîte des nœuds). */
function contentBounds(root: Element, nodes: Rect, edges: Set<string> | undefined): Rect {
  let { x, y } = nodes;
  let x2 = nodes.x + nodes.width;
  let y2 = nodes.y + nodes.height;
  for (const e of root.querySelectorAll<SVGGraphicsElement>('.react-flow__edge')) {
    if (edges && !edges.has(e.getAttribute('data-id') ?? '')) continue;
    const path = e.querySelector<SVGGraphicsElement>('.react-flow__edge-path');
    const b = path?.getBBox();
    if (!b) continue;
    x = Math.min(x, b.x); y = Math.min(y, b.y);
    x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
  }
  return { x, y, width: x2 - x, height: y2 - y };
}

/** Ajoute le bandeau de titre au-dessus de la capture (police système). */
function withTitle(capture: HTMLCanvasElement, title: string, ratio: number): HTMLCanvasElement {
  const font = `600 ${20 * ratio}px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`;
  const out = document.createElement('canvas');
  const ctx = out.getContext('2d')!;
  ctx.font = font;
  out.width = Math.max(capture.width, Math.ceil(ctx.measureText(title).width + 2 * MARGIN * ratio));
  out.height = capture.height + HEADER * ratio;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.font = font;
  ctx.fillStyle = '#1e293b';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, MARGIN * ratio, (MARGIN - 4) * ratio);
  ctx.drawImage(capture, 0, HEADER * ratio);
  return out;
}

/**
 * Export du logigramme en PNG à la demande (commande `view.exportImageRun`, compteur `imageRequest`) : capture de
 * `.react-flow__viewport` hors zoom (tous les nœuds sont dans le DOM), fond blanc, 2×, sans sélection ni transitions.
 */
export function useImageExport(graph: GraphRef, container: RefObject<HTMLDivElement | null>, enabled: boolean) {
  const rf = useReactFlow();
  const t = useT();
  const request = useStore((s) => s.imageRequest);
  const handled = useRef(request);
  useEffect(() => {
    if (!enabled || request === handled.current) return;
    handled.current = request;
    void exportImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, enabled]);

  async function exportImage() {
    const root = container.current;
    const viewport = root?.querySelector<HTMLElement>('.react-flow__viewport');
    const st = useStore.getState();
    const g = getGraph(st.ws, graph);
    const q = st.ws.questionnaires.find((x) => x.id === graph.id);
    if (!root || !viewport || !g || !q || !g.nodes.length) return;
    const previous = st.selection;
    const selected = st.imageOptions.scope === 'selection' && previous.graph?.id === graph.id ? previous.nodes : [];
    const keep: Keep | undefined = selected.length
      ? { nodes: new Set(selected), edges: new Set(g.edges.filter((e) => selected.includes(e.from) && selected.includes(e.to)).map((e) => e.id)) }
      : undefined;
    st.set((s) => void (s.imageBusy = true));
    root.setAttribute('data-exporting', '');
    st.select({ graph, nodes: [] });
    try {
      await nextFrame(); // rendu sans sélection validé avant la capture
      const nodes = rf.getNodes().filter((n) => !keep || keep.nodes.has(n.id));
      const b = contentBounds(root, rf.getNodesBounds(nodes), keep?.edges);
      const width = Math.ceil(b.width + 2 * MARGIN);
      const height = Math.ceil(b.height + 2 * MARGIN);
      const side = Math.max(width, height + HEADER);
      const ratio = side * RATIO > MAX_SIDE ? Math.floor((MAX_SIDE / side) * 100) / 100 : RATIO;
      const capture = await toCanvas(viewport, {
        backgroundColor: '#ffffff', pixelRatio: ratio, width, height, filter: filterFor(keep),
        style: { transform: `translate(${MARGIN - b.x}px, ${MARGIN - b.y}px) scale(1)`, width: `${width}px`, height: `${height}px` },
      });
      const title = imageTitle(q, st.contentLang, st.ws.project.defaultLanguage);
      const canvas = st.imageOptions.title ? withTitle(capture, title, ratio) : capture;
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
      if (!blob) throw new Error('canvas.toBlob');
      download(imageFileName(st.ws.project.name, title, new Date()), blob);
      if (ratio < RATIO) st.set((s) => void (s.notice = { title: t('image.reduced'), lines: [t('image.reducedHint', { ratio })] }));
    } catch (e) {
      useStore.getState().set((s) => void (s.notice = { title: t('image.failed'), lines: [e instanceof Error ? e.message : String(e)] }));
    } finally {
      root.removeAttribute('data-exporting');
      useStore.getState().select(previous);
      useStore.getState().set((s) => void (s.imageBusy = false));
    }
  }
}
