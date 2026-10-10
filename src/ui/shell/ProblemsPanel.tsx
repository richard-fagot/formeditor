import { ChevronDown, ChevronUp } from 'lucide-react';
import { describeIssue, type Issue } from '../../core/validation';
import { useStore, useT, type GraphRef } from '../../app/store';
import { runCommand } from '../../app/commands';
import { cn } from '../../ui-kit';

/** Panneau repliable des avertissements (§4.6) ; un clic sélectionne l'objet concerné. */
export function ProblemsPanel({ graph, issues }: { graph: GraphRef; issues: Issue[] }) {
  const t = useT();
  const open = useStore((s) => s.problemsOpen);
  const uiLang = useStore((s) => s.uiLang);
  const errors = issues.filter((i) => i.severity === 'error').length;
  return (
    <div className="border-t border-slate-200 bg-white" data-testid="problems">
      <button type="button" className="flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" onClick={() => runCommand('view.problems')}>
        {open ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
        {t('view.problems')}
        <span className={cn('rounded-full px-1.5', errors ? 'bg-rose-100 text-rose-700' : issues.length ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700')}>{issues.length}</span>
      </button>
      {open && (
        <ul className="max-h-40 overflow-y-auto px-2 pb-2 text-xs">
          {!issues.length && <li className="px-2 py-1 text-slate-400">{t('view.noProblem')}</li>}
          {issues.map((i, k) => (
            <li key={k}>
              <button type="button" className="flex w-full gap-2 rounded px-2 py-1 text-left hover:bg-slate-50"
                onClick={() => useStore.getState().select({ graph, nodes: i.nodeId ? [i.nodeId] : [], edge: i.nodeId ? undefined : i.edgeId })}>
                <span className={i.severity === 'error' ? 'text-rose-600' : 'text-amber-600'}>●</span>
                <span className="text-slate-700">{describeIssue(i, uiLang)}</span>
                <span className="ml-auto font-mono text-slate-400">{i.nodeId ?? i.edgeId ?? ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
