import { calledFragments, fragmentCallers, isValidKey, type Graph, type LocalizedText, type Question, type Workspace } from '../model';
import { collectExpressions, questionOfNode, type Owner } from '../references';
import { checkGraph } from './graph';
import { checkReferences } from './refs-check';
import { checkGroups } from './groups-check';
import { checkRedirects } from './redirect-check';
import { issue, type Issue } from './issue';

function checkKeys(ws: Workspace, g: Graph, owner: Owner, out: Issue[]) {
  const seen = new Set<string>();
  const add = (key: string, nodeId: string) => {
    if (!isValidKey(key)) out.push(issue('invalidKey', owner, { nodeId }, { key }));
    if (seen.has(key)) out.push(issue('duplicateKey', owner, { nodeId }, { key }));
    seen.add(key);
  };
  for (const n of g.nodes) {
    if (n.kind === 'question' && 'ref' in n && !ws.library.questions.some((q) => q.id === n.ref)) {
      out.push(issue('libraryMissing', owner, { nodeId: n.id }, { ref: n.ref }));
    }
    if (n.kind === 'fragment') {
      if (!ws.library.fragments.some((f) => f.id === n.ref)) out.push(issue('libraryMissing', owner, { nodeId: n.id }, { ref: n.ref }));
      add(n.alias, n.id);
    }
    const q = questionOfNode(ws, n);
    if (q) {
      add(q.key, n.id);
      checkQuestion(ws, q, owner, n.id, out);
    }
  }
}

function checkQuestion(ws: Workspace, q: Question, owner: Owner, nodeId: string, out: Issue[]) {
  checkGroups(ws, q, owner, nodeId, out);
  if (q.type === 'boolean' && q.labelSet && !ws.library.labelSets.some((l) => l.id === q.labelSet)) {
    out.push(issue('libraryMissing', owner, { nodeId }, { ref: q.labelSet }));
  }
  if (q.type === 'structure') {
    const keys = q.fields.map((f) => f.key);
    keys.forEach((k, i) => keys.indexOf(k) !== i && out.push(issue('duplicateKey', owner, { nodeId }, { key: `${q.key}.${k}` })));
  }
}

/** Dictionnaire de l'état du système : noms de variables et de champs de liste (clés valides, uniques). */
function checkSystem(ws: Workspace, out: Issue[]) {
  const seen = new Set<string>();
  for (const v of ws.project.systemState) {
    const owner: Owner = { kind: 'system', id: v.name };
    if (!isValidKey(v.name)) out.push(issue('invalidKey', owner, {}, { key: v.name }));
    if (seen.has(v.name)) out.push(issue('duplicateKey', owner, {}, { key: v.name }));
    seen.add(v.name);
    const names = (v.fields ?? []).map((f) => f.name);
    names.forEach((n, i) => {
      if (!isValidKey(n)) out.push(issue('invalidKey', owner, {}, { key: `${v.name}.${n}` }));
      if (names.indexOf(n) !== i) out.push(issue('duplicateKey', owner, {}, { key: `${v.name}.${n}` }));
    });
  }
}

function checkTranslations(ws: Workspace, out: Issue[]) {
  const langs = ws.project.languages;
  const seen = new Set<string>();
  for (const f of collectExpressions(ws)) {
    if (f.kind !== 'template' || !f.loc.langs) continue;
    const missing = langs.filter((l) => !f.loc.langs!.includes(l));
    const id = [f.loc.owner.kind, f.loc.owner.id, f.loc.nodeId, f.loc.edgeId, f.loc.property].join('|');
    if (!missing.length || seen.has(id)) continue;
    seen.add(id);
    out.push(issue('missingTranslation', f.loc.owner, { nodeId: f.loc.nodeId, property: f.loc.property }, { lang: missing.join(', '), property: f.loc.property }));
  }
  const text = (t: LocalizedText | undefined, owner: Owner, property: string) => {
    const missing = t ? langs.filter((l) => !t[l]?.trim()) : [];
    if (missing.length) out.push(issue('missingTranslation', owner, { property }, { lang: missing.join(', '), property }));
  };
  ws.questionnaires.forEach((q) => text(q.title, { kind: 'questionnaire', id: q.id }, 'title'));
  ws.library.fragments.forEach((f) => text(f.title, { kind: 'fragment', id: f.id }, 'title'));
  for (const l of ws.library.labelSets) {
    const owner: Owner = { kind: 'libraryQuestion', id: l.id };
    text(l.yes, owner, `${l.key}.yes`);
    text(l.no, owner, `${l.key}.no`);
  }
}

/** Toutes les vérifications non bloquantes du §4.6 sur le projet. */
export function checkWorkspace(ws: Workspace): Issue[] {
  const out: Issue[] = [];
  for (const q of ws.questionnaires) {
    const owner: Owner = { kind: 'questionnaire', id: q.id };
    checkKeys(ws, q, owner, out);
    out.push(...checkGraph(ws, q, owner));
    checkRedirects(ws, q, owner, out);
  }
  for (const f of ws.library.fragments) {
    const owner: Owner = { kind: 'fragment', id: f.id };
    checkKeys(ws, f, owner, out);
    out.push(...checkGraph(ws, f, owner));
    if (calledFragments(ws, f.id).has(f.id)) out.push(issue('fragmentCycle', owner));
    if (!fragmentCallers(ws, f.id).length) out.push(issue('unusedFragment', owner));
  }
  for (const q of ws.library.questions) checkQuestion(ws, q, { kind: 'libraryQuestion', id: q.id }, q.id, out);
  checkSystem(ws, out);
  out.push(...checkReferences(ws));
  checkTranslations(ws, out);
  return out;
}
