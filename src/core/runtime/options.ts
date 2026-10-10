import { evaluate, evaluateCondition, type EvalContext, type EvalEnv } from '../expressions';
import { OTHER_VALUE, type ChoiceOption, type Label, type MultipleChoiceQuestion, type SingleChoiceQuestion } from '../model';

/** Option proposée : libellé statique (`Label`) ou texte calculé (source dynamique). */
export interface ResolvedOption {
  value: string;
  label: Label | string;
  dynamic?: true;
}

const asList = (v: unknown): unknown[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const text = (v: unknown): string => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Évalue `expr` avec l'élément comme contexte ; sans expression, l'élément lui-même. */
function onItem(expr: string | undefined, item: unknown, env: EvalEnv): unknown {
  if (!expr) return item;
  return evaluate(expr, item as EvalContext, env);
}

/**
 * Options d'un choix dans un contexte : options statiques dont la condition est vraie (ou absente),
 * puis options de la source dynamique (docs/FORMAT.md §7.5). Doublons, valeurs vides et `other` écartés.
 */
export function choiceOptions(q: SingleChoiceQuestion | MultipleChoiceQuestion, ctx: EvalContext, env: EvalEnv = {}): ResolvedOption[] {
  const out: ResolvedOption[] = q.options
    .filter((o: ChoiceOption) => !o.when || evaluateCondition(o.when, ctx, env))
    .map((o) => ({ value: o.value, label: o.label }));
  if (!q.source) return out;
  const seen = new Set(out.map((o) => o.value));
  for (const item of asList(evaluate(q.source.from, ctx, env))) {
    if (item === null || item === undefined) continue;
    const value = text(onItem(q.source.value, item, env));
    if (!value || value === OTHER_VALUE || seen.has(value)) continue;
    seen.add(value);
    out.push({ value, label: text(onItem(q.source.label, item, env)) || value, dynamic: true });
  }
  return out;
}
