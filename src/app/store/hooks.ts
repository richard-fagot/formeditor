import { useMemo } from 'react';
import { makeTranslate } from '../i18n';
import type { Questionnaire } from '../../core/model';
import type { EditorEnv } from '../../plugin-api';
import { useStore, type Store } from './store';
import type { GraphRef } from './graph';

export function useT() {
  const lang = useStore((s) => s.uiLang);
  return useMemo(() => makeTranslate(lang), [lang]);
}

/** Graphe édité dans l'onglet actif : questionnaire, ou bloc affiché dans l'onglet Bibliothèque. */
export function activeGraphRef(s: Store): GraphRef | undefined {
  if (s.activeTab.startsWith('q:')) return { kind: 'questionnaire', id: s.activeTab.slice(2) };
  if (s.activeTab === 'library' && s.libraryItem?.kind === 'block') return { kind: 'block', id: s.libraryItem.id };
  return undefined;
}

export function activeQuestionnaire(s: Store): Questionnaire | undefined {
  return s.activeTab.startsWith('q:') ? s.ws.questionnaires.find((q) => q.id === s.activeTab.slice(2)) : undefined;
}

/** Environnement de l'éditeur ; l'interface y ajoute `questionType` (registre) avant de le transmettre aux plugins. */
export function useEditorEnv(): Omit<EditorEnv, 'questionType'> {
  const ws = useStore((s) => s.ws);
  const uiLang = useStore((s) => s.uiLang);
  const contentLang = useStore((s) => s.contentLang);
  return useMemo(
    () => ({ ws, uiLang, languages: ws.project.languages, contentLang, defaultLang: ws.project.defaultLanguage }),
    [ws, uiLang, contentLang],
  );
}
