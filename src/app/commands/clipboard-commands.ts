import { isVariantLabel, type GraphNode, type Workspace } from '../../core/model';
import {
  activeGraphRef, copyNodes, duplicateLibraryItem, duplicateQuestionnaire, pasteNodes, scopeOf, useStore,
  type CopyName, type LibraryItem, type PasteDrop,
} from '../store';
import { makeTranslate, UI_LANGUAGES } from '../i18n';
import { inDiagram } from './graph-commands';
import { showLibraryItem } from './library-item-commands';
import type { Command } from './types';

const st = () => useStore.getState();
const t = () => makeTranslate(st().uiLang);
const ref = () => activeGraphRef(st());

/** Dernière position du pointeur sur le logigramme affiché (coordonnées du graphe) ; posée par `ui/diagram`. */
let pointer: { graph: string; x: number; y: number } | undefined;
export function setPastePoint(graph: string, p?: { x: number; y: number }) {
  pointer = p ? { graph, ...p } : pointer?.graph === graph ? undefined : pointer;
}

/** Texte sélectionné dans la page : Ctrl+C le copie normalement, pas les nœuds. */
const textSelected = () => typeof window !== 'undefined' && !!window.getSelection?.()?.toString();

const copyName: CopyName = (lang, name, n) => {
  const tt = makeTranslate((UI_LANGUAGES as readonly string[]).includes(lang) ? lang : st().uiLang);
  return n === 1 ? tt('copy.name', { name }) : tt('copy.nameN', { n, name });
};

function nodeName(ws: Workspace, n: GraphNode): string {
  const lang = st().contentLang;
  if (n.kind === 'fragment') return n.alias;
  if (n.kind === 'exit') return n.name;
  if (n.kind === 'question') return 'ref' in n ? (ws.library.questions.find((q) => q.id === n.ref)?.key ?? n.ref) : n.key;
  if (n.kind === 'end') return (isVariantLabel(n.message) ? n.message.otherwise : n.message)[lang] ?? n.id;
  return n.id;
}

function report(dropped: PasteDrop[], inFragment: boolean) {
  const clip = st().clipboard!;
  const tt = t();
  const lines = dropped.map((d) => {
    const n = clip.nodes.find((x) => x.id === d.nodeId)!;
    const key = d.reason === 'start' && inFragment ? 'paste.startFragment' : (`paste.${d.reason}` as const);
    return tt(key, { name: nodeName(st().ws, n) });
  });
  st().set((s) => void (s.notice = { title: tt('paste.title'), lines }));
}

/** Élément de bibliothèque visé : argument, sinon le fragment de l'onglet actif ou la question affichée dans l'onglet Bibliothèque. */
function libraryTarget(arg: unknown): LibraryItem | undefined {
  const a = arg as LibraryItem | undefined;
  if (a && (a.kind === 'question' || a.kind === 'fragment') && typeof a.id === 'string') return a;
  const tab = st().activeTab;
  if (tab.startsWith('f:')) return { kind: 'fragment', id: tab.slice(2) };
  return tab === 'library' ? st().libraryItem : undefined;
}

/** Copier-coller de nœuds et duplication d'un questionnaire ou d'un élément de bibliothèque (EVO-010). */
export function clipboardCommands(): Command[] {
  return [
    {
      id: 'node.copy', label: 'node.copy', keys: ['$mod+c'], scope: 'graph', enabled: () => inDiagram() && st().selection.nodes.length > 0 && !textSelected(),
      run: () => {
        const clip = copyNodes(st().ws, ref()!, st().selection.nodes);
        if (clip) st().set((s) => void (s.clipboard = clip));
      },
    },
    {
      // `arg` : { position? } (menu contextuel) ; sinon position du pointeur s'il est sur le logigramme.
      id: 'node.paste', label: 'node.paste', keys: ['$mod+v'], scope: 'graph',
      enabled: () => inDiagram() && st().clipboard?.project === st().ws.project.id,
      run: (arg) => {
        const r = ref()!;
        const clip = st().clipboard!;
        const position = (arg as { position?: { x: number; y: number } } | undefined)?.position ?? (pointer?.graph === r.id ? pointer : undefined);
        let res: ReturnType<typeof pasteNodes> = { ids: [], dropped: [] };
        st().edit(scopeOf(r), (ws) => void (res = pasteNodes(ws, r, clip, position && { x: position.x, y: position.y })));
        st().select({ graph: r, nodes: res.ids });
        if (res.dropped.length) report(res.dropped, r.kind === 'fragment');
      },
    },
    {
      id: 'questionnaire.duplicate', label: 'questionnaire.duplicate', keys: [], scope: 'global',
      enabled: () => st().ws.questionnaires.length > 0,
      run: (arg) => {
        const id = typeof arg === 'string' ? arg : st().activeTab.startsWith('q:') ? st().activeTab.slice(2) : undefined;
        if (!id) return;
        let copy: string | undefined;
        st().edit('project', (ws) => void (copy = duplicateQuestionnaire(ws, id, copyName)));
        if (copy) st().openTab(`q:${copy}`);
      },
    },
    {
      id: 'library.duplicate', label: 'library.duplicate', keys: [], scope: 'global',
      enabled: () => st().ws.library.questions.length + st().ws.library.fragments.length > 0,
      run: (arg) => {
        const item = libraryTarget(arg);
        if (!item) return;
        let copy: string | undefined;
        st().edit('library', (ws) => void (copy = duplicateLibraryItem(ws, item, copyName)));
        if (copy) showLibraryItem({ kind: item.kind, id: copy });
      },
    },
  ];
}

