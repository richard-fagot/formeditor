import jsonata from 'jsonata';
import { addDays, age, daysBetween, todayIso } from './dates';
import { rewriteGroupRefs } from './group-ref';

/** Environnement d'évaluation (date du jour figée pour les tests et la prévisualisation). */
export interface EvalEnv {
  today?: string;
  /** Langue par défaut du projet : identifiant d'un groupe d'options sans code (EVO-003). */
  defaultLang?: string;
}
export type EvalContext = Record<string, unknown>;

export interface SyntaxError {
  message: string;
  /** Position (index de fin du jeton fautif) dans l'expression. */
  position: number;
}

type Compiled = ReturnType<typeof jsonata>;
const cache = new Map<string, Compiled | SyntaxError>();

/** Compile (avec cache) ; renvoie l'expression compilée ou l'erreur de syntaxe. */
export function compile(expr: string): Compiled | SyntaxError {
  let c = cache.get(expr);
  if (!c) {
    try {
      c = jsonata(expr);
    } catch (e) {
      const err = e as { message: string; position?: number };
      c = { message: err.message, position: err.position ?? 0 };
    }
    cache.set(expr, c);
  }
  return c;
}

const isError = (c: Compiled | SyntaxError): c is SyntaxError => 'message' in c && !('evaluate' in c);

export function checkSyntax(expr: string): SyntaxError | undefined {
  const c = compile(expr);
  return isError(c) ? c : undefined;
}

function bindings(env: EvalEnv) {
  const today = env.today ?? todayIso();
  return {
    today: () => today,
    addDays: (d: string, n: number) => addDays(d, n),
    daysBetween: (a: string, b: string) => daysBetween(a, b),
    age: (d: string) => age(d, today),
  };
}

/** Évalue une expression ; lève une erreur en cas d'échec. */
export function evaluateStrict(expr: string, ctx: EvalContext, env: EvalEnv = {}): unknown {
  const c = compile(rewriteGroupRefs(expr));
  if (isError(c)) throw new Error(c.message);
  const value = c.evaluate(ctx, bindings(env));
  return normalize(value);
}

/** Évalue une expression ; `undefined` en cas d'erreur. */
export function evaluate(expr: string, ctx: EvalContext, env: EvalEnv = {}): unknown {
  try {
    return evaluateStrict(expr, ctx, env);
  } catch {
    return undefined;
  }
}

/** Condition : vraie seulement si l'expression vaut `true` (erreur ou autre valeur → faux). */
export function evaluateCondition(expr: string, ctx: EvalContext, env: EvalEnv = {}): boolean {
  return evaluate(expr, ctx, env) === true;
}

/** JSONata renvoie des tableaux « séquences » marqués ; on les ramène à des tableaux simples. */
function normalize(value: unknown): unknown {
  return Array.isArray(value) ? Array.from(value as unknown[]) : value;
}
