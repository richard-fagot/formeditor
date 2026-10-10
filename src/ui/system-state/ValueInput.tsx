import { useEffect, useState } from 'react';
import type { SystemVariable } from '../../core/model';
import { useT, valueError } from '../../app/store';
import { Input, Select, Textarea } from '../../ui-kit';

interface Props {
  variable: SystemVariable;
  value: unknown;
  onChange(value: unknown): void;
  id?: string;
}

/** Saisie d'une valeur de l'état du système selon le type déclaré (liste d'objets : JSON). */
export function ValueInput({ variable: v, value, onChange, id }: Props) {
  const t = useT();
  const err = valueError(v, value);
  const unset = <option value="">{t('system.unset')}</option>;
  let input;
  switch (v.type) {
    case 'number':
      input = <Input id={id} type="number" value={typeof value === 'number' ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />;
      break;
    case 'date':
      input = <Input id={id} type="date" value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || undefined)} />;
      break;
    case 'boolean':
      input = (
        <Select id={id} value={typeof value === 'boolean' ? String(value) : ''} onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}>
          {unset}
          <option value="true">true</option>
          <option value="false">false</option>
        </Select>
      );
      break;
    case 'enum':
      input = (
        <Select id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || undefined)}>
          {unset}
          {(v.values ?? []).map((x) => <option key={x} value={x}>{x}</option>)}
          {typeof value === 'string' && value && !v.values?.includes(value) && <option value={value}>{value}</option>}
        </Select>
      );
      break;
    case 'list':
      return <JsonInput id={id} value={value} onChange={onChange} typeError={err} />;
    default:
      input = <Input id={id} value={typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value)} onChange={(e) => onChange(e.target.value || undefined)} />;
  }
  return (
    <div>
      {input}
      {err && <p className="mt-1 text-xs text-amber-700">{t('system.typeError', { type: err })}</p>}
    </div>
  );
}

/** Valeur JSON saisie librement : transmise seulement si elle est valide. */
function JsonInput({ id, value, onChange, typeError }: { id?: string; value: unknown; onChange(v: unknown): void; typeError?: string }) {
  const t = useT();
  const format = (x: unknown) => (x === undefined ? '' : JSON.stringify(x, null, 2));
  const [text, setText] = useState(format(value));
  const [bad, setBad] = useState(false);
  useEffect(() => {
    // Resynchronise si la valeur change ailleurs (scénario choisi, annulation), sans écraser une saisie équivalente.
    setText((cur) => {
      try {
        return JSON.stringify(cur.trim() ? JSON.parse(cur) : undefined) === JSON.stringify(value) ? cur : format(value);
      } catch {
        return format(value);
      }
    });
    setBad(false);
  }, [value]);
  return (
    <div>
      <Textarea id={id} className="min-h-24 font-mono text-xs" value={text} spellCheck={false}
        onChange={(e) => {
          setText(e.target.value);
          try {
            onChange(e.target.value.trim() ? JSON.parse(e.target.value) : undefined);
            setBad(false);
          } catch {
            setBad(true);
          }
        }} />
      {bad && <p className="mt-1 text-xs text-rose-600">{t('system.jsonError')}</p>}
      {!bad && typeError && <p className="mt-1 text-xs text-amber-700">{t('system.typeError', { type: typeError })}</p>}
    </div>
  );
}

/** Valeurs de toutes les variables du dictionnaire (scénario, état de la prévisualisation). */
export function SystemValuesEditor({ variables, values, onChange, idPrefix }: {
  variables: SystemVariable[]; values: Record<string, unknown>; onChange(name: string, value: unknown): void; idPrefix: string;
}) {
  return (
    <div className="space-y-2">
      {variables.map((v) => (
        <div key={v.name} className="space-y-1">
          <label htmlFor={`${idPrefix}-${v.name}`} className="flex items-baseline gap-2 text-xs">
            <span className="font-mono font-medium text-slate-700">sys.{v.name}</span>
            <span className="text-slate-400">{v.type}</span>
          </label>
          <ValueInput id={`${idPrefix}-${v.name}`} variable={v} value={values[v.name]} onChange={(x) => onChange(v.name, x)} />
        </div>
      ))}
    </div>
  );
}
