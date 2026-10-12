import { extractReferences, renameInTemplate, renameReference } from '../expressions';
import { fragmentCallers, isValidKey, OTHER_VALUE, type Graph, type Question, type Workspace } from '../model';
import { mapWorkspace, type ExprLocation, type Owner } from './visit';
import { questionOfNode } from './scope';

/** Ce qu'on renomme. `owner` + `nodeId` désignent une question locale ; `fieldId` un champ de cette structure. */
export type RenameTarget =
  | { kind: 'question'; owner: Owner; nodeId: string; fieldId?: string }
  /** Alias d'un nœud fragment du graphe `owner` (questionnaire ou fragment). */
  | { kind: 'alias'; owner: Owner; nodeId: string }
  | { kind: 'system'; name: string }
  /** Champ d'une variable système de type liste d'objets. */
  | { kind: 'systemField'; variable: string; field: string };

interface Rule {
  owner: Owner;
  path: string[];
  /** Chemin restreint aux champs de cette structure (clés sœurs). */
  structure?: string;
}

const sameOwner = (a: Owner, b: Owner) => a.kind === b.kind && a.id === b.id;

/**
 * Endroits où une clé définie dans le graphe `owner` est visible, avec le préfixe d'alias : le graphe lui-même,
 * puis, pour un fragment, chacun de ses appelants (récursivement : `a.b.cle` chez l'appelant de l'appelant).
 */
function graphVisibility(ws: Workspace, owner: Owner, seen = new Set<string>()): { owner: Owner; prefix: string[] }[] {
  if (owner.kind !== 'fragment') return [{ owner, prefix: [] }];
  if (seen.has(owner.id)) return [];
  const inner = new Set([...seen, owner.id]);
  const out: { owner: Owner; prefix: string[] }[] = [{ owner, prefix: [] }];
  for (const c of fragmentCallers(ws, owner.id)) {
    for (const n of graphOf(ws, c)?.nodes ?? []) {
      if (n.kind !== 'fragment' || n.ref !== owner.id) continue;
      for (const v of graphVisibility(ws, c, inner)) out.push({ owner: v.owner, prefix: [...v.prefix, n.alias] });
    }
  }
  return out;
}

/** Endroits où une question définie dans `owner` est visible, avec le préfixe à utiliser. */
function visibility(ws: Workspace, owner: Owner): { owner: Owner; prefix: string[] }[] {
  if (owner.kind !== 'libraryQuestion') return graphVisibility(ws, owner);
  const usedIn = (g: Graph) => g.nodes.some((n) => n.kind === 'question' && 'ref' in n && n.ref === owner.id);
  return [
    { owner, prefix: [] },
    ...ws.questionnaires.filter(usedIn).map((q) => ({ owner: { kind: 'questionnaire', id: q.id } as Owner, prefix: [] })),
    ...ws.library.fragments.filter(usedIn).flatMap((f) => graphVisibility(ws, { kind: 'fragment', id: f.id })),
  ];
}

function graphOf(ws: Workspace, owner: Owner): Graph | undefined {
  if (owner.kind === 'questionnaire') return ws.questionnaires.find((q) => q.id === owner.id);
  if (owner.kind === 'fragment') return ws.library.fragments.find((f) => f.id === owner.id);
  return undefined;
}

/** Question locale désignée (nœud d'un graphe, ou question de bibliothèque si `owner.kind === 'libraryQuestion'`). */
function findQuestion(ws: Workspace, owner: Owner, nodeId: string): Question | undefined {
  if (owner.kind === 'libraryQuestion') return ws.library.questions.find((q) => q.id === owner.id);
  const node = graphOf(ws, owner)?.nodes.find((n) => n.id === nodeId);
  return node && node.kind === 'question' && !('ref' in node) ? node : undefined;
}

/** Un champ de structure de même nom masque la clé racine dans les expressions de cette structure. */
function shadowed(ws: Workspace, loc: ExprLocation, name: string): boolean {
  if (!loc.structure) return false;
  const g = graphOf(ws, loc.owner);
  const qs = g ? g.nodes.map((n) => questionOfNode(ws, n)) : ws.library.questions.filter((q) => q.id === loc.owner.id);
  const s = qs.find((q) => q?.key === loc.structure);
  return s?.type === 'structure' && s.fields.some((f) => f.key === name);
}

function applyRules(ws: Workspace, rules: Rule[], newName: (path: string[]) => string): Workspace {
  return mapWorkspace(ws, (text, kind, loc) => {
    if (loc.relative) return text;
    let out = text;
    for (const r of rules) {
      if (!sameOwner(r.owner, loc.owner)) continue;
      if (r.structure !== undefined && r.structure !== loc.structure) continue;
      if (r.structure === undefined && r.path.length === 1 && shadowed(ws, loc, r.path[0]!)) continue;
      out = kind === 'expr' ? renameReference(out, r.path, newName(r.path)) : renameInTemplate(out, r.path, newName(r.path));
    }
    return out;
  });
}

/** Renomme une clé (question, champ, alias, variable système) et propage dans toutes les expressions (appelants des fragments compris). */
export function renameKey(ws: Workspace, target: RenameTarget, newKey: string): Workspace {
  const next: Workspace = JSON.parse(JSON.stringify(ws));
  if (target.kind === 'system') {
    const v = next.project.systemState.find((x) => x.name === target.name);
    if (!v || target.name === newKey) return ws;
    v.name = newKey;
    for (const s of next.project.scenarios) {
      if (target.name in s.values) {
        s.values = Object.fromEntries(Object.entries(s.values).map(([k, val]) => [k === target.name ? newKey : k, val]));
      }
    }
    const all: Owner[] = [
      ...next.questionnaires.map((q) => ({ kind: 'questionnaire', id: q.id }) as Owner),
      ...next.library.fragments.map((f) => ({ kind: 'fragment', id: f.id }) as Owner),
      ...next.library.questions.map((q) => ({ kind: 'libraryQuestion', id: q.id }) as Owner),
    ];
    return applyRules(next, all.map((owner) => ({ owner, path: ['sys', target.name] })), () => newKey);
  }
  if (target.kind === 'systemField') return renameSystemField(ws, next, target.variable, target.field, newKey);
  if (target.kind === 'alias') {
    const node = graphOf(next, target.owner)?.nodes.find((n) => n.id === target.nodeId);
    if (node?.kind !== 'fragment' || node.alias === newKey) return ws;
    const old = node.alias;
    node.alias = newKey;
    return applyRules(next, graphVisibility(next, target.owner).map((v) => ({ owner: v.owner, path: [...v.prefix, old] })), () => newKey);
  }
  const q = findQuestion(next, target.owner, target.nodeId);
  if (!q) return ws;
  const vis = visibility(next, target.owner);
  if (target.fieldId) {
    const field = q.type === 'structure' ? q.fields.find((f) => f.id === target.fieldId) : undefined;
    if (!field || field.key === newKey) return ws;
    const old = field.key;
    field.key = newKey;
    if (target.owner.kind === 'libraryQuestion') renameHidden(next, target.owner.id, old, newKey);
    const rules: Rule[] = [
      { owner: target.owner, path: [old], structure: q.key },
      { owner: target.owner, path: [`${old}_${OTHER_VALUE}`], structure: q.key },
      ...vis.map((v) => ({ owner: v.owner, path: [...v.prefix, q.key, old] })),
      ...vis.map((v) => ({ owner: v.owner, path: [...v.prefix, q.key, `${old}_${OTHER_VALUE}`] })),
    ];
    return applyRules(next, rules, (p) => (p.at(-1)!.endsWith(`_${OTHER_VALUE}`) ? `${newKey}_${OTHER_VALUE}` : newKey));
  }
  if (q.key === newKey) return ws;
  const old = q.key;
  q.key = newKey;
  const rules: Rule[] = vis.flatMap((v) => [
    { owner: v.owner, path: [...v.prefix, old] },
    { owner: v.owner, path: [...v.prefix, `${old}_${OTHER_VALUE}`] },
  ]);
  return applyRules(next, rules, (p) => (p.at(-1) === old ? newKey : `${newKey}_${OTHER_VALUE}`));
}

/**
 * Préfixe par `alias` les références aux clés `keys` dans les expressions de `owner` (questions déplacées
 * dans un fragment appelé sous cet alias). Les précisions « Autre » (`cle_other`) suivent.
 */
export function qualifyKeys(ws: Workspace, owner: Owner, keys: string[], alias: string): Workspace {
  const next: Workspace = JSON.parse(JSON.stringify(ws));
  const rules: Rule[] = keys.flatMap((k) => [{ owner, path: [k] }, { owner, path: [`${k}_${OTHER_VALUE}`] }]);
  return applyRules(next, rules, (p) => `${alias}.${p[0]}`);
}

/** Champ renommé d'une question de bibliothèque : suit dans `hiddenFields` de ses instances (EVO-009). */
function renameHidden(ws: Workspace, questionId: string, old: string, key: string): void {
  for (const g of [...ws.questionnaires, ...ws.library.fragments]) {
    for (const n of g.nodes) {
      if (n.kind === 'question' && 'ref' in n && n.ref === questionId && n.hiddenFields) n.hiddenFields = n.hiddenFields.map((k) => (k === old ? key : k));
    }
  }
}

/** Renomme la propriété `old` de chaque objet d'une liste (valeur d'exemple, valeurs de scénario). */
function renameInItems(list: unknown, old: string, key: string): unknown {
  if (!Array.isArray(list)) return list;
  return list.map((item) => (item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).map(([k, v]) => [k === old ? key : k, v]))
    : item));
}

/**
 * Champ d'une liste système : `sys.<variable>.<champ>` dans les expressions, noms relatifs des sources
 * dont `from` est cette liste, valeur d'exemple et scénarios. Nom invalide ou pris : projet inchangé.
 */
function renameSystemField(ws: Workspace, next: Workspace, variable: string, old: string, key: string): Workspace {
  const v = next.project.systemState.find((x) => x.name === variable);
  const f = v?.fields?.find((x) => x.name === old);
  if (!v || !f || old === key || !isValidKey(key) || v.fields!.some((x) => x.name === key)) return ws;
  f.name = key;
  if (v.example !== undefined) v.example = renameInItems(v.example, old, key);
  for (const s of next.project.scenarios) if (variable in s.values) s.values[variable] = renameInItems(s.values[variable], old, key);
  const fromList = (src?: string) => !!src && extractReferences(src).some((r) => r.length === 2 && r[0] === 'sys' && r[1] === variable);
  return mapWorkspace(next, (text, kind, loc) => {
    const path = loc.relative ? (fromList(loc.source) ? [old] : undefined) : ['sys', variable, old];
    if (!path) return text;
    return kind === 'expr' ? renameReference(text, path, key) : renameInTemplate(text, path, key);
  });
}
