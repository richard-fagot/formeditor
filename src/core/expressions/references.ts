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
/** `filterStart` : indice du premier nom pris dans un filtre (chemin prolongé par un filtre). */
/** `absolute` : chemin `$$.…`, jamais prolongé par le chemin filtré qui l'entoure. */
type Visit = (steps: NameStep[], filterStart?: number, absolute?: boolean) => void;

function walk(node: unknown, visit: Visit, skipExists = false): void {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit, skipExists));
  if (!node || typeof node !== 'object') return;
  const n = node as AstNode;
  if (skipExists && n.type === 'function' && (n.procedure as { value?: string } | undefined)?.value === 'exists') return;
  if (n.type === 'path' && n.steps) {
    const lead: NameStep[] = [];
    // `$$.cle` : racine du contexte (utile dans un filtre, où un nom nu désigne un champ de l'élément).
    const fromRoot = n.steps[0]?.type === 'variable' && n.steps[0].value === '$' && n.steps.length > 1;
    for (const s of fromRoot ? n.steps.slice(1) : n.steps) {
      if (s.type !== 'name') break;
      lead.push(s as unknown as NameStep);
    }
    if (lead.length) visit(lead, undefined, fromRoot);
    // Les étapes suivantes sont relatives : seule une première étape non nommée est racine.
    else if (n.steps[0]) walk(n.steps[0], visit, skipExists);
    // Un nom dans un filtre d'une étape de tête prolonge le chemin filtré : `sys.x[champ > 1]` → `sys.x.champ`.
    lead.forEach((step, i) => {
      for (const stage of ((step as unknown as AstNode).stages as AstNode[] | undefined) ?? []) {
        if (stage.type === 'filter') walk(stage.expr, (inner, f, abs) => (abs ? visit(inner, f, abs) : visit([...lead.slice(0, i + 1), ...inner], i + 1)), skipExists);
      }
    });
    return;
  }
  // Filtres hors d'un chemin de tête (`(sys.x)[champ]`) : noms relatifs, ignorés.
  for (const [k, v] of Object.entries(n)) if (!['position', 'value', 'stages', 'predicate'].includes(k)) walk(v, visit, skipExists);
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

/** Références issues d'un filtre (`sys.x[cle > 1]` → `{ path: ['sys','x','cle'], name: 'cle' }`). */
export function filterReferences(expr: string): { path: RefPath; name: string }[] {
  const out: { path: RefPath; name: string }[] = [];
  walk(ast(expr), (steps, f) => f !== undefined && out.push({ path: steps.map((s) => s.value), name: steps[f]!.value }));
  return out;
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
  // Une même étape de tête est vue une fois par chemin qui la prolonge (filtres) : une seule modification.
  const unique = [...new Map(edits.map((e) => [e.start, e])).values()];
  for (const e of unique.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + newName + out.slice(e.end);
  return out;
}
