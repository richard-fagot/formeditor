import { UserRound } from 'lucide-react';
import { CIVILITY_LABELS, civilityCodes, civilityLabel, type CivilityCode, type CivilityQuestion } from '../../../core/model';
import { dontKnowLabel, previewText, tr, type FieldProps, type QuestionTypePlugin } from '../../../plugin-api';
import { Checkbox, Field, LocalizedTextInput } from '../../../ui-kit';
import { DontKnowEditor } from '../../../ui/expression-editor';

const T = {
  name: { fr: 'Civilité', en: 'Title' },
  short: { fr: 'Libellés courts (« Mme », « M. »)', en: 'Short labels ("Mrs", "Mr")' },
  undisclosed: { fr: 'Option « Ne se prononce pas » (code NP)', en: '"Prefer not to say" option (code NP)' },
  label: { fr: 'Libellé', en: 'Label' },
  hint: { fr: 'Codes fixes MME, M, NP ; seuls les libellés se modifient.', en: 'Fixed codes MME, M, NP; only labels can be changed.' },
};

/** Saisie : boutons radio sur une ligne, puis « Ne sais pas » si activée. */
function CivilityField({ question, value, onChange, env, inputId, dontKnow, onDontKnow }: FieldProps<CivilityQuestion>) {
  const radio = (key: string, text: string, checked: boolean, change: () => void) => (
    <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50">
      <input type="radio" name={inputId} className="size-4 accent-indigo-600" checked={checked} onChange={change} />
      <span className="text-slate-800">{text}</span>
    </label>
  );
  return (
    <div role="radiogroup" id={inputId} className="flex flex-wrap gap-2" data-testid="civility">
      {civilityCodes(question).map((c) => radio(c, env.text(civilityLabel(question, c)), !dontKnow && value === c, () => onChange(c)))}
      {question.dontKnow && radio('nsp', env.label(dontKnowLabel(question)), !!dontKnow, () => onDontKnow?.(true))}
    </div>
  );
}

/** Type « civilité » (EVO-007) : Madame (`MME`), Monsieur (`M`), « Ne se prononce pas » (`NP`, facultative). */
export const civilityType: QuestionTypePlugin<CivilityQuestion> = {
  type: 'civility',
  name: T.name,
  shortcut: 'Shift+C',
  create: (base) => ({ ...base, type: 'civility' }),
  Preview: ({ question, env }) => (
    <span className="inline-flex items-center gap-1 text-slate-500">
      <UserRound className="size-3 text-slate-400" aria-hidden />
      {civilityCodes(question).map((c) => previewText(civilityLabel(question, c), env)).join(' / ')}
      {question.dontKnow && <span className="italic"> + {previewText(dontKnowLabel(question), env)}</span>}
    </span>
  ),
  Properties: ({ question, update, env }) => {
    const setLabel = (code: CivilityCode, text: Record<string, string>) => {
      const labels = { ...(question.labels ?? {}) };
      if (Object.keys(text).length) labels[code] = text;
      else delete labels[code];
      update({ labels: Object.keys(labels).length ? labels : undefined });
    };
    const defaults = CIVILITY_LABELS[question.short ? 'short' : 'long'];
    return (
      <div className="space-y-3">
        <Checkbox label={tr(T.short, env.uiLang)} checked={!!question.short} onChange={(e) => update({ short: e.target.checked || undefined })} />
        <Checkbox label={tr(T.undisclosed, env.uiLang)} checked={!!question.undisclosed} onChange={(e) => update({ undisclosed: e.target.checked || undefined })} />
        {civilityCodes(question).map((c) => (
          <Field key={c} label={`${tr(T.label, env.uiLang)} — ${c}`}>
            <LocalizedTextInput languages={env.languages} activeLang={env.contentLang} value={question.labels?.[c]}
              placeholder={defaults[c][env.contentLang] ?? defaults[c].fr} onChange={(t) => setLabel(c, t)} />
          </Field>
        ))}
        <p className="text-xs text-slate-500">{tr(T.hint, env.uiLang)}</p>
        <DontKnowEditor value={question.dontKnow} onChange={(dontKnow) => update({ dontKnow })} />
      </div>
    );
  },
  Field: CivilityField,
  formatAnswer: (q, value, env) =>
    typeof value === 'string' && (civilityCodes(q) as string[]).includes(value) ? env.text(civilityLabel(q, value as CivilityCode)) : String(value ?? ''),
};
