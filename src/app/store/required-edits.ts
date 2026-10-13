import { isLibraryQuestion, type Workspace } from '../../core/model';
import { getGraph, type GraphRef } from './graph';

/**
 * Surcharge (`true` / `false`) ou rend hérité (`undefined`) le caractère obligatoire d'une question utilisée (EVO-012) :
 * sans `path`, sur la référence de bibliothèque `nodeId` ; avec `path` (chemin d'identifiants dans le fragment appelé),
 * sur l'appel de fragment `nodeId`. Une surcharge égale à la valeur héritée est conservée. Renvoie `false` si refusé.
 */
export function setRequiredOverride(ws: Workspace, ref: GraphRef, nodeId: string, value: boolean | undefined, path?: string): boolean {
  const node = getGraph(ws, ref)?.nodes.find((n) => n.id === nodeId);
  if (!node) return false;
  if (path === undefined) {
    if (!isLibraryQuestion(node)) return false;
    if (value === undefined) delete node.required;
    else node.required = value;
    return true;
  }
  if (node.kind !== 'fragment') return false;
  const next = { ...node.requiredOverrides };
  if (value === undefined) delete next[path];
  else next[path] = value;
  if (Object.keys(next).length) node.requiredOverrides = next;
  else delete node.requiredOverrides;
  return true;
}

/** « Revenir à la valeur héritée » : retire la surcharge d'une référence, ou toutes celles d'un appel (orphelines comprises). */
export function resetRequired(ws: Workspace, ref: GraphRef, nodeId: string): boolean {
  const node = getGraph(ws, ref)?.nodes.find((n) => n.id === nodeId);
  if (node && isLibraryQuestion(node) && node.required !== undefined) return delete node.required;
  if (node?.kind === 'fragment' && node.requiredOverrides) return delete node.requiredOverrides;
  return false;
}

/** Une surcharge est posée sur la référence ou l'appel (pour activer « Revenir à la valeur héritée »). */
export function hasRequiredOverride(ws: Workspace, ref: GraphRef, nodeId: string): boolean {
  const node = getGraph(ws, ref)?.nodes.find((n) => n.id === nodeId);
  return !!node && ((isLibraryQuestion(node) && node.required !== undefined) || (node.kind === 'fragment' && !!node.requiredOverrides));
}
