import { ArrowDown, ArrowUp, X } from 'lucide-react';
import type { ChoiceGroup } from '../../../core/model';
import { previewText, tr, type EditorEnv } from '../../../plugin-api';
import { Button, Field, Input } from '../../../ui-kit';
import { ExpressionInput, LabelEditor } from '../../../ui/expression-editor';

const T = {
  group: { fr: 'groupe', en: 'group' },
  code: { fr: 'Code du groupe', en: 'Group code' },
  codeHint: {
    fr: 'Identifiant du groupe dans la réponse (ma_question.groupe). Vide : le libellé dans la langue par défaut. « AUTRE » est réservé.',
    en: 'Group identifier in the answer (my_question.groupe). Empty: the label in the default language. “AUTRE” is reserved.',
  },
  when: { fr: "Condition d'affichage du groupe", en: 'Group display condition' },
  up: { fr: 'Monter le groupe (avec ses options)', en: 'Move group up (with its options)' },
  down: { fr: 'Descendre le groupe (avec ses options)', en: 'Move group down (with its options)' },
  remove: { fr: 'Supprimer le groupe et ses options', en: 'Remove group and its options' },
};

/** Retire les propriétés vides (`code`, `when`). */
const clean = (g: ChoiceGroup): ChoiceGroup =>
  Object.fromEntries(Object.entries(g).filter(([, v]) => v !== undefined && v !== '')) as unknown as ChoiceGroup;

interface Props {
  group: ChoiceGroup;
  env: EditorEnv;
  first: boolean;
  last: boolean;
  onChange(g: ChoiceGroup): void;
  onMove(delta: number): void;
  onRemove(): void;
}

/** Ligne de paramétrage d'un groupe d'options (EVO-003) : libellé à variantes, code, condition ; monter, descendre, supprimer. */
export function GroupDetail({ group, env, first, last, onChange, onMove, onRemove }: Props) {
  const set = (patch: Partial<ChoiceGroup>) => onChange(clean({ ...group, ...patch }));
  const stop = (f: () => void) => (e: { preventDefault(): void }) => (e.preventDefault(), f());
  return (
    <details className="rounded-md border border-indigo-100 bg-indigo-50/40 px-2 py-1" data-testid="option-group">
      <summary className="flex cursor-pointer items-center gap-1 text-xs text-slate-700">
        <span className="min-w-0 flex-1 truncate">
          <span className="font-semibold"># {previewText(group.group, env) || '…'}</span>
          <span className="ml-1 text-indigo-500">({tr(T.group, env.uiLang)})</span>
          {group.code && <span className="ml-1 font-mono text-slate-400" data-testid="option-group-code">= {group.code}</span>}
          {group.when && <span className="ml-1 text-amber-600">?</span>}
        </span>
        <Button size="sm" variant="ghost" aria-label={tr(T.up, env.uiLang)} disabled={first} onClick={stop(() => onMove(-1))}><ArrowUp className="size-3" /></Button>
        <Button size="sm" variant="ghost" aria-label={tr(T.down, env.uiLang)} disabled={last} onClick={stop(() => onMove(1))}><ArrowDown className="size-3" /></Button>
        <Button size="sm" variant="ghost" aria-label={tr(T.remove, env.uiLang)} onClick={stop(onRemove)}><X className="size-3" /></Button>
      </summary>
      <div className="space-y-2 py-2">
        <LabelEditor value={group.group} onChange={(label) => set({ group: label ?? {} })} />
        <Field label={tr(T.code, env.uiLang)} hint={tr(T.codeHint, env.uiLang)}>
          <Input className="font-mono" aria-label={tr(T.code, env.uiLang)} value={group.code ?? ''} onChange={(e) => set({ code: e.target.value.trim() || undefined })} />
        </Field>
        <Field label={tr(T.when, env.uiLang)}>
          <ExpressionInput value={group.when ?? ''} onChange={(v) => set({ when: v.trim() || undefined })} />
        </Field>
      </div>
    </details>
  );
}
