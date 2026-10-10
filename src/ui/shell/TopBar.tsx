import { Command, Download, FileJson, FilePlus2, FolderOpen, Sparkles } from 'lucide-react';
import { UI_LANGUAGES } from '../../app/i18n';
import { runCommand } from '../../app/commands';
import { useStore, useT } from '../../app/store';
import { Button, Kbd, Select, cn } from '../../ui-kit';

/** Barre de projet : nom, fichiers, langues, état d'export, palette. */
export function TopBar() {
  const t = useT();
  const name = useStore((s) => s.ws.project.name);
  const dirty = useStore((s) => s.dirty);
  const languages = useStore((s) => s.ws.project.languages);
  const contentLang = useStore((s) => s.contentLang);
  const uiLang = useStore((s) => s.uiLang);
  return (
    <header className="flex h-12 items-center gap-2 border-b border-slate-200 bg-white px-3">
      <div className="mr-2 flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">Q</div>
      <input
        aria-label={t('project.name')}
        className="w-56 rounded px-1.5 py-1 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:bg-white focus:outline-indigo-400"
        value={name}
        onChange={(e) => runCommand('project.rename', e.target.value)}
      />
      <span className={cn('flex items-center gap-1 text-xs', dirty ? 'text-amber-600' : 'text-emerald-600')} data-testid="dirty">
        <span className="size-1.5 rounded-full bg-current" />
        {t(dirty ? 'project.unsaved' : 'project.saved')}
      </span>
      <div className="ml-4 flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={() => runCommand('project.new')}><FilePlus2 className="size-3.5" />{t('project.new')}</Button>
        <Button size="sm" variant="ghost" onClick={() => runCommand('project.open')}><FolderOpen className="size-3.5" />{t('project.open')}</Button>
        <Button size="sm" variant="ghost" onClick={() => runCommand('project.example')} title={t('project.example')}><Sparkles className="size-3.5" /></Button>
        <Button size="sm" variant="ghost" onClick={() => runCommand('project.export')} data-testid="export"><Download className="size-3.5" />{t('project.export')}</Button>
        <Button size="sm" variant="ghost" onClick={() => runCommand('project.exportFiles')} title={t('project.exportFiles')}><FileJson className="size-3.5" /></Button>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Select aria-label={t('common.contentLang')} title={t('common.contentLang')} className="h-7 w-20 py-0 text-xs" value={contentLang}
          onChange={(e) => runCommand('lang.content', e.target.value)}>
          {languages.map((l) => <option key={l}>{l}</option>)}
        </Select>
        <Select aria-label={t('common.lang')} title={t('common.lang')} className="h-7 w-20 py-0 text-xs" value={uiLang}
          onChange={(e) => runCommand('lang.ui', e.target.value)}>
          {UI_LANGUAGES.map((l) => <option key={l}>{l}</option>)}
        </Select>
        <Button size="sm" onClick={() => runCommand('palette.open')} data-testid="palette-button">
          <Command className="size-3.5" />{t('palette.open')}<Kbd>Ctrl+K</Kbd>
        </Button>
      </div>
    </header>
  );
}
