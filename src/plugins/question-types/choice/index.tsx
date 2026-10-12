import type { FC } from 'react';
import { isChoiceGroup, isDynamicEntry, type ChoiceItem, type MultipleChoiceQuestion, type Question, type SingleChoiceQuestion } from '../../../core/model';
import { previewText, tr, type EditorEnv, type QuestionPropertiesProps, type QuestionTypePlugin } from '../../../plugin-api';
import { Field, Input } from '../../../ui-kit';
import { ChoiceField, formatAnswer } from './choice-field';
import { OptionsEditor } from './options-editor';
import { OTHER_LABEL, OtherEditor } from './other-editor';

type Choice = SingleChoiceQuestion | MultipleChoiceQuestion;
const T = {
  single: { fr: 'Choix unique', en: 'Single choice' },
  multiple: { fr: 'Choix multiple', en: 'Multiple choice' },
  minSelected: { fr: 'Sélections min.', en: 'Min. selections' },
  maxSelected: { fr: 'Sélections max.', en: 'Max. selections' },
};
const MAX_PREVIEW = 4;

/** Entrées et « Autre » conservés lors d'un changement de type (choix unique ↔ multiple). */
const keep = (previous?: Question) =>
  previous && (previous.type === 'single' || previous.type === 'multiple')
    ? { options: previous.options, ...(previous.other ? { other: previous.other } : {}) }
    : { options: [], ...(previous && 'other' in previous && previous.other ? { other: previous.other } : {}) };

/** Aperçu d'un élément : libellé d'une option statique, `<référence : libellé>` d'une entrée dynamique. */
const itemPreview = (o: ChoiceItem, env: EditorEnv) =>
  (isDynamicEntry(o) ? `<${o.from}${o.label ? ` : ${o.label}` : ''}>` : previewText(o.label, env)) + (o.when ? ' ?' : '');

/** Aperçu du nœud : ○ / ☐ par option, intitulé de groupe en gras avec ses options dessous, « Autre » en dernier, tronqué par « … ». */
function Preview({ question, env }: { question: Choice; env: EditorEnv }) {
  const mark = question.type === 'single' ? '○' : '☐';
  const rows = question.options.flatMap((o) => (isChoiceGroup(o)
    ? [{ text: previewText(o.group, env) + (o.when ? ' ?' : ''), bold: true }, ...o.options.map((x) => ({ text: `${mark} ${itemPreview(x, env)}`, indent: true }))]
    : [{ text: `${mark} ${itemPreview(o, env)}` }]));
  if (question.other) rows.push({ text: `${mark} ${previewText(question.other.label ?? OTHER_LABEL, env)}` });
  return (
    <ul className="space-y-px text-slate-500">
      {rows.slice(0, MAX_PREVIEW).map((r, i) => (
        <li key={i} className={'bold' in r ? 'truncate font-semibold text-slate-700' : 'indent' in r ? 'truncate pl-2' : 'truncate'}>{r.text}</li>
      ))}
      {rows.length > MAX_PREVIEW && <li>…</li>}
    </ul>
  );
}

function Properties({ question, update, env }: QuestionPropertiesProps<Choice>) {
  const count = (v: string) => (v === '' ? undefined : Math.max(0, Math.trunc(Number(v))));
  return (
    <div className="space-y-3">
      <OptionsEditor options={question.options} env={env} onChange={(options) => update({ options })} />
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

const common = {
  Preview: Preview as FC<{ question: Choice; env: EditorEnv }>,
  Properties,
  Field: ChoiceField,
  formatAnswer,
  badges: (q: Choice) => (q.other ? ['other'] : []),
};

/** Type « choix unique » : entrées ordonnées (options statiques, entrées dynamiques, conditionnables), « Autre ». */
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
