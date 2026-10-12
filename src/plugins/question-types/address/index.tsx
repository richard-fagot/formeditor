import { MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ADDRESS_MAX, ADDRESS_MIN, COUNTRIES, countryChoices, flagOf } from '../../../core/contact';
import { DEFAULT_COUNTRY, type AddressQuestion } from '../../../core/model';
import { formatErrors } from '../../../core/validation';
import { dontKnowLabel, previewText, tr, type FieldProps, type QuestionTypePlugin } from '../../../plugin-api';
import { Checkbox, Field, Input, Select } from '../../../ui-kit';
import { DontKnowEditor } from '../../../ui/expression-editor';

const T = {
  name: { fr: 'Adresse', en: 'Address' },
  preview: { fr: '<adresse>', en: '<address>' },
  country: { fr: 'Pays', en: 'Country' },
  defaultCountry: { fr: 'Pays par défaut', en: 'Default country' },
  countries: { fr: 'Pays autorisés (codes ISO séparés par des virgules ; vide : tous)', en: 'Allowed countries (ISO codes, comma-separated; empty: all)' },
  minLength: { fr: 'Longueur min.', en: 'Min. length' },
  maxLength: { fr: 'Longueur max.', en: 'Max. length' },
  verify: { fr: 'Adresse à vérifier par un service de normalisation (BAN…) — exporté, non exécuté', en: 'Address to check with a normalisation service (BAN…) — exported, not run' },
  hint: {
    fr: 'Contrôles intégrés : une ligne avec au moins une lettre, longueur bornée (message « address ») ; en France, code postal à 5 chiffres (« postalCode »). Pays sous <clé>_pays.',
    en: 'Built-in checks: one line with at least one letter, bounded length ("address" message); in France, 5-digit postal code ("postalCode"). Country under <key>_pays.',
  },
};

const parseCodes = (s: string) => [...new Set(s.toUpperCase().split(/[\s,;]+/).filter((c) => COUNTRIES.includes(c)))];
const num = (v: string) => (v === '' ? undefined : Math.max(0, Math.trunc(Number(v))));

/** Pays proposé au départ : pays par défaut s'il est autorisé, sinon le premier pays autorisé. */
const initialCountry = (q: AddressQuestion) => {
  const d = q.defaultCountry ?? DEFAULT_COUNTRY;
  return !q.countries?.length || q.countries.includes(d) ? d : q.countries[0]!;
};

/** Saisie : sélecteur de pays (masqué si un seul pays est autorisé) et une ligne ; contrôle à la sortie du champ. */
function AddressField({ question, value, country, onChange, env, inputId, errors, dontKnow, onDontKnow }: FieldProps<AddressQuestion>) {
  const stored = typeof value === 'string' ? value : '';
  const [picked, setPicked] = useState(country ?? initialCountry(question));
  const [text, setText] = useState(stored);
  const [blurErrors, setBlurErrors] = useState<string[]>([]);
  useEffect(() => {
    if (text.trim() !== stored) setText(stored);
  }, [stored]);
  const commit = (t: string, c: string) => {
    setBlurErrors([]);
    onChange(t.trim() ? t.trim() : null, undefined, undefined, t.trim() ? c : undefined);
  };
  const blur = () => {
    setText(stored);
    setBlurErrors(formatErrors(question, stored || null, picked).map((e) => env.label(e.message)));
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {question.countries?.length !== 1 && (
          <Select aria-label={tr(T.country, env.contentLang)} className="w-44 shrink-0" value={picked} disabled={!!dontKnow} data-testid="address-country"
            onChange={(e) => {
              setPicked(e.target.value);
              commit(text, e.target.value);
            }}>
            {countryChoices(question.countries, env.contentLang).map((c) => <option key={c.code} value={c.code}>{flagOf(c.code)} {c.name}</option>)}
          </Select>
        )}
        <Input id={inputId} className="flex-1" value={text} placeholder={env.label(question.placeholder)} disabled={!!dontKnow}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value, picked);
          }} onBlur={blur} />
      </div>
      {!(errors[''] ?? []).length && blurErrors.map((m, i) => <p key={i} className="text-sm text-rose-600" role="alert">{m}</p>)}
      {question.dontKnow && (
        <Checkbox data-testid="dont-know" label={env.label(dontKnowLabel(question))} checked={!!dontKnow} onChange={(e) => onDontKnow?.(e.target.checked)} />
      )}
    </div>
  );
}

/** Type « adresse » (EVO-007) : pays et une ligne de texte libre. */
export const addressType: QuestionTypePlugin<AddressQuestion> = {
  type: 'address',
  name: T.name,
  shortcut: 'Shift+A',
  create: (base) => ({ ...base, type: 'address' }),
  Preview: ({ question, env }) => (
    <span className="inline-flex items-center gap-1 font-mono text-slate-400">
      <MapPin className="size-3" aria-hidden />{tr(T.preview, env.uiLang)}
      {question.defaultCountry && question.defaultCountry !== DEFAULT_COUNTRY && <span className="font-sans"> · {question.defaultCountry}</span>}
      {question.dontKnow && <span className="font-sans italic"> + {previewText(dontKnowLabel(question), env)}</span>}
    </span>
  ),
  Properties: ({ question, update, env }) => (
    <div className="space-y-3">
      <Field label={tr(T.defaultCountry, env.uiLang)}>
        <Select value={question.defaultCountry ?? DEFAULT_COUNTRY} onChange={(e) => update({ defaultCountry: e.target.value === DEFAULT_COUNTRY ? undefined : e.target.value })}>
          {countryChoices(undefined, env.uiLang).map((c) => <option key={c.code} value={c.code}>{flagOf(c.code)} {c.name}</option>)}
        </Select>
      </Field>
      <Field label={tr(T.countries, env.uiLang)}>
        <Input key={(question.countries ?? []).join()} className="font-mono" defaultValue={(question.countries ?? []).join(', ')}
          onBlur={(e) => {
            const countries = parseCodes(e.target.value);
            update({ countries: countries.length ? countries : undefined });
          }} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={tr(T.minLength, env.uiLang)}>
          <Input type="number" min={0} placeholder={String(ADDRESS_MIN)} value={question.minLength ?? ''} onChange={(e) => update({ minLength: num(e.target.value) })} />
        </Field>
        <Field label={tr(T.maxLength, env.uiLang)}>
          <Input type="number" min={1} placeholder={String(ADDRESS_MAX)} value={question.maxLength ?? ''} onChange={(e) => update({ maxLength: num(e.target.value) || undefined })} />
        </Field>
      </div>
      <Checkbox label={tr(T.verify, env.uiLang)} checked={!!question.verify} onChange={(e) => update({ verify: e.target.checked || undefined })} />
      <p className="text-xs text-slate-500">{tr(T.hint, env.uiLang)}</p>
      <DontKnowEditor value={question.dontKnow} onChange={(dontKnow) => update({ dontKnow })} />
    </div>
  ),
  Field: AddressField,
  formatAnswer: (_q, value) => (value === null || value === undefined ? '' : String(value)),
};
