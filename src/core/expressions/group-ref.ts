import jsonata from 'jsonata';
import { GROUP_REF, GROUP_SUFFIX } from '../model';

type Step = { type: string; value?: unknown; position?: number };

/** Modification du texte : remplace `[start, end)` par `text`. */
type Edit = { start: number; end: number; text: string };

/**
 * Pour chaque `.groupe` final d'un chemin nommé : `_group` inséré juste après le nom qui précède (avant
 * ses éventuels indices ou filtres) et `.groupe` retiré. `liens[0].groupe` → `liens_group[0]`.
 */
function collect(node: unknown, expr: string, out: Edit[]): void {
  if (Array.isArray(node)) return node.forEach((n) => collect(n, expr, out));
  if (!node || typeof node !== 'object') return;
  const n = node as { type?: string; steps?: Step[] } & Record<string, unknown>;
  if (n.type === 'path' && n.steps) {
    n.steps.forEach((s, i) => {
      const prev = n.steps![i - 1];
      const next = n.steps![i + 1];
      const final = !next || next.type !== 'name';
      if (s.type === 'name' && s.value === GROUP_REF && prev?.type === 'name' && final) {
        const name = s.position! - GROUP_REF.length;
        const dot = expr.lastIndexOf('.', name - 1);
        out.push({ start: dot, end: s.position!, text: '' }, { start: prev.position!, end: prev.position!, text: `_${GROUP_SUFFIX}` });
      }
    });
  }
  for (const v of Object.values(n)) if (v && typeof v === 'object') collect(v, expr, out);
}

const cache = new Map<string, string>();

/**
 * Réécrit `cle.groupe` en `cle_group`, `cle[0].groupe` en `cle_group[0]` (EVO-003) : le groupe de la sélection est rangé à côté de la réponse.
 * Seule une étape finale `groupe` d'un chemin nommé est réécrite (`groupe` est une clé réservée).
 * Expression invalide : inchangée (l'erreur de syntaxe est signalée par ailleurs).
 */
export function rewriteGroupRefs(expr: string): string {
  if (!expr.includes(GROUP_REF)) return expr;
  let out = cache.get(expr);
  if (out !== undefined) return out;
  out = expr;
  try {
    const edits: Edit[] = [];
    collect(jsonata(expr).ast(), expr, edits);
    const unique = [...new Map(edits.map((e) => [`${e.start}:${e.end}:${e.text}`, e])).values()];
    for (const e of unique.sort((a, b) => b.start - a.start || b.end - a.end)) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  } catch {
    out = expr;
  }
  cache.set(expr, out);
  return out;
}
