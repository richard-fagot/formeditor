import { Plus, X } from 'lucide-react';
import type { Constraint, LocalizedText } from '../../core/model';
import { Button, Field, LocalizedTextInput } from '../../ui-kit';
import { useExpressionEnv } from './context';
import { ExpressionInput } from './ExpressionInput';

const T = {
  rules: { fr: 'Contraintes libres', en: 'Custom rules' },
  add: { fr: 'Ajouter une règle', en: 'Add a rule' },
  rule: { fr: 'Règle (vraie si valide)', en: 'Rule (true when valid)' },
  message: { fr: 'Message d’erreur', en: 'Error message' },
  remove: { fr: 'Supprimer', en: 'Delete' },
};

export interface ConstraintsValue {
  constraints?: Constraint[];
  messages?: Record<string, LocalizedText>;
}

/**
 * Contraintes libres (règle + message) et messages d'erreur des contraintes intégrées (`params`).
 * `onChange(patch, field)` : `field` regroupe les frappes successives d'un même champ.
 */
export function ConstraintsEditor({ value, params, onChange }: {
  value: ConstraintsValue; params: string[]; onChange(patch: ConstraintsValue, field: string): void;
}) {
  const env = useExpressionEnv();
  const tr = (t: LocalizedText) => t[env.uiLang] ?? t.fr!;
  const list = value.constraints ?? [];
  const setAt = (i: number, c: Constraint | undefined, field: string) => {
    const next = c ? list.map((x, j) => (j === i ? c : x)) : list.filter((_, j) => j !== i);
    onChange({ constraints: next.length ? next : undefined }, field);
  };
  const text = (v: LocalizedText | undefined, set: (m: LocalizedText) => void, placeholder?: string) => (
    <LocalizedTextInput languages={env.languages} activeLang={env.contentLang} value={v} placeholder={placeholder} onChange={set} />
  );
  return (
    <div className="space-y-2" data-testid="constraints">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{tr(T.rules)}</span>
        <Button size="sm" variant="ghost" onClick={() => onChange({ constraints: [...list, { rule: '' }] }, 'constraints')}>
          <Plus className="size-3" />{tr(T.add)}
        </Button>
      </div>
      {list.map((c, i) => (
        <div key={i} className="space-y-1 rounded-md border border-slate-100 p-2">
          <div className="flex items-center gap-1">
            <ExpressionInput className="flex-1" placeholder={tr(T.rule)} value={c.rule} onChange={(rule) => setAt(i, { ...c, rule }, `constraint${i}`)} />
            <Button size="sm" variant="ghost" aria-label={tr(T.remove)} onClick={() => setAt(i, undefined, 'constraints')}><X className="size-3" /></Button>
          </div>
          {text(c.message, (m) => setAt(i, { rule: c.rule, ...(Object.keys(m).length ? { message: m } : {}) }, `constraintMsg${i}`), tr(T.message))}
        </div>
      ))}
      {params.map((p) => (
        <Field key={p} label={`${tr(T.message)} — ${p}`}>
          {text(value.messages?.[p], (m) => {
            const messages = { ...(value.messages ?? {}) };
            if (Object.keys(m).length) messages[p] = m;
            else delete messages[p];
            onChange({ messages: Object.keys(messages).length ? messages : undefined }, `msg-${p}`);
          })}
        </Field>
      ))}
    </div>
  );
}
