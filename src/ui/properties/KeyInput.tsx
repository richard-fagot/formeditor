import { useEffect, useState } from 'react';
import { isValidKey } from '../../core/model';
import { Input } from '../../ui-kit';

/** Saisie d'une clé : validée à la sortie du champ ou sur Entrée (le renommage est propagé). */
export function KeyInput({ value, taken, onCommit, id, invalidText }: { value: string; taken: string[]; onCommit(k: string): void; id?: string; invalidText: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const valid = text === value || (isValidKey(text) && !taken.includes(text));
  const commit = () => (valid && text !== value ? onCommit(text) : setText(value));
  return (
    <div>
      <Input
        id={id}
        className={`font-mono ${valid ? '' : 'border-rose-400'}`}
        value={text}
        onChange={(e) => setText(e.target.value.trim())}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') setText(value);
        }}
      />
      {!valid && <p className="mt-1 text-xs text-rose-600">{invalidText}</p>}
    </div>
  );
}
