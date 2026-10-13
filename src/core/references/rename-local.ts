import { renameInTemplate, renameReference } from '../expressions';
import { OTHER_VALUE, type Edge, type Graph, type GraphNode } from '../model';
import { mapGraph, type Owner } from './visit';

/**
 * Renomme des clés de questions locales et des alias de nœuds fragment dans un morceau de graphe (nœuds collés, EVO-010),
 * et réécrit leurs références (`cle`, `cle_other`, `cle.champ`, `alias.cle`…) dans les seules expressions de ce morceau.
 * Les nouvelles clés doivent être distinctes de toutes les anciennes (pas d'enchaînement). Noms relatifs des entrées
 * dynamiques et clés masquées par un champ de même nom de leur structure : inchangés. Entrée non modifiée.
 */
export function renameKeysIn(part: { nodes: GraphNode[]; edges: Edge[] }, renames: Record<string, string>, owner: Owner): { nodes: GraphNode[]; edges: Edge[] } {
  const olds = Object.keys(renames).filter((k) => renames[k] !== k);
  const graph = JSON.parse(JSON.stringify({ nodes: part.nodes, edges: part.edges })) as Graph;
  const structures = new Map<string, string[]>();
  for (const n of graph.nodes) if (n.kind === 'question' && !('ref' in n) && n.type === 'structure') structures.set(n.key, n.fields.map((f) => f.key));
  const mapped = mapGraph(graph, (text, kind, loc) => {
    if (loc.relative) return text;
    let out = text;
    for (const old of olds) {
      if (loc.structure && structures.get(loc.structure)?.includes(old)) continue;
      for (const [from, to] of [[old, renames[old]!], [`${old}_${OTHER_VALUE}`, `${renames[old]}_${OTHER_VALUE}`]] as const) {
        out = kind === 'expr' ? renameReference(out, [from], to) : renameInTemplate(out, [from], to);
      }
    }
    return out;
  }, owner);
  for (const n of mapped.nodes) {
    if (n.kind === 'question' && !('ref' in n) && renames[n.key]) n.key = renames[n.key]!;
    if (n.kind === 'fragment' && renames[n.alias]) n.alias = renames[n.alias]!;
  }
  return { nodes: mapped.nodes, edges: mapped.edges };
}
