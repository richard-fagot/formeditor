import { useMemo } from 'react';
import { evaluate, evaluateCondition, pickText, resolveLabel, type EvalContext } from '../../core/expressions';
import { buildContext, choiceOptions, resolveStep, start, type RuntimeInput, type Session } from '../../core/runtime';
import type { RenderEnv } from '../../plugin-api';
import { systemStateOf, useStore, type PreviewState } from '../../app/store';
import { questionType } from '../../registry';

/** État de la prévisualisation d'un questionnaire : entrée du moteur, session (créée au besoin), langue. */
export function usePreview(questionnaireId: string) {
  const ws = useStore((s) => s.ws);
  const p = useStore((s) => s.preview[questionnaireId]);
  const uiLang = useStore((s) => s.uiLang);
  const contentLang = useStore((s) => s.contentLang);
  const lang = p?.lang ?? contentLang;
  const input: RuntimeInput = useMemo(() => ({ ws, questionnaireId, sys: systemStateOf(ws, p) }), [ws, questionnaireId, p]);
  const session: Session = useMemo(() => {
    const s = p?.session;
    // Une session dont la page courante n'existe plus (graphe modifié) est recommencée.
    return s && s.history.length && s.history.every((id) => resolveStep(input, id)) ? s : start(input);
  }, [p?.session, input]);
  const update = (patch: Partial<PreviewState>) =>
    useStore.getState().set((st) => void (st.preview[questionnaireId] = { ...st.preview[questionnaireId], ...patch }));
  return { input, session, lang, uiLang, update, state: p };
}

/** Environnement de rendu des plugins à une étape donnée. */
export function makeRenderEnv(input: RuntimeInput, session: Session, stepId: string | undefined, lang: string, uiLang: string): RenderEnv {
  return envOf(input, buildContext(input, session.answers, stepId), lang, uiLang);
}

/** Copie sans les valeurs `null` (comme `buildContext`) : une valeur vide n'est pas « renseignée ». */
const withoutNulls = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null));

function envOf(input: RuntimeInput, ctx: EvalContext, lang: string, uiLang: string): RenderEnv {
  const langs = { lang, defaultLang: input.ws.project.defaultLanguage };
  return {
    ws: input.ws,
    uiLang,
    languages: input.ws.project.languages,
    contentLang: lang,
    defaultLang: langs.defaultLang,
    questionType,
    label: (l) => resolveLabel(l, langs, ctx, input.env),
    text: (t) => pickText(t, langs),
    evaluate: (e, extra) => evaluate(e, { ...ctx, ...extra }, input.env),
    condition: (e, extra) => evaluateCondition(e, { ...ctx, ...extra }, input.env),
    options: (q) => (q.type === 'single' || q.type === 'multiple' ? choiceOptions(q, ctx, input.env) : []),
    scoped: (extra) => envOf(input, { ...ctx, ...withoutNulls(extra) }, lang, uiLang),
  };
}
