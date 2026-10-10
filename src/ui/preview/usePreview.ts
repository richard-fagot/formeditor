import { useMemo } from 'react';
import { evaluate, evaluateCondition, pickText, resolveLabel } from '../../core/expressions';
import type { Workspace } from '../../core/model';
import { buildContext, resolveStep, start, type RuntimeInput, type Session } from '../../core/runtime';
import type { RenderEnv } from '../../plugin-api';
import { useStore, type PreviewState } from '../../app/store';

/** Valeurs d'exemple du dictionnaire de l'état du système. */
export function exampleSystemState(ws: Workspace): Record<string, unknown> {
  return Object.fromEntries(ws.project.systemState.filter((v) => v.example !== undefined).map((v) => [v.name, v.example]));
}

export function systemStateOf(ws: Workspace, p: PreviewState | undefined): Record<string, unknown> {
  if (p?.sys) return p.sys;
  const sc = ws.project.scenarios.find((s) => s.id === p?.scenarioId) ?? (p?.scenarioId === undefined ? ws.project.scenarios[0] : undefined);
  return sc?.values ?? exampleSystemState(ws);
}

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
  const ctx = buildContext(input, session.answers, stepId);
  const langs = { lang, defaultLang: input.ws.project.defaultLanguage };
  return {
    ws: input.ws,
    uiLang,
    languages: input.ws.project.languages,
    contentLang: lang,
    defaultLang: langs.defaultLang,
    label: (l) => resolveLabel(l, langs, ctx, input.env),
    text: (t) => pickText(t, langs),
    evaluate: (e, extra) => evaluate(e, { ...ctx, ...extra }, input.env),
    condition: (e, extra) => evaluateCondition(e, { ...ctx, ...extra }, input.env),
  };
}
