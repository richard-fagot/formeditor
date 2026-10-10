import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { deriveKey, isVariantLabel, OTHER_VALUE, uniqueKey, type ChoiceOption, type LocalizedText } from '../../../core/model';
import { previewText, tr, type EditorEnv } from '../../../plugin-api';
import { Button, Field, Input, Textarea } from '../../../ui-kit';
import { ExpressionInput, LabelEditor } from '../../../ui/expression-editor';

const T = {
  quick: { fr: 'Options (une par ligne)', en: 'Options (one per line)' },
  quickHint: { fr: 'Collage multi-lignes accepté. Valeur, condition et traductions : détail ci-dessous.', en: 'Multi-line paste accepted. Value, condition and translations: details below.' },
  value: { fr: 'Valeur', en: 'Value' },
  when: { fr: "Condition d'affichage", en: 'Display condition' },
  remove: { fr: "Supprimer l'option", en: 'Remove option' },
};

const lineOf = (o: ChoiceOption, env: EditorEnv) => previewText(o.label, env);

/**
 * Réconcilie les lignes saisies avec les options existantes : une ligne identique garde son option,
 * une ligne modifiée garde l'option de même rang (valeur, condition, traductions), sinon option nouvelle.
 */
export function reconcile(lines: string[], options: ChoiceOption[], env: EditorEnv): ChoiceOption[] {
  const texts = lines.map((l) => l.trim()).filter(Boolean);
  const used = new Set<number>();
  const match = texts.map((t) => {
    const i = options.findIndex((o, j) => !used.has(j) && lineOf(o, env) === t);
    if (i >= 0) used.add(i);
    return i;
  });
  const taken = new Set([OTHER_VALUE, ...options.map((o) => o.value)]);
  return texts.map((t, k) => {
    let i = match[k]!;
    if (i < 0 && options[k] && !used.has(k)) (i = k), used.add(k);
    if (i >= 0) {
      const o = options[i]!;
      if (lineOf(o, env) === t) return o;
      const label = isVariantLabel(o.label) ? { ...o.label, otherwise: { ...o.label.otherwise, [env.contentLang]: t } } : { ...o.label, [env.contentLang]: t };
      return { ...o, label };
    }
    const value = uniqueKey(deriveKey(t) || 'option', taken);
    taken.add(value);
    return { value, label: { [env.contentLang]: t } as LocalizedText };
  });
}

/** Saisie rapide (une option par ligne) puis détail de chaque option : valeur, libellé, condition. */
export function OptionsEditor({ options, onChange, env }: { options: ChoiceOption[]; onChange(o: ChoiceOption[]): void; env: EditorEnv }) {
  const joined = options.map((o) => lineOf(o, env)).join('\n');
  const [text, setText] = useState(joined);
  useEffect(() => setText((t) => (t.split('\n').map((l) => l.trim()).filter(Boolean).join('\n') === joined ? t : joined)), [joined]);
  const set = (i: number, patch: Partial<ChoiceOption>) =>
    onChange(options.map((o, j) => (j === i ? (Object.fromEntries(Object.entries({ ...o, ...patch }).filter(([, v]) => v !== undefined)) as unknown as ChoiceOption) : o)));
  return (
    <div className="space-y-2">
      <Field label={tr(T.quick, env.uiLang)} hint={tr(T.quickHint, env.uiLang)}>
        <Textarea rows={Math.max(3, options.length + 1)} value={text} data-testid="options-quick"
          onChange={(e) => {
            setText(e.target.value);
            onChange(reconcile(e.target.value.split('\n'), options, env));
          }} />
      </Field>
      {options.map((o, i) => (
        <details key={i} className="rounded-md border border-slate-100 px-2 py-1">
          <summary className="cursor-pointer text-xs text-slate-600">
            {lineOf(o, env) || '…'} <span className="font-mono text-slate-400">= {o.value}</span>
            {o.when && <span className="ml-1 text-amber-600">?</span>}
          </summary>
          <div className="space-y-2 py-2">
            <div className="flex items-end gap-1">
              <Field label={tr(T.value, env.uiLang)} className="flex-1">
                <Input className="font-mono" value={o.value} onChange={(e) => e.target.value && e.target.value !== OTHER_VALUE && set(i, { value: e.target.value })} />
              </Field>
              <Button size="sm" variant="ghost" aria-label={tr(T.remove, env.uiLang)} onClick={() => onChange(options.filter((_, j) => j !== i))}><X className="size-3" /></Button>
            </div>
            <LabelEditor value={o.label} onChange={(label) => set(i, { label: label ?? {} })} />
            <Field label={tr(T.when, env.uiLang)}>
              <ExpressionInput value={o.when ?? ''} onChange={(v) => set(i, { when: v.trim() || undefined })} />
            </Field>
          </div>
        </details>
      ))}
    </div>
  );
}
