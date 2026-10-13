// Commentaires de révision (EVO-011) : rangés dans la mise en page de l'objet commenté (`layout.comments`).
import type { ReviewComment, Workspace } from '../../core/model';
import { layoutOf, NODE_SPACING } from './graph';
import type { Scope } from './history';

/** Objet qui porte un commentaire : questionnaire, fragment ou question de bibliothèque. */
export interface CommentHost {
  kind: 'questionnaire' | 'fragment' | 'question';
  id: string;
}

/** Commentaire désigné : objet et nœud question (id de la question elle-même pour une question de bibliothèque). */
export interface CommentRef {
  host: CommentHost;
  node: string;
}

/** Clé d'un commentaire dans l'état de session (affichage, focus). */
export const commentKey = (r: CommentRef) => `${r.host.id}/${r.node}`;

/** Portée d'historique de l'objet commenté. */
export const hostScope = (h: CommentHost): Scope => (h.kind === 'questionnaire' ? `q:${h.id}` : 'library');

export function commentOf(ws: Workspace, r: CommentRef): ReviewComment | undefined {
  return ws.layouts.find((l) => l.graph === r.host.id)?.comments?.find((c) => c.node === r.node);
}

/** Commentaires d'un objet (graphe ou question de bibliothèque). */
export function commentsOf(ws: Workspace, hostId: string): ReviewComment[] {
  return ws.layouts.find((l) => l.graph === hostId)?.comments ?? [];
}

/** Tous les commentaires du projet : questionnaires (ordre du projet), fragments, puis questions de bibliothèque. */
export function allComments(ws: Workspace): (CommentRef & { comment: ReviewComment })[] {
  const hosts: CommentHost[] = [
    ...ws.questionnaires.map((q) => ({ kind: 'questionnaire' as const, id: q.id })),
    ...ws.library.fragments.map((f) => ({ kind: 'fragment' as const, id: f.id })),
    ...ws.library.questions.map((q) => ({ kind: 'question' as const, id: q.id })),
  ];
  return hosts.flatMap((host) => commentsOf(ws, host.id).map((comment) => ({ host, node: comment.node, comment })));
}

/**
 * Crée le commentaire d'une question (texte vide, sans réponse), à droite de la question dans un graphe.
 * Une question a au plus un commentaire : renvoie `false` s'il existe déjà.
 */
export function addComment(ws: Workspace, r: CommentRef): boolean {
  if (commentOf(ws, r)) return false;
  const layout = layoutOf(ws, r.host.id);
  const p = layout.nodes[r.node];
  const at = r.host.kind === 'question' ? {} : { x: (p?.x ?? 0) + NODE_SPACING.x, y: p?.y ?? 0 };
  (layout.comments ??= []).push({ node: r.node, ...at, text: '', replies: [] });
  return true;
}

function edit(ws: Workspace, r: CommentRef, f: (c: ReviewComment) => void): void {
  const c = ws.layouts.find((l) => l.graph === r.host.id)?.comments?.find((x) => x.node === r.node);
  if (c) f(c);
}

export const setCommentText = (ws: Workspace, r: CommentRef, text: string) => edit(ws, r, (c) => void (c.text = text));
export const moveComment = (ws: Workspace, r: CommentRef, x: number, y: number) => edit(ws, r, (c) => Object.assign(c, { x: Math.round(x), y: Math.round(y) }));
export const setReply = (ws: Workspace, r: CommentRef, i: number, text: string) => edit(ws, r, (c) => void (i < c.replies.length && (c.replies[i] = text)));
export const deleteReply = (ws: Workspace, r: CommentRef, i: number) => edit(ws, r, (c) => void c.replies.splice(i, 1));

/** Ajoute une réponse vide en fin de fil ; renvoie son rang (-1 sans commentaire). */
export function addReply(ws: Workspace, r: CommentRef): number {
  let i = -1;
  edit(ws, r, (c) => void (i = c.replies.push('') - 1));
  return i;
}

/** Retire les commentaires des nœuds `nodes` d'un objet ; une mise en page de question de bibliothèque vidée disparaît. */
export function removeComments(ws: Workspace, hostId: string, nodes: string[]): void {
  const layout = ws.layouts.find((l) => l.graph === hostId);
  if (!layout?.comments?.some((c) => nodes.includes(c.node))) return;
  layout.comments = layout.comments.filter((c) => !nodes.includes(c.node));
  if (layout.comments.length) return;
  delete layout.comments;
  const isQuestion = ws.library.questions.some((q) => q.id === hostId);
  if (isQuestion && !Object.keys(layout.nodes).length) ws.layouts = ws.layouts.filter((l) => l !== layout);
}

/** Supprime le commentaire entier (texte initial et réponses). */
export const deleteComment = (ws: Workspace, r: CommentRef) => removeComments(ws, r.host.id, [r.node]);

/** Déplace les commentaires des nœuds `nodes` d'un graphe vers un autre (extraction en fragment). */
export function moveCommentsTo(ws: Workspace, from: string, to: string, nodes: string[]): void {
  const moved = JSON.parse(JSON.stringify(commentsOf(ws, from).filter((c) => nodes.includes(c.node)))) as ReviewComment[];
  if (!moved.length) return;
  removeComments(ws, from, nodes);
  (layoutOf(ws, to).comments ??= []).push(...moved);
}
