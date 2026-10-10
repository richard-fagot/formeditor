import { newId, uniqueKey, type GraphNode } from '../../core/model';
import { nodeKind } from '../../registry';
import {
  activeGraphRef, addBlock, canMoveToLibrary, addLibraryQuestion, deleteLibraryItem, getGraph, groupEntries, groupIntoBlock, insertNode, moveToLibrary, placeNode,
  referenceNode, scopeOf, useStore, type GraphRef, type LibraryItem,
} from '../store';
import { makeTranslate } from '../i18n';
import { createAfter, inDiagram } from './graph-commands';
import type { Command } from './types';

const st = () => useStore.getState();
const t = () => makeTranslate(st().uiLang);
const ref = () => activeGraphRef(st());
const selected = () => {
  const r = ref();
  const id = st().selection.nodes.length === 1 ? st().selection.nodes[0] : undefined;
  return r && id ? getGraph(st().ws, r)?.nodes.find((n) => n.id === id) : undefined;
};
const isItem = (x: unknown): x is LibraryItem =>
  !!x && typeof x === 'object' && ((x as LibraryItem).kind === 'question' || (x as LibraryItem).kind === 'block') && typeof (x as LibraryItem).id === 'string';

/** Affiche un élément dans l'onglet Bibliothèque (sans élément : les jeux de libellés). */
export function showLibraryItem(item?: LibraryItem) {
  st().openTab('library');
  st().set((s) => void (s.libraryItem = item));
}

/** Insère une référence : à la position donnée (dépôt), sinon à la suite du nœud sélectionné. */
function insertItem(arg: unknown) {
  const r = (arg as { graph?: GraphRef }).graph ?? ref();
  const g = r && getGraph(st().ws, r);
  if (!r || !g || !isItem(arg)) return;
  const node = referenceNode(st().ws, g, arg, newId('n'));
  if (!node) return;
  const position = (arg as { position?: { x: number; y: number } }).position;
  if (!position) return createAfter(() => node, false, false);
  st().edit(scopeOf(r), (ws) => {
    insertNode(ws, r, node);
    placeNode(ws, r.id, node.id, position);
  });
  st().select({ graph: r, nodes: [node.id] });
}

/** Questions et blocs de la bibliothèque : création, affichage, insertion, regroupement, sorties. */
export function libraryItemCommands(): Command[] {
  return [
    {
      id: 'library.newQuestion', label: 'library.newQuestion', keys: [], scope: 'global',
      run: () => {
        let id = '';
        st().edit('library', (ws) => void (id = addLibraryQuestion(ws, { [st().contentLang]: t()('node.newLabel') })));
        showLibraryItem({ kind: 'question', id });
      },
    },
    {
      id: 'library.newBlock', label: 'library.newBlock', keys: [], scope: 'global',
      run: () => {
        let id = '';
        st().edit('library', (ws) => void (id = addBlock(ws, { [st().contentLang]: t()('library.newBlockTitle') })));
        showLibraryItem({ kind: 'block', id });
      },
    },
    { id: 'library.show', label: 'tab.library', keys: [], scope: 'global', hidden: true, run: (item) => showLibraryItem(isItem(item) ? item : undefined) },
    {
      id: 'library.delete', label: 'library.delete', keys: [], scope: 'global', hidden: true,
      run: (item) => {
        if (!isItem(item)) return;
        st().edit('library', (ws) => deleteLibraryItem(ws, item));
        if (st().libraryItem?.id === item.id) showLibraryItem();
      },
    },
    {
      id: 'library.insert', label: 'library.insert', keys: ['i'], scope: 'graph',
      enabled: () => inDiagram() && (st().ws.library.questions.length > 0 || st().ws.library.blocks.length > 0),
      run: () => st().set((s) => void (s.palette = { open: true, mode: 'library' })),
    },
    // `arg` : { kind, id, graph?, position? } — palette, panneau latéral ou dépôt sur le logigramme.
    { id: 'library.insertItem', label: 'library.insert', keys: [], scope: 'graph', hidden: true, run: insertItem },
    {
      id: 'view.libraryPanel', label: 'view.libraryPanel', keys: [], scope: 'global',
      run: () => st().set((s) => void (s.libraryPanel = !s.libraryPanel)),
    },
    {
      id: 'node.group', label: 'node.group', keys: ['$mod+g'], scope: 'graph',
      enabled: () => ref()?.kind === 'questionnaire' && inDiagram() && st().selection.nodes.length > 0,
      run: () => {
        const r = ref()!;
        const ids = st().selection.nodes;
        const entries = groupEntries(st().ws, r, ids);
        if (entries.length > 1) {
          const tt = t();
          const g = getGraph(st().ws, r)!;
          const name = (id: string) => { const n = g.nodes.find((x) => x.id === id); return n && 'key' in n ? String(n.key) : id; };
          st().set((s) => void (s.notice = { title: tt('group.refused'), lines: [tt('group.multipleEntries', { list: entries.map(name).join(', ') })] }));
          return;
        }
        const title = { [st().contentLang]: t()('library.newBlockTitle') };
        const res = groupIntoBlock(JSON.parse(JSON.stringify(st().ws)), r, ids, title);
        if (!res) return;
        // Le bloc créé touche aussi la bibliothèque : `edit` en fait une transaction (annulable depuis l'un ou l'autre onglet).
        st().edit(scopeOf(r), () => res.ws);
        st().select({ graph: r, nodes: [res.instanceId] });
      },
    },
    {
      id: 'node.toLibrary', label: 'node.toLibrary', keys: [], scope: 'graph',
      enabled: () => { const n = selected(); return !!n && canMoveToLibrary(st().ws, ref()!, n.id); },
      run: () => {
        const r = ref()!;
        const id = selected()!.id;
        st().edit(scopeOf(r), (ws) => void moveToLibrary(ws, r, id));
      },
    },
    {
      id: 'node.openInLibrary', label: 'node.openInLibrary', keys: [], scope: 'graph',
      enabled: () => { const n = selected(); return !!n && (n.kind === 'block' || (n.kind === 'question' && 'ref' in n)); },
      run: () => {
        const n = selected() as GraphNode & { ref: string };
        showLibraryItem({ kind: n.kind === 'block' ? 'block' : 'question', id: n.ref });
      },
    },
    {
      id: 'node.newExit', label: 'node.newExit', keys: [], scope: 'graph', enabled: () => ref()?.kind === 'block',
      run: () => {
        const g = getGraph(st().ws, ref()!)!;
        const names = g.nodes.flatMap((n) => (n.kind === 'exit' ? [n.name] : []));
        createAfter((id) => ({ ...nodeKind('exit').create!(id), name: uniqueKey('sortie', names) }) as GraphNode, false, false);
      },
    },
  ];
}
