import type { Fragment, Questionnaire, Workspace } from './documents';
import { graphStart } from './fragment';
import type { Graph } from './graph';
import { instanceQuestion } from './instance';
import type { FragmentNode, GraphNode, QuestionNode } from './node';
import type { Question, QuestionType, StructureField } from './question';
import { resolveRequired } from './required';
import type { Label } from './text';

// Inventaire des données capturées par un questionnaire (EVO-029, amorce RGPD). Fonctions pures.

/** Une donnée capturée : réponse, champ de structure ou précision « Autre » (`other`). */
export interface InventoryRow {
  /** Chemin tel qu'il s'écrit dans les expressions : `cle`, `cle.champ`, `alias.cle`, `cle_other`. */
  path: string;
  /** Intitulé de la question effective (non interpolé) ; pour `other`, celui de la question. */
  label?: Label;
  /** Type de la donnée (`text` pour une précision « Autre »). */
  type: QuestionType;
  /** Caractère obligatoire effectif : booléen ou expression ; pour `other`, la précision est-elle exigée. */
  required: Question['required'];
  /** Champ d'une structure répétable. */
  repeatable: boolean;
  /** Donnée personnelle présumée (mail, téléphone, adresse, civilité). */
  personal: boolean;
  description?: string;
  /** Ligne de précision « Autre (préciser) ». */
  other: boolean;
}

/** Types présumés porter une donnée personnelle (EVO-029-030). */
export const PERSONAL_TYPES: readonly QuestionType[] = ['email', 'phone', 'address', 'civility'];

/**
 * Nœuds d'un graphe dans l'ordre de parcours (EVO-029-021) : profondeur d'abord depuis le départ, arêtes sortantes dans
 * leur ordre, chaque nœud une seule fois (boucles comprises) ; puis les nœuds non atteignables, dans l'ordre du graphe.
 */
export function traversalOrder(g: Graph, start: string): GraphNode[] {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const out: GraphNode[] = [];
  const visit = (id: string) => {
    const n = byId.get(id);
    if (!n || seen.has(id)) return;
    seen.add(id);
    out.push(n);
    for (const e of g.edges) if (e.from === id) visit(e.to);
  };
  visit(start);
  return [...out, ...g.nodes.filter((n) => !seen.has(n.id))];
}

/** Lignes d'une donnée (question ou champ) suivies de sa précision « Autre » éventuelle. */
function dataRows(q: Question | StructureField, path: string, required: Question['required'], repeatable: boolean, description: string | undefined): InventoryRow[] {
  const rows: InventoryRow[] = [{ path, label: q.label, type: q.type, required, repeatable, personal: PERSONAL_TYPES.includes(q.type), description, other: false }];
  if ('other' in q && q.other) {
    rows.push({ path: `${path}_other`, label: q.label, type: 'text', required: !!q.other.detailRequired, repeatable, personal: false, description, other: true });
  }
  return rows;
}

/** Lignes d'un nœud question atteint par `instances` (appels de fragment, du plus externe au plus interne). */
function questionRows(ws: Workspace, node: QuestionNode, prefix: string, instances: FragmentNode[]): InventoryRow[] {
  let q: Question;
  let description: string | undefined;
  if ('ref' in node) {
    const def = ws.library.questions.find((x) => x.id === node.ref);
    if (!def) return [];
    q = instanceQuestion(def, node);
    description = node.description || def.description;
  } else {
    q = node;
    description = node.description;
  }
  const path = `${prefix}${q.key}`;
  if (q.type !== 'structure') return dataRows(q, path, resolveRequired(ws, node, instances).value, false, description);
  return q.fields.flatMap((f) => dataRows(f, `${path}.${f.key}`, f.required, !!q.repeat, f.description));
}

function graphRows(ws: Workspace, g: Questionnaire | Fragment, prefix: string, instances: FragmentNode[], calls: string[]): InventoryRow[] {
  return traversalOrder(g, graphStart(g)).flatMap((n): InventoryRow[] => {
    if (n.kind === 'question') return questionRows(ws, n, prefix, instances);
    if (n.kind !== 'fragment' || calls.includes(n.ref)) return [];
    const f = ws.library.fragments.find((x) => x.id === n.ref);
    return f ? graphRows(ws, f, `${prefix}${n.alias}.`, [...instances, n], [...calls, n.ref]) : [];
  });
}

/**
 * Données capturées par un questionnaire, dans l'ordre de parcours (EVO-029) : questions locales et de bibliothèque,
 * questions des fragments appelés (chemin préfixé par les alias), un champ de structure par ligne (champs masqués exclus),
 * précision « Autre » à la suite. Aucune ligne pour les autres nœuds, le pays d'un téléphone ou d'une adresse, l'état du système.
 */
export function inventoryRows(ws: Workspace, q: Questionnaire): InventoryRow[] {
  return graphRows(ws, q, '', [], []);
}
