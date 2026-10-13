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
  /** EVO-006 : option « Ne sais pas » (`dontKnow`). Propriété absente = désactivée : seul le numéro change. */
  4: (doc) => bump(doc, 5),
  /** EVO-007 : types `email`, `phone`, `address`, `civility`. Un document antérieur n'en a pas : seul le numéro change. */
  5: (doc) => bump(doc, 6),
  /** EVO-008 : les blocs deviennent des fragments (`fragments`, nœuds `kind: "fragment"`, `start` → `entry` si utile). */
  6: (doc) => {
    const v7 = (d: Doc) => {
      if (d?.kind === 'questionnaire') return { ...graphV7(d), formatVersion: 7 };
      if (d?.kind === 'library') return { ...libraryV7(d), formatVersion: 7 };
      return d && 'formatVersion' in d ? { ...d, formatVersion: 7 } : d;
    };
    if (doc.kind !== 'bundle') return v7(doc);
    return {
      ...doc,
      formatVersion: 7,
      ...(doc.library ? { library: v7({ kind: 'library', ...doc.library }) } : {}),
      ...(Array.isArray(doc.questionnaires) ? { questionnaires: doc.questionnaires.map((q: Doc) => v7({ kind: 'questionnaire', ...q })) } : {}),
      ...(Array.isArray(doc.layouts) ? { layouts: doc.layouts.map((l: Doc) => versioned(l, 7)) } : {}),
      ...(doc.project ? { project: versioned(doc.project, 7) } : {}),
    };
  },
  /** EVO-009 : champs masqués `hiddenFields` d'une instance. Propriété absente = tous affichés : seul le numéro change. */
  7: (doc) => bump(doc, 8),
  /** EVO-011 : commentaires de révision `comments` d'une mise en page. Propriété absente = aucun : seul le numéro change. */
  8: (doc) => bump(doc, 9),
  /** EVO-012 : surcharges du caractère obligatoire (`required`, `requiredOverrides`). Absentes = hérité : seul le numéro change. */
  9: (doc) => bump(doc, 10),
  /** EVO-015 : état de validation `status` / `validatedAt` d'un questionnaire. Absent = non validé : seul le numéro change. */
  10: (doc) => bump(doc, 11),
  /** EVO-016 : suggestions `suggestions` d'un champ texte. Propriété absente = aucune : seul le numéro change. */
  11: (doc) => bump(doc, 12),
};

/** Graphe v6 → v7 : instances de bloc → nœuds fragment. */
const graphV7 = (g: Doc): Doc =>
  Array.isArray(g.nodes) ? { ...g, nodes: g.nodes.map((n: Doc) => (n?.kind === 'block' ? { ...n, kind: 'fragment' } : n)) } : g;

/** Bloc v6 → fragment : `start` gardé comme `entry` seulement s'il n'est pas l'unique nœud sans arête entrante. */
function blockToFragment(b: Doc): Doc {
  const { start, nodes, edges, ...rest } = graphV7(b);
  const targets = new Set((edges ?? []).map((e: Doc) => e.to));
  const roots = (nodes ?? []).filter((n: Doc) => !targets.has(n.id));
  const implicit = roots.length === 1 && roots[0].id === start;
  const out: Doc = { ...rest };
  if (start && !implicit && (nodes ?? []).some((n: Doc) => n.id === start)) out.entry = start;
  return { ...out, nodes, edges };
}

/** Bibliothèque v6 → v7 : `blocks` → `fragments` (placés après `questions`). */
function libraryV7(l: Doc): Doc {
  const out: Doc = {};
  for (const [k, v] of Object.entries(l)) {
    if (k === 'blocks') continue;
    out[k] = v;
    if (k === 'questions') out.fragments = [...(l.fragments ?? []), ...(Array.isArray(l.blocks) ? l.blocks.map(blockToFragment) : [])];
  }
  if (!out.fragments) out.fragments = Array.isArray(l.blocks) ? l.blocks.map(blockToFragment) : [];
  return out;
}

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
