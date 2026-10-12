import {
  COUNTRY_REF, DONT_KNOW_REF, fragmentCallers, hasCountry, GROUP_REF, hasDontKnow, isLibraryQuestion, OTHER_VALUE, type Graph, type Label, type Question,
  type QuestionType, type StructureField, type SystemVariable, type VariableType, type Workspace,
} from '../model';

/**
 * `group` : groupe de la sélection d'un choix (`cle.groupe`, EVO-003) ; `dontKnow` : `cle.nsp` (EVO-006) ;
 * `country` : pays d'un téléphone ou d'une adresse (`cle.pays`, EVO-007).
 */
export type RefKind = 'answer' | 'field' | 'other' | 'group' | 'dontKnow' | 'country' | 'alias' | 'system';

export interface RefInfo {
  /** Chemin pointé : `tiers.nom`, `sys.sinistres.date`. */
  path: string;
  kind: RefKind;
  type?: QuestionType | VariableType;
  label?: Label;
  description?: string;
  /** Libellé de lecture d'une variable système ou d'un champ de liste (EVO-005). */
  caption?: string;
  /** Valeurs possibles d'une variable système de type énumération. */
  values?: string[];
  /** Nœud qui porte la question (dans le graphe de l'appelant ou du fragment). */
  nodeId?: string;
  /** Pour une question de fragment : chemin des alias (`ident`, `ident.adr` pour un fragment imbriqué). */
  alias?: string;
}

/** Références visibles depuis un endroit du projet, indexées par chemin. */
export type Scope = Map<string, RefInfo>;

/** Question effective d'un nœud question (locale ou bibliothèque, libellé surchargé). */
export function questionOfNode(ws: Workspace, node: Graph['nodes'][number]): Question | undefined {
  if (node.kind !== 'question') return undefined;
  if (!isLibraryQuestion(node)) return node;
  const q = ws.library.questions.find((x) => x.id === node.ref);
  return q && node.label ? { ...q, label: node.label } : q;
}

function addQuestion(scope: Scope, q: Question | StructureField, prefix: string, extra: Partial<RefInfo>) {
  const path = prefix + q.key;
  scope.set(path, { path, kind: 'answer', type: q.type, label: q.label, ...extra });
  if ('other' in q && q.other) scope.set(`${path}_${OTHER_VALUE}`, { path: `${path}_${OTHER_VALUE}`, kind: 'other', type: 'text', ...extra });
  if (q.type === 'single' || q.type === 'multiple') {
    scope.set(`${path}.${GROUP_REF}`, { path: `${path}.${GROUP_REF}`, type: 'text', ...extra, kind: 'group' });
  }
  if (hasDontKnow(q)) {
    scope.set(`${path}.${DONT_KNOW_REF}`, { path: `${path}.${DONT_KNOW_REF}`, type: 'boolean', ...extra, kind: 'dontKnow' });
  }
  if (hasCountry(q)) {
    scope.set(`${path}.${COUNTRY_REF}`, { path: `${path}.${COUNTRY_REF}`, type: 'text', ...extra, kind: 'country' });
  }
  if (q.type === 'structure') {
    for (const f of q.fields) addQuestion(scope, f, `${path}.`, { ...extra, kind: 'field' });
  }
}

function addSystem(scope: Scope, vars: SystemVariable[], prefix = 'sys') {
  if (prefix === 'sys') scope.set('sys', { path: 'sys', kind: 'system' });
  for (const v of vars) {
    const path = `${prefix}.${v.name}`;
    scope.set(path, { path, kind: 'system', type: v.type, description: v.description, ...(v.caption ? { caption: v.caption } : {}), ...(v.values ? { values: v.values } : {}) });
    if (v.fields) addSystem(scope, v.fields, path);
  }
}

/**
 * Ajoute les questions d'un graphe ; `prefix` (chemin des alias) préfixe les clés d'un fragment vu de l'appelant.
 * Les fragments appelés sont parcourus récursivement (`seen` : garde contre un cycle d'appels).
 */
function addGraph(scope: Scope, ws: Workspace, g: Graph, prefix: string[] = [], seen = new Set<string>()) {
  const alias = prefix.join('.');
  const p = alias ? `${alias}.` : '';
  for (const n of g.nodes) {
    const q = questionOfNode(ws, n);
    if (q) addQuestion(scope, q, p, { nodeId: n.id, ...(alias ? { alias } : {}) });
    if (n.kind === 'fragment' && !seen.has(n.ref)) {
      const path = p + n.alias;
      scope.set(path, { path, kind: 'alias', nodeId: n.id, alias: path });
      const f = ws.library.fragments.find((x) => x.id === n.ref);
      if (f) addGraph(scope, ws, f, [...prefix, n.alias], new Set([...seen, n.ref]));
    }
  }
}

export function questionnaireScope(ws: Workspace, questionnaireId: string): Scope {
  const scope: Scope = new Map();
  const q = ws.questionnaires.find((x) => x.id === questionnaireId);
  if (q) addGraph(scope, ws, q);
  addSystem(scope, ws.project.systemState);
  return scope;
}

/** Graphe appelant d'un fragment. */
export type Caller = { kind: 'questionnaire' | 'fragment'; id: string };

/**
 * Portée à l'intérieur d'un fragment : ses questions et celles des fragments qu'il appelle (prioritaires),
 * celles de ses appelants (par défaut tous : union pour l'autocomplétion ; un fragment appelant apporte
 * à son tour ses propres appelants), l'état du système.
 */
export function fragmentScope(ws: Workspace, fragmentId: string, callers?: Caller[], seen = new Set<string>()): Scope {
  const scope: Scope = new Map();
  const inner = new Set([...seen, fragmentId]);
  for (const c of callers ?? fragmentCallers(ws, fragmentId)) {
    if (c.kind === 'fragment' && inner.has(c.id)) continue;
    const s = c.kind === 'questionnaire' ? questionnaireScope(ws, c.id) : fragmentScope(ws, c.id, undefined, inner);
    s.forEach((v, k) => scope.set(k, v));
  }
  addSystem(scope, ws.project.systemState);
  const f = ws.library.fragments.find((x) => x.id === fragmentId);
  if (f) addGraph(scope, ws, f, [], new Set([fragmentId]));
  return scope;
}

/** Portée d'un champ de structure : champs frères sans préfixe, puis la portée englobante. */
export function structureScope(outer: Scope, structure: Question | undefined): Scope {
  if (structure?.type !== 'structure') return outer;
  const scope: Scope = new Map(outer);
  for (const f of structure.fields) addQuestion(scope, f, '', { kind: 'field' });
  return scope;
}

/** Une référence est connue si son chemin est dans la portée, ou prolonge une variable système liste sans schéma. */
export function resolvePath(scope: Scope, path: string[]): RefInfo | undefined {
  const exact = scope.get(path.join('.'));
  if (exact) return exact;
  for (let i = path.length - 1; i > 0; i--) {
    const p = scope.get(path.slice(0, i).join('.'));
    if (p) return p.kind === 'system' && p.type === 'list' && ![...scope.keys()].some((k) => k.startsWith(p.path + '.')) ? p : undefined;
  }
  return undefined;
}
