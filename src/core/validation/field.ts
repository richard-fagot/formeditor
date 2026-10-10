import { evaluate, evaluateCondition, type EvalContext, type EvalEnv } from '../expressions';
import { OTHER_VALUE, type LocalizedText, type Question, type StructureField } from '../model';
import { choiceOptions } from '../runtime';
import { defaultMessage } from './messages';

export interface FieldError {
  /** Chemin dans la réponse : `''` (la question), `victimes[0].prenom` (champ d'une occurrence). */
  path: string;
  param: string;
  /** Message multilingue, interpolable. */
  message: LocalizedText;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

function bound(b: string | number | undefined, ctx: EvalContext, env: EvalEnv, isDate: boolean): unknown {
  if (b === undefined) return undefined;
  if (typeof b === 'number' || (isDate && ISO_DATE.test(b))) return b;
  return evaluate(b, ctx, env);
}

function validDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

/**
 * Valide une réponse. `ctx` est le contexte d'évaluation, réponse courante comprise (sous sa clé).
 * `other` : précision de l'option « Autre ».
 */
export function validateAnswer(
  q: Question | StructureField, value: unknown, ctx: EvalContext, env: EvalEnv = {}, other?: unknown, path = '',
): FieldError[] {
  const errors: FieldError[] = [];
  const fail = (param: string, arg?: unknown) =>
    errors.push({ path, param, message: q.messages?.[param] ?? defaultMessage(param, arg) });

  const required = typeof q.required === 'string' ? evaluateCondition(q.required, ctx, env) : q.required === true;
  // Liste vide d'une structure répétable : vide si facultative ; si obligatoire, `repeat.min` (≥ 1) s'applique,
  // et sans minimum la liste vide est une réponse manquante (`required`).
  const repeatList = required && q.type === 'structure' && !!q.repeat?.min && Array.isArray(value);
  if (isEmpty(value) && !repeatList) {
    if (required) fail('required');
    return errors;
  }

  switch (q.type) {
    case 'text': {
      const s = String(value);
      if (q.minLength !== undefined && s.length < q.minLength) fail('minLength', q.minLength);
      if (q.maxLength !== undefined && s.length > q.maxLength) fail('maxLength', q.maxLength);
      if (q.pattern && !safeTest(q.pattern, s)) fail('pattern');
      break;
    }
    case 'date': {
      const s = String(value);
      if (!validDate(s)) {
        fail('format');
        break;
      }
      const min = bound(q.min, ctx, env, true);
      const max = bound(q.max, ctx, env, true);
      if (typeof min === 'string' && s < min) fail('min', min);
      if (typeof max === 'string' && s > max) fail('max', max);
      break;
    }
    case 'number': {
      const n = Number(value);
      if (q.numberKind === 'natural' && (!Number.isInteger(n) || n < 0)) fail('numberKind', 'natural');
      else if (q.numberKind === 'integer' && !Number.isInteger(n)) fail('numberKind', 'integer');
      const min = bound(q.min, ctx, env, false);
      const max = bound(q.max, ctx, env, false);
      if (typeof min === 'number' && n < min) fail('min', min);
      if (typeof max === 'number' && n > max) fail('max', max);
      if (q.decimals !== undefined && decimalsOf(n) > q.decimals) fail('decimals', q.decimals);
      break;
    }
    case 'single':
    case 'multiple': {
      const visible = new Set(choiceOptions(q, ctx, env).map((o) => o.value));
      if (q.other) visible.add(OTHER_VALUE);
      const list = Array.isArray(value) ? value : [value];
      if (list.some((v) => !visible.has(String(v)))) fail('option');
      if (q.type === 'single') break;
      if (q.minSelected !== undefined && list.length < q.minSelected) fail('minSelected', q.minSelected);
      if (q.maxSelected !== undefined && list.length > q.maxSelected) fail('maxSelected', q.maxSelected);
      break;
    }
    case 'structure':
      validateStructure(q, value, ctx, env, path || q.key, fail, errors);
      break;
  }
  if ('other' in q && q.other?.detailRequired && hasOther(value) && isEmpty(other)) fail('otherDetail');
  q.constraints?.forEach((c, i) => {
    if (!evaluateCondition(c.rule, ctx, env)) errors.push({ path, param: `constraints[${i}]`, message: c.message ?? defaultMessage('constraint') });
  });
  return errors;
}

const hasOther = (v: unknown) => v === OTHER_VALUE || (Array.isArray(v) && v.includes(OTHER_VALUE));
const decimalsOf = (n: number) => (String(n).split('.')[1] ?? '').length;

function safeTest(pattern: string, s: string): boolean {
  try {
    return new RegExp(pattern).test(s);
  } catch {
    return true;
  }
}

function validateStructure(
  q: Extract<Question, { type: 'structure' }>, value: unknown, ctx: EvalContext, env: EvalEnv,
  path: string, fail: (p: string, a?: unknown) => void, errors: FieldError[],
) {
  const occurrences = q.repeat ? (value as Record<string, unknown>[]) : [value as Record<string, unknown>];
  if (q.repeat?.min !== undefined && occurrences.length < q.repeat.min) fail('minOccurrences', q.repeat.min);
  if (q.repeat?.max !== undefined && occurrences.length > q.repeat.max) fail('maxOccurrences', q.repeat.max);
  if (errors.length) return;
  occurrences.forEach((occ, i) => {
    const octx = { ...ctx, ...occ };
    for (const f of q.fields) {
      if (f.when && !evaluateCondition(f.when, octx, env)) continue;
      const fpath = q.repeat ? `${path}[${i}].${f.key}` : `${path}.${f.key}`;
      errors.push(...validateAnswer(f, occ?.[f.key], octx, env, occ?.[`${f.key}_${OTHER_VALUE}`], fpath));
    }
  });
}

const BUILTIN_PARAMS = ['minLength', 'maxLength', 'pattern', 'min', 'max', 'numberKind', 'decimals', 'minSelected', 'maxSelected'];

/** Paramètres dont le message d'erreur est personnalisable (`messages.<param>`) pour cette question. */
export function messageParams(q: Question | StructureField): string[] {
  const r = q as unknown as Record<string, unknown>;
  return [
    'required',
    ...BUILTIN_PARAMS.filter((p) => r[p] !== undefined),
    ...(q.type === 'date' ? ['format'] : []),
    ...(q.type === 'single' || q.type === 'multiple' ? ['option'] : []),
    ...('other' in q && q.other?.detailRequired ? ['otherDetail'] : []),
    ...(q.type === 'structure' && q.repeat?.min !== undefined ? ['minOccurrences'] : []),
    ...(q.type === 'structure' && q.repeat?.max !== undefined ? ['maxOccurrences'] : []),
  ];
}
