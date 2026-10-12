import { Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { normalizeEmail } from '../../../core/contact';
import type { EmailQuestion } from '../../../core/model';
import { formatErrors } from '../../../core/validation';
import { dontKnowLabel, previewText, tr, type FieldProps, type QuestionTypePlugin } from '../../../plugin-api';
import { Checkbox, Input } from '../../../ui-kit';
import { DontKnowEditor } from '../../../ui/expression-editor';

const T = {
  name: { fr: 'Mail', en: 'Email' },
  preview: { fr: '<mail>', en: '<email>' },
  hint: {
    fr: 'Contrôle intégré : adresse conforme aux RFC 5321 / 5322 (message « email »). Domaine enregistré en minuscules.',
    en: 'Built-in check: address compliant with RFC 5321 / 5322 ("email" message). Domain stored in lower case.',
  },
};

/** Saisie : la valeur enregistrée est le mail normalisé ; contrôle et mise en forme à la sortie du champ. */
function EmailField({ question, value, onChange, env, inputId, errors, dontKnow, onDontKnow }: FieldProps<EmailQuestion>) {
  const stored = typeof value === 'string' ? value : '';
  const [text, setText] = useState(stored);
  const [blurErrors, setBlurErrors] = useState<string[]>([]);
  // Réponse modifiée ailleurs (« Ne sais pas », retour) : le champ suit.
  useEffect(() => {
    if (normalizeEmail(text).value !== stored) setText(stored);
  }, [stored]);
  const change = (t: string) => {
    setText(t);
    setBlurErrors([]);
    onChange(t.trim() === '' ? null : normalizeEmail(t).value);
  };
  const blur = () => {
    setText(stored);
    setBlurErrors(formatErrors(question, stored || null).map((e) => env.label(e.message)));
  };
  return (
    <div className="space-y-2">
      <Input id={inputId} type="email" value={text} placeholder={env.label(question.placeholder)} disabled={!!dontKnow}
        onChange={(e) => change(e.target.value)} onBlur={blur} />
      {!(errors[''] ?? []).length && blurErrors.map((m, i) => <p key={i} className="text-sm text-rose-600" role="alert">{m}</p>)}
      {question.dontKnow && (
        <Checkbox data-testid="dont-know" label={env.label(dontKnowLabel(question))} checked={!!dontKnow} onChange={(e) => onDontKnow?.(e.target.checked)} />
      )}
    </div>
  );
}

/** Type « mail » (EVO-007) : RFC 5321 / 5322, domaine normalisé en minuscules. */
export const emailType: QuestionTypePlugin<EmailQuestion> = {
  type: 'email',
  name: T.name,
  shortcut: 'Shift+E',
  create: (base) => ({ ...base, type: 'email' }),
  Preview: ({ question, env }) => (
    <span className="inline-flex items-center gap-1 font-mono text-slate-400">
      <Mail className="size-3" aria-hidden />{tr(T.preview, env.uiLang)}
      {question.dontKnow && <span className="font-sans italic"> + {previewText(dontKnowLabel(question), env)}</span>}
    </span>
  ),
  Properties: ({ question, update, env }) => (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">{tr(T.hint, env.uiLang)}</p>
      <DontKnowEditor value={question.dontKnow} onChange={(dontKnow) => update({ dontKnow })} />
    </div>
  ),
  Field: EmailField,
  formatAnswer: (_q, value) => (value === null || value === undefined ? '' : String(value)),
};
