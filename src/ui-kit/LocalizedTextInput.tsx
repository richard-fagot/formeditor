import { Input, Textarea } from './controls';

type Text = Record<string, string>;

/** Saisie d'un texte multilingue : une ligne par langue, la langue active en premier. */
export function LocalizedTextInput({
  value, onChange, languages, activeLang, multiline, placeholder, id, autoFocus, onKeyDown,
}: {
  value: Text | undefined;
  onChange(v: Text): void;
  languages: string[];
  activeLang: string;
  multiline?: boolean;
  placeholder?: string;
  id?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  const ordered = [activeLang, ...languages.filter((l) => l !== activeLang)];
  const set = (lang: string, text: string) => {
    const next = { ...(value ?? {}) };
    if (text) next[lang] = text;
    else delete next[lang];
    onChange(next);
  };
  return (
    <div className="space-y-1">
      {ordered.map((lang, i) => {
        const props = {
          id: i === 0 ? id : undefined,
          value: value?.[lang] ?? '',
          placeholder: i === 0 ? placeholder : (value?.[activeLang] ?? ''),
          autoFocus: i === 0 && autoFocus,
          onKeyDown,
          'aria-label': lang,
          className: i === 0 ? '' : 'text-slate-600',
        };
        return (
          <div key={lang} className="flex items-start gap-1.5">
            {languages.length > 1 && (
              <span className={`mt-1.5 w-6 shrink-0 text-center font-mono text-[10px] uppercase ${value?.[lang] ? 'text-slate-400' : 'text-amber-500'}`}>
                {lang}
              </span>
            )}
            {multiline ? (
              <Textarea {...props} onChange={(e) => set(lang, e.target.value)} />
            ) : (
              <Input {...props} onChange={(e) => set(lang, e.target.value)} />
            )}
          </div>
        );
      })}
    </div>
  );
}
