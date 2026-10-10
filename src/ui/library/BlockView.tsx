import { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import type { Block } from '../../core/model';
import { checkWorkspace } from '../../core/validation';
import { runCommand } from '../../app/commands';
import { useStore, useT, type GraphRef } from '../../app/store';
import { Button, Field, Input, LocalizedTextInput } from '../../ui-kit';
import { Diagram, ProblemsPanel } from '../diagram';
import { KeyInput, PropertiesPanel, usePluginEnv } from '../properties';
import { itemUsages } from './items';

/** Modifie le bloc dans l'historique de la bibliothèque (frappes regroupées par champ). */
function patch(id: string, field: string, p: Partial<Block>) {
  useStore.getState().edit('library', (ws) => {
    const b = ws.library.blocks.find((x) => x.id === id);
    if (b) Object.assign(b, p);
  }, `${id}:${field}`);
}

/** Bloc de la bibliothèque : en-tête (titre, clé, description) puis logigramme éditable et propriétés. */
export function BlockView({ id }: { id: string }) {
  const t = useT();
  const env = usePluginEnv();
  const block = env.ws.library.blocks.find((b) => b.id === id);
  const graph: GraphRef = useMemo(() => ({ kind: 'block', id }), [id]);
  const issues = useMemo(() => checkWorkspace(env.ws).filter((i) => i.owner.kind === 'block' && i.owner.id === id), [env.ws, id]);
  if (!block) return null;
  const usages = itemUsages(env.ws, { kind: 'block', id });
  const taken = env.ws.library.blocks.filter((b) => b.id !== id).map((b) => b.key);
  return (
    <div className="flex h-full flex-col" data-testid="block-view">
      <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <Field label={t('library.blockTitle')} className="w-72">
          <LocalizedTextInput languages={env.languages} activeLang={env.contentLang} value={block.title} onChange={(title) => patch(id, 'title', { title })} />
        </Field>
        <Field label={t('library.blockKey')} htmlFor="block-key" className="w-48">
          <KeyInput id="block-key" value={block.key} taken={taken} invalidText={t('props.keyInvalid')} onCommit={(key) => patch(id, 'key', { key })} />
        </Field>
        <Field label={t('props.description')} className="min-w-48 flex-1">
          <Input value={block.description ?? ''} onChange={(e) => patch(id, 'description', { description: e.target.value || undefined })} />
        </Field>
        <Button size="sm" variant="danger" onClick={() => runCommand('library.delete', { kind: 'block', id })}>
          <Trash2 className="size-3" />{t('props.delete')}
        </Button>
        <p className="w-full text-xs text-slate-500">
          {t('library.blockHint')} {usages.length ? t('library.usedIn', { list: usages.join(', ') }) : t('library.unused')}
        </p>
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1"><Diagram graph={graph} issues={issues} /></div>
          <ProblemsPanel graph={graph} issues={issues} />
        </div>
        <aside className="w-96 shrink-0 border-l border-slate-200 bg-white"><PropertiesPanel graph={graph} /></aside>
      </div>
    </div>
  );
}
