import { command, runCommand } from '../../app/commands';
import { formatKey } from '../../app/shortcuts';
import { useStore, useT } from '../../app/store';
import { Button, Kbd } from '../../ui-kit';

export /** Invitation affichée sur un graphe vide : la première question, à la souris ou par N. */
function EmptyHint() {
  const t = useT();
  const custom = useStore((s) => s.keymap['node.newQuestion']);
  const key = (custom ?? command('node.newQuestion')?.keys ?? [])[0];
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" data-testid="diagram-empty">
      <div className="pointer-events-auto flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white/90 px-6 py-4 text-sm text-slate-500">
        <span>{t('diagram.empty')}</span>
        <Button size="sm" onClick={() => runCommand('node.newQuestion')}>{t('diagram.firstQuestion')}{key && <Kbd>{formatKey(key)}</Kbd>}</Button>
      </div>
    </div>
  );
}
