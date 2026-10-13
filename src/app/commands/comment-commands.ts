import {
  activeGraphRef, addComment, addReply, commentKey, commentOf, commentsOf, deleteComment, deleteReply, getGraph, hostScope, useStore,
  type CommentRef,
} from '../store';
import { inDiagram } from './graph-commands';
import { showLibraryItem } from './library-item-commands';
import type { Command } from './types';

const st = () => useStore.getState();

const isRef = (a: unknown): a is CommentRef => {
  const r = a as CommentRef | undefined;
  return !!r && typeof r.node === 'string' && !!r.host && typeof r.host.id === 'string'
    && ['questionnaire', 'fragment', 'question'].includes(r.host.kind);
};

/** Question sélectionnée seule dans le logigramme affiché. */
function selectedQuestion(): CommentRef | undefined {
  const r = activeGraphRef(st());
  const ids = st().selection.nodes;
  if (!r || !inDiagram() || ids.length !== 1) return undefined;
  const n = getGraph(st().ws, r)?.nodes.find((x) => x.id === ids[0]);
  return n?.kind === 'question' ? { host: r, node: n.id } : undefined;
}

/** Commentaire visé : argument, sinon la question sélectionnée. */
const target = (arg: unknown) => (isRef(arg) ? arg : selectedQuestion());

const setShown = (key: string, shown: boolean) =>
  st().set((s) => void (s.shownComments = shown ? [...new Set([...s.shownComments, key])] : s.shownComments.filter((k) => k !== key)));

/** Affiche l'objet du commentaire : onglet du questionnaire (vue logigramme), du fragment ou question dans la bibliothèque. */
function openHost(r: CommentRef) {
  const { host } = r;
  if (host.kind === 'question') return showLibraryItem({ kind: 'question', id: host.id });
  if (host.kind === 'fragment') return showLibraryItem({ kind: 'fragment', id: host.id });
  st().openTab(`q:${host.id}`);
  st().set((s) => void (s.view[host.id] = 'diagram'));
}

/** Commentaires de révision (EVO-011). */
export function commentCommands(): Command[] {
  return [
    {
      // `arg` : { host, node } (menu contextuel) ; sinon la question sélectionnée. Existant : affiché, pas de second commentaire.
      id: 'comment.add', label: 'comment.add', keys: [], scope: 'global', enabled: (arg) => !!target(arg),
      run: (arg) => {
        const r = target(arg);
        if (!r) return;
        if (!commentOf(st().ws, r)) st().edit(hostScope(r.host), (ws) => void addComment(ws, r));
        if (r.host.kind === 'question') openHost(r);
        setShown(commentKey(r), true);
        st().requestFocus('comment', commentKey(r));
      },
    },
    {
      // `arg` : { host, node } (icône du nœud) ; sinon la question sélectionnée.
      id: 'comment.toggle', label: 'comment.toggle', keys: [], scope: 'global',
      enabled: (arg) => { const r = target(arg); return !!r && !!commentOf(st().ws, r); },
      run: (arg) => {
        const r = target(arg);
        if (r && commentOf(st().ws, r)) setShown(commentKey(r), !st().shownComments.includes(commentKey(r)));
      },
    },
    {
      // Graphe affiché : affiche tout si un commentaire est masqué, sinon masque tout.
      id: 'comment.toggleAll', label: 'comment.toggleAll', keys: [], scope: 'global',
      enabled: () => { const r = activeGraphRef(st()); return !!r && inDiagram() && commentsOf(st().ws, r.id).length > 0; },
      run: () => {
        const r = activeGraphRef(st());
        if (!r) return;
        const keys = commentsOf(st().ws, r.id).map((c) => commentKey({ host: r, node: c.node }));
        const show = keys.some((k) => !st().shownComments.includes(k));
        st().set((s) => void (s.shownComments = show ? [...new Set([...s.shownComments, ...keys])] : s.shownComments.filter((k) => !keys.includes(k))));
      },
    },
    {
      // `arg` : { host, node } : nouvelle réponse vide en fin de fil, en saisie.
      id: 'comment.reply', label: 'comment.reply', keys: [], scope: 'global', hidden: true,
      run: (arg) => {
        if (!isRef(arg) || !commentOf(st().ws, arg)) return;
        let i = -1;
        st().edit(hostScope(arg.host), (ws) => void (i = addReply(ws, arg)));
        st().requestFocus('comment', `${commentKey(arg)}#${i}`);
      },
    },
    {
      // `arg` : { host, node, index }.
      id: 'comment.deleteReply', label: 'comment.deleteReply', keys: [], scope: 'global', hidden: true,
      run: (arg) => {
        const index = (arg as { index?: unknown } | undefined)?.index;
        if (isRef(arg) && typeof index === 'number') st().edit(hostScope(arg.host), (ws) => deleteReply(ws, arg, index));
      },
    },
    {
      // `arg` : { host, node } ; sinon la question sélectionnée. Texte initial et réponses.
      id: 'comment.delete', label: 'comment.delete', keys: [], scope: 'global',
      enabled: (arg) => { const r = target(arg); return !!r && !!commentOf(st().ws, r); },
      run: (arg) => {
        const r = target(arg);
        if (!r || !commentOf(st().ws, r)) return;
        st().edit(hostScope(r.host), (ws) => deleteComment(ws, r));
        setShown(commentKey(r), false);
      },
    },
    {
      // `arg` : { host, node } : ouvre l'objet, commentaires de l'objet affichés, vue centrée sur le commentaire.
      id: 'comment.open', label: 'comment.open', keys: [], scope: 'global', hidden: true,
      run: (arg) => {
        if (!isRef(arg)) return;
        openHost(arg);
        if (arg.host.kind === 'question') return;
        const keys = commentsOf(st().ws, arg.host.id).map((c) => commentKey({ host: arg.host, node: c.node }));
        st().set((s) => {
          s.shownComments = [...new Set([...s.shownComments, ...keys])];
          s.selection = { graph: { kind: arg.host.kind as 'questionnaire' | 'fragment', id: arg.host.id }, nodes: [arg.node] };
          s.centerRequest = { graph: arg.host.id, node: arg.node, n: (s.centerRequest?.n ?? 0) + 1 };
        });
      },
    },
    { id: 'tab.comments', label: 'tab.comments', keys: [], scope: 'global', run: () => st().openTab('comments') },
  ];
}
