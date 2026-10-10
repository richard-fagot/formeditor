import { useEffect, useState } from 'react';
import { isValidKey, type ExitNode } from '../../../core/model';
import { tr, type NodeKindPlugin } from '../../../plugin-api';
import { Field, Input, LocalizedTextInput } from '../../../ui-kit';

const T = {
  name: { fr: 'Sortie', en: 'Exit' },
  exitName: { fr: 'Nom de la sortie', en: 'Exit name' },
  hint: { fr: 'Nom technique (snake_case) : les arêtes des instances du bloc le visent.', en: 'Technical name (snake_case): edges of the block instances target it.' },
  invalid: { fr: 'Nom invalide (snake_case).', en: 'Invalid name (snake_case).' },
  label: { fr: 'Libellé (facultatif)', en: 'Label (optional)' },
};

/** Saisie du nom, validée à la sortie du champ ou sur Entrée (le renommage suit dans les instances). */
function NameInput({ value, onCommit }: { value: string; onCommit(v: string): void }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const valid = isValidKey(text);
  const commit = () => (valid && text !== value ? onCommit(text) : setText(value));
  return (
    <Input id="prop-exit-name" className={`font-mono ${valid ? '' : 'border-rose-400'}`} value={text}
      onChange={(e) => setText(e.target.value.trim())} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setText(value); }} />
  );
}

/** Sortie nommée d'un bloc (uniquement dans un bloc). */
export const exitKind: NodeKindPlugin<ExitNode> = {
  kind: 'exit',
  name: T.name,
  create: (id) => ({ kind: 'exit', id, name: 'sortie' }),
  shapeClass: 'rounded-md border-slate-400 bg-slate-100',
  Shape: ({ node, env, badges }) => (
    <div className="space-y-1 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tr(T.name, env.uiLang)}</div>
      <div className="font-mono text-sm text-slate-700">{node.name}</div>
      <div className="flex flex-wrap justify-center gap-1 empty:hidden">{badges}</div>
    </div>
  ),
  Properties: ({ node, update, env }) => (
    <div className="space-y-3">
      <Field label={tr(T.exitName, env.uiLang)} hint={tr(T.hint, env.uiLang)} htmlFor="prop-exit-name">
        <NameInput value={node.name} onCommit={(name) => update({ name })} />
      </Field>
      <Field label={tr(T.label, env.uiLang)}>
        <LocalizedTextInput languages={env.languages} activeLang={env.contentLang} value={node.label}
          onChange={(label) => update({ label: Object.values(label).some((v) => v) ? label : undefined })} />
      </Field>
    </div>
  ),
};
