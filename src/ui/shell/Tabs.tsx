import { useState } from 'react';
import { BadgeCheck, BookOpen, Boxes, Database, MessageSquare, Plus, Settings, X } from 'lucide-react';
import { isValidated, type Questionnaire } from '../../core/model';
import { runCommand } from '../../app/commands';
import { useStore, useT, type TabId } from '../../app/store';
import { cn, ContextMenu } from '../../ui-kit';
import { UnusedTotal } from '../library';

/** Onglets : questionnaires et fragments ouverts, bibliothèque, état du système. */
export function Tabs() {
  const t = useT();
  const tabs = useStore((s) => s.tabs);
  const active = useStore((s) => s.activeTab);
  const ws = useStore((s) => s.ws);
  const lang = useStore((s) => s.contentLang);
  const label = (tab: TabId) => {
    if (tab === 'library') return t('tab.library');
    if (tab === 'system') return t('tab.system');
    if (tab === 'settings') return t('tab.settings');
    if (tab === 'comments') return t('tab.comments');
    if (tab.startsWith('f:')) {
      const f = ws.library.fragments.find((x) => `f:${x.id}` === tab);
      return f ? (f.title[lang] ?? f.title[ws.project.defaultLanguage] ?? f.key) : tab;
    }
    const q = ws.questionnaires.find((x) => `q:${x.id}` === tab);
    return q ? (q.title[lang] ?? q.title[ws.project.defaultLanguage] ?? q.key) : tab;
  };
  const closed = ws.questionnaires.filter((q) => !tabs.includes(`q:${q.id}`));
  // Marqueur « Validé » d'un formulaire validé (EVO-015).
  const badge = (q: Questionnaire | undefined) => isValidated(q) && (
    <span data-testid="validated-badge" title={t('validation.badgeTitle', { date: q!.validatedAt ?? '' })}
      className="flex items-center gap-0.5 rounded bg-emerald-50 px-1 text-[10px] font-medium text-emerald-700">
      <BadgeCheck className="size-3" />{t('validation.badge')}
    </span>
  );
  // Menu contextuel d'un questionnaire ou d'un fragment (EVO-010) : « Dupliquer » ; questionnaire : « Supprimer » (EVO-027).
  const [menu, setMenu] = useState<{ x: number; y: number; tab: TabId }>();
  const onMenu = (tab: TabId) => (e: React.MouseEvent) => {
    if (!tab.startsWith('q:') && !tab.startsWith('f:')) return;
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, tab });
  };
  const duplicate = (tab: TabId) => (tab.startsWith('q:')
    ? runCommand('questionnaire.duplicate', tab.slice(2))
    : runCommand('library.duplicate', { kind: 'fragment', id: tab.slice(2) }));
  return (
    <nav className="flex h-9 items-end gap-0.5 border-b border-slate-200 bg-slate-100 px-2" role="tablist">
      {tabs.map((tab) => (
        <div key={tab} role="tab" aria-selected={tab === active}
          className={cn('group flex h-8 cursor-pointer items-center gap-1.5 rounded-t-md border border-b-0 px-3 text-sm',
            tab === active ? 'border-slate-200 bg-white text-slate-800' : 'border-transparent text-slate-500 hover:bg-slate-50')}
          onClick={() => runCommand('tab.show', tab)} onContextMenu={onMenu(tab)}>
          {tab === 'library' && <BookOpen className="size-3.5" />}
          {tab === 'system' && <Database className="size-3.5" />}
          {tab === 'settings' && <Settings className="size-3.5" />}
          {tab === 'comments' && <MessageSquare className="size-3.5" />}
          {tab.startsWith('f:') && <Boxes className="size-3.5 text-amber-600" />}
          <span className="max-w-48 truncate">{label(tab)}</span>
          {tab === 'library' && <UnusedTotal />}
          {tab.startsWith('q:') && badge(ws.questionnaires.find((x) => `q:${x.id}` === tab))}
          <button type="button" aria-label={t('questionnaire.close')} className="rounded p-0.5 opacity-0 hover:bg-slate-200 group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); runCommand('tab.close', tab); }}>
            <X className="size-3" />
          </button>
        </div>
      ))}
      <button type="button" title={t('questionnaire.new')} aria-label={t('questionnaire.new')} className="mb-1 rounded p-1 text-slate-500 hover:bg-slate-200"
        onClick={() => runCommand('questionnaire.new')}>
        <Plus className="size-4" />
      </button>
      {closed.map((q) => (
        <button key={q.id} type="button" className="mb-1 flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-200" onClick={() => runCommand('tab.open', `q:${q.id}`)}
          onContextMenu={onMenu(`q:${q.id}`)}>
          {q.title[lang] ?? q.key}{badge(q)}
        </button>
      ))}
      <div className="ml-auto flex gap-1 pb-1">
        {!tabs.includes('library') && <button type="button" className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200" onClick={() => runCommand('tab.library')}>{t('tab.library')}<UnusedTotal /></button>}
        {!tabs.includes('system') && <button type="button" className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200" onClick={() => runCommand('tab.system')}>{t('tab.system')}</button>}
        {!tabs.includes('comments') && <button type="button" data-testid="open-comments" className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-200" onClick={() => runCommand('tab.comments')}>{t('tab.comments')}</button>}
      </div>
      <ContextMenu at={menu} onClose={() => setMenu(undefined)} items={[
        { label: t('node.duplicate'), onSelect: () => void duplicate(menu!.tab) },
        ...(menu?.tab.startsWith('q:') ? [{ label: t('props.delete'), onSelect: () => void runCommand('questionnaire.delete', menu!.tab.slice(2)) }] : []),
      ]} />
    </nav>
  );
}
