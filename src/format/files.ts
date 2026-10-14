import { versionSnapshot, type ItemStatus, type Layout, type Library, type Project, type Questionnaire, type Workspace } from '../core/model';
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

/** Caractères interdits dans un nom de fichier (Windows, macOS, Linux) et caractères de contrôle. */
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

/**
 * Nom du fichier d'un questionnaire (EVO-022) : `<clé> - <version> - <final|provisoire>.json` ; version vide → segment
 * omis ; caractères interdits de la version → `_`.
 */
export function questionnaireFileName(q: { key: string; version?: string; status?: ItemStatus }): string {
  const version = (q.version ?? '').replace(FORBIDDEN, '_').trim();
  return [q.key, version, q.status === 'validated' ? 'final' : 'provisoire'].filter(Boolean).join(' - ') + '.json';
}

/** Recopie `obj` en plaçant d'abord les propriétés `head` présentes (dans cet ordre), puis les autres dans leur ordre. */
function ordered<T extends object>(obj: T, head: string[]): T {
  const src = obj as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of head) if (src[k] !== undefined) out[k] = src[k];
  for (const [k, v] of Object.entries(src)) if (!(k in out)) out[k] = v;
  return out as T;
}

const QUESTIONNAIRE_HEAD = ['formatVersion', 'kind', 'id', 'key', 'title', 'description', 'version', 'status', 'validatedAt', 'libraryVersions'];

/**
 * Fichier livré d'un questionnaire (EVO-022) : `status` toujours écrit (`draft` s'il est absent) ; `libraryVersions` =
 * versions de référence s'il est validé, sinon versions actuelles des éléments utilisés (omis s'il n'en utilise aucun).
 */
function deliveredQuestionnaire(lib: Library, q: Questionnaire): Questionnaire {
  const snapshot = versionSnapshot(lib, q);
  const refs = q.status === 'validated' ? q.libraryVersions : Object.keys(snapshot).length ? snapshot : undefined;
  return ordered({ ...q, status: q.status ?? 'draft', libraryVersions: refs }, QUESTIONNAIRE_HEAD);
}

/** Inverse de `deliveredQuestionnaire` à l'import : un questionnaire provisoire n'a en mémoire ni `status` ni `libraryVersions`. */
function importedQuestionnaire(q: Questionnaire): Questionnaire {
  if (q.status === 'validated') return q;
  const { status: _status, libraryVersions: _refs, ...rest } = q;
  return rest;
}

/** Bibliothèque livrée : `version` et `status` de chaque question et fragment placés après la clé. */
function deliveredLibrary(lib: Library): Library {
  const item = <T extends object>(x: T) => ordered(x, ['id', 'key', 'version', 'status']);
  return { ...lib, questions: lib.questions.map(item), fragments: lib.fragments.map(item) };
}

export function exportBundle(ws: Workspace): string {
  return serialize(toBundle(ws));
}

/**
 * Fichiers unitaires : projet, bibliothèque, chaque questionnaire suivi de sa mise en page, mises en page des fragments et
 * des questions de bibliothèque. Questionnaire nommé par `questionnaireFileName` (EVO-022), nom repris dans `projet.json`.
 */
export function exportFiles(ws: Workspace): FileContent[] {
  const fileOf = new Map(ws.questionnaires.map((q) => [q.id, questionnaireFileName(q)]));
  const project = { ...ws.project, questionnaires: ws.project.questionnaires.map((e) => ({ ...e, file: fileOf.get(e.id) ?? e.file })) };
  const files: FileContent[] = [
    { name: PROJECT_FILE, text: serialize(project) },
    { name: LIBRARY_FILE, text: serialize(deliveredLibrary(ws.library)) },
  ];
  for (const q of ws.questionnaires) {
    const file = fileOf.get(q.id)!;
    files.push({ name: file, text: serialize(deliveredQuestionnaire(ws.library, q)) });
    const layout = ws.layouts.find((l) => l.graph === q.id);
    if (layout) files.push({ name: layoutFileFor(file), text: serialize(layout) });
  }
  for (const f of ws.library.fragments) {
    const layout = ws.layouts.find((l) => l.graph === f.id);
    if (layout) files.push({ name: `fragment_${f.key}.layout.json`, text: serialize(layout) });
  }
  // Commentaires de révision d'une question de bibliothèque (EVO-011).
  for (const q of ws.library.questions) {
    const layout = ws.layouts.find((l) => l.graph === q.id);
    if (layout) files.push({ name: `question_${q.key}.layout.json`, text: serialize(layout) });
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
    : (JSON.parse(JSON.stringify(current ?? newWorkspace('Nouveau projet'))) as Workspace);
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
      const q = importedQuestionnaire(doc as unknown as Questionnaire);
      upsert(ws.questionnaires, q);
      if (!ws.project.questionnaires.some((e) => e.id === q.id)) ws.project.questionnaires.push({ id: q.id, file: name });
    }
  }
  // Ordre des questionnaires : celui déclaré par le projet.
  const order = ws.project.questionnaires.map((e) => e.id);
  ws.questionnaires.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return { workspace: ws, errors };
}
