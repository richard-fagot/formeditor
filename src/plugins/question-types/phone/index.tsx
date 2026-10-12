import { Phone } from 'lucide-react';
import { DEFAULT_COUNTRY, type PhoneQuestion } from '../../../core/model';
import { callingCode, COUNTRIES, countryChoices, flagOf, formatPhone } from '../../../core/contact';
import { dontKnowLabel, previewText, tr, type QuestionTypePlugin } from '../../../plugin-api';
import { Field, Input, Select } from '../../../ui-kit';
import { DontKnowEditor } from '../../../ui/expression-editor';
import { PhoneField } from './phone-field';

const T = {
  name: { fr: 'Téléphone', en: 'Phone' },
  preview: { fr: '<téléphone>', en: '<phone>' },
  defaultCountry: { fr: 'Pays par défaut', en: 'Default country' },
  countries: { fr: 'Pays autorisés (codes ISO séparés par des virgules ; vide : tous)', en: 'Allowed countries (ISO codes, comma-separated; empty: all)' },
  lineType: { fr: 'Type de ligne attendu', en: 'Expected line type' },
  any: { fr: 'Indifférent', en: 'Any' },
  mobile: { fr: 'Mobile', en: 'Mobile' },
  fixed: { fr: 'Fixe', en: 'Landline' },
  hint: {
    fr: 'Contrôles intégrés : numéro valide pour le pays (message « phone »), type de ligne (« lineType »). Valeur enregistrée au format E.164, pays sous <clé>_pays.',
    en: 'Built-in checks: valid number for the country ("phone" message), line type ("lineType"). Stored as E.164, country under <key>_pays.',
  },
};

/** Codes pays saisis (`fr, BE`) : majuscules, connus, sans doublon. */
const parseCodes = (s: string) => [...new Set(s.toUpperCase().split(/[\s,;]+/).filter((c) => COUNTRIES.includes(c)))];

/** Type « téléphone » (EVO-007) : indicatif pays et numéro, contrôle par pays, valeur E.164. */
export const phoneType: QuestionTypePlugin<PhoneQuestion> = {
  type: 'phone',
  name: T.name,
  shortcut: 'Shift+T',
  create: (base) => ({ ...base, type: 'phone' }),
  Preview: ({ question, env }) => (
    <span className="inline-flex items-center gap-1 font-mono text-slate-400">
      <Phone className="size-3" aria-hidden />{tr(T.preview, env.uiLang)}
      {question.defaultCountry && question.defaultCountry !== DEFAULT_COUNTRY && <span className="font-sans"> · {question.defaultCountry}</span>}
      {question.lineType && <span className="font-sans"> · {tr(T[question.lineType], env.uiLang).toLowerCase()}</span>}
      {question.dontKnow && <span className="font-sans italic"> + {previewText(dontKnowLabel(question), env)}</span>}
    </span>
  ),
  Properties: ({ question, update, env }) => (
    <div className="space-y-3">
      <Field label={tr(T.defaultCountry, env.uiLang)}>
        <Select value={question.defaultCountry ?? DEFAULT_COUNTRY} onChange={(e) => update({ defaultCountry: e.target.value === DEFAULT_COUNTRY ? undefined : e.target.value })}>
          {countryChoices(undefined, env.uiLang).map((c) => <option key={c.code} value={c.code}>{flagOf(c.code)} {c.name} +{callingCode(c.code)}</option>)}
        </Select>
      </Field>
      <Field label={tr(T.countries, env.uiLang)}>
        <Input key={(question.countries ?? []).join()} className="font-mono" defaultValue={(question.countries ?? []).join(', ')}
          onBlur={(e) => {
            const countries = parseCodes(e.target.value);
            update({ countries: countries.length ? countries : undefined });
          }} />
      </Field>
      <Field label={tr(T.lineType, env.uiLang)}>
        <Select value={question.lineType ?? ''} onChange={(e) => update({ lineType: (e.target.value || undefined) as PhoneQuestion['lineType'] })}>
          <option value="">{tr(T.any, env.uiLang)}</option>
          <option value="mobile">{tr(T.mobile, env.uiLang)}</option>
          <option value="fixed">{tr(T.fixed, env.uiLang)}</option>
        </Select>
      </Field>
      <p className="text-xs text-slate-500">{tr(T.hint, env.uiLang)}</p>
      <DontKnowEditor value={question.dontKnow} onChange={(dontKnow) => update({ dontKnow })} />
    </div>
  ),
  Field: PhoneField,
  formatAnswer: (_q, value) => (typeof value === 'string' ? formatPhone(value) : ''),
};

