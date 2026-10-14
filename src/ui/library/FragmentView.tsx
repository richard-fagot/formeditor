import { useMemo } from 'react';
import { BookOpen, Boxes, MessageSquare, Trash2 } from 'lucide-react';
import { fragmentCallers, type Fragment } from '../../core/model';
import { checkWorkspace } from '../../core/validation';
import { runCommand } from '../../app/commands';
import { useStore, useT, type GraphRef } from '../../app/store';
import { Button, cn, Field, Input, LocalizedTextInput } from '../../ui-kit';
import { Diagram, ProblemsPanel } from '../diagram';
import { KeyInput, PropertiesPanel, usePluginEnv } from '../properties';
import { LibraryPanel } from './LibraryPanel';
import { ItemVersion } from './ItemVersion';

/** Modifie le fragment dans l'historique de la bibliothèque (frappes regroupées par champ). */
function patch(id: string, field: string, p: Partial<Fragment>) {
  useStore.getState().edit('library', (ws) => {
    const f = ws.library.fragments.find((x) => x.id === id);
    if (f) Object.assign(f, p);
  }, `${id}:${field}`);
}

/**
 * Onglet d'un fragment (EVO-008) : bandeau (fragment, nombre d'appelants), titre, clé, description, suppression,
 * puis le même logigramme qu'un questionnaire (panneau de la bibliothèque, problèmes, propriétés).
 */
export function FragmentView({ id }: { id: string }) {
  const t = useT();
  const env = usePluginEnv();
  const panel = useStore((s) => s.libraryPanel);
  const hasComments = useStore((s) => !!s.ws.layouts.find((l) => l.graph === id)?.comments?.length);
  const fragment = env.ws.library.fragments.find((f) => f.id === id);
  const graph: GraphRef = useMemo(() => ({ kind: 'fragment', id }), [id]);
  const issues = useMemo(() => checkWorkspace(env.ws).filter((i) => i.owner.kind === 'fragment' && i.owner.id === id), [env.ws, id]);
  if (!fragment) return null;
  const callers = fragmentCallers(env.ws, id).map((c) =>
    c.kind === 'questionnaire' ? env.ws.questionnaires.find((q) => q.id === c.id)?.key : env.ws.library.fragments.find((f) => f.id === c.id)?.key);
  const taken = env.ws.library.fragments.filter((f) => f.id !== id).map((f) => f.key);
  return (
    <div className="flex h-full flex-col" data-testid="fragment-view">
      <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-800" data-testid="fragment-banner">
        <Boxes className="size-3.5" />
        <span className="font-semibold">{t('library.fragmentBanner')}</span>
        <span>·</span>
        <span data-testid="fragment-callers">{callers.length ? t('library.callers', { n: String(callers.length), list: callers.join(', ') }) : t('library.noCaller')}</span>
        <button type="button" data-testid="toggle-comments" title={t('comment.toggleAll')} disabled={!hasComments}
          className="ml-auto flex items-center gap-1 rounded px-2 py-0.5 hover:bg-amber-100 disabled:opacity-40 disabled:hover:bg-transparent"
          onClick={() => runCommand('comment.toggleAll')}>
          <MessageSquare className="size-3.5" />{t('comment.short')}
        </button>
        <button type="button" data-testid="toggle-library-panel" title={t('view.libraryPanel')}
          className={cn('flex items-center gap-1 rounded px-2 py-0.5', panel ? 'bg-amber-100' : 'hover:bg-amber-100')}
          onClick={() => runCommand('view.libraryPanel')}>
          <BookOpen className="size-3.5" />{t('tab.library')}
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <Field label={t('library.fragmentTitle')} className="w-72">
          <LocalizedTextInput languages={env.languages} activeLang={env.contentLang} value={fragment.title} onChange={(title) => patch(id, 'title', { title })} />
        </Field>
        <Field label={t('library.fragmentKey')} htmlFor="fragment-key" className="w-48">
          <KeyInput id="fragment-key" value={fragment.key} taken={taken} invalidText={t('props.keyInvalid')} onCommit={(key) => patch(id, 'key', { key })} />
        </Field>
        <Field label={t('props.description')} className="min-w-48 flex-1">
          <Input value={fragment.description ?? ''} onChange={(e) => patch(id, 'description', { description: e.target.value || undefined })} />
        </Field>
        <Button size="sm" variant="danger" onClick={() => runCommand('library.delete', { kind: 'fragment', id })}>
          <Trash2 className="size-3" />{t('props.delete')}
        </Button>
        <ItemVersion item={{ kind: 'fragment', id }} />
        <p className="w-full text-xs text-slate-500">{t('library.fragmentHint')}</p>
      </div>
      <div className="flex min-h-0 flex-1">
        {panel && <LibraryPanel graph={graph} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1"><Diagram graph={graph} issues={issues} /></div>
          <ProblemsPanel graph={graph} issues={issues} />
        </div>
        <aside className="w-96 shrink-0 border-l border-slate-200 bg-white"><PropertiesPanel graph={graph} /></aside>
      </div>
    </div>
  );
}
