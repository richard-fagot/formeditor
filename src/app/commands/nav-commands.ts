import { activeGraphRef, getGraph, scopeOf, useStore } from '../store';
import type { Command } from './types';

const st = () => useStore.getState();

/** Navigation aux flèches entre nœuds reliés : ↓ successeur, ↑ prédécesseur, ←/→ voisins (même parent). */
function navigate(dir: 'down' | 'up' | 'left' | 'right') {
  const r = activeGraphRef(st());
  const g = r && getGraph(st().ws, r);
  if (!r || !g) return;
  const current = st().selection.nodes[0];
  if (!current) {
    if (g.nodes[0]) st().select({ graph: r, nodes: [g.start || g.nodes[0].id] });
    return;
  }
  let target: string | undefined;
  if (dir === 'down') target = g.edges.find((e) => e.from === current)?.to;
  if (dir === 'up') target = g.edges.find((e) => e.to === current)?.from;
  if (dir === 'left' || dir === 'right') {
    const parent = g.edges.find((e) => e.to === current)?.from;
    const siblings = [...new Set(g.edges.filter((e) => e.from === parent).map((e) => e.to))];
    const i = siblings.indexOf(current);
    target = siblings[(i + (dir === 'right' ? 1 : -1) + siblings.length) % siblings.length];
  }
  if (target) st().select({ graph: r, nodes: [target] });
}

const scope = () => scopeOf(activeGraphRef(st()));

export function navCommands(): Command[] {
  return [
    { id: 'nav.down', label: 'node.navNext', keys: ['ArrowDown'], scope: 'graph', hidden: true, run: () => navigate('down') },
    { id: 'nav.up', label: 'node.navPrev', keys: ['ArrowUp'], scope: 'graph', hidden: true, run: () => navigate('up') },
    { id: 'nav.right', label: 'node.navSiblingNext', keys: ['ArrowRight'], scope: 'graph', hidden: true, run: () => navigate('right') },
    { id: 'nav.left', label: 'node.navSiblingPrev', keys: ['ArrowLeft'], scope: 'graph', hidden: true, run: () => navigate('left') },
    { id: 'edit.undo', label: 'edit.undo', keys: ['$mod+z'], scope: 'graph', run: () => st().undo(scope()) },
    { id: 'edit.redo', label: 'edit.redo', keys: ['$mod+Shift+z', '$mod+y'], scope: 'graph', run: () => st().redo(scope()) },
    { id: 'view.fit', label: 'view.fit', keys: ['f'], scope: 'graph', run: () => st().set((s) => void (s.fitRequest += 1)) },
    {
      id: 'view.toggle', label: 'view.toggle', keys: ['p'], scope: 'graph',
      enabled: () => st().activeTab.startsWith('q:'),
      run: () => {
        const id = st().activeTab.slice(2);
        st().set((s) => void (s.view[id] = (s.view[id] ?? 'diagram') === 'diagram' ? 'preview' : 'diagram'));
      },
    },
  ];
}
