import { useEffect, useState } from 'react';
import { callingCode, countryChoices, flagOf, nationalPhone, normalizePhone } from '../../../core/contact';
import { DEFAULT_COUNTRY, type PhoneQuestion } from '../../../core/model';
import { formatErrors } from '../../../core/validation';
import { dontKnowLabel, tr, type FieldProps } from '../../../plugin-api';
import { Checkbox, Input, Select } from '../../../ui-kit';

const T = { country: { fr: 'Indicatif pays', en: 'Country code' } };

/** Pays proposé au départ : pays par défaut s'il est autorisé, sinon le premier pays autorisé. */
export function initialCountry(q: PhoneQuestion | { defaultCountry?: string; countries?: string[] }): string {
  const d = q.defaultCountry ?? DEFAULT_COUNTRY;
  return !q.countries?.length || q.countries.includes(d) ? d : q.countries[0]!;
}

/**
 * Saisie : sélecteur d'indicatif (drapeau, nom, indicatif) puis numéro. À chaque frappe, la valeur enregistrée est le
 * numéro E.164 s'il est valide (sinon la saisie) et le pays celui du numéro (`+`, `00`) ou celui du sélecteur.
 * À la sortie du champ : affichage au format national et contrôle.
 */
export function PhoneField({ question, value, country, onChange, env, inputId, errors, dontKnow, onDontKnow }: FieldProps<PhoneQuestion>) {
  const stored = typeof value === 'string' ? value : '';
  const [picked, setPicked] = useState(country ?? initialCountry(question));
  const [text, setText] = useState(stored ? nationalPhone(stored, picked) : '');
  const [blurErrors, setBlurErrors] = useState<string[]>([]);
  // Pays du numéro (`+32…`) : le sélecteur suit, s'il propose ce pays.
  useEffect(() => {
    if (country && (!question.countries?.length || question.countries.includes(country))) setPicked(country);
  }, [country]);
  // Réponse modifiée ailleurs (« Ne sais pas », retour) : le champ suit.
  useEffect(() => {
    if ((text.trim() ? normalizePhone(text, picked).value : '') !== stored) setText(stored ? nationalPhone(stored, country ?? picked) : '');
  }, [stored]);
  const commit = (t: string, c: string) => {
    setBlurErrors([]);
    if (!t.trim()) return onChange(null);
    const n = normalizePhone(t, c);
    onChange(n.value, undefined, undefined, n.country);
  };
  const blur = () => {
    const c = country ?? picked;
    setText(stored ? nationalPhone(stored, c) : '');
    setBlurErrors(formatErrors(question, stored || null, c).map((e) => env.label(e.message)));
  };
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select aria-label={tr(T.country, env.contentLang)} className="w-44 shrink-0" value={picked} disabled={!!dontKnow} data-testid="phone-country"
          onChange={(e) => {
            setPicked(e.target.value);
            commit(text, e.target.value);
          }}>
          {countryChoices(question.countries, env.contentLang).map((c) => (
            <option key={c.code} value={c.code}>{flagOf(c.code)} {c.name} +{callingCode(c.code)}</option>
          ))}
        </Select>
        <Input id={inputId} type="tel" className="flex-1" value={text} placeholder={env.label(question.placeholder)} disabled={!!dontKnow}
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
