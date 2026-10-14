import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import type { Question } from '../../core/model';
import { runCommand } from '../../app/commands';
import { setLibraryQuestionLabel, useStore, useT } from '../../app/store';
import { Button } from '../../ui-kit';
import { ExpressionEnvProvider } from '../expression-editor';
import { QuestionEditor, usePluginEnv, type QuestionTarget } from '../properties';
import { itemUsages, libraryQuestionScope } from './items';
import { CommentThread } from '../comments';
import { ItemVersion } from './ItemVersion';

/** Question de la bibliothèque : mêmes propriétés qu'une question locale, modifiées pour tous ses usages. */
export function LibraryQuestionView({ id }: { id: string }) {
  const t = useT();
  const env = usePluginEnv();
  const ws = useStore((s) => s.ws);
  const q = ws.library.questions.find((x) => x.id === id);
  const scope = useMemo(() => libraryQuestionScope(ws, id), [ws, id]);
  if (!q) return null;
  const usages = itemUsages(ws, { kind: 'question', id });
  const target: QuestionTarget = {
    scope: 'library',
    owner: { kind: 'libraryQuestion', id },
    nodeId: id,
    taken: ws.library.questions.filter((x) => x.id !== id).map((x) => x.key),
    replace: (w, f) => {
      const i = w.library.questions.findIndex((x) => x.id === id);
      if (i < 0) return;
      const { kind: _kind, ...next } = f(w.library.questions[i]!) as Question & { kind?: string };
      w.library.questions[i] = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)) as unknown as Question;
    },
    setLabel: (w, label, lang) => setLibraryQuestionLabel(w, id, label, lang),
  };
  return (
    <ExpressionEnvProvider value={{ scope, uiLang: env.uiLang, languages: env.languages, contentLang: env.contentLang }}>
      <div className="h-full overflow-y-auto" data-testid="library-question">
        <div className="mx-auto max-w-2xl pb-8">
          <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
            <div className="min-w-0 text-xs text-slate-500">
              <p>{t('library.questionHint')}</p>
              <p>{usages.length ? t('library.usedIn', { list: usages.join(', ') }) : t('library.unused')}</p>
            </div>
            <Button size="sm" variant="danger" className="ml-auto" onClick={() => runCommand('library.delete', { kind: 'question', id })}>
              <Trash2 className="size-3" />{t('props.delete')}
            </Button>
          </div>
          {/* Commentaire de révision (EVO-011) : toujours affiché, la question n'a pas de logigramme. */}
          <CommentThread cref={{ host: { kind: 'question', id }, node: id }} className="mx-4 mt-3" />
          <ItemVersion item={{ kind: 'question', id }} className="mx-4 mt-3" />
          <QuestionEditor question={q} target={target} />
        </div>
      </div>
    </ExpressionEnvProvider>
  );
}
