import type { ReactNode } from 'react';
import { Bug, ChevronLeft, ChevronRight, Database, RotateCcw, Undo2 } from 'lucide-react';
import { OTHER_VALUE } from '../../core/model';
import { back, buildContext, currentStep, getAnswer, next, otherPath, progress, resume, setAnswer, start, type Session } from '../../core/runtime';
import { validateAnswer } from '../../core/validation';
import { nodeKind, questionType } from '../../registry';
import { runCommand } from '../../app/commands';
import { useStore, useT } from '../../app/store';
import { Button, Select, cn } from '../../ui-kit';
import { DebugPanel } from './DebugPanel';
import { Summary } from './Summary';
import { SystemPanel } from './SystemPanel';
import { makeRenderEnv, usePreview } from './usePreview';

/** Wizard : une page par question, pages d'information, de synthèse et de fin, via le moteur de parcours ; panneaux d'état du système et de débogage. */
export function Preview({ questionnaireId }: { questionnaireId: string }) {
  const t = useT();
  const preview = usePreview(questionnaireId);
  const { input, session, lang, uiLang, update, state } = preview;
  const panels = useStore((s) => s.previewPanels);
  const ws = input.ws;
  const toggle = (id: string, on: boolean, icon: ReactNode, label: string) => (
    <Button size="sm" variant="ghost" className={cn(on && 'bg-indigo-50 text-indigo-700')} aria-pressed={on} onClick={() => runCommand(id)}>
      {icon}{label}
    </Button>
  );
  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <label className="flex items-center gap-2 text-slate-500">
          {t('preview.language')}
          <Select className="w-20" value={lang} onChange={(e) => update({ lang: e.target.value })}>
            {ws.project.languages.map((l) => <option key={l}>{l}</option>)}
          </Select>
        </label>
        <Button size="sm" variant="ghost" onClick={() => update({ session: start(input), attempted: false, returnTo: undefined })}>
          <RotateCcw className="size-3.5" />{t('preview.restart')}
        </Button>
        <div className="ml-auto flex gap-1">
          {toggle('preview.toggleSystem', panels.system, <Database className="size-3.5" />, t('preview.system'))}
          {toggle('preview.toggleDebug', panels.debug, <Bug className="size-3.5" />, t('preview.debug'))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <Wizard questionnaireId={questionnaireId} preview={preview} />
        {(panels.system || panels.debug) && (
          <aside className="w-80 shrink-0 space-y-6 overflow-y-auto border-l border-slate-200 bg-white p-4">
            {panels.system && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700">{t('preview.system')}</h3>
                <SystemPanel questionnaireId={questionnaireId} state={state} update={update} />
              </section>
            )}
            {panels.debug && session.history.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700">{t('preview.debug')}</h3>
                <DebugPanel input={input} session={session} uiLang={uiLang} />
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

/** Page courante, progression, précédent / suivant (et retour à la synthèse après une modification). */
function Wizard({ questionnaireId, preview }: { questionnaireId: string; preview: ReturnType<typeof usePreview> }) {
  const t = useT();
  const { input, session, lang, uiLang, update, state } = preview;
  if (!session.history.length) return <p className="flex-1 p-8 text-slate-400" data-testid="preview">{t('preview.empty')}</p>;
  const step = currentStep(input, session);
  const env = makeRenderEnv(input, session, step.id, lang, uiLang);
  const q = step.question;
  const plugin = q ? questionType(q.type) : undefined;
  const value = step.answerPath ? getAnswer(session.answers, step.answerPath) : undefined;
  const other = step.answerPath ? (getAnswer(session.answers, otherPath(step.answerPath)) as string | undefined) : undefined;
  const ctx = buildContext(input, session.answers, step.id);
  const check = () => (q ? validateAnswer(q, value, { ...ctx, ...(value === null ? {} : { [q.key]: value }) }, input.env, other) : []);
  const errors = state?.attempted ? check() : [];
  const errorMap: Record<string, string[]> = {};
  for (const e of errors) (errorMap[e.path] ??= []).push(env.label(e.message));
  const isEnd = step.node.kind === 'end';
  const hostNodeId = step.instance?.id ?? step.node.id;
  const returnTo = state?.returnTo && state.returnTo !== step.id && session.history.includes(state.returnTo) ? state.returnTo : undefined;

  /** Avance (validation d'abord) ; `move` calcule la nouvelle session. */
  const advance = (move: (s: Session) => Session) => {
    if (check().length) return update({ attempted: true, session });
    const s = move(session);
    update({ session: s, attempted: false, ...(s.history.at(-1) === state?.returnTo ? { returnTo: undefined } : {}) });
  };
  const select = () => useStore.getState().select({ graph: { kind: 'questionnaire', id: questionnaireId }, nodes: [hostNodeId] });
  const Page = nodeKind(step.node.kind).Page;

  return (
    <div className="flex min-w-0 flex-1 flex-col" data-testid="preview">
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
            <Summary node={step.node} stepId={step.id} input={input} session={session} env={env} lang={lang} uiLang={uiLang} update={update} />
          )}
          {!q && step.node.kind !== 'summary' && Page && <Page node={step.node} env={env} />}
          {session.blocked && <p className="mt-4 rounded-md bg-amber-50 p-2 text-sm text-amber-700">{t('preview.blocked')}</p>}
        </div>
        <div className="mx-auto mt-6 flex max-w-xl flex-wrap justify-between gap-2">
          <Button disabled={session.history.length < 2} onClick={() => update({ session: back(session), attempted: false })}>
            <ChevronLeft className="size-4" />{t('preview.prev')}
          </Button>
          <div className="flex gap-2">
            {returnTo && !isEnd && (
              <Button data-testid="preview-back-to-summary" onClick={() => advance((s) => resume(input, s, returnTo))}>
                <Undo2 className="size-4" />{t('preview.backToSummary')}
              </Button>
            )}
            {!isEnd && <Button variant="primary" onClick={() => advance((s) => next(input, s))} data-testid="preview-next">{t('preview.next')}<ChevronRight className="size-4" /></Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
