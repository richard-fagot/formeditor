import jsonata from 'jsonata';
import { DONT_KNOW_REF, DONT_KNOW_SUFFIX } from '../model';

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
 * Pour chaque chemin nommé terminé par `.nsp` : `_nsp` inséré après le nom qui précède, `.nsp` retiré, et le
 * chemin entouré de `( … = true)`. `victimes[0].age.nsp` → `(victimes[0].age_nsp = true)`.
 */
function collect(node: unknown, expr: string, out: Edit[]): void {
  if (Array.isArray(node)) return node.forEach((n) => collect(n, expr, out));
  if (!node || typeof node !== 'object') return;
  const n = node as { type?: string; steps?: Step[] } & Record<string, unknown>;
  const steps = n.type === 'path' ? n.steps : undefined;
  const last = steps?.at(-1);
  const prev = steps?.at(-2);
  const start = steps?.[0] ? startOf(steps[0]) : undefined;
  if (last && prev && start !== undefined && last.type === 'name' && last.value === DONT_KNOW_REF && !last.stages && prev.type === 'name') {
    const name = last.position! - DONT_KNOW_REF.length;
    const dot = expr.lastIndexOf('.', name - 1);
    out.push(
      { start: last.position!, end: last.position!, text: ' = true)' },
      { start: dot, end: last.position!, text: '' },
      { start: prev.position!, end: prev.position!, text: `_${DONT_KNOW_SUFFIX}` },
      { start, end: start, text: '(' },
    );
  }
  for (const v of Object.values(n)) if (v && typeof v === 'object') collect(v, expr, out);
}

const cache = new Map<string, string>();

/**
 * Réécrit `cle.nsp` en `(cle_nsp = true)` (EVO-006) : le marqueur « Ne sais pas » est rangé à côté de la réponse ;
 * une comparaison avec une valeur absente vaut `false`, la référence n'est donc jamais vide. Seule une étape finale
 * `nsp` d'un chemin nommé est réécrite (`nsp` est une clé réservée). Expression invalide : inchangée.
 */
export function rewriteDontKnowRefs(expr: string): string {
  if (!expr.includes(DONT_KNOW_REF)) return expr;
  let out = cache.get(expr);
  if (out !== undefined) return out;
  out = expr;
  try {
    const edits: Edit[] = [];
    collect(jsonata(expr).ast(), expr, edits);
    // Ordre décroissant ; à position égale, l'insertion de fin (` = true)`) passe avant la suppression qui s'y arrête.
    for (const e of edits.sort((a, b) => b.start - a.start || b.end - a.end)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  } catch {
    out = expr;
  }
  cache.set(expr, out);
  return out;
}
