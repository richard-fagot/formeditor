import type { Fragment, Library, Questionnaire, Workspace } from './documents';
import type { Graph } from './graph';
import type { Question } from './question';

/** Statut d'un questionnaire ou d'un élément de bibliothèque (EVO-022) : absent = `draft` (provisoire) ; `validated` = final. */
export type ItemStatus = 'draft' | 'validated';

/** Version (texte libre, absente = vide) et statut d'un élément de bibliothèque (EVO-022). */
export interface Versioned {
  version?: string;
  status?: ItemStatus;
}

/** Version de référence d'un élément utilisé, relevée à la validation d'un questionnaire. */
export interface VersionRef {
  version: string;
  status: ItemStatus;
}

/** Élément de bibliothèque désigné par sa nature et son id. */
export interface LibraryItemRef {
  kind: 'question' | 'fragment';
  id: string;
}

/** Écart entre la version de référence et la version actuelle d'un élément utilisé. */
export interface VersionAlert extends LibraryItemRef {
  key: string;
  from: string;
  to: string;
}

export const isItemValidated = (x: Versioned | undefined): boolean => x?.status === 'validated';

export function libraryItemOf(lib: Library, item: LibraryItemRef): ((Question | Fragment) & Versioned) | undefined {
  return item.kind === 'question' ? lib.questions.find((q) => q.id === item.id) : lib.fragments.find((f) => f.id === item.id);
}

/** Éléments de bibliothèque utilisés par un graphe, directement puis par les fragments appelés (récursivement), sans doublon. */
export function usedLibraryItems(lib: Library, graph: Graph): LibraryItemRef[] {
  const out: LibraryItemRef[] = [];
  const seen = new Set<string>();
  const visit = (g: Graph) => {
    const called: Fragment[] = [];
    for (const n of g.nodes) {
      if (!('ref' in n) || typeof n.ref !== 'string') continue;
      const kind = n.kind === 'fragment' ? 'fragment' : 'question';
      if (seen.has(`${kind}:${n.ref}`)) continue;
      seen.add(`${kind}:${n.ref}`);
      out.push({ kind, id: n.ref });
      const f = kind === 'fragment' ? lib.fragments.find((x) => x.id === n.ref) : undefined;
      if (f) called.push(f);
    }
    called.forEach(visit);
  };
  visit(graph);
  return out;
}

/** Versions de référence d'un graphe : version (vide si absente) et statut de chaque élément utilisé existant. */
export function versionSnapshot(lib: Library, graph: Graph): Record<string, VersionRef> {
  const out: Record<string, VersionRef> = {};
  for (const ref of usedLibraryItems(lib, graph)) {
    const item = libraryItemOf(lib, ref);
    if (item) out[ref.id] = { version: item.version ?? '', status: isItemValidated(item) ? 'validated' : 'draft' };
  }
  return out;
}

/**
 * Alertes d'un questionnaire validé : éléments utilisés dont la version actuelle diffère de la version de référence
 * (élément absent des références = référence vide, cas d'un projet antérieur). Aucune sur un questionnaire provisoire.
 */
export function versionAlerts(lib: Library, q: Questionnaire): VersionAlert[] {
  if (q.status !== 'validated') return [];
  return usedLibraryItems(lib, q).flatMap((ref) => {
    const item = libraryItemOf(lib, ref);
    if (!item) return [];
    const from = q.libraryVersions?.[ref.id]?.version ?? '';
    const to = item.version ?? '';
    return from === to ? [] : [{ ...ref, key: item.key, from, to }];
  });
}

/** Éléments provisoires (non validés) utilisés par un graphe. */
export function provisionalItems(lib: Library, graph: Graph): LibraryItemRef[] {
  return usedLibraryItems(lib, graph).filter((ref) => {
    const item = libraryItemOf(lib, ref);
    return !!item && !isItemValidated(item);
  });
}

/** Questionnaires qui utilisent un élément, directement ou par un fragment appelé. */
export function itemUsers(ws: Workspace, item: LibraryItemRef): Questionnaire[] {
  return ws.questionnaires.filter((q) => usedLibraryItems(ws.library, q).some((r) => r.kind === item.kind && r.id === item.id));
}
