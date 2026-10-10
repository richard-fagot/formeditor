import type { FC } from 'react';
import { OTHER_VALUE, type MultipleChoiceQuestion, type Question, type SingleChoiceQuestion } from '../../../core/model';
import { previewText, tr, type EditorEnv, type FieldProps, type QuestionPropertiesProps, type QuestionTypePlugin, type RenderEnv } from '../../../plugin-api';
import { Field, Input } from '../../../ui-kit';
import { OptionsEditor } from './options-editor';
import { OTHER_LABEL, OtherEditor } from './other-editor';
import { SourceEditor } from './source-editor';

type Choice = SingleChoiceQuestion | MultipleChoiceQuestion;
const T = {
  single: { fr: 'Choix unique', en: 'Single choice' },
  multiple: { fr: 'Choix multiple', en: 'Multiple choice' },
  minSelected: { fr: 'Sélections min.', en: 'Min. selections' },
  maxSelected: { fr: 'Sélections max.', en: 'Max. selections' },
};
const MAX_PREVIEW = 4;

/** Options conservées lors d'un changement de type (choix unique ↔ multiple). */
const keep = (previous?: Question) =>
  previous && (previous.type === 'single' || previous.type === 'multiple')
    ? { options: previous.options, ...(previous.other ? { other: previous.other } : {}), ...(previous.source ? { source: previous.source } : {}) }
    : { options: [], ...(previous && 'other' in previous && previous.other ? { other: previous.other } : {}) };

function Preview({ question, env }: { question: Choice; env: EditorEnv }) {
  const mark = question.type === 'single' ? '○' : '☐';
  const items = question.options.map((o) => previewText(o.label, env) + (o.when ? ' ?' : ''));
  if (question.source) items.push(`<${question.source.from}${question.source.label ? ` : ${question.source.label}` : ''}>`);
  if (question.other) items.push(previewText(question.other.label ?? OTHER_LABEL, env));
  return (
    <ul className="space-y-px text-slate-500">
      {items.slice(0, MAX_PREVIEW).map((t, i) => <li key={i} className="truncate">{mark} {t}</li>)}
      {items.length > MAX_PREVIEW && <li>…</li>}
    </ul>
  );
}

function Properties({ question, update, env }: QuestionPropertiesProps<Choice>) {
  const count = (v: string) => (v === '' ? undefined : Math.max(0, Math.trunc(Number(v))));
  return (
    <div className="space-y-3">
      <OptionsEditor options={question.options} env={env} onChange={(options) => update({ options })} />
      <SourceEditor source={question.source} env={env} onChange={(source) => update({ source })} />
      <OtherEditor other={question.other} env={env} onChange={(other) => update({ other })} />
      {question.type === 'multiple' && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={tr(T.minSelected, env.uiLang)}>
            <Input type="number" min={0} value={question.minSelected ?? ''} onChange={(e) => update({ minSelected: count(e.target.value) } as Partial<Choice>)} />
          </Field>
          <Field label={tr(T.maxSelected, env.uiLang)}>
            <Input type="number" min={1} value={question.maxSelected ?? ''} onChange={(e) => update({ maxSelected: count(e.target.value) } as Partial<Choice>)} />
          </Field>
        </div>
      )}
    </div>
  );
}

const optionText = (l: unknown, env: RenderEnv) => (typeof l === 'string' ? l : env.label(l as Parameters<RenderEnv['label']>[0]));

/** Saisie : boutons radio (unique) ou cases à cocher (multiple), puis « Autre » avec sa précision. */
function ChoiceField({ question, value, other, onChange, env, inputId }: FieldProps<Choice>) {
  const multiple = question.type === 'multiple';
  const choices = env.options(question).map((o) => ({ value: o.value, text: optionText(o.label, env) }));
  if (question.other) choices.push({ value: OTHER_VALUE, text: env.label(question.other.label ?? OTHER_LABEL) });
  const selected: string[] = multiple ? (Array.isArray(value) ? (value as string[]) : []) : typeof value === 'string' ? [value] : [];
  const toggle = (v: string) => {
    if (!multiple) return onChange(v, v === OTHER_VALUE ? other : undefined);
    const list = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
    onChange(list.length ? list : null, list.includes(OTHER_VALUE) ? other : undefined);
  };
  return (
    <div role={multiple ? 'group' : 'radiogroup'} id={inputId} className="space-y-2">
      {choices.map((c) => (
        <label key={c.value} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50">
          <input type={multiple ? 'checkbox' : 'radio'} name={inputId} className="size-4 accent-indigo-600" checked={selected.includes(c.value)} onChange={() => toggle(c.value)} />
          <span className="text-slate-800">{c.text}</span>
        </label>
      ))}
      {selected.includes(OTHER_VALUE) && (
        <Input autoFocus aria-label={env.label(question.other?.label ?? OTHER_LABEL)} value={other ?? ''} onChange={(e) => onChange(value, e.target.value)} />
      )}
    </div>
  );
}

function formatAnswer(q: Choice, value: unknown, env: RenderEnv, other?: string): string {
  const options = env.options(q);
  const one = (v: unknown) => {
    if (v === OTHER_VALUE) return `${env.label(q.other?.label ?? OTHER_LABEL)} : ${other ?? ''}`;
    const o = options.find((x) => x.value === v);
    return o ? optionText(o.label, env) : String(v ?? '');
  };
  return Array.isArray(value) ? value.map(one).join(', ') : value === null || value === undefined ? '' : one(value);
}

const common = {
  Preview: Preview as FC<{ question: Choice; env: EditorEnv }>,
  Properties,
  Field: ChoiceField,
  formatAnswer,
  badges: (q: Choice) => (q.other ? ['other'] : []),
};

/** Type « choix unique » : options statiques (conditionnables), source dynamique, « Autre ». */
export const singleType = {
  ...common,
  type: 'single',
  name: T.single,
  shortcut: 'u',
  create: (base, previous) => ({ ...base, type: 'single', ...keep(previous) }),
} as QuestionTypePlugin<SingleChoiceQuestion>;

/** Type « choix multiple » : idem, nombre de sélections min. et max. */
export const multipleType = {
  ...common,
  type: 'multiple',
  name: T.multiple,
  shortcut: 'm',
  create: (base, previous) => ({ ...base, type: 'multiple', ...keep(previous) }),
} as QuestionTypePlugin<MultipleChoiceQuestion>;
