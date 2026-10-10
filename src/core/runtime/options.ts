import { evaluate, evaluateCondition, type EvalContext, type EvalEnv } from '../expressions';
import { isDynamicEntry, OTHER_VALUE, type Label, type MultipleChoiceQuestion, type SingleChoiceQuestion } from '../model';

/** Option proposée : libellé statique (`Label`) ou texte calculé (entrée dynamique). */
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
 * Options d'un choix dans un contexte : chaque entrée dont la condition est vraie (ou absente) est
 * déployée à sa position (docs/FORMAT.md §7.3, §7.5) : option statique telle quelle, entrée dynamique
 * en autant d'options que sa source fournit d'éléments. Valeurs vides, `other` et valeurs déjà proposées plus haut écartées.
 */
export function choiceOptions(q: SingleChoiceQuestion | MultipleChoiceQuestion, ctx: EvalContext, env: EvalEnv = {}): ResolvedOption[] {
  const out: ResolvedOption[] = [];
  const seen = new Set<string>();
  const push = (o: ResolvedOption) => {
    if (!o.value || o.value === OTHER_VALUE || seen.has(o.value)) return;
    seen.add(o.value);
    out.push(o);
  };
  for (const entry of q.options) {
    if (entry.when && !evaluateCondition(entry.when, ctx, env)) continue;
    if (!isDynamicEntry(entry)) {
      push({ value: entry.value, label: entry.label });
      continue;
    }
    for (const item of asList(evaluate(entry.from, ctx, env))) {
      if (item === null || item === undefined) continue;
      const value = text(onItem(entry.value, item, env));
      push({ value, label: text(onItem(entry.label, item, env)) || value, dynamic: true });
    }
  }
  return out;
}
