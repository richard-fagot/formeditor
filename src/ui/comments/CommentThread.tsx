import { useEffect, useRef, type ReactNode } from 'react';
import { EyeOff, MessageSquare, Reply, Trash2, X } from 'lucide-react';
import { runCommand } from '../../app/commands';
import { commentKey, commentOf, hostScope, setCommentText, setReply, useStore, useT, type CommentRef } from '../../app/store';
import { Button, cn } from '../../ui-kit';

/** Modifie un texte du commentaire dans l'historique de l'objet (frappes regroupées par champ). */
function write(r: CommentRef, field: string, recipe: Parameters<ReturnType<typeof useStore.getState>['edit']>[1]) {
  useStore.getState().edit(hostScope(r.host), recipe, `comment:${commentKey(r)}:${field}`);
}

/** Zone de saisie multiligne qui prend le focus quand `focusRequest` la désigne (`comment`, id `focusId`). */
function CommentText({ value, focusId, label, placeholder, onChange, className }: {
  value: string; focusId: string; label: string; placeholder?: string; onChange(v: string): void; className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const focus = useStore((s) => (s.focusRequest?.kind === 'comment' && s.focusRequest.id === focusId ? s.focusRequest.n : undefined));
  useEffect(() => {
    if (focus === undefined) return;
    // Le logigramme peut reprendre le focus juste après le montage : on le redonne au champ.
    ref.current?.focus();
    const id = setTimeout(() => ref.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [focus]);
  // Hauteur ajustée au texte (multiligne).
  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px`; }
  }, [value]);
  return (
    <textarea ref={ref} aria-label={label} placeholder={placeholder} rows={1} value={value}
      className={cn('nodrag nowheel nopan block w-full resize-none rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-slate-800 outline-none hover:border-amber-200 focus:border-amber-400 focus:bg-white', className)}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.stopPropagation()} />
  );
}

/**
 * Fil d'un commentaire de révision (EVO-011) : texte initial, puis une carte par réponse (modifiable, supprimable),
 * « Répondre », « Supprimer le commentaire » ; `actions` : boutons d'en-tête (masquer, ouvrir).
 */
export function CommentThread({ cref, actions, className }: { cref: CommentRef; actions?: ReactNode; className?: string }) {
  const t = useT();
  const c = useStore((s) => commentOf(s.ws, cref));
  if (!c) return null;
  const key = commentKey(cref);
  return (
    <div data-testid="comment-thread" data-comment={key} className={cn('rounded-md border border-amber-300 bg-amber-50 p-2 text-sm shadow-sm', className)}>
      <div className="mb-1 flex items-center gap-1 text-xs font-semibold text-amber-800">
        <MessageSquare className="size-3.5" />{t('comment.text')}
        <span className="ml-auto flex items-center gap-0.5">{actions}</span>
      </div>
      <CommentText value={c.text} focusId={key} label={t('comment.text')} placeholder={t('comment.placeholder')} className="font-medium"
        onChange={(v) => write(cref, 'text', (ws) => setCommentText(ws, cref, v))} />
      {c.replies.map((r, i) => (
        <div key={i} data-testid="comment-reply" className="mt-1.5 flex items-start gap-1 rounded border border-amber-200 bg-white p-1">
          <CommentText value={r} focusId={`${key}#${i}`} label={t('comment.replyText', { n: String(i + 1) })} placeholder={t('comment.placeholder')}
            onChange={(v) => write(cref, `reply${i}`, (ws) => setReply(ws, cref, i, v))} />
          <button type="button" data-testid="comment-delete-reply" title={t('comment.deleteReply')} aria-label={t('comment.deleteReply')}
            className="nodrag shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            onClick={() => runCommand('comment.deleteReply', { ...cref, index: i })}>
            <X className="size-3" />
          </button>
        </div>
      ))}
      <div className="mt-1.5 flex items-center gap-1">
        <Button size="sm" variant="ghost" className="nodrag" data-testid="comment-reply-add" onClick={() => runCommand('comment.reply', cref)}>
          <Reply className="size-3" />{t('comment.reply')}
        </Button>
        <Button size="sm" variant="danger" className="nodrag ml-auto" data-testid="comment-delete" onClick={() => runCommand('comment.delete', cref)}>
          <Trash2 className="size-3" />{t('comment.delete')}
        </Button>
      </div>
    </div>
  );
}

/** Bouton « Masquer le commentaire » de l'en-tête d'un nœud commentaire. */
export function HideCommentButton({ cref }: { cref: CommentRef }) {
  const t = useT();
  return (
    <button type="button" data-testid="comment-hide" title={t('comment.hide')} aria-label={t('comment.hide')}
      className="nodrag rounded p-0.5 text-amber-700 hover:bg-amber-100" onClick={() => runCommand('comment.toggle', cref)}>
      <EyeOff className="size-3.5" />
    </button>
  );
}
