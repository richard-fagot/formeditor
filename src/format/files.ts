import type { Layout, Library, Project, Questionnaire, Workspace } from '../core/model';
import { migrate } from './migrate';
import { serialize } from './serialize';
import { documentKind, validateDocument } from './validate';
import { emptyLibrary, newWorkspace, toBundle } from './workspace';

export interface FileContent {
  name: string;
  text: string;
}

export const PROJECT_FILE = 'projet.json';
export const LIBRARY_FILE = 'bibliotheque.json';

const layoutFileFor = (file: string) => file.replace(/\.json$/, '') + '.layout.json';

export function exportBundle(ws: Workspace): string {
  return serialize(toBundle(ws));
}

/** Fichiers unitaires : projet, bibliothèque, puis chaque questionnaire suivi de sa mise en page. */
export function exportFiles(ws: Workspace): FileContent[] {
  const files: FileContent[] = [
    { name: PROJECT_FILE, text: serialize(ws.project) },
    { name: LIBRARY_FILE, text: serialize(ws.library) },
  ];
  const fileOf = new Map(ws.project.questionnaires.map((e) => [e.id, e.file]));
  for (const q of ws.questionnaires) {
    const file = fileOf.get(q.id) ?? `${q.key}.json`;
    files.push({ name: file, text: serialize(q) });
    const layout = ws.layouts.find((l) => l.graph === q.id);
    if (layout) files.push({ name: layoutFileFor(file), text: serialize(layout) });
  }
  for (const b of ws.library.blocks) {
    const layout = ws.layouts.find((l) => l.graph === b.id);
    if (layout) files.push({ name: `bloc_${b.key}.layout.json`, text: serialize(layout) });
  }
  return files;
}

export interface ImportResult {
  workspace?: Workspace;
  errors: string[];
}

const upsert = <T extends { id: string }>(list: T[], item: T) => {
  const i = list.findIndex((x) => x.id === item.id);
  if (i >= 0) list[i] = item;
  else list.push(item);
};

/**
 * Importe un bundle ou des fichiers unitaires. Sans projet dans les fichiers, ils sont fusionnés
 * dans `current` (ou un nouveau projet). Un seul fichier invalide et rien n'est chargé.
 */
export function importFiles(files: FileContent[], current?: Workspace): ImportResult {
  const errors: string[] = [];
  const docs: { name: string; doc: Record<string, unknown> }[] = [];
  for (const f of files) {
    try {
      const doc = migrate(JSON.parse(f.text));
      const errs = validateDocument(doc);
      if (errs.length) errors.push(...errs.map((e) => `${f.name} ${e}`));
      else docs.push({ name: f.name, doc });
    } catch (e) {
      errors.push(`${f.name} : ${(e as Error).message}`);
    }
  }
  if (errors.length) return { errors };

  const bundle = docs.find((d) => documentKind(d.doc) === 'bundle');
  if (bundle) {
    const { formatVersion: _v, kind: _k, ...ws } = bundle.doc;
    return { workspace: ws as unknown as Workspace, errors };
  }
  const projectDoc = docs.find((d) => documentKind(d.doc) === 'project');
  const ws: Workspace = projectDoc
    ? { project: projectDoc.doc as unknown as Project, library: emptyLibrary(), questionnaires: [], layouts: [] }
    : structuredClone(current ?? newWorkspace('Nouveau projet'));
  for (const { name, doc } of docs) {
    const kind = documentKind(doc);
    if (kind === 'library') ws.library = doc as unknown as Library;
    if (kind === 'layout') {
      const layout = doc as unknown as Layout;
      const i = ws.layouts.findIndex((l) => l.graph === layout.graph);
      if (i >= 0) ws.layouts[i] = layout;
      else ws.layouts.push(layout);
    }
    if (kind === 'questionnaire') {
      const q = doc as unknown as Questionnaire;
      upsert(ws.questionnaires, q);
      if (!ws.project.questionnaires.some((e) => e.id === q.id)) ws.project.questionnaires.push({ id: q.id, file: name });
    }
  }
  // Ordre des questionnaires : celui déclaré par le projet.
  const order = ws.project.questionnaires.map((e) => e.id);
  ws.questionnaires.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return { workspace: ws, errors };
}
