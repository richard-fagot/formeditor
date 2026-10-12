import { FORMAT_VERSION } from '../core/model';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;
/** Migration de la version `n` vers `n + 1`, indexée par `n`. */
export type Migrations = Record<number, (doc: Doc) => Doc>;

/** Question (ou champ de structure) v1 → v2 : `source` devient une entrée dynamique après les options statiques. */
function sourceToEntry(q: Doc): Doc {
  let out = q;
  if (q.source && Array.isArray(q.options)) {
    const { source, ...rest } = q;
    out = { ...rest, options: [...q.options, source] };
  }
  return Array.isArray(out.fields) ? { ...out, fields: out.fields.map(sourceToEntry) } : out;
}

const graphV2 = (g: Doc): Doc => (Array.isArray(g.nodes) ? { ...g, nodes: g.nodes.map(sourceToEntry) } : g);
const libraryV2 = (l: Doc): Doc => ({
  ...l,
  ...(Array.isArray(l.questions) ? { questions: l.questions.map(sourceToEntry) } : {}),
  ...(Array.isArray(l.blocks) ? { blocks: l.blocks.map(graphV2) } : {}),
});
const versioned = (d: Doc, v: number): Doc => (d && 'formatVersion' in d ? { ...d, formatVersion: v } : d);

/** Migrations du format. Ajouter ici `n: (doc) => …` à chaque montée de `FORMAT_VERSION`. */
export const MIGRATIONS: Migrations = {
  /** EVO-001 : options d'un choix = suite ordonnée d'entrées ; `source` disparaît. */
  1: (doc) => {
    switch (doc.kind) {
      case 'questionnaire':
        return { ...graphV2(doc), formatVersion: 2 };
      case 'library':
        return { ...libraryV2(doc), formatVersion: 2 };
      case 'bundle':
        return {
          ...doc,
          formatVersion: 2,
          ...(doc.library ? { library: versioned(libraryV2(doc.library), 2) } : {}),
          ...(Array.isArray(doc.questionnaires) ? { questionnaires: doc.questionnaires.map((q: Doc) => versioned(graphV2(q), 2)) } : {}),
          ...(Array.isArray(doc.layouts) ? { layouts: doc.layouts.map((l: Doc) => versioned(l, 2)) } : {}),
          ...(doc.project ? { project: versioned(doc.project, 2) } : {}),
        };
      default:
        return { ...doc, formatVersion: 2 };
    }
  },
  /** EVO-003 : groupes d'options. Un document antérieur n'a pas de groupe : seul le numéro de version change. */
  2: (doc) => bump(doc, 3),
  /** EVO-005 : libellés `caption` (arête, variable, champ). Un document antérieur n'en a pas : seul le numéro change. */
  3: (doc) => bump(doc, 4),
};

/** Change seulement `formatVersion` (et celui des documents d'un bundle). */
function bump(doc: Doc, v: number): Doc {
  if (doc.kind !== 'bundle') return { ...doc, formatVersion: v };
  return {
    ...doc,
    formatVersion: v,
    ...(doc.library ? { library: versioned(doc.library, v) } : {}),
    ...(Array.isArray(doc.questionnaires) ? { questionnaires: doc.questionnaires.map((q: Doc) => versioned(q, v)) } : {}),
    ...(Array.isArray(doc.layouts) ? { layouts: doc.layouts.map((l: Doc) => versioned(l, v)) } : {}),
    ...(doc.project ? { project: versioned(doc.project, v) } : {}),
  };
}

/** Amène un document (unitaire ou bundle) à la version cible. */
export function migrate(doc: Doc, migrations: Migrations = MIGRATIONS, target = FORMAT_VERSION): Doc {
  let current = doc;
  let version = Number(current.formatVersion ?? 1);
  if (version > target) {
    throw new Error(`Format ${version} plus récent que celui de l'outil (${target}).`);
  }
  while (version < target) {
    const step = migrations[version];
    if (!step) throw new Error(`Aucune migration depuis la version ${version}.`);
    current = step(current);
    version++;
  }
  return current;
}
