import { OTHER_VALUE } from '../../../core/model';
import type { FieldProps, RenderEnv } from '../../../plugin-api';
import { Input } from '../../../ui-kit';
import { asList, OTHER_LABEL, fits, itemsOf, pickedAnswer, sectionsOf, selectedOf, type Choice } from './selection';

/** Saisie : boutons radio (unique) ou cases à cocher (multiple), en sections par groupe, puis « Autre » avec sa précision. */
export function ChoiceField({ question, value, other, group, onChange, env, inputId }: FieldProps<Choice>) {
  const multiple = question.type === 'multiple';
  const items = itemsOf(question, env);
  const values = multiple ? asList(value) : typeof value === 'string' ? [value] : [];
  const selected = selectedOf(items, values, multiple ? asList(group) : [group]);
  const hasOther = selected.some((i) => items[i]!.value === OTHER_VALUE);
  const toggle = (i: number) => {
    const c = items[i]!;
    if (!multiple) return onChange(c.value, c.value === OTHER_VALUE ? other : undefined, c.group);
    const answer = pickedAnswer(items, selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i]);
    if (!answer) return onChange(null, undefined, undefined);
    onChange(answer.values, answer.values.includes(OTHER_VALUE) ? other : undefined, answer.groups);
  };
  const option = (i: number) => (
    <label key={i} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 hover:border-indigo-300 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50/50">
      <input type={multiple ? 'checkbox' : 'radio'} name={inputId} className="size-4 accent-indigo-600" checked={selected.includes(i)} onChange={() => toggle(i)} />
      <span className="text-slate-800">{items[i]!.text}</span>
    </label>
  );
  return (
    <div role={multiple ? 'group' : 'radiogroup'} id={inputId} className="space-y-2">
      {sectionsOf(items).map((s, k) => (s.title === undefined ? s.indexes.map(option) : (
        <div key={`g${k}`} role="group" aria-label={s.title} className="space-y-2 pt-1" data-testid="choice-group">
          <p className="text-sm font-semibold text-slate-700">{s.title}</p>
          {s.indexes.map(option)}
        </div>
      )))}
      {hasOther && (
        <Input autoFocus aria-label={env.label(question.other?.label ?? OTHER_LABEL)} value={other ?? ''} onChange={(e) => onChange(value, e.target.value, group)} />
      )}
    </div>
  );
}

/** Réponse affichée (synthèse) : « Groupe — Option » pour une option d'un groupe. */
export function formatAnswer(q: Choice, value: unknown, env: RenderEnv, other?: string, group?: unknown): string {
  const items = itemsOf(q, env);
  const one = (v: unknown, g: unknown) => {
    if (v === OTHER_VALUE) return `${env.label(q.other?.label ?? OTHER_LABEL)} : ${other ?? ''}`;
    const c = items.find((x) => fits(x, v, g));
    if (!c) return String(v ?? '');
    return c.title === undefined ? c.text : `${c.title} — ${c.text}`;
  };
  if (Array.isArray(value)) return value.map((v, k) => one(v, asList(group)[k])).join(', ');
  return value === null || value === undefined ? '' : one(value, group);
}
