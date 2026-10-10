import { useMemo, useState, type KeyboardEvent } from 'react';
import { Plus, RotateCcw, X } from 'lucide-react';
import { commands, labelOf, runCommand, type Command } from '../../app/commands';
import { comboOf, formatKey, keysOf, normalizeKey } from '../../app/shortcuts';
import { useStore, useT } from '../../app/store';
import { Badge, Button, Input, Kbd } from '../../ui-kit';

/** Actions paramétrables : visibles dans la palette, ou dotées d'un raccourci par défaut (flèches…). */
const configurable = () => commands().filter((c) => !c.hidden || c.keys.length > 0);

/** Écran de paramétrage des raccourcis : chaque action, ses combinaisons, ajout par frappe, retrait, retour au défaut. */
export function ShortcutsSection() {
  const t = useT();
  const keymap = useStore((s) => s.keymap);
  const [filter, setFilter] = useState('');
  const [capturing, setCapturing] = useState<string>();
  const list = useMemo(() => {
    void keymap;
    return configurable().map((c) => ({ c, label: labelOf(c, t), keys: keysOf(c) }));
  }, [keymap, t]);
  // Combinaison → actions qui l'utilisent (signalement des doublons sur les actions personnalisées).
  const users = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const { label, keys } of list) for (const k of keys) m.set(normalizeKey(k), [...(m.get(normalizeKey(k)) ?? []), label]);
    return m;
  }, [list]);
  const shown = list.filter(({ label, c }) => `${label} ${c.id}`.toLowerCase().includes(filter.toLowerCase()));

  const capture = (c: Command, keys: string[]) => (e: KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') return setCapturing(undefined);
    const combo = comboOf(e.nativeEvent);
    if (!combo) return;
    runCommand('shortcut.set', { id: c.id, keys: [...keys, combo] });
    setCapturing(undefined);
  };

  return (
    <section className="space-y-3" data-testid="settings-shortcuts">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold text-slate-800">{t('settings.shortcuts')}</h3>
        <Button size="sm" variant="ghost" className="ml-auto" disabled={!Object.keys(keymap).length} onClick={() => runCommand('shortcut.reset')}>
          <RotateCcw className="size-3" />{t('shortcut.resetAll')}
        </Button>
      </div>
      <p className="text-sm text-slate-500">{t('settings.shortcutsHint')}</p>
      <Input value={filter} placeholder={t('settings.filter')} aria-label={t('settings.filter')} onChange={(e) => setFilter(e.target.value)} />
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
        {shown.map(({ c, label, keys }) => {
          const custom = c.id in keymap;
          const clash = custom ? [...new Set(keys.flatMap((k) => users.get(normalizeKey(k)) ?? []))].filter((l) => l !== label) : [];
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-2 px-3 py-1.5" data-testid={`shortcut-${c.id}`}>
              <span className="min-w-0 flex-1 truncate text-slate-700" title={c.id}>{label}</span>
              {c.scope === 'graph' && <Badge>{t('shortcut.graph')}</Badge>}
              {custom && <Badge tone="indigo">{t('shortcut.custom')}</Badge>}
              {keys.map((k) => (
                <span key={k} className="flex items-center">
                  <Kbd>{formatKey(k)}</Kbd>
                  <button type="button" className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600" aria-label={t('shortcut.remove', { key: formatKey(k) })}
                    onClick={() => runCommand('shortcut.set', { id: c.id, keys: keys.filter((x) => x !== k) })}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {capturing === c.id ? (
                <Input autoFocus readOnly className="h-7 w-64 text-xs" value="" placeholder={t('shortcut.press')} aria-label={t('shortcut.press')}
                  onKeyDown={capture(c, keys)} onBlur={() => setCapturing(undefined)} />
              ) : (
                <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" title={t('shortcut.add')} aria-label={`${t('shortcut.add')} : ${label}`}
                  onClick={() => setCapturing(c.id)}>
                  <Plus className="size-3.5" />
                </button>
              )}
              {custom && (
                <button type="button" className="rounded p-1 text-slate-500 hover:bg-slate-100" title={t('shortcut.reset')} aria-label={t('shortcut.reset')}
                  onClick={() => runCommand('shortcut.reset', c.id)}>
                  <RotateCcw className="size-3.5" />
                </button>
              )}
              {clash.length > 0 && <p className="basis-full text-xs text-amber-700">{t('shortcut.conflict', { list: clash.join(', ') })}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
