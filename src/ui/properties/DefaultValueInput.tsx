import { useEffect, useState } from 'react';
import type { QuestionType } from '../../core/model';
import { Input } from '../../ui-kit';

/** Types dont la réponse est une chaîne : la valeur littérale se saisit telle quelle. */
const STRING_TYPES: readonly QuestionType[] = ['text', 'date', 'single'];

const show = (type: QuestionType, v: unknown) =>
  v === undefined ? '' : STRING_TYPES.includes(type) && typeof v === 'string' ? v : JSON.stringify(v);

/** Valeur par défaut littérale : chaîne brute pour les types texte, JSON sinon (`true`, `12`, `["a"]`…). Vide = aucune. */
export function DefaultValueInput({ type, value, onChange, invalidText }: {
  type: QuestionType; value: unknown; onChange(v: unknown): void; invalidText: string;
}) {
  const [text, setText] = useState(show(type, value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setText(show(type, value)), [type, value]);
  const change = (raw: string) => {
    setText(raw);
    if (raw.trim() === '') return (setInvalid(false), onChange(undefined));
    if (STRING_TYPES.includes(type)) return (setInvalid(false), onChange(raw));
    try {
      const parsed: unknown = JSON.parse(raw);
      setInvalid(false);
      onChange(parsed);
    } catch {
      setInvalid(true);
    }
  };
  return (
    <div>
      <Input className={invalid ? 'border-rose-400 font-mono' : 'font-mono'} value={text} onChange={(e) => change(e.target.value)} />
      {invalid && <p className="mt-1 text-xs text-rose-600">{invalidText}</p>}
    </div>
  );
}
