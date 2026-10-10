import {
  isLibraryQuestion, OTHER_VALUE, type Graph, type Label, type Question, type QuestionType,
  type StructureField, type SystemVariable, type VariableType, type Workspace,
} from '../model';

export type RefKind = 'answer' | 'field' | 'other' | 'alias' | 'system';

export interface RefInfo {
  /** Chemin pointé : `tiers.nom`, `sys.sinistres.date`. */
  path: string;
  kind: RefKind;
  type?: QuestionType | VariableType;
  label?: Label;
  description?: string;
  /** Nœud qui porte la question (dans le graphe de l'hôte ou du bloc). */
  nodeId?: string;
  /** Pour une question de bloc : alias de l'instance. */
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
  if (q.type === 'structure') {
    for (const f of q.fields) addQuestion(scope, f, `${path}.`, { ...extra, kind: 'field' });
  }
}

function addSystem(scope: Scope, vars: SystemVariable[], prefix = 'sys') {
  if (prefix === 'sys') scope.set('sys', { path: 'sys', kind: 'system' });
  for (const v of vars) {
    const path = `${prefix}.${v.name}`;
    scope.set(path, { path, kind: 'system', type: v.type, description: v.description });
    if (v.fields) addSystem(scope, v.fields, path);
  }
}

/** Ajoute les questions d'un graphe ; `alias` préfixe les clés (instance de bloc vue de l'hôte). */
function addGraph(scope: Scope, ws: Workspace, g: Graph, alias?: string) {
  const prefix = alias ? `${alias}.` : '';
  for (const n of g.nodes) {
    const q = questionOfNode(ws, n);
    if (q) addQuestion(scope, q, prefix, { nodeId: n.id, ...(alias ? { alias } : {}) });
    if (n.kind === 'block' && !alias) {
      scope.set(n.alias, { path: n.alias, kind: 'alias', nodeId: n.id, alias: n.alias });
      const block = ws.library.blocks.find((b) => b.id === n.ref);
      if (block) addGraph(scope, ws, block, n.alias);
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

/** Hôtes d'un bloc : questionnaires qui l'instancient. */
export function blockHosts(ws: Workspace, blockId: string): string[] {
  return ws.questionnaires.filter((q) => q.nodes.some((n) => n.kind === 'block' && n.ref === blockId)).map((q) => q.id);
}

/**
 * Portée à l'intérieur d'un bloc : ses questions (prioritaires), celles de l'hôte, l'état du système.
 * Sans hôte précisé : union de tous les hôtes (autocomplétion).
 */
export function blockScope(ws: Workspace, blockId: string, hostId?: string): Scope {
  const scope: Scope = new Map();
  for (const h of hostId ? [hostId] : blockHosts(ws, blockId)) questionnaireScope(ws, h).forEach((v, k) => scope.set(k, v));
  addSystem(scope, ws.project.systemState);
  const block = ws.library.blocks.find((b) => b.id === blockId);
  if (block) addGraph(scope, ws, block);
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
