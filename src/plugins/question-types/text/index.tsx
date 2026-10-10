import type { TextQuestion } from '../../../core/model';
import { tr, type QuestionTypePlugin } from '../../../plugin-api';
import { Checkbox, Field, Input, Textarea } from '../../../ui-kit';

const T = {
  name: { fr: 'Texte', en: 'Text' },
  short: { fr: '<texte>', en: '<text>' },
  long: { fr: '<texte long>', en: '<long text>' },
  multiline: { fr: 'Texte long (plusieurs lignes)', en: 'Long text (multi-line)' },
  minLength: { fr: 'Longueur min.', en: 'Min. length' },
  maxLength: { fr: 'Longueur max.', en: 'Max. length' },
  pattern: { fr: 'Motif (expression régulière)', en: 'Pattern (regular expression)' },
};

const num = (v: string) => (v === '' ? undefined : Math.max(0, Math.trunc(Number(v))));

/** Type « texte » : court ou long, longueur min/max, motif. */
export const textType: QuestionTypePlugin<TextQuestion> = {
  type: 'text',
  name: T.name,
  shortcut: 't',
  create: (base) => ({ ...base, type: 'text' }),
  Preview: ({ question, env }) => <span className="font-mono text-slate-400">{tr(question.multiline ? T.long : T.short, env.uiLang)}</span>,
  Properties: ({ question, update, env }) => (
    <div className="space-y-3">
      <Checkbox label={tr(T.multiline, env.uiLang)} checked={!!question.multiline} onChange={(e) => update({ multiline: e.target.checked || undefined })} />
      <div className="grid grid-cols-2 gap-2">
        <Field label={tr(T.minLength, env.uiLang)}>
          <Input type="number" min={0} value={question.minLength ?? ''} onChange={(e) => update({ minLength: num(e.target.value) })} />
        </Field>
        <Field label={tr(T.maxLength, env.uiLang)}>
          <Input type="number" min={0} value={question.maxLength ?? ''} onChange={(e) => update({ maxLength: num(e.target.value) })} />
        </Field>
      </div>
      <Field label={tr(T.pattern, env.uiLang)}>
        <Input className="font-mono" value={question.pattern ?? ''} onChange={(e) => update({ pattern: e.target.value || undefined })} />
      </Field>
    </div>
  ),
  Field: ({ question, value, onChange, env, inputId }) => {
    const props = {
      id: inputId,
      value: typeof value === 'string' ? value : '',
      placeholder: env.label(question.placeholder),
      maxLength: question.maxLength,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value === '' ? null : e.target.value),
    };
    return question.multiline ? <Textarea rows={5} {...props} /> : <Input {...props} />;
  },
  formatAnswer: (_q, value) => (value === null || value === undefined ? '' : String(value)),
};
