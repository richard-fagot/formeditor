import { useMemo } from 'react';
import { makeTranslate } from '../i18n';
import type { Questionnaire } from '../../core/model';
import { useStore, type Store } from './store';
import type { GraphRef } from './graph';

export function useT() {
  const lang = useStore((s) => s.uiLang);
  return useMemo(() => makeTranslate(lang), [lang]);
}

/** Graphe de l'onglet actif (questionnaire). */
export function activeGraphRef(s: Store): GraphRef | undefined {
  return s.activeTab.startsWith('q:') ? { kind: 'questionnaire', id: s.activeTab.slice(2) } : s.selection.graph;
}

export function activeQuestionnaire(s: Store): Questionnaire | undefined {
  return s.activeTab.startsWith('q:') ? s.ws.questionnaires.find((q) => q.id === s.activeTab.slice(2)) : undefined;
}

/** Environnement transmis aux plugins. */
export function useEditorEnv() {
  const ws = useStore((s) => s.ws);
  const uiLang = useStore((s) => s.uiLang);
  const contentLang = useStore((s) => s.contentLang);
  return useMemo(
    () => ({ ws, uiLang, languages: ws.project.languages, contentLang, defaultLang: ws.project.defaultLanguage }),
    [ws, uiLang, contentLang],
  );
}
