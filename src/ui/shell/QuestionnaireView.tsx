import { useMemo } from 'react';
import { checkWorkspace } from '../../core/validation';
import { useStore, useT, type GraphRef } from '../../app/store';
import { runCommand } from '../../app/commands';
import { cn } from '../../ui-kit';
import { Diagram } from '../diagram';
import { PropertiesPanel } from '../properties';
import { Preview } from '../preview';
import { ProblemsPanel } from './ProblemsPanel';

/** Onglet de questionnaire : sous-onglets Logigramme / Prévisualisation. */
export function QuestionnaireView({ id }: { id: string }) {
  const t = useT();
  const ws = useStore((s) => s.ws);
  const view = useStore((s) => s.view[id] ?? 'diagram');
  const graph: GraphRef = useMemo(() => ({ kind: 'questionnaire', id }), [id]);
  const issues = useMemo(() => checkWorkspace(ws).filter((i) => i.owner.kind === 'questionnaire' && i.owner.id === id), [ws, id]);
  const sub = (v: 'diagram' | 'preview', label: string) => (
    <button type="button" data-testid={`view-${v}`}
      className={cn('border-b-2 px-3 py-2 text-sm', view === v ? 'border-indigo-500 font-medium text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700')}
      onClick={() => view !== v && runCommand('view.toggle')}>
      {label}
    </button>
  );
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-3">
        {sub('diagram', t('view.diagram'))}
        {sub('preview', t('view.preview'))}
      </div>
      {view === 'diagram' ? (
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="min-h-0 flex-1"><Diagram graph={graph} issues={issues} /></div>
            <ProblemsPanel graph={graph} issues={issues} />
          </div>
          <aside className="w-96 shrink-0 border-l border-slate-200 bg-white"><PropertiesPanel graph={graph} /></aside>
        </div>
      ) : (
        <div className="min-h-0 flex-1"><Preview questionnaireId={id} /></div>
      )}
    </div>
  );
}
