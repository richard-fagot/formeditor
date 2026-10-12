import { evaluate, evaluateCondition, resolveLabel, type EvalContext, type EvalEnv } from '../expressions';
import {
  isChoiceGroup, isDynamicEntry, OTHER_VALUE,
  type ChoiceGroup, type ChoiceItem, type Label, type MultipleChoiceQuestion, type SingleChoiceQuestion,
} from '../model';

/** Groupe d'une option proposée : identifiant (code, sinon libellé dans la langue par défaut) et intitulé. */
export interface ResolvedGroup {
  id: string;
  label: Label;
}

/** Option proposée : libellé statique (`Label`) ou texte calculé (entrée dynamique), et son groupe éventuel. */
export interface ResolvedOption {
  value: string;
  label: Label | string;
  dynamic?: true;
  group?: ResolvedGroup;
}

const asList = (v: unknown): unknown[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const text = (v: unknown): string => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));

/** Évalue `expr` avec l'élément comme contexte ; sans expression, l'élément lui-même. */
function onItem(expr: string | undefined, item: unknown, env: EvalEnv): unknown {
  if (!expr) return item;
  return evaluate(expr, item as EvalContext, env);
}

/** Identifiant d'un groupe : son code, sinon son libellé dans la langue par défaut (`env.defaultLang`), interpolé. */
export function groupId(g: ChoiceGroup, ctx: EvalContext, env: EvalEnv = {}): string {
  if (g.code) return g.code;
  const lang = env.defaultLang ?? '';
  return resolveLabel(g.group, { lang, defaultLang: lang }, ctx, env);
}

/**
 * Options d'un choix dans un contexte : chaque entrée dont la condition est vraie (ou absente) est
 * déployée à sa position (docs/FORMAT.md §7.3, §7.5) : option statique telle quelle, entrée dynamique
 * en autant d'options que sa source fournit d'éléments, groupe en ses entrées (chacune marquée de son groupe).
 * Valeurs vides, `other` et valeurs déjà proposées plus haut dans le même groupe écartées.
 */
export function choiceOptions(q: SingleChoiceQuestion | MultipleChoiceQuestion, ctx: EvalContext, env: EvalEnv = {}): ResolvedOption[] {
  const out: ResolvedOption[] = [];
  const seen = new Set<string>();
  const push = (o: ResolvedOption) => {
    const id = `${o.group?.id ?? ''}\u0000${o.value}`;
    if (!o.value || o.value === OTHER_VALUE || seen.has(id)) return;
    seen.add(id);
    out.push(o);
  };
  const visible = (e: { when?: string }) => !e.when || evaluateCondition(e.when, ctx, env);
  const deploy = (entry: ChoiceItem, group?: ResolvedGroup) => {
    if (!visible(entry)) return;
    const g = group ? { group } : {};
    if (!isDynamicEntry(entry)) return push({ value: entry.value, label: entry.label, ...g });
    for (const item of asList(evaluate(entry.from, ctx, env))) {
      if (item === null || item === undefined) continue;
      const value = text(onItem(entry.value, item, env));
      push({ value, label: text(onItem(entry.label, item, env)) || value, dynamic: true, ...g });
    }
  };
  for (const entry of q.options) {
    if (!isChoiceGroup(entry)) {
      deploy(entry);
      continue;
    }
    if (!visible(entry)) continue;
    const group = { id: groupId(entry, ctx, env), label: entry.group };
    for (const item of entry.options) deploy(item, group);
  }
  return out;
}
