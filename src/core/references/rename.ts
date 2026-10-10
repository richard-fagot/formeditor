import { renameInTemplate, renameReference } from '../expressions';
import { OTHER_VALUE, type Graph, type Question, type Workspace } from '../model';
import { mapWorkspace, type ExprLocation, type Owner } from './visit';
import { questionOfNode } from './scope';

/** Ce qu'on renomme. `owner` + `nodeId` désignent une question locale ; `fieldId` un champ de cette structure. */
export type RenameTarget =
  | { kind: 'question'; owner: Owner; nodeId: string; fieldId?: string }
  | { kind: 'alias'; questionnaireId: string; nodeId: string }
  | { kind: 'system'; name: string };

interface Rule {
  owner: Owner;
  path: string[];
  /** Chemin restreint aux champs de cette structure (clés sœurs). */
  structure?: string;
}

const sameOwner = (a: Owner, b: Owner) => a.kind === b.kind && a.id === b.id;

/** Endroits où une question définie dans `owner` est visible, avec le préfixe à utiliser. */
function visibility(ws: Workspace, owner: Owner): { owner: Owner; prefix: string[] }[] {
  const ofBlock = (blockId: string) => [
    { owner: { kind: 'block', id: blockId } as Owner, prefix: [] as string[] },
    ...ws.questionnaires.flatMap((q) =>
      q.nodes.flatMap((n) => (n.kind === 'block' && n.ref === blockId ? [{ owner: { kind: 'questionnaire', id: q.id } as Owner, prefix: [n.alias] }] : [])),
    ),
  ];
  if (owner.kind === 'questionnaire') return [{ owner, prefix: [] }];
  if (owner.kind === 'block') return ofBlock(owner.id);
  const usedIn = (g: Graph) => g.nodes.some((n) => n.kind === 'question' && 'ref' in n && n.ref === owner.id);
  return [
    { owner, prefix: [] },
    ...ws.questionnaires.filter(usedIn).map((q) => ({ owner: { kind: 'questionnaire', id: q.id } as Owner, prefix: [] })),
    ...ws.library.blocks.filter(usedIn).flatMap((b) => ofBlock(b.id)),
  ];
}

function graphOf(ws: Workspace, owner: Owner): Graph | undefined {
  if (owner.kind === 'questionnaire') return ws.questionnaires.find((q) => q.id === owner.id);
  if (owner.kind === 'block') return ws.library.blocks.find((b) => b.id === owner.id);
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

/** Renomme une clé (question, champ, alias, variable système) et propage dans toutes les expressions. */
export function renameKey(ws: Workspace, target: RenameTarget, newKey: string): Workspace {
  const next = structuredClone(ws);
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
      ...next.library.blocks.map((b) => ({ kind: 'block', id: b.id }) as Owner),
      ...next.library.questions.map((q) => ({ kind: 'libraryQuestion', id: q.id }) as Owner),
    ];
    return applyRules(next, all.map((owner) => ({ owner, path: ['sys', target.name] })), () => newKey);
  }
  if (target.kind === 'alias') {
    const node = next.questionnaires.find((q) => q.id === target.questionnaireId)?.nodes.find((n) => n.id === target.nodeId);
    if (node?.kind !== 'block' || node.alias === newKey) return ws;
    const old = node.alias;
    node.alias = newKey;
    return applyRules(next, [{ owner: { kind: 'questionnaire', id: target.questionnaireId }, path: [old] }], () => newKey);
  }
  const q = findQuestion(next, target.owner, target.nodeId);
  if (!q) return ws;
  const vis = visibility(next, target.owner);
  if (target.fieldId) {
    const field = q.type === 'structure' ? q.fields.find((f) => f.id === target.fieldId) : undefined;
    if (!field || field.key === newKey) return ws;
    const old = field.key;
    field.key = newKey;
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
