import type { DateQuestion } from '../../../core/model';
import { tr, type QuestionTypePlugin } from '../../../plugin-api';
import { Field, Input } from '../../../ui-kit';
import { ExpressionInput } from '../../../ui/expression-editor';

const T = {
  name: { fr: 'Date', en: 'Date' },
  preview: { fr: '<date>', en: '<date>' },
  min: { fr: 'Au plus tôt', en: 'Earliest' },
  max: { fr: 'Au plus tard', en: 'Latest' },
  hint: { fr: 'AAAA-MM-JJ ou expression : $today(), date_sinistre, sys.date_effet_contrat', en: 'YYYY-MM-DD or expression: $today(), claim_date, sys.contract_start' },
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Type « date » : réponse `AAAA-MM-JJ`, bornes littérales ou calculées. */
export const dateType: QuestionTypePlugin<DateQuestion> = {
  type: 'date',
  name: T.name,
  shortcut: 'd',
  create: (base) => ({ ...base, type: 'date' }),
  Preview: ({ env }) => <span className="font-mono text-slate-400">{tr(T.preview, env.uiLang)}</span>,
  Properties: ({ question, update, env }) => (
    <div className="space-y-3">
      <Field label={tr(T.min, env.uiLang)}>
        <ExpressionInput value={question.min ?? ''} onChange={(v) => update({ min: v.trim() || undefined })} />
      </Field>
      <Field label={tr(T.max, env.uiLang)} hint={tr(T.hint, env.uiLang)}>
        <ExpressionInput value={question.max ?? ''} onChange={(v) => update({ max: v.trim() || undefined })} />
      </Field>
    </div>
  ),
  Field: ({ question, value, onChange, env, inputId }) => {
    const bound = (b: string | undefined) => {
      if (!b) return undefined;
      const v = ISO.test(b) ? b : env.evaluate(b);
      return typeof v === 'string' && ISO.test(v) ? v : undefined;
    };
    return (
      <Input id={inputId} type="date" className="w-48" value={typeof value === 'string' ? value : ''}
        min={bound(question.min)} max={bound(question.max)}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)} />
    );
  },
  formatAnswer: (_q, value) => (typeof value === 'string' ? value : ''),
};
