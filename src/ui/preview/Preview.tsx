import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { OTHER_VALUE } from '../../core/model';
import { back, buildContext, currentStep, getAnswer, goTo, next, otherPath, progress, setAnswer, start, summaryEntries } from '../../core/runtime';
import { validateAnswer } from '../../core/validation';
import { nodeKind, questionType } from '../../registry';
import { useStore, useT } from '../../app/store';
import { Button, Select } from '../../ui-kit';
import { makeRenderEnv, usePreview } from './usePreview';

/** Wizard : une page par question, pages d'information, de synthèse et de fin, via le moteur de parcours. */
export function Preview({ questionnaireId }: { questionnaireId: string }) {
  const t = useT();
  const { input, session, lang, uiLang, update, state } = usePreview(questionnaireId);
  const ws = input.ws;
  if (!session.history.length) return <p className="p-8 text-slate-400">{t('preview.empty')}</p>;
  const step = currentStep(input, session);
  const env = makeRenderEnv(input, session, step.id, lang, uiLang);
  const q = step.question;
  const plugin = q ? questionType(q.type) : undefined;
  const value = step.answerPath ? getAnswer(session.answers, step.answerPath) : undefined;
  const other = step.answerPath ? (getAnswer(session.answers, otherPath(step.answerPath)) as string | undefined) : undefined;
  const ctx = buildContext(input, session.answers, step.id);
  const errors = q && state?.attempted ? validateAnswer(q, value, { ...ctx, ...(value === null ? {} : { [q.key]: value }) }, input.env, other) : [];
  const errorMap: Record<string, string[]> = {};
  for (const e of errors) (errorMap[e.path] ??= []).push(env.label(e.message));
  const isEnd = step.node.kind === 'end';
  const hostNodeId = step.instance?.id ?? step.node.id;

  const goNext = () => {
    if (q && validateAnswer(q, value, { ...ctx, ...(value === null ? {} : { [q.key]: value }) }, input.env, other).length) return update({ attempted: true, session });
    update({ session: next(input, session), attempted: false });
  };
  const select = () => useStore.getState().select({ graph: { kind: 'questionnaire', id: questionnaireId }, nodes: [hostNodeId] });
  const Page = nodeKind(step.node.kind).Page;

  return (
    <div className="flex h-full flex-col bg-slate-50" data-testid="preview">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <label className="flex items-center gap-2 text-slate-500">
          {t('preview.scenario')}
          <Select className="w-56" value={state?.scenarioId ?? ws.project.scenarios[0]?.id ?? ''} onChange={(e) => update({ scenarioId: e.target.value, sys: undefined, session: undefined })}>
            {ws.project.scenarios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value="">{t('preview.noScenario')}</option>
          </Select>
        </label>
        <label className="flex items-center gap-2 text-slate-500">
          {t('preview.language')}
          <Select className="w-20" value={lang} onChange={(e) => update({ lang: e.target.value })}>
            {ws.project.languages.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </label>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => update({ session: start(input), attempted: false })}>
          <RotateCcw className="size-3.5" />{t('preview.restart')}
        </Button>
      </div>
      <div className="h-1 bg-slate-200"><div className="h-1 bg-indigo-500 transition-all" style={{ width: `${Math.round(progress(input, session) * 100)}%` }} /></div>
      <div className="flex-1 overflow-y-auto px-4 py-10">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm" onClick={select} data-testid="preview-page">
          {q && plugin && (
            <div className="space-y-4">
              <label htmlFor={`f-${step.id}`} className="block text-2xl font-semibold leading-snug text-slate-900">
                {env.label(q.label)}
                {q.required === true && <span className="text-rose-500"> *</span>}
              </label>
              {q.help && <p className="text-sm text-slate-500">{env.label(q.help)}</p>}
              <plugin.Field key={step.id} question={q} value={value} other={other} errors={errorMap} env={env} inputId={`f-${step.id}`}
                onChange={(v, o) => update({ session: setAnswer(input, session, v, v === OTHER_VALUE || (Array.isArray(v) && v.includes(OTHER_VALUE)) ? o : undefined) })} />
              {(errorMap[''] ?? []).map((m, i) => <p key={i} className="text-sm text-rose-600" role="alert">{m}</p>)}
            </div>
          )}
          {q && !plugin && <p className="text-sm text-slate-400">{env.label(q.label)} — {q.type}</p>}
          {step.node.kind === 'summary' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-slate-900">{env.label(step.node.title)}</h2>
              <dl className="divide-y divide-slate-100">
                {summaryEntries(input, session).map((e) => {
                  const p = e.step.question && questionType(e.step.question.type);
                  return (
                    <button key={e.stepId} type="button" className="flex w-full justify-between gap-4 py-2 text-left hover:bg-slate-50"
                      onClick={(ev) => { ev.stopPropagation(); update({ session: goTo(session, e.stepId) }); }}>
                      <dt className="text-sm text-slate-500">{makeRenderEnv(input, session, e.stepId, lang, uiLang).label(e.step.question?.label)}</dt>
                      <dd className="text-sm font-medium text-slate-800">{p?.formatAnswer(e.step.question!, e.value, env, e.other as string | undefined)}</dd>
                    </button>
                  );
                })}
              </dl>
              {!summaryEntries(input, session).length && <p className="text-sm text-slate-400">{t('preview.summaryEmpty')}</p>}
            </div>
          )}
          {!q && step.node.kind !== 'summary' && Page && <Page node={step.node} env={env} />}
          {session.blocked && <p className="mt-4 rounded-md bg-amber-50 p-2 text-sm text-amber-700">{t('preview.blocked')}</p>}
        </div>
        <div className="mx-auto mt-6 flex max-w-xl justify-between">
          <Button disabled={session.history.length < 2} onClick={() => update({ session: back(session), attempted: false })}>
            <ChevronLeft className="size-4" />{t('preview.prev')}
          </Button>
          {!isEnd && <Button variant="primary" onClick={goNext} data-testid="preview-next">{t('preview.next')}<ChevronRight className="size-4" /></Button>}
        </div>
      </div>
    </div>
  );
}
