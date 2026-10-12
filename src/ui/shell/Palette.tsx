import { Command as Cmdk } from 'cmdk';
import { activeGraphRef, getGraph, insertionCycle, useEditorEnv, useStore, useT, type GraphRef } from '../../app/store';
import { command, commands, labelOf, runCommand } from '../../app/commands';
import { formatKey, keysOf } from '../../app/shortcuts';
import { questionOfNode } from '../../core/references';
import { previewText } from '../../plugin-api';
import { Dialog, Kbd } from '../../ui-kit';

/** Éléments de bibliothèque insérables dans le graphe (sans les fragments qui créeraient un cycle d'appels). */
function libraryItems(env: ReturnType<typeof useEditorEnv>, ref: GraphRef | undefined) {
  const lib = env.ws.library;
  return [
    ...lib.questions.map((q) => ({ kind: 'question' as const, id: q.id, key: q.key, title: previewText(q.label, env) || q.key })),
    ...lib.fragments
      .filter((f) => !ref || !insertionCycle(env.ws, ref, { kind: 'fragment', id: f.id }))
      .map((f) => ({ kind: 'fragment' as const, id: f.id, key: f.key, title: f.title[env.contentLang] ?? f.title[env.defaultLang] ?? f.key })),
  ];
}

const ITEM = 'flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-slate-700 data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-800';

/** Palette de commandes (Ctrl+K) : toutes les actions, et recherche de nœud par clé ou intitulé. */
export function Palette() {
  const t = useT();
  const env = useEditorEnv();
  const palette = useStore((s) => s.palette);
  useStore((s) => s.activeTab + (s.libraryItem?.id ?? ''));
  const ref = activeGraphRef(useStore.getState());
  const g = ref ? getGraph(env.ws, ref) : undefined;
  const close = () => useStore.getState().set((s) => void (s.palette = { ...s.palette, open: false }));
  const refocus = () => setTimeout(() => (document.querySelector('[data-graph-focus]') as HTMLElement | null)?.focus(), 0);
  const connect = palette.mode === 'connect';
  const libraryMode = palette.mode === 'library';
  const items = palette.mode === 'commands' ? commands().filter((c) => !c.hidden && (!c.enabled || c.enabled())) : [];
  const insertable = palette.mode !== 'connect' && command('library.insert')?.enabled?.() ? libraryItems(env, ref) : [];
  const nodes = (libraryMode ? [] : g?.nodes ?? []).map((n) => {
    const q = questionOfNode(env.ws, n);
    const label = q?.label ?? (('title' in n && n.title) || ('text' in n && n.text) || ('message' in n && n.message) || undefined);
    const text = n.kind === 'fragment' ? n.alias : n.kind === 'exit' ? n.name : previewText(label, env);
    return { id: n.id, text: text || n.kind, key: q?.key ?? n.kind };
  });
  return (
    <Dialog open={palette.open} onOpenChange={(o) => !o && close()} title={t('palette.open')}>
      <Cmdk label={t('palette.open')} className="overflow-hidden rounded-xl" loop>
        <Cmdk.Input autoFocus placeholder={t(connect ? 'palette.connectPlaceholder' : libraryMode ? 'palette.libraryPlaceholder' : 'palette.placeholder')}
          className="w-full border-b border-slate-100 px-4 py-3 text-sm outline-none placeholder:text-slate-400" />
        <Cmdk.List className="max-h-[50vh] overflow-y-auto p-2">
          <Cmdk.Empty className="p-3 text-sm text-slate-400">{t('palette.empty')}</Cmdk.Empty>
          {items.length > 0 && (
            <Cmdk.Group heading={t('palette.commands')} className="text-xs text-slate-400 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1">
              {items.map((c) => (
                <Cmdk.Item key={c.id} value={`${labelOf(c, t)} ${c.id}`} className={ITEM} onSelect={() => { close(); c.run(); refocus(); }}>
                  <span>{labelOf(c, t)}</span>
                  <span className="flex gap-1">{keysOf(c).slice(0, 1).map((k) => <Kbd key={k}>{formatKey(k)}</Kbd>)}</span>
                </Cmdk.Item>
              ))}
            </Cmdk.Group>
          )}
          {insertable.length > 0 && (
            <Cmdk.Group heading={t('palette.library')} className="text-xs text-slate-400 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1">
              {insertable.map((x) => (
                <Cmdk.Item key={x.id} value={`${libraryMode ? '' : t('library.insert')} ${x.title} ${x.key} ${x.id}`} className={ITEM}
                  onSelect={() => { close(); runCommand('library.insertItem', { kind: x.kind, id: x.id }); refocus(); }}>
                  <span className="truncate">{libraryMode ? x.title : t('library.insertItem', { name: x.title })}</span>
                  <span className="font-mono text-[11px] text-slate-400">{x.kind === 'fragment' ? `▣ ${x.key}` : x.key}</span>
                </Cmdk.Item>
              ))}
            </Cmdk.Group>
          )}
          {nodes.length > 0 && (
            <Cmdk.Group heading={t('palette.nodes')} className="text-xs text-slate-400 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1">
              {nodes.map((n) => (
                <Cmdk.Item key={n.id} value={`${n.text} ${n.key} ${n.id}`} className={ITEM}
                  onSelect={() => {
                    close();
                    if (connect) runCommand('node.connectTo', n.id);
                    else useStore.getState().select({ graph: ref, nodes: [n.id] });
                    refocus();
                  }}>
                  <span className="truncate">{n.text}</span>
                  <span className="font-mono text-[11px] text-slate-400">{n.key}</span>
                </Cmdk.Item>
              ))}
            </Cmdk.Group>
          )}
        </Cmdk.List>
      </Cmdk>
    </Dialog>
  );
}
