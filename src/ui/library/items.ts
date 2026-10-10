import type { Workspace } from '../../core/model';
import { blockScope, questionnaireScope, type Scope } from '../../core/references';
import { previewText, type EditorEnv } from '../../plugin-api';
import type { LibraryItem } from '../../app/store';

/** Intitulé d'un élément de bibliothèque dans la langue affichée. */
export function itemTitle(env: EditorEnv, item: LibraryItem): string {
  if (item.kind === 'question') {
    const q = env.ws.library.questions.find((x) => x.id === item.id);
    return q ? previewText(q.label, env) || q.key : '?';
  }
  const b = env.ws.library.blocks.find((x) => x.id === item.id);
  return b ? (b.title[env.contentLang] ?? b.title[env.defaultLang] ?? b.key) : '?';
}

const refers = (nodes: Workspace['questionnaires'][number]['nodes'], item: LibraryItem) =>
  nodes.some((n) => (item.kind === 'block' ? n.kind === 'block' : n.kind === 'question') && 'ref' in n && n.ref === item.id);

/** Questionnaires et blocs qui utilisent l'élément (clés). */
export function itemUsages(ws: Workspace, item: LibraryItem): string[] {
  return [
    ...ws.questionnaires.filter((q) => refers(q.nodes, item)).map((q) => q.key),
    ...ws.library.blocks.filter((b) => refers(b.nodes, item)).map((b) => b.key),
  ];
}

/** Portée d'une question de bibliothèque : réunion des portées des graphes qui l'utilisent (état du système au minimum). */
export function libraryQuestionScope(ws: Workspace, id: string): Scope {
  const item: LibraryItem = { kind: 'question', id };
  const scopes = [
    ...ws.questionnaires.filter((q) => refers(q.nodes, item)).map((q) => questionnaireScope(ws, q.id)),
    ...ws.library.blocks.filter((b) => refers(b.nodes, item)).map((b) => blockScope(ws, b.id)),
  ];
  const out: Scope = questionnaireScope(ws, '');
  for (const s of scopes) for (const [k, v] of s) if (!out.has(k)) out.set(k, v);
  return out;
}
