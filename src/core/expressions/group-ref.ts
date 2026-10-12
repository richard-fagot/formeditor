import jsonata from 'jsonata';
import { GROUP_REF, GROUP_SUFFIX } from '../model';

type Step = { type: string; value?: unknown; position?: number };

/** Positions (début, fin) des `.groupe` finaux d'un chemin nommé, dans l'AST. */
function collect(node: unknown, out: { start: number; end: number }[]): void {
  if (Array.isArray(node)) return node.forEach((n) => collect(n, out));
  if (!node || typeof node !== 'object') return;
  const n = node as { type?: string; steps?: Step[] } & Record<string, unknown>;
  if (n.type === 'path' && n.steps) {
    n.steps.forEach((s, i) => {
      const prev = n.steps![i - 1];
      const next = n.steps![i + 1];
      const final = !next || next.type !== 'name';
      if (s.type === 'name' && s.value === GROUP_REF && prev?.type === 'name' && final) {
        out.push({ start: prev.position!, end: s.position! });
      }
    });
  }
  for (const v of Object.values(n)) if (v && typeof v === 'object') collect(v, out);
}

const cache = new Map<string, string>();

/**
 * Réécrit `cle.groupe` en `cle_group` (EVO-003) : le groupe de la sélection est rangé à côté de la réponse.
 * Seule une étape finale `groupe` d'un chemin nommé est réécrite (`groupe` est une clé réservée).
 * Expression invalide : inchangée (l'erreur de syntaxe est signalée par ailleurs).
 */
export function rewriteGroupRefs(expr: string): string {
  if (!expr.includes(GROUP_REF)) return expr;
  let out = cache.get(expr);
  if (out !== undefined) return out;
  out = expr;
  try {
    const edits: { start: number; end: number }[] = [];
    collect(jsonata(expr).ast(), edits);
    for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + `_${GROUP_SUFFIX}` + out.slice(e.end);
  } catch {
    out = expr;
  }
  cache.set(expr, out);
  return out;
}
