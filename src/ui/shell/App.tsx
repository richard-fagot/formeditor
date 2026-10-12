import { useEffect, useState } from 'react';
import { restoreSession, startAutosave } from '../../app/persistence';
import { bindShortcuts } from '../../app/shortcuts';
import { useStore, useT } from '../../app/store';
import { Button, Dialog } from '../../ui-kit';
import { FragmentView, Library } from '../library';
import { SystemState } from '../system-state';
import { Settings } from '../settings';
import { CopyDialog } from './CopyDialog';
import { Palette } from './Palette';
import { QuestionnaireView } from './QuestionnaireView';
import { Tabs } from './Tabs';
import { TopBar } from './TopBar';

/** Application : barre de projet, onglets, contenu de l'onglet actif, palette. */
export function App() {
  const t = useT();
  const [ready, setReady] = useState(false);
  const active = useStore((s) => s.activeTab);
  const keymap = useStore((s) => s.keymap);
  const notice = useStore((s) => s.notice);

  useEffect(() => {
    let stop: (() => void) | undefined;
    void restoreSession().finally(() => {
      stop = startAutosave();
      setReady(true);
    });
    return () => stop?.();
  }, []);
  useEffect(() => bindShortcuts(window), [keymap]);

  if (!ready) return null;
  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-800">
      <h1 data-testid="app-title" className="sr-only">{t('app.title')}</h1>
      <TopBar />
      <Tabs />
      <main className="min-h-0 flex-1">
        {active.startsWith('q:') && <QuestionnaireView key={active} id={active.slice(2)} />}
        {active.startsWith('f:') && <FragmentView key={active} id={active.slice(2)} />}
        {active === 'library' && <Library />}
        {active === 'system' && <SystemState />}
        {active === 'settings' && <Settings />}
      </main>
      <Palette />
      <CopyDialog />
      <Dialog open={!!notice} onOpenChange={() => useStore.getState().set((s) => void (s.notice = undefined))} title={notice?.title ?? ''} description={notice?.title}>
        <ul className="max-h-80 space-y-1 overflow-y-auto p-4 font-mono text-xs text-rose-700">
          {notice?.lines.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
        <div className="flex justify-end p-3"><Button onClick={() => useStore.getState().set((s) => void (s.notice = undefined))}>{t('common.close')}</Button></div>
      </Dialog>
    </div>
  );
}
