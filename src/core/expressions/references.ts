import { compile } from './evaluate';

/** Chemin d'une référence : `['tiers', 'nom']` pour `tiers.nom`. */
export type RefPath = string[];

interface NameStep {
  type: 'name';
  value: string;
  position: number;
}
type AstNode = { type: string; steps?: AstNode[] } & Record<string, unknown>;

/** Parcourt l'AST et appelle `visit` pour chaque chemin racine (suite de noms en tête de chemin). */
function walk(node: unknown, visit: (steps: NameStep[]) => void, skipExists = false): void {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit, skipExists));
  if (!node || typeof node !== 'object') return;
  const n = node as AstNode;
  if (skipExists && n.type === 'function' && (n.procedure as { value?: string } | undefined)?.value === 'exists') return;
  if (n.type === 'path' && n.steps) {
    const lead: NameStep[] = [];
    for (const s of n.steps) {
      if (s.type !== 'name') break;
      lead.push(s as unknown as NameStep);
    }
    if (lead.length) visit(lead);
    // Les étapes suivantes et les filtres sont relatifs : seule une première étape non nommée est racine.
    else if (n.steps[0]) walk(n.steps[0], visit, skipExists);
    return;
  }
  for (const [k, v] of Object.entries(n)) if (k !== 'position' && k !== 'value') walk(v, visit, skipExists);
}

function ast(expr: string): unknown {
  const c = compile(expr);
  return 'ast' in c ? c.ast() : undefined;
}

/**
 * Références racines d'une expression (vide si syntaxe invalide).
 * `skipExists` ignore les références testées par `$exists(…)` (présence non garantie assumée).
 */
export function extractReferences(expr: string, options: { skipExists?: boolean } = {}): RefPath[] {
  const refs: RefPath[] = [];
  walk(ast(expr), (steps) => refs.push(steps.map((s) => s.value)), options.skipExists);
  return refs;
}

/**
 * Renomme le dernier segment de `path` dans toute référence racine qui commence par `path`.
 * `renameReference('tiers.nom = 1', ['tiers', 'nom'], 'x')` → `'tiers.x = 1'`.
 */
export function renameReference(expr: string, path: RefPath, newName: string): string {
  const edits: { start: number; end: number }[] = [];
  walk(ast(expr), (steps) => {
    if (steps.length < path.length || !path.every((p, i) => steps[i]!.value === p)) return;
    const s = steps[path.length - 1]!;
    edits.push({ start: s.position - s.value.length, end: s.position });
  });
  let out = expr;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + newName + out.slice(e.end);
  return out;
}
