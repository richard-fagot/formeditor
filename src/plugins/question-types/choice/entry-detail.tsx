import { ArrowDown, ArrowUp, Copy, X } from 'lucide-react';
import { isDynamicEntry, OTHER_VALUE, type ChoiceEntry, type DynamicEntry } from '../../../core/model';
import type { Scope } from '../../../core/references';
import { tr, type EditorEnv } from '../../../plugin-api';
import { Button, Field, Input } from '../../../ui-kit';
import { ExpressionEnvProvider, ExpressionInput, LabelEditor, useExpressionEnv } from '../../../ui/expression-editor';
import { lineOf } from './entries';

const T = {
  value: { fr: 'Valeur', en: 'Value' },
  when: { fr: "Condition d'affichage", en: 'Display condition' },
  from: { fr: 'Liste (réponse précédente ou variable système)', en: 'List (previous answer or system variable)' },
  label: { fr: 'Libellé affiché (expression sur chaque élément)', en: 'Displayed label (expression on each item)' },
  itemValue: { fr: 'Valeur retenue (expression sur chaque élément)', en: 'Stored value (expression on each item)' },
  hint: { fr: "Vide : l'élément lui-même. Ex. date & ' — ' & nature", en: "Empty: the item itself. E.g. date & ' — ' & nature" },
  dynamic: { fr: 'dynamique', en: 'dynamic' },
  up: { fr: 'Monter', en: 'Move up' },
  down: { fr: 'Descendre', en: 'Move down' },
  duplicate: { fr: "Dupliquer l'entrée", en: 'Duplicate entry' },
  remove: { fr: "Supprimer l'entrée", en: 'Remove entry' },
};

/** Portée d'une expression évaluée sur chaque élément : les sous-champs de la liste, sans préfixe. */
function itemScope(outer: Scope, from: string): Scope {
  const prefix = `${from.trim()}.`;
  const scope: Scope = new Map();
  for (const [path, info] of outer) if (path.startsWith(prefix)) scope.set(path.slice(prefix.length), { ...info, path: path.slice(prefix.length) });
  return scope;
}

/** Retire les propriétés vides (`undefined` ou chaîne vide), sauf `from`, `value` et `label` d'une option statique. */
const clean = (e: ChoiceEntry): ChoiceEntry =>
  Object.fromEntries(Object.entries(e).filter(([k, v]) => v !== undefined && (v !== '' || k === 'from' || !isDynamicEntry(e)))) as unknown as ChoiceEntry;

interface Props {
  entry: ChoiceEntry;
  env: EditorEnv;
  first: boolean;
  last: boolean;
  onChange(e: ChoiceEntry): void;
  onMove(delta: number): void;
  onDuplicate(): void;
  onRemove(): void;
}

/** Détail d'une entrée : réglages (statique : valeur, libellé ; dynamique : liste, libellé, valeur), condition, actions. */
export function EntryDetail({ entry, env, first, last, onChange, onMove, onDuplicate, onRemove }: Props) {
  const set = (patch: Partial<ChoiceEntry>) => onChange(clean({ ...entry, ...patch } as ChoiceEntry));
  const dynamic = isDynamicEntry(entry);
  const stop = (f: () => void) => (e: { preventDefault(): void }) => (e.preventDefault(), f());
  return (
    <details className="rounded-md border border-slate-100 px-2 py-1" data-testid="option-entry">
      <summary className="flex cursor-pointer items-center gap-1 text-xs text-slate-600">
        <span className="min-w-0 flex-1 truncate">
          {lineOf(entry, env) || '…'}
          {dynamic ? <span className="ml-1 text-indigo-500">({tr(T.dynamic, env.uiLang)})</span> : <span className="ml-1 font-mono text-slate-400">= {entry.value}</span>}
          {entry.when && <span className="ml-1 text-amber-600">?</span>}
        </span>
        <Button size="sm" variant="ghost" aria-label={tr(T.up, env.uiLang)} disabled={first} onClick={stop(() => onMove(-1))}><ArrowUp className="size-3" /></Button>
        <Button size="sm" variant="ghost" aria-label={tr(T.down, env.uiLang)} disabled={last} onClick={stop(() => onMove(1))}><ArrowDown className="size-3" /></Button>
        <Button size="sm" variant="ghost" aria-label={tr(T.duplicate, env.uiLang)} onClick={stop(onDuplicate)}><Copy className="size-3" /></Button>
        <Button size="sm" variant="ghost" aria-label={tr(T.remove, env.uiLang)} onClick={stop(onRemove)}><X className="size-3" /></Button>
      </summary>
      <div className="space-y-2 py-2">
        {dynamic ? <DynamicFields entry={entry} env={env} set={set} /> : (
          <>
            <Field label={tr(T.value, env.uiLang)}>
              <Input className="font-mono" value={entry.value} onChange={(e) => e.target.value && e.target.value !== OTHER_VALUE && set({ value: e.target.value })} />
            </Field>
            <LabelEditor value={entry.label} onChange={(label) => set({ label: label ?? {} })} />
          </>
        )}
        <Field label={tr(T.when, env.uiLang)}>
          <ExpressionInput value={entry.when ?? ''} onChange={(v) => set({ when: v.trim() || undefined })} />
        </Field>
      </div>
    </details>
  );
}

/** Réglages d'une entrée dynamique : liste source, puis libellé et valeur évalués sur chaque élément. */
function DynamicFields({ entry, env, set }: { entry: DynamicEntry; env: EditorEnv; set(p: Partial<DynamicEntry>): void }) {
  const outer = useExpressionEnv();
  return (
    <>
      <Field label={tr(T.from, env.uiLang)}>
        <ExpressionInput value={entry.from} onChange={(from) => set({ from })} />
      </Field>
      <ExpressionEnvProvider value={{ ...outer, scope: itemScope(outer.scope, entry.from) }}>
        <Field label={tr(T.label, env.uiLang)}>
          <ExpressionInput value={entry.label ?? ''} onChange={(label) => set({ label: label.trim() })} />
        </Field>
        <Field label={tr(T.itemValue, env.uiLang)} hint={tr(T.hint, env.uiLang)}>
          <ExpressionInput value={entry.value ?? ''} onChange={(value) => set({ value: value.trim() })} />
        </Field>
      </ExpressionEnvProvider>
    </>
  );
}
