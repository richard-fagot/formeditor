import jsonata from 'jsonata';
import { COUNTRY_REF, COUNTRY_SUFFIX } from '../model';

type Step = { type: string; value?: unknown; position?: number; stages?: unknown[] };
/** Modification du texte : remplace `[start, end)` par `text`. */
type Edit = { start: number; end: number; text: string };

/** Début (index) de la première étape d'un chemin : nom `a` ou variable `$$`. */
function startOf(s: Step): number | undefined {
  const len = String(s.value ?? '').length;
  if (s.type === 'name') return s.position! - len;
  if (s.type === 'variable') return s.position! - len - 1;
  return undefined;
}

/**
 * Pour chaque chemin nommé terminé par `.pays` : `P.pays` remplacé par `($exists(P_pays) ? P_pays : P.pays)`, où
 * `_pays` est inséré après le nom qui précède (`souscripteurs[0].telephone.pays` → `souscripteurs[0].telephone_pays`).
 * Les chemins imbriqués dans un chemin réécrit ne sont pas visités.
 */
function collect(node: unknown, expr: string, out: Edit[]): void {
  if (Array.isArray(node)) return node.forEach((n) => collect(n, expr, out));
  if (!node || typeof node !== 'object') return;
  const n = node as { type?: string; steps?: Step[] } & Record<string, unknown>;
  const steps = n.type === 'path' ? n.steps : undefined;
  const last = steps?.at(-1);
  const prev = steps?.at(-2);
  const start = steps?.[0] ? startOf(steps[0]) : undefined;
  if (last && prev && start !== undefined && last.type === 'name' && last.value === COUNTRY_REF && !last.stages && prev.type === 'name') {
    const end = last.position!;
    const original = expr.slice(start, end);
    const dot = expr.lastIndexOf('.', end - COUNTRY_REF.length - 1);
    const stored = expr.slice(start, prev.position!) + `_${COUNTRY_SUFFIX}` + expr.slice(prev.position!, dot);
    out.push({ start, end, text: `($exists(${stored}) ? ${stored} : ${original})` });
    return;
  }
  for (const v of Object.values(n)) if (v && typeof v === 'object') collect(v, expr, out);
}

const cache = new Map<string, string>();

/**
 * Réécrit `cle.pays` (EVO-007) : le pays d'un téléphone ou d'une adresse est rangé à côté de la réponse (`cle_pays`).
 * Repli sur `cle.pays` d'origine : un champ de structure nommé `pays` reste lisible (`pays` n'est pas réservé).
 * Expression invalide : inchangée.
 */
export function rewriteCountryRefs(expr: string): string {
  if (!expr.includes(COUNTRY_REF)) return expr;
  let out = cache.get(expr);
  if (out !== undefined) return out;
  out = expr;
  try {
    const edits: Edit[] = [];
    collect(jsonata(expr).ast(), expr, edits);
    for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  } catch {
    out = expr;
  }
  cache.set(expr, out);
  return out;
}
