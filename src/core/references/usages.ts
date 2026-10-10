import { extractReferences, templateReferences } from '../expressions';
import type { Workspace } from '../model';
import { collectExpressions, type FoundExpression } from './visit';

/** Expressions dont une référence racine commence par `path` (index des usages). */
export function findUsages(ws: Workspace, path: string[]): FoundExpression[] {
  return collectExpressions(ws).filter((f) => {
    if (f.loc.relative) return false;
    const refs = f.kind === 'expr' ? extractReferences(f.text) : templateReferences(f.text);
    return refs.some((r) => path.every((p, i) => r[i] === p));
  });
}
