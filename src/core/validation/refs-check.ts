import { checkSyntax, extractReferences, filterReferences, templateExpressions, templateReferences, type RefPath } from '../expressions';
import { OTHER_VALUE, type Graph, type Question, type Workspace } from '../model';
import {
  blockHosts, blockScope, collectExpressions, questionnaireScope, questionOfNode, resolvePath, structureScope,
  type FoundExpression, type Owner, type RefInfo, type Scope,
} from '../references';
import { generated, guaranteedBefore, type Guarantees } from './guarantee';
import { issue, type Issue } from './issue';

const refsOf = (f: FoundExpression, skipExists = false): RefPath[] =>
  f.kind === 'expr' ? extractReferences(f.text, { skipExists }) : templateReferences(f.text, { skipExists });

/** Question-racine désignée par une référence : `cle` ou `alias.cle` (sans le suffixe « Autre »). */
function rootOf(path: RefPath, info: RefInfo): string {
  const parts = info.alias ? [info.alias, path[1]!] : [path[0]!];
  const last = parts.length - 1;
  if (info.kind === 'other') parts[last] = parts[last]!.replace(new RegExp(`_${OTHER_VALUE}$`), '');
  return parts.join('.');
}

export function checkReferences(ws: Workspace): Issue[] {
  const out: Issue[] = [];
  const scopes = new Map<string, Scope>();
  const cached = (k: string, make: () => Scope) => scopes.get(k) ?? (scopes.set(k, make()), scopes.get(k)!);
  const graphs = new Map<string, Graph>([
    ...ws.questionnaires.map((q) => [`questionnaire:${q.id}`, q] as const),
    ...ws.library.blocks.map((b) => [`block:${b.id}`, b] as const),
  ]);
  const guarantees = new Map<string, Guarantees>();
  const guaranteed = (key: string) => guarantees.get(key) ?? (guarantees.set(key, guaranteedBefore(ws, graphs.get(key)!)), guarantees.get(key)!);

  const structureOf = (owner: Owner, key: string): Question | undefined => {
    if (owner.kind === 'libraryQuestion') return ws.library.questions.find((q) => q.id === owner.id);
    return graphs.get(`${owner.kind}:${owner.id}`)?.nodes.map((n) => questionOfNode(ws, n)).find((q) => q?.key === key);
  };
  /** Portées dans lesquelles l'expression doit se résoudre (une par hôte pour un bloc ou une question de bibliothèque). */
  const scopesFor = (f: FoundExpression): Scope[] => {
    const o = f.loc.owner;
    let base: Scope[];
    if (o.kind === 'questionnaire') base = [cached(`q:${o.id}`, () => questionnaireScope(ws, o.id))];
    else if (o.kind === 'block') {
      const hosts = blockHosts(ws, o.id);
      base = (hosts.length ? hosts : [undefined]).map((h) => cached(`b:${o.id}:${h}`, () => blockScope(ws, o.id, h)));
    } else {
      const users = ws.questionnaires.filter((q) => q.nodes.some((n) => n.kind === 'question' && 'ref' in n && n.ref === o.id));
      base = users.map((q) => cached(`q:${q.id}`, () => questionnaireScope(ws, q.id)));
      if (!base.length) base = [new Map()];
    }
    const s = f.loc.structure ? structureOf(o, f.loc.structure) : undefined;
    return s ? base.map((sc) => structureScope(sc, s)) : base;
  };

  for (const f of collectExpressions(ws)) {
    const where = { nodeId: f.loc.nodeId, edgeId: f.loc.edgeId, property: f.loc.property };
    const exprs = f.kind === 'expr' ? [f.text] : templateExpressions(f.text);
    const bad = exprs.map((e) => [e, checkSyntax(e)] as const).find(([, err]) => err);
    if (bad) {
      out.push(issue('invalidExpression', f.loc.owner, where, { expr: bad[0], error: bad[1]!.message }));
      continue;
    }
    if (f.loc.relative) {
      out.push(...checkRelative(ws, f, where));
      continue;
    }
    const scopes = scopesFor(f);
    const unknown = refsOf(f).filter((r) => scopes.some((s) => !resolvePath(s, r)));
    // Nom d'un filtre qui est une clé de question : suggérer `$$.cle` (racine du contexte).
    const fromFilter = new Map(exprs.flatMap(filterReferences).map((x) => [x.path.join('.'), x.name]));
    for (const r of new Set(unknown.map((x) => x.join('.')))) {
      const key = fromFilter.get(r);
      const known = key !== undefined && scopes.every((s) => resolvePath(s, [key]));
      out.push(known ? issue('unknownFilterReference', f.loc.owner, where, { ref: r, key: key! }) : issue('unknownReference', f.loc.owner, where, { ref: r }));
    }
    if (unknown.length) continue;
    out.push(...checkGuaranteed(ws, f, scopes[0]!, guaranteed, graphs));
  }
  return out;
}

function checkGuaranteed(
  ws: Workspace, f: FoundExpression, scope: Scope, guaranteed: (k: string) => Guarantees, graphs: Map<string, Graph>,
): Issue[] {
  const guardRefs = new Set(f.loc.guard ? extractReferences(f.loc.guard).map((r) => r.join('.')) : []);
  const roots = refsOf(f, true)
    .filter((r) => !guardRefs.has(r.join('.')))
    .flatMap((ref) => {
      // `cle.groupe`, `cle.nsp` : même règle que la question `cle`.
      const kind = resolvePath(scope, ref)?.kind;
      const r = kind === 'group' || kind === 'dontKnow' ? ref.slice(0, -1) : ref;
      const info = resolvePath(scope, r);
      if (!info || info.kind === 'system' || info.kind === 'alias') return [];
      if (f.loc.structure && info.kind === 'field' && !r[0]!.includes('.') && info.path === r[0]) return []; // champ frère
      return [rootOf(r, info)];
    });
  if (!roots.length) return [];
  const o = f.loc.owner;
  // Points de contrôle : (graphe, nœud ou arête) où l'expression est évaluée.
  const checkpoints: { gkey: string; owner: Owner; nodeId?: string; edgeId?: string }[] = [];
  if (o.kind === 'libraryQuestion') {
    for (const q of ws.questionnaires) {
      for (const n of q.nodes) if (n.kind === 'question' && 'ref' in n && n.ref === o.id) {
        checkpoints.push({ gkey: `questionnaire:${q.id}`, owner: { kind: 'questionnaire', id: q.id }, nodeId: n.id });
      }
    }
  } else checkpoints.push({ gkey: `${o.kind}:${o.id}`, owner: o, nodeId: f.loc.nodeId, edgeId: f.loc.edgeId });
  const out: Issue[] = [];
  for (const cp of checkpoints) {
    const g = graphs.get(cp.gkey)!;
    const edge = cp.edgeId ? g.edges.find((e) => e.id === cp.edgeId) : undefined;
    const at = edge?.from ?? cp.nodeId;
    if (!at) continue;
    const before = guaranteed(cp.gkey).get(at);
    if (!before) continue; // nœud inaccessible : déjà signalé
    const known = new Set([...before, ...generated(ws, g, at, edge)]);
    const ownKeys = o.kind === 'block' ? new Set(g.nodes.map((n) => questionOfNode(ws, n)?.key)) : undefined;
    for (const root of new Set(roots)) {
      if (ownKeys && !ownKeys.has(root)) continue; // clé de l'hôte vue depuis un bloc : non vérifiée
      if (!known.has(root)) out.push(issue('notGuaranteed', cp.owner, { nodeId: cp.nodeId, edgeId: cp.edgeId, property: f.loc.property }, { ref: root }));
    }
  }
  return out;
}

/** Noms relatifs d'une source dont `from` est une liste système à schéma déclaré : chaque nom doit être un champ. */
function checkRelative(ws: Workspace, f: FoundExpression, where: Partial<Issue>): Issue[] {
  const list = f.loc.source ? extractReferences(f.loc.source).find((r) => r.length === 2 && r[0] === 'sys') : undefined;
  const v = list && ws.project.systemState.find((x) => x.name === list[1]);
  if (v?.type !== 'list' || !v.fields?.length) return [];
  const names = new Set(v.fields.map((x) => x.name));
  const unknown = new Set(refsOf(f).map((r) => r[0]!).filter((n) => !names.has(n)));
  return [...unknown].map((n) => issue('unknownReference', f.loc.owner, where, { ref: `sys.${v.name}.${n}` }));
}
