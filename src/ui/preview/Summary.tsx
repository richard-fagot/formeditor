import { Pencil } from 'lucide-react';
import type { SummaryNode } from '../../core/model';
import { goTo, summaryEntries, type RuntimeInput, type Session } from '../../core/runtime';
import type { RenderEnv } from '../../plugin-api';
import { questionType } from '../../registry';
import { useT, type PreviewState } from '../../app/store';
import { makeRenderEnv } from './usePreview';

interface Props {
  node: SummaryNode;
  stepId: string;
  input: RuntimeInput;
  session: Session;
  env: RenderEnv;
  lang: string;
  uiLang: string;
  update(patch: Partial<PreviewState>): void;
}

/** Page de synthèse : réponses du parcours effectif ; un clic ramène à la question pour la modifier. */
export function Summary({ node, stepId, input, session, env, lang, uiLang, update }: Props) {
  const t = useT();
  const entries = summaryEntries(input, session);
  return (
    <div className="space-y-4" data-testid="summary">
      <h2 className="text-2xl font-semibold text-slate-900">{env.label(node.title)}</h2>
      <dl className="divide-y divide-slate-100">
        {entries.map((e) => {
          const p = e.step.question && questionType(e.step.question.type);
          return (
            <button key={e.stepId} type="button" title={t('preview.edit')}
              className="group flex w-full items-start justify-between gap-4 rounded px-1 py-2 text-left hover:bg-indigo-50/60"
              onClick={(ev) => {
                ev.stopPropagation();
                update({ session: goTo(session, e.stepId), returnTo: stepId, attempted: false });
              }}>
              <dt className="text-sm text-slate-500">{makeRenderEnv(input, session, e.stepId, lang, uiLang).label(e.step.question?.label)}</dt>
              <dd className="flex items-center gap-2 text-right text-sm font-medium text-slate-800">
                {p?.formatAnswer(e.step.question!, e.value, env, e.other as string | undefined)}
                <Pencil className="size-3 shrink-0 text-slate-300 group-hover:text-indigo-500" />
              </dd>
            </button>
          );
        })}
      </dl>
      {!entries.length && <p className="text-sm text-slate-400">{t('preview.summaryEmpty')}</p>}
    </div>
  );
}
