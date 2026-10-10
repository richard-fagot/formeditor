import { Command as Cmdk } from 'cmdk';
import { activeGraphRef, getGraph, useEditorEnv, useStore, useT } from '../../app/store';
import { commands, connectSelectedTo, labelOf } from '../../app/commands';
import { formatKey, keysOf } from '../../app/shortcuts';
import { questionOfNode } from '../../core/references';
import { previewText } from '../../plugin-api';
import { Dialog, Kbd } from '../../ui-kit';

const ITEM = 'flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-slate-700 data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-800';

/** Palette de commandes (Ctrl+K) : toutes les actions, et recherche de nœud par clé ou intitulé. */
export function Palette() {
  const t = useT();
  const env = useEditorEnv();
  const palette = useStore((s) => s.palette);
  const activeTab = useStore((s) => s.activeTab);
  const ref = activeTab.startsWith('q:') ? activeGraphRef(useStore.getState()) : undefined;
  const g = ref ? getGraph(env.ws, ref) : undefined;
  const close = () => useStore.getState().set((s) => void (s.palette = { ...s.palette, open: false }));
  const refocus = () => setTimeout(() => (document.querySelector('[data-graph-focus]') as HTMLElement | null)?.focus(), 0);
  const connect = palette.mode === 'connect';
  const items = connect ? [] : commands().filter((c) => !c.hidden && (!c.enabled || c.enabled()));
  const nodes = (g?.nodes ?? []).map((n) => {
    const q = questionOfNode(env.ws, n);
    const label = q?.label ?? (('title' in n && n.title) || ('text' in n && n.text) || ('message' in n && n.message) || undefined);
    const text = n.kind === 'block' ? n.alias : n.kind === 'exit' ? n.name : previewText(label, env);
    return { id: n.id, text: text || n.kind, key: q?.key ?? n.kind };
  });
  return (
    <Dialog open={palette.open} onOpenChange={(o) => !o && close()} title={t('palette.open')}>
      <Cmdk label={t('palette.open')} className="overflow-hidden rounded-xl" loop>
        <Cmdk.Input autoFocus placeholder={t(connect ? 'palette.connectPlaceholder' : 'palette.placeholder')}
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
          {nodes.length > 0 && (
            <Cmdk.Group heading={t('palette.nodes')} className="text-xs text-slate-400 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1">
              {nodes.map((n) => (
                <Cmdk.Item key={n.id} value={`${n.text} ${n.key} ${n.id}`} className={ITEM}
                  onSelect={() => {
                    close();
                    if (connect) connectSelectedTo(n.id);
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
