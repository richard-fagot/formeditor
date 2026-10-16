import type { Workspace } from './documents';
import type { Graph } from './graph';
import type { Question } from './question';
import { fragmentCallers } from './fragment';

/** Ids des éléments de bibliothèque qu'aucun autre élément du projet ne référence directement (EVO-028), dans l'ordre de la bibliothèque. */
export interface UnusedItems {
  questions: string[];
  fragments: string[];
  labelSets: string[];
}

const graphs = (ws: Workspace): Graph[] => [...ws.questionnaires, ...ws.library.fragments];

/** Jeux de libellés d'une question booléenne ou des champs booléens d'une structure. */
function labelSetsOf(q: Question): string[] {
  if (q.type === 'boolean') return q.labelSet ? [q.labelSet] : [];
  if (q.type === 'structure') return q.fields.flatMap((f) => (f.type === 'boolean' && f.labelSet ? [f.labelSet] : []));
  return [];
}

/**
 * Éléments inutilisés : question sans nœud qui la référence, fragment sans appelant (`fragmentCallers`, comme
 * `unusedFragment`), jeu de libellés qu'aucune question booléenne (locale, de bibliothèque, champ de structure) n'utilise.
 * Usage direct seulement ; le statut (validé, provisoire) n'intervient pas.
 */
export function unusedLibraryItems(ws: Workspace): UnusedItems {
  const questionRefs = new Set<string>();
  const labelSets = new Set<string>();
  for (const g of graphs(ws)) {
    for (const n of g.nodes) {
      if (n.kind !== 'question') continue;
      if ('ref' in n) questionRefs.add(n.ref);
      else labelSetsOf(n).forEach((l) => labelSets.add(l));
    }
  }
  for (const q of ws.library.questions) labelSetsOf(q).forEach((l) => labelSets.add(l));
  return {
    questions: ws.library.questions.filter((q) => !questionRefs.has(q.id)).map((q) => q.id),
    fragments: ws.library.fragments.filter((f) => !fragmentCallers(ws, f.id).length).map((f) => f.id),
    labelSets: ws.library.labelSets.filter((l) => !labelSets.has(l.id)).map((l) => l.id),
  };
}

/** Nombre total d'éléments inutilisés. */
export const unusedCount = (u: UnusedItems): number => u.questions.length + u.fragments.length + u.labelSets.length;
