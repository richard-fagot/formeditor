import { useStore, type TabId } from '../store';
import { UI_LANGUAGES } from '../i18n';
import type { Command } from './types';

const st = () => useStore.getState();
const closedQuestionnaires = () => st().ws.questionnaires.filter((q) => !st().tabs.includes(`q:${q.id}`));

/** Langue suivante dans la liste (palette), ou celle passée en paramètre si elle est proposée. */
function pickLang(list: readonly string[], current: string, arg: unknown): string | undefined {
  if (typeof arg === 'string') return list.includes(arg) ? arg : undefined;
  return list[(list.indexOf(current) + 1) % list.length];
}

/** Onglets (ouvrir, fermer) et langues du contenu et de l'interface. */
export function shellCommands(): Command[] {
  return [
    {
      // `arg` : onglet à afficher ; sans paramètre, rouvre le premier questionnaire fermé.
      id: 'tab.open', label: 'tab.open', keys: [], scope: 'global',
      enabled: () => closedQuestionnaires().length > 0,
      run: (tab) => {
        const target = (typeof tab === 'string' ? tab : closedQuestionnaires()[0] && `q:${closedQuestionnaires()[0]!.id}`) as TabId | undefined;
        if (target) st().openTab(target);
      },
    },
    {
      // Les onglets ouverts sont rendus actifs par cette commande (`arg` obligatoire), toujours disponible.
      id: 'tab.show', label: 'tab.open', keys: [], scope: 'global', hidden: true,
      run: (tab) => typeof tab === 'string' && st().openTab(tab as TabId),
    },
    {
      // `arg` : onglet à fermer ; sans paramètre, l'onglet actif.
      id: 'tab.close', label: 'questionnaire.close', keys: [], scope: 'global', enabled: () => st().tabs.length > 0,
      run: (tab) => st().closeTab((typeof tab === 'string' ? tab : st().activeTab) as TabId),
    },
    {
      id: 'lang.content', label: (t) => t('lang.content', { lang: st().contentLang }), keys: [], scope: 'global',
      enabled: () => st().ws.project.languages.length > 1,
      run: (arg) => {
        const lang = pickLang(st().ws.project.languages, st().contentLang, arg);
        if (lang) st().set((s) => void (s.contentLang = lang));
      },
    },
    {
      id: 'lang.ui', label: (t) => t('lang.ui', { lang: st().uiLang }), keys: [], scope: 'global',
      run: (arg) => {
        const lang = pickLang(UI_LANGUAGES, st().uiLang, arg);
        if (lang) st().set((s) => void (s.uiLang = lang));
      },
    },
  ];
}
