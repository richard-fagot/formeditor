import type { DynamicSource } from '../../../core/model';
import { tr, type EditorEnv } from '../../../plugin-api';
import type { Scope } from '../../../core/references';
import { Checkbox, Field } from '../../../ui-kit';
import { ExpressionEnvProvider, ExpressionInput, useExpressionEnv } from '../../../ui/expression-editor';

/** Portée d'une expression évaluée sur chaque élément : les sous-champs de la liste, sans préfixe. */
function itemScope(outer: Scope, from: string): Scope {
  const prefix = `${from.trim()}.`;
  const scope: Scope = new Map();
  for (const [path, info] of outer) if (path.startsWith(prefix)) scope.set(path.slice(prefix.length), { ...info, path: path.slice(prefix.length) });
  return scope;
}

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
    onChange(Object.fromEntries(Object.entries({ ...source, ...patch }).filter(([k, v]) => k === 'from' || (v !== undefined && v !== ''))) as unknown as DynamicSource);
  const outer = useExpressionEnv();
  return (
    <div className="space-y-2">
      <Checkbox label={tr(T.enable, env.uiLang)} checked={!!source} onChange={(e) => onChange(e.target.checked ? { from: '' } : undefined)} />
      {source && (
        <div className="space-y-2 border-l-2 border-slate-100 pl-3">
          <Field label={tr(T.from, env.uiLang)}>
            <ExpressionInput value={source.from} onChange={(from) => onChange({ ...source, from })} />
          </Field>
          <ExpressionEnvProvider value={{ ...outer, scope: itemScope(outer.scope, source.from) }}>
            <Field label={tr(T.label, env.uiLang)}>
              <ExpressionInput value={source.label ?? ''} onChange={(label) => set({ label: label.trim() })} />
            </Field>
            <Field label={tr(T.value, env.uiLang)} hint={tr(T.hint, env.uiLang)}>
              <ExpressionInput value={source.value ?? ''} onChange={(value) => set({ value: value.trim() })} />
            </Field>
          </ExpressionEnvProvider>
        </div>
      )}
    </div>
  );
}
