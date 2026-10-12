import { Plus, Trash2 } from 'lucide-react';
import { DONT_KNOW_SUFFIX, GROUP_SUFFIX, OTHER_VALUE, type StructureField, type StructureQuestion } from '../../../core/model';
import { dontKnowAnswer } from '../../../core/runtime';
import { tr, type FieldProps, type RenderEnv } from '../../../plugin-api';
import { Button } from '../../../ui-kit';

type Occurrence = Record<string, unknown>;
const T = {
  add: { fr: 'Ajouter', en: 'Add' },
  remove: { fr: 'Supprimer', en: 'Remove' },
};

/** Occurrences affichées : la réponse, complétée par des occurrences vides jusqu'au minimum. */
export function occurrencesOf(q: StructureQuestion, value: unknown): Occurrence[] {
  if (!q.repeat) return [value && typeof value === 'object' && !Array.isArray(value) ? (value as Occurrence) : {}];
  const list = Array.isArray(value) ? (value as Occurrence[]) : [];
  const min = q.repeat.min ?? 0;
  return list.length >= min ? list : [...list, ...Array.from({ length: min - list.length }, () => ({}))];
}

/** Champs visibles d'une occurrence (condition `when` évaluée avec les clés sœurs). */
export const visibleFields = (q: StructureQuestion, occ: Occurrence, env: RenderEnv) =>
  q.fields.filter((f) => !f.when || env.scoped(occ).condition(f.when));

/**
 * Occurrence avec la réponse d'un champ, sa précision « Autre », le groupe de la sélection d'un choix (`<clé>_group`)
 * et le marqueur « Ne sais pas » (`<clé>_nsp`, EVO-006).
 */
function setField(occ: Occurrence, f: StructureField, value: unknown, other?: string, group?: unknown, dontKnow?: boolean): Occurrence {
  const next: Occurrence = { ...occ, [f.key]: value === undefined ? null : value };
  const extra: [string, unknown][] = [
    [`${f.key}_${OTHER_VALUE}`, other], [`${f.key}_${GROUP_SUFFIX}`, group], [`${f.key}_${DONT_KNOW_SUFFIX}`, dontKnow || undefined],
  ];
  for (const [k, v] of extra) {
    if (v !== undefined && v !== null) next[k] = v;
    else delete next[k];
  }
  return next;
}

/** Saisie d'une structure : ses champs, et pour une structure répétable les occurrences avec « Ajouter » / « Supprimer ». */
export function StructureInput({ question, value, onChange, errors, env, inputId }: FieldProps<StructureQuestion>) {
  const occs = occurrencesOf(question, value);
  const repeat = question.repeat;
  const commit = (list: Occurrence[]) => onChange(repeat ? list : list[0] ?? {});
  const canAdd = !repeat?.max || occs.length < repeat.max;
  const canRemove = occs.length > (repeat?.min ?? 0);
  return (
    <div id={inputId} className="space-y-4">
      {occs.map((occ, i) => {
        const scoped = env.scoped(occ);
        const prefix = repeat ? `${question.key}[${i}]` : question.key;
        return (
          <fieldset key={i} className={repeat ? 'space-y-3 rounded-lg border border-slate-200 p-4' : 'space-y-3'} data-testid="occurrence">
            {repeat && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">#{i + 1}</span>
                <Button size="sm" variant="danger" disabled={!canRemove} onClick={() => commit(occs.filter((_, j) => j !== i))}>
                  <Trash2 className="size-3.5" />{tr(T.remove, env.uiLang)}
                </Button>
              </div>
            )}
            {visibleFields(question, occ, env).map((f) => {
              const plugin = env.questionType(f.type);
              const id = `${inputId}-${i}-${f.key}`;
              const fieldErrors = errors[`${prefix}.${f.key}`] ?? [];
              return (
                <div key={f.id} className="space-y-1.5">
                  <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                    {scoped.label(f.label)}
                    {f.required === true && <span className="text-rose-500"> *</span>}
                  </label>
                  {f.help && <p className="text-xs text-slate-500">{scoped.label(f.help)}</p>}
                  {plugin && (
                    <plugin.Field question={f} value={occ[f.key] ?? undefined} other={occ[`${f.key}_${OTHER_VALUE}`] as string | undefined} group={occ[`${f.key}_${GROUP_SUFFIX}`]}
                      errors={{ '': fieldErrors }} env={scoped} inputId={id} dontKnow={occ[`${f.key}_${DONT_KNOW_SUFFIX}`] === true}
                      onChange={(v, o, g) => commit(occs.map((x, j) => (j === i ? setField(x, f, v, o, g) : x)))}
                      onDontKnow={(on) => {
                        const a = dontKnowAnswer(f);
                        commit(occs.map((x, j) => (j !== i ? x : on ? setField(x, f, a.value, undefined, a.group, true) : setField(x, f, null))));
                      }} />
                  )}
                  {fieldErrors.map((m, k) => <p key={k} className="text-sm text-rose-600" role="alert">{m}</p>)}
                </div>
              );
            })}
          </fieldset>
        );
      })}
      {repeat && (
        <Button disabled={!canAdd} onClick={() => commit([...occs, {}])} data-testid="structure-add">
          <Plus className="size-4" />{repeat.addLabel ? env.text(repeat.addLabel) : tr(T.add, env.contentLang)}
        </Button>
      )}
    </div>
  );
}
