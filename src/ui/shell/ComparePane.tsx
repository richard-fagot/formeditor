import { useMemo } from 'react';
import { X } from 'lucide-react';
import { checkWorkspace } from '../../core/validation';
import { runCommand } from '../../app/commands';
import { useStore, useT, type GraphRef } from '../../app/store';
import { Select } from '../../ui-kit';
import { Diagram } from '../diagram';

/** Vue côte à côte : logigramme d'un autre questionnaire, en lecture seule, à droite du logigramme actif. */
export function ComparePane({ activeId, compareId }: { activeId: string; compareId: string }) {
  const t = useT();
  const ws = useStore((s) => s.ws);
  const lang = useStore((s) => s.contentLang);
  const graph: GraphRef = useMemo(() => ({ kind: 'questionnaire', id: compareId }), [compareId]);
  const issues = useMemo(() => checkWorkspace(ws).filter((i) => i.owner.kind === 'questionnaire' && i.owner.id === compareId), [ws, compareId]);
  const others = ws.questionnaires.filter((q) => q.id !== activeId);
  return (
    <section className="flex min-w-0 flex-1 flex-col border-l-4 border-slate-200" data-testid="compare-pane" aria-label={t('view.compare')}>
      <div className="flex items-center gap-2 overflow-hidden border-b border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-500">
        <label className="flex min-w-0 items-center gap-2">
          {t('compare.with')}
          <Select className="h-7 w-56 min-w-0 py-0 text-xs" value={compareId} onChange={(e) => runCommand('view.compare', e.target.value)}>
            {others.map((q) => <option key={q.id} value={q.id}>{q.title[lang] ?? q.title[ws.project.defaultLanguage] ?? q.key}</option>)}
          </Select>
        </label>
        <span className="shrink-0 italic">{t('compare.readOnly')}</span>
        <button type="button" className="ml-auto shrink-0 rounded p-1 hover:bg-slate-200" title={t('compare.close')} aria-label={t('compare.close')}
          onClick={() => runCommand('view.compare')}>
          <X className="size-3.5" />
        </button>
      </div>
      <div className="min-h-0 flex-1"><Diagram graph={graph} issues={issues} readOnly /></div>
    </section>
  );
}
