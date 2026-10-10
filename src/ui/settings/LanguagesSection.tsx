import { useState } from 'react';
import { Plus, Star, Trash2 } from 'lucide-react';
import { runCommand } from '../../app/commands';
import { isLanguageCode, useStore, useT } from '../../app/store';
import { Badge, Button, Input } from '../../ui-kit';

/** Langues déclarées par le projet : ajout, retrait, langue par défaut. */
export function LanguagesSection() {
  const t = useT();
  const languages = useStore((s) => s.ws.project.languages);
  const def = useStore((s) => s.ws.project.defaultLanguage);
  const [code, setCode] = useState('');
  const valid = isLanguageCode(code.trim()) && !languages.includes(code.trim());
  const add = () => {
    if (!valid) return;
    runCommand('lang.add', code.trim());
    setCode('');
  };
  return (
    <section className="space-y-3" data-testid="settings-languages">
      <h3 className="text-lg font-semibold text-slate-800">{t('settings.languages')}</h3>
      <p className="text-sm text-slate-500">{t('settings.languagesHint')}</p>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {languages.map((l) => (
          <li key={l} className="flex items-center gap-2 px-3 py-2 text-sm" data-testid={`language-${l}`}>
            <span className="w-16 font-mono font-medium text-slate-700">{l}</span>
            {l === def ? <Badge tone="indigo">{t('lang.default')}</Badge> : (
              <Button size="sm" variant="ghost" onClick={() => runCommand('lang.default', l)}><Star className="size-3" />{t('lang.makeDefault')}</Button>
            )}
            {l !== def && (
              <Button size="sm" variant="ghost" className="ml-auto" title={t('lang.removeHint')} aria-label={`${t('lang.remove')} ${l}`}
                onClick={() => runCommand('lang.remove', l)}>
                <Trash2 className="size-3" />{t('lang.remove')}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <Input className="w-56" value={code} placeholder={t('lang.code')} aria-label={t('lang.code')} onChange={(e) => setCode(e.target.value)} />
        <Button size="sm" type="submit" disabled={!valid}><Plus className="size-3" />{t('lang.add')}</Button>
        {code.trim() && !valid && <span className="text-xs text-rose-600">{t('lang.invalid')}</span>}
      </form>
    </section>
  );
}
