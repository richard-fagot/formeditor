import { useEffect, useState, type KeyboardEvent } from 'react';
import { runCommand } from '../../app/commands';
import { useStore, useT, type GraphRef, type ImageOptions } from '../../app/store';
import { Button, Checkbox, Dialog } from '../../ui-kit';

/**
 * Options de l'export d'image (EVO-004) : périmètre (la sélection seulement si des nœuds sont sélectionnés), titre.
 * Ouvert avec les derniers choix ; `Entrée` lance l'export (commande `view.exportImageRun`).
 */
export function ImageDialog({ graph }: { graph: GraphRef }) {
  const t = useT();
  const open = useStore((s) => s.imageDialog);
  const saved = useStore((s) => s.imageOptions);
  const count = useStore((s) => (s.selection.graph?.id === graph.id ? s.selection.nodes.length : 0));
  const [opts, setOpts] = useState<ImageOptions>(saved);
  useEffect(() => {
    if (open) setOpts({ ...saved, scope: saved.scope === 'selection' && count > 0 ? 'selection' : 'all' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => useStore.getState().set((s) => void (s.imageDialog = false));
  const run = () => runCommand('view.exportImageRun', opts);
  const onKeyDown = (e: KeyboardEvent) => {
    // `Entrée` lance l'export, sauf sur un bouton (qui garde son propre comportement).
    if (e.key !== 'Enter' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    run();
  };
  const radio = (scope: ImageOptions['scope'], label: string) => (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="radio" name="image-scope" data-testid={`image-scope-${scope}`} checked={opts.scope === scope}
        onChange={() => setOpts((o) => ({ ...o, scope }))} />
      {label}
    </label>
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()} title={t('image.export')} description={t('image.format')} className="w-[min(440px,92vw)]">
      <div data-testid="image-dialog" onKeyDown={onKeyDown} className="space-y-3 p-4">
        <fieldset className="space-y-1.5">
          <legend className="mb-1 text-xs font-medium text-slate-500">{t('image.scope')}</legend>
          {radio('all', t('image.scopeAll'))}
          {count > 0 && radio('selection', t('image.scopeSelection', { n: count }))}
        </fieldset>
        <Checkbox data-testid="image-title" checked={opts.title} onChange={(e) => setOpts((o) => ({ ...o, title: e.target.checked }))} label={t('image.title')} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={close}>{t('common.cancel')}</Button>
          <Button variant="primary" data-testid="image-submit" onClick={run}>{t('image.submit')}</Button>
        </div>
      </div>
    </Dialog>
  );
}
