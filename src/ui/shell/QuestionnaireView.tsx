import { useMemo } from 'react';
import { BadgeCheck, BookOpen, Columns2, FileSpreadsheet, ImageDown, MessageSquare, Network } from 'lucide-react';
import { isValidated } from '../../core/model';
import { useStore, useT, type GraphRef } from '../../app/store';
import { useIssues } from '../../app/issues';
import { runCommand } from '../../app/commands';
import { cn } from '../../ui-kit';
import { Diagram, ProblemsPanel } from '../diagram';
import { PropertiesPanel } from '../properties';
import { Preview } from '../preview';
import { LibraryPanel } from '../library';
import { ComparePane } from './ComparePane';
import { VersionAlert } from './VersionAlert';

/** Onglet de questionnaire : sous-onglets Logigramme / Prévisualisation. */
export function QuestionnaireView({ id }: { id: string }) {
  const t = useT();
  const view = useStore((s) => s.view[id] ?? 'diagram');
  const panel = useStore((s) => s.libraryPanel);
  const compare = useStore((s) => (s.compare && s.compare !== id && s.ws.questionnaires.some((q) => q.id === s.compare) ? s.compare : undefined));
  const canCompare = useStore((s) => s.ws.questionnaires.length > 1);
  const empty = useStore((s) => !s.ws.questionnaires.find((q) => q.id === id)?.nodes.length);
  const busy = useStore((s) => s.imageBusy);
  const hasComments = useStore((s) => !!s.ws.layouts.find((l) => l.graph === id)?.comments?.length);
  const validatedAt = useStore((s) => { const q = s.ws.questionnaires.find((x) => x.id === id); return isValidated(q) ? (q!.validatedAt ?? '') : undefined; });
  const graph: GraphRef = useMemo(() => ({ kind: 'questionnaire', id }), [id]);
  const issues = useIssues({ owner: { kind: 'questionnaire', id } });
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
        {view === 'diagram' && (
          <button type="button" data-testid="auto-layout" title={t('view.layout')}
            className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            onClick={() => runCommand('view.layout')}>
            <Network className="size-3.5" />{t('view.layout')}
          </button>
        )}
        {view === 'diagram' && (
          <button type="button" data-testid="export-image" title={t('image.export')} disabled={empty || busy}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
            onClick={() => runCommand('view.exportImage')}>
            <ImageDown className="size-3.5" />{busy ? t('image.busy') : t('image.short')}
          </button>
        )}
        {view === 'diagram' && (
          <button type="button" data-testid="export-inventory" title={t('inventory.export')}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            onClick={() => runCommand('questionnaire.exportInventory')}>
            <FileSpreadsheet className="size-3.5" />{t('inventory.short')}
          </button>
        )}
        {view === 'diagram' && (
          <button type="button" data-testid="toggle-comments" title={t('comment.toggleAll')} disabled={!hasComments}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
            onClick={() => runCommand('comment.toggleAll')}>
            <MessageSquare className="size-3.5" />{t('comment.short')}
          </button>
        )}
        {view === 'diagram' && canCompare && (
          <button type="button" data-testid="toggle-compare" title={t('view.compare')} aria-pressed={!!compare}
            className={cn('flex items-center gap-1 rounded px-2 py-1 text-xs', compare ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-100')}
            onClick={() => runCommand('view.compare')}>
            <Columns2 className="size-3.5" />{t('view.compare')}
          </button>
        )}
        {view === 'diagram' && (validatedAt === undefined ? (
          <button type="button" data-testid="validate" title={t('questionnaire.validate')}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            onClick={() => runCommand('questionnaire.validate')}>
            <BadgeCheck className="size-3.5" />{t('questionnaire.validate')}
          </button>
        ) : (
          <button type="button" data-testid="unvalidate" title={t('questionnaire.unvalidate')}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
            onClick={() => runCommand('questionnaire.unvalidate')}>
            {t('questionnaire.unvalidate')}
          </button>
        ))}
        {view === 'diagram' && (
          <button type="button" data-testid="toggle-library-panel" title={t('view.libraryPanel')}
            className={cn('flex items-center gap-1 rounded px-2 py-1 text-xs', panel ? 'bg-amber-50 text-amber-800' : 'text-slate-500 hover:bg-slate-100')}
            onClick={() => runCommand('view.libraryPanel')}>
            <BookOpen className="size-3.5" />{t('tab.library')}
          </button>
        )}
      </div>
      {view === 'diagram' ? (
        <div className="flex min-h-0 flex-1">
          {panel && !compare && <LibraryPanel graph={graph} />}
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              <Diagram graph={graph} issues={issues} />
              {validatedAt !== undefined && (
                <span data-testid="diagram-validated" title={t('validation.badgeTitle', { date: validatedAt })}
                  className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 shadow-sm">
                  <BadgeCheck className="size-4" />{t('validation.badge')}
                </span>
              )}
              <VersionAlert id={id} />
            </div>
            <ProblemsPanel graph={graph} issues={issues} />
          </div>
          {compare && <ComparePane activeId={id} compareId={compare} />}
          <aside className="w-96 shrink-0 border-l border-slate-200 bg-white"><PropertiesPanel graph={graph} /></aside>
        </div>
      ) : (
        <div className="min-h-0 flex-1"><Preview questionnaireId={id} /></div>
      )}
    </div>
  );
}
