import { newId, uniqueKey, type GraphNode } from '../../core/model';
import { nodeKind } from '../../registry';
import {
  commentsOf, activeGraphRef, addFragment, canExtract, canMoveToLibrary, copyToLibrary, addLibraryQuestion, deleteLibraryItem, getGraph, groupEntries, groupIntoFragment, insertNode,
  insertionCycle, placeNode, referenceNode, scopeOf, useStore, type GraphRef, type LibraryItem,
} from '../store';
import { makeTranslate } from '../i18n';
import { confirm, inform, refuse } from '../feedback';
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
  !!x && typeof x === 'object' && ((x as LibraryItem).kind === 'question' || (x as LibraryItem).kind === 'fragment') && typeof (x as LibraryItem).id === 'string';

/**
 * Affiche un élément : une question dans l'onglet Bibliothèque (sans élément : les jeux de libellés),
 * un fragment dans son propre onglet (EVO-008).
 */
export function showLibraryItem(item?: LibraryItem) {
  if (item?.kind === 'fragment') {
    st().openTab(`f:${item.id}`);
    return;
  }
  st().openTab('library');
  st().set((s) => void (s.libraryItem = item));
}

/** Ouvre l'objet lié s'il existe dans la bibliothèque, sinon le signale (EVO-013). */
function openRef(arg: unknown) {
  if (!isItem(arg)) return;
  const lib = st().ws.library;
  if ((arg.kind === 'question' ? lib.questions : lib.fragments).some((x) => x.id === arg.id)) return showLibraryItem(arg);
  refuse('library.brokenRef', { key: 'library.brokenRefLine', params: { id: arg.id } });
}

/** Insère une référence : à la position donnée (dépôt), sinon à la suite du nœud sélectionné. */
function insertItem(arg: unknown) {
  const r = (arg as { graph?: GraphRef }).graph ?? ref();
  const g = r && getGraph(st().ws, r);
  if (!r || !g || !isItem(arg)) return;
  if (insertionCycle(st().ws, r, arg)) {
    const f = st().ws.library.fragments.find((x) => x.id === arg.id);
    const name = f ? (f.title[st().contentLang] ?? f.key) : arg.id;
    refuse('insert.refused', { key: 'insert.cycle', params: { name } });
    return;
  }
  const node = referenceNode(st().ws, r, arg, newId('n'));
  if (!node) return;
  const position = (arg as { position?: { x: number; y: number } }).position;
  if (!position) return createAfter(() => node, false, false);
  st().edit(scopeOf(r), (ws) => {
    insertNode(ws, r, node);
    placeNode(ws, r.id, node.id, position);
  });
  st().select({ graph: r, nodes: [node.id] });
}

/**
 * Copie en bibliothèque (EVO-009) : même clé si elle est libre ; sinon dialogue de choix d'une autre clé
 * (`copyRequest`), puis rapport des références réécrites.
 */
function copyQuestion(arg?: { graph?: GraphRef; nodeId?: string; key?: string }) {
  const r = arg?.graph ?? ref();
  const id = arg?.nodeId ?? selected()?.id;
  if (!r || !id) return;
  if (!arg?.key && !canMoveToLibrary(st().ws, r, id)) {
    st().set((s) => void (s.copyRequest = { graph: r, nodeId: id }));
    return;
  }
  const res = copyToLibrary(st().ws, r, id, arg?.key);
  if (!res) return;
  st().set((s) => void (s.copyRequest = undefined));
  st().edit(scopeOf(r), () => res.ws);
  if (res.rewritten.length) {
    inform('copy.rewritten', ...res.rewritten.map((x) => ({ raw: `${x.loc.nodeId ?? x.loc.edgeId ?? ''} · ${x.loc.property} : ${x.before} → ${x.after}` })));
  }
}

/** Questions et fragments de la bibliothèque : création, affichage, insertion, extraction, entrée, sorties. */
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
      id: 'library.newFragment', label: 'library.newFragment', keys: [], scope: 'global',
      run: () => {
        let id = '';
        st().edit('library', (ws) => void (id = addFragment(ws, { [st().contentLang]: t()('library.newFragmentTitle') })));
        showLibraryItem({ kind: 'fragment', id });
      },
    },
    // EVO-013 : double-clic sur le badge « bib. » ; `arg` : { kind, id } ; lien rompu → message, aucune navigation.
    { id: 'library.openRef', label: 'node.openInLibrary', keys: [], scope: 'global', hidden: true, run: openRef },
    { id: 'library.show', label: 'tab.library', keys: [], scope: 'global', hidden: true, run: (item) => showLibraryItem(isItem(item) ? item : undefined) },
    {
      id: 'library.delete', label: 'library.delete', keys: [], scope: 'global', hidden: true,
      run: (item) => {
        if (!isItem(item)) return;
        // Question réutilisable commentée, ou fragment dont des questions sont commentées (EVO-011) : confirmation.
        if (commentsOf(st().ws, item.id).length && !confirm(item.kind === 'fragment' ? 'comment.confirmDeleteFragment' : 'comment.confirmDelete')) return;
        st().edit('library', (ws) => deleteLibraryItem(ws, item));
        if (item.kind === 'fragment') st().closeTab(`f:${item.id}`);
        if (st().libraryItem?.id === item.id) showLibraryItem();
      },
    },
    {
      id: 'library.insert', label: 'library.insert', keys: ['i'], scope: 'graph',
      enabled: () => inDiagram() && (st().ws.library.questions.length > 0 || st().ws.library.fragments.length > 0),
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
        if (!canExtract(st().ws, r, ids)) return refuse('group.refused', 'group.forbidden');
        if (entries.length > 1) {
          const g = getGraph(st().ws, r)!;
          const name = (id: string) => { const n = g.nodes.find((x) => x.id === id); return n && 'key' in n ? String(n.key) : id; };
          return refuse('group.refused', { key: 'group.multipleEntries', params: { list: entries.map(name).join(', ') } });
        }
        const title = { [st().contentLang]: t()('library.newFragmentTitle') };
        const res = groupIntoFragment(JSON.parse(JSON.stringify(st().ws)), r, ids, title);
        if (!res) return;
        // Le fragment créé touche aussi la bibliothèque : `edit` en fait une transaction (annulable depuis l'un ou l'autre onglet).
        st().edit(scopeOf(r), () => res.ws);
        st().select({ graph: r, nodes: [res.instanceId] });
      },
    },
    {
      // Question locale sélectionnée (EVO-009). `arg` : { graph, nodeId, key } — clé choisie dans le dialogue si la clé est prise.
      id: 'node.toLibrary', label: 'node.toLibrary', keys: [], scope: 'graph',
      enabled: () => { const n = selected(); return !!n && n.kind === 'question' && !('ref' in n); },
      run: (arg) => copyQuestion(arg as { graph?: GraphRef; nodeId?: string; key?: string } | undefined),
    },
    {
      id: 'node.openInLibrary', label: 'node.openInLibrary', keys: [], scope: 'graph',
      enabled: () => { const n = selected(); return !!n && n.kind === 'question' && 'ref' in n; },
      run: () => showLibraryItem({ kind: 'question', id: (selected() as GraphNode & { ref: string }).ref }),
    },
    {
      // Nœud fragment sélectionné : ouvre le fragment dans son onglet.
      id: 'node.openFragment', label: 'node.openFragment', keys: [], scope: 'graph',
      enabled: () => selected()?.kind === 'fragment',
      run: () => showLibraryItem({ kind: 'fragment', id: (selected() as GraphNode & { ref: string }).ref }),
    },
    {
      // Entrée explicite d'un fragment ; sur l'entrée déjà réglée : retour à l'entrée implicite.
      id: 'node.setEntry', label: 'node.setEntry', keys: [], scope: 'graph',
      enabled: () => ref()?.kind === 'fragment' && !!selected(),
      run: () => {
        const r = ref()!;
        const id = selected()!.id;
        st().edit(scopeOf(r), (ws) => {
          const f = ws.library.fragments.find((x) => x.id === r.id);
          if (!f) return;
          if (f.entry === id) delete f.entry;
          else f.entry = id;
        });
      },
    },
    {
      id: 'node.newExit', label: 'node.newExit', keys: [], scope: 'graph', enabled: () => ref()?.kind === 'fragment',
      run: () => {
        const g = getGraph(st().ws, ref()!)!;
        const names = g.nodes.flatMap((n) => (n.kind === 'exit' ? [n.name] : []));
        createAfter((id) => ({ ...nodeKind('exit').create!(id), name: uniqueKey('sortie', names) }) as GraphNode, false, false);
      },
    },
  ];
}
