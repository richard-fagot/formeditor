import { Plus, X } from 'lucide-react';
import { isVariantLabel, type Label, type LocalizedText } from '../../core/model';
import { Button, LocalizedTextInput } from '../../ui-kit';
import { useExpressionEnv } from './context';
import { ExpressionInput } from './ExpressionInput';

const T = {
  addVariant: { fr: 'Variante conditionnelle', en: 'Conditional variant' },
  when: { fr: 'Si', en: 'If' },
  otherwise: { fr: 'Sinon', en: 'Otherwise' },
  hint: { fr: '{cle} insère une valeur', en: '{key} inserts a value' },
};

/** Saisie d'un libellé multilingue interpolable, avec variantes conditionnelles facultatives. */
export function LabelEditor({
  value, onChange, multiline, id, autoFocus, placeholder, onKeyDown,
}: {
  value: Label | undefined;
  onChange(v: Label | undefined): void;
  multiline?: boolean;
  id?: string;
  autoFocus?: boolean;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  const env = useExpressionEnv();
  const tr = (t: LocalizedText) => t[env.uiLang] ?? t.fr!;
  const text = (v: LocalizedText | undefined, set: (t: LocalizedText) => void, first = false) => (
    <LocalizedTextInput
      value={v}
      onChange={set}
      languages={env.languages}
      activeLang={env.contentLang}
      multiline={multiline}
      id={first ? id : undefined}
      autoFocus={first && autoFocus}
      placeholder={first ? placeholder : undefined}
      onKeyDown={first ? onKeyDown : undefined}
    />
  );
  const clean = (t: LocalizedText) => (Object.keys(t).length ? t : undefined);

  if (!value || !isVariantLabel(value)) {
    return (
      <div className="space-y-1">
        {text(value, (t) => onChange(clean(t)), true)}
        <Button size="sm" variant="ghost" onClick={() => onChange({ variants: [{ when: '', text: {} }], otherwise: value ?? {} })}>
          <Plus className="size-3" /> {tr(T.addVariant)}
        </Button>
      </div>
    );
  }
  const setVariants = (variants: typeof value.variants) =>
    onChange(variants.length ? { ...value, variants } : clean(value.otherwise));
  return (
    <div className="space-y-2">
      {value.variants.map((v, i) => (
        <div key={i} className="space-y-1 rounded-md border border-slate-100 bg-slate-50/60 p-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-violet-600">{tr(T.when)}</span>
            <ExpressionInput className="flex-1" value={v.when} onChange={(w) => setVariants(value.variants.map((x, j) => (j === i ? { ...x, when: w } : x)))} />
            <Button size="sm" variant="ghost" aria-label="×" onClick={() => setVariants(value.variants.filter((_, j) => j !== i))}>
              <X className="size-3" />
            </Button>
          </div>
          {text(v.text, (t) => setVariants(value.variants.map((x, j) => (j === i ? { ...x, text: t } : x))), i === 0)}
        </div>
      ))}
      <div className="space-y-1 p-2">
        <span className="text-xs font-medium text-violet-600">{tr(T.otherwise)}</span>
        {text(value.otherwise, (t) => onChange({ ...value, otherwise: t }))}
      </div>
      <Button size="sm" variant="ghost" onClick={() => setVariants([...value.variants, { when: '', text: {} }])}>
        <Plus className="size-3" /> {tr(T.addVariant)}
      </Button>
    </div>
  );
}
