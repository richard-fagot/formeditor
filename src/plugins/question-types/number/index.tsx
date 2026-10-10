import { useEffect, useState } from 'react';
import type { NumberBound, NumberKind, NumberQuestion } from '../../../core/model';
import { tr, type FieldProps, type QuestionTypePlugin } from '../../../plugin-api';
import { Field, Input, LocalizedTextInput, Select } from '../../../ui-kit';
import { ExpressionInput } from '../../../ui/expression-editor';

const T = {
  name: { fr: 'Nombre', en: 'Number' },
  kind: { fr: 'Nature', en: 'Kind' },
  real: { fr: 'réel', en: 'real' },
  natural: { fr: 'entier naturel', en: 'natural number' },
  integer: { fr: 'entier relatif', en: 'integer' },
  min: { fr: 'Minimum', en: 'Minimum' },
  max: { fr: 'Maximum', en: 'Maximum' },
  boundHint: { fr: 'Nombre ou expression (sys.plafond, montant_max)', en: 'Number or expression (sys.ceiling, max_amount)' },
  decimals: { fr: 'Décimales (max.)', en: 'Decimals (max.)' },
  unit: { fr: 'Unité affichée', en: 'Displayed unit' },
};
const KINDS: NumberKind[] = ['real', 'natural', 'integer'];
const NUMERIC = /^-?\d+(\.\d+)?$/;

const toBound = (v: string): NumberBound | undefined => (v.trim() === '' ? undefined : NUMERIC.test(v.trim()) ? Number(v) : v.trim());

/** Type « nombre » : réel, entier naturel ou relatif ; bornes, décimales, unité. */
export const numberType: QuestionTypePlugin<NumberQuestion> = {
  type: 'number',
  name: T.name,
  shortcut: 'r',
  create: (base) => ({ ...base, type: 'number' }),
  Preview: ({ question, env }) => (
    <span className="font-mono text-slate-400">
      {`<${tr(T[question.numberKind ?? 'real'], env.uiLang)}>`}
      {question.unit && ` ${question.unit[env.contentLang] ?? Object.values(question.unit)[0] ?? ''}`}
    </span>
  ),
  Properties: ({ question, update, env }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label={tr(T.kind, env.uiLang)}>
          <Select value={question.numberKind ?? 'real'} onChange={(e) => update({ numberKind: e.target.value as NumberKind })}>
            {KINDS.map((k) => <option key={k} value={k}>{tr(T[k], env.uiLang)}</option>)}
          </Select>
        </Field>
        <Field label={tr(T.decimals, env.uiLang)}>
          <Input type="number" min={0} value={question.decimals ?? ''} disabled={question.numberKind === 'natural' || question.numberKind === 'integer'}
            onChange={(e) => update({ decimals: e.target.value === '' ? undefined : Math.max(0, Math.trunc(Number(e.target.value))) })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label={tr(T.min, env.uiLang)}>
          <ExpressionInput value={question.min === undefined ? '' : String(question.min)} onChange={(v) => update({ min: toBound(v) })} />
        </Field>
        <Field label={tr(T.max, env.uiLang)}>
          <ExpressionInput value={question.max === undefined ? '' : String(question.max)} onChange={(v) => update({ max: toBound(v) })} />
        </Field>
      </div>
      <p className="text-xs text-slate-400">{tr(T.boundHint, env.uiLang)}</p>
      <Field label={tr(T.unit, env.uiLang)}>
        <LocalizedTextInput languages={env.languages} activeLang={env.contentLang} value={question.unit}
          onChange={(unit) => update({ unit: Object.keys(unit).length ? unit : undefined })} />
      </Field>
    </div>
  ),
  Field: NumberField,
  formatAnswer: (q, value, env) => (typeof value === 'number' ? `${value}${q.unit ? ` ${env.text(q.unit)}` : ''}` : ''),
};

/** Saisie d'un nombre : texte local (une saisie partielle comme « 12, » n'est pas écrasée). */
function NumberField({ question, value, onChange, env, inputId }: FieldProps<NumberQuestion>) {
  const [text, setText] = useState(typeof value === 'number' ? String(value) : '');
  useEffect(() => {
    if (typeof value !== 'number') return;
    setText((t) => (Number(t.replace(',', '.')) === value ? t : String(value)));
  }, [value]);
  const change = (raw: string) => {
    setText(raw);
    const n = Number(raw.replace(',', '.'));
    onChange(raw.trim() === '' || Number.isNaN(n) ? null : n);
  };
  return (
    <div className="flex items-center gap-2">
      <Input id={inputId} inputMode="decimal" className="w-48" value={text} placeholder={env.label(question.placeholder)}
        onChange={(e) => change(e.target.value)} />
      {question.unit && <span className="text-slate-500">{env.text(question.unit)}</span>}
    </div>
  );
}
