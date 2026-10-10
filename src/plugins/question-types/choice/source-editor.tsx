import type { DynamicSource } from '../../../core/model';
import { tr, type EditorEnv } from '../../../plugin-api';
import { Checkbox, Field, Input } from '../../../ui-kit';
import { ExpressionInput } from '../../../ui/expression-editor';

const T = {
  enable: { fr: 'Source dynamique', en: 'Dynamic source' },
  from: { fr: 'Liste (réponse précédente ou variable système)', en: 'List (previous answer or system variable)' },
  label: { fr: 'Libellé affiché (expression sur chaque élément)', en: 'Displayed label (expression on each item)' },
  value: { fr: 'Valeur retenue (expression sur chaque élément)', en: 'Stored value (expression on each item)' },
  hint: { fr: "Vide : l'élément lui-même. Ex. date & ' — ' & nature", en: "Empty: the item itself. E.g. date & ' — ' & nature" },
};

/** Source dynamique : les options (en plus des statiques) proviennent d'une liste. */
export function SourceEditor({ source, onChange, env }: { source: DynamicSource | undefined; onChange(s: DynamicSource | undefined): void; env: EditorEnv }) {
  const set = (patch: Partial<DynamicSource>) =>
    onChange(Object.fromEntries(Object.entries({ ...source, ...patch }).filter(([, v]) => v !== undefined && v !== '')) as unknown as DynamicSource);
  return (
    <div className="space-y-2">
      <Checkbox label={tr(T.enable, env.uiLang)} checked={!!source} onChange={(e) => onChange(e.target.checked ? { from: '' } : undefined)} />
      {source && (
        <div className="space-y-2 border-l-2 border-slate-100 pl-3">
          <Field label={tr(T.from, env.uiLang)}>
            <ExpressionInput value={source.from} onChange={(from) => onChange({ ...source, from })} />
          </Field>
          <Field label={tr(T.label, env.uiLang)}>
            <Input className="font-mono" value={source.label ?? ''} onChange={(e) => set({ label: e.target.value })} />
          </Field>
          <Field label={tr(T.value, env.uiLang)} hint={tr(T.hint, env.uiLang)}>
            <Input className="font-mono" value={source.value ?? ''} onChange={(e) => set({ value: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  );
}
