import { ExternalLink, MessageSquare } from 'lucide-react';
import { previewText } from '../../plugin-api';
import { questionOfNode } from '../../core/references';
import { runCommand } from '../../app/commands';
import { allComments, useStore, useT, type CommentHost } from '../../app/store';
import type { LocalizedText, Workspace } from '../../core/model';
import { Button } from '../../ui-kit';
import { CommentThread } from './CommentThread';

/** Objet et question commentée, dans la langue du contenu. */
function describe(ws: Workspace, host: CommentHost, node: string, lang: string) {
  const env = { contentLang: lang, defaultLang: ws.project.defaultLanguage };
  const title = (t: LocalizedText) => previewText(t, env);
  if (host.kind === 'question') {
    const q = ws.library.questions.find((x) => x.id === host.id);
    return { object: q?.key ?? host.id, question: q ? `${previewText(q.label, env)} (${q.key})` : node };
  }
  const g = host.kind === 'questionnaire' ? ws.questionnaires.find((x) => x.id === host.id) : ws.library.fragments.find((x) => x.id === host.id);
  const n = g?.nodes.find((x) => x.id === node);
  const q = n && questionOfNode(ws, n);
  return { object: g ? title(g.title) || g.key : host.id, question: q ? `${previewText(q.label, env)} (${q.key})` : node };
}

/** Page des commentaires (EVO-011) : tous les commentaires du projet, éditables ; « Ouvrir » affiche l'objet centré sur le commentaire. */
export function CommentsPage() {
  const t = useT();
  const ws = useStore((s) => s.ws);
  const lang = useStore((s) => s.contentLang);
  const list = allComments(ws);
  return (
    <div className="h-full overflow-y-auto px-6 py-6" data-testid="comments-page">
      <div className="mx-auto max-w-3xl space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800"><MessageSquare className="size-5" />{t('comments.title')}</h2>
        {!list.length && <p className="text-sm text-slate-500">{t('comments.empty')}</p>}
        {list.map(({ host, node }) => {
          const d = describe(ws, host, node, lang);
          return (
            <section key={`${host.id}/${node}`} data-testid="comments-entry" className="space-y-1.5">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="rounded bg-slate-100 px-1.5 text-xs text-slate-600">{t(`comments.${host.kind}`)}</span>
                <span data-testid="comments-object" className="font-semibold text-slate-800">{d.object}</span>
                <span className="text-slate-400">›</span>
                <span data-testid="comments-question" className="truncate text-slate-700">{d.question}</span>
                <Button size="sm" variant="ghost" className="ml-auto" data-testid="comments-open" onClick={() => runCommand('comment.open', { host, node })}>
                  <ExternalLink className="size-3" />{t('comment.open')}
                </Button>
              </div>
              <CommentThread cref={{ host, node }} />
            </section>
          );
        })}
      </div>
    </div>
  );
}
