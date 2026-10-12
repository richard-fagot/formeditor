import { checkSyntax, extractReferences, templateExpressions, templateReferences } from '../expressions';
import type { Question, Workspace } from '../model';
import { collectExpressions, fragmentScope, questionOfNode, resolvePath, structureScope } from '../references';

/**
 * Clés attendues de l'appelant par un fragment (EVO-008) : références de ses expressions qui ne désignent ni
 * ses propres questions (ni celles des fragments qu'il appelle), ni l'état du système. Triées, sans doublon.
 */
export function expectedKeys(ws: Workspace, fragmentId: string): string[] {
  const f = ws.library.fragments.find((x) => x.id === fragmentId);
  if (!f) return [];
  const own = fragmentScope(ws, fragmentId, []);
  const structure = (key: string): Question | undefined => f.nodes.map((n) => questionOfNode(ws, n)).find((q) => q?.key === key);
  const out = new Set<string>();
  for (const x of collectExpressions(ws)) {
    if (x.loc.owner.kind !== 'fragment' || x.loc.owner.id !== fragmentId || x.loc.relative) continue;
    const exprs = x.kind === 'expr' ? [x.text] : templateExpressions(x.text);
    if (exprs.some((e) => checkSyntax(e))) continue;
    const scope = x.loc.structure ? structureScope(own, structure(x.loc.structure)) : own;
    const refs = x.kind === 'expr' ? extractReferences(x.text) : templateReferences(x.text);
    for (const r of refs) if (!resolvePath(scope, r)) out.add(r.join('.'));
  }
  return [...out].sort();
}
