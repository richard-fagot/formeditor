import { BookOpen, Database, Plus, X } from 'lucide-react';
import { runCommand } from '../../app/commands';
import { useStore, useT, type TabId } from '../../app/store';
import { cn } from '../../ui-kit';

/** Onglets : questionnaires ouverts, bibliothèque, état du système. */
export function Tabs() {
  const t = useT();
  const tabs = useStore((s) => s.tabs);
  const active = useStore((s) => s.activeTab);
  const ws = useStore((s) => s.ws);
  const lang = useStore((s) => s.contentLang);
  const label = (tab: TabId) => {
    if (tab === 'library') return t('tab.library');
    if (tab === 'system') return t('tab.system');
    const q = ws.questionnaires.find((x) => `q:${x.id}` === tab);
    return q ? (q.title[lang] ?? q.title[ws.project.defaultLanguage] ?? q.key) : tab;
  };
  const closed = ws.questionnaires.filter((q) => !tabs.includes(`q:${q.id}`));
  return (
    <nav className="flex h-9 items-end gap-0.5 border-b border-slate-200 bg-slate-100 px-2" role="tablist">
      {tabs.map((tab) => (
        <div key={tab} role="tab" aria-selected={tab === active}
          className={cn('group flex h-8 cursor-pointer items-center gap-1.5 rounded-t-md border border-b-0 px-3 text-sm',
            tab === active ? 'border-slate-200 bg-white text-slate-800' : 'border-transparent text-slate-500 hover:bg-slate-50')}
          onClick={() => useStore.getState().openTab(tab)}>
          {tab === 'library' && <BookOpen className="size-3.5" />}
          {tab === 'system' && <Database className="size-3.5" />}
          <span className="max-w-48 truncate">{label(tab)}</span>
          <button type="button" aria-label={t('questionnaire.close')} className="rounded p-0.5 opacity-0 hover:bg-slate-200 group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); useStore.getState().closeTab(tab); }}>
            <X className="size-3" />
          </button>
        </div>
      ))}
      <button type="button" title={t('questionnaire.new')} aria-label={t('questionnaire.new')} className="mb-1 rounded p-1 text-slate-500 hover:bg-slate-200"
        onClick={() => runCommand('questionnaire.new')}>
        <Plus className="size-4" />
      </button>
      {closed.map((q) => (
        <button key={q.id} type="button" className="mb-1 rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-200" onClick={() => useStore.getState().openTab(`q:${q.id}`)}>
          {q.title[lang] ?? q.key}
        </button>
      ))}
      <div className="ml-auto flex gap-1 pb-1">
        {!tabs.includes('library') && <button type="button" className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200" onClick={() => runCommand('tab.library')}>{t('tab.library')}</button>}
        {!tabs.includes('system') && <button type="button" className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200" onClick={() => runCommand('tab.system')}>{t('tab.system')}</button>}
      </div>
    </nav>
  );
}
