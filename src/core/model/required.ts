import type { FragmentNode, QuestionNode } from './node';
import type { Question } from './question';
import type { Workspace } from './documents';

/**
 * Caractère obligatoire résolu (EVO-012). `holder` : niveau qui le fixe — `0` pour le graphe racine (celui qui
 * contient `instances[0]`, ou le nœud lui-même), `k` pour le fragment appelé par `instances[k-1]`, `'library'` pour
 * la définition en bibliothèque. `override` : la valeur vient d'une surcharge (et non d'une définition).
 */
export interface RequiredResolution {
  value: Question['required'];
  override: boolean;
  holder: number | 'library';
}

/** Question d'un fragment vue depuis un appel : chemin d'identifiants, nœud, appels intérieurs traversés. */
export interface FragmentQuestion {
  path: string;
  node: QuestionNode;
  instances: FragmentNode[];
}

const isRef = (n: QuestionNode): n is Extract<QuestionNode, { ref: string }> => 'ref' in n;

/** Chemin d'une question à partir du fragment appelé par `instances[i]` : `n_tel`, `n_appel/n_tel`. */
export function requiredPath(instances: readonly FragmentNode[], i: number, node: QuestionNode): string {
  return [...instances.slice(i + 1).map((x) => x.id), node.id].join('/');
}

/**
 * Valeur effective du caractère obligatoire d'une question atteinte par `instances` (appels, du plus externe au plus
 * interne) : le niveau le plus proche de l'utilisation l'emporte — surcharge de l'appel le plus externe, puis des
 * appels intérieurs, puis de la référence de bibliothèque, puis la définition.
 */
export function resolveRequired(ws: Workspace, node: QuestionNode, instances: readonly FragmentNode[]): RequiredResolution {
  for (let i = 0; i < instances.length; i++) {
    const v = instances[i]!.requiredOverrides?.[requiredPath(instances, i, node)];
    if (v !== undefined) return { value: v, override: true, holder: i };
  }
  if (!isRef(node)) return { value: node.required, override: false, holder: instances.length };
  if (node.required !== undefined) return { value: node.required, override: true, holder: instances.length };
  return { value: ws.library.questions.find((q) => q.id === node.ref)?.required, override: false, holder: 'library' };
}

/** Valeur qu'aurait la question sans la surcharge du niveau 0 (« Hérité »). */
export function inheritedRequired(ws: Workspace, node: QuestionNode, instances: readonly FragmentNode[]): RequiredResolution {
  if (instances.length) {
    const r = resolveRequired(ws, node, instances.slice(1));
    return { ...r, holder: r.holder === 'library' ? 'library' : r.holder + 1 };
  }
  if (!isRef(node)) return resolveRequired(ws, node, []);
  return { value: ws.library.questions.find((q) => q.id === node.ref)?.required, override: false, holder: 'library' };
}

/** Questions d'un fragment, fragments appelés compris, dans l'ordre des nœuds (garde contre un cycle d'appels). */
export function fragmentQuestions(ws: Workspace, fragmentId: string, seen: readonly string[] = []): FragmentQuestion[] {
  const f = seen.includes(fragmentId) ? undefined : ws.library.fragments.find((x) => x.id === fragmentId);
  if (!f) return [];
  return f.nodes.flatMap((n): FragmentQuestion[] => {
    if (n.kind === 'question') return [{ path: n.id, node: n, instances: [] }];
    if (n.kind !== 'fragment') return [];
    return fragmentQuestions(ws, n.ref, [...seen, fragmentId])
      .map((q) => ({ path: `${n.id}/${q.path}`, node: q.node, instances: [n, ...q.instances] }));
  });
}

/** Nombre de surcharges d'un appel qui désignent une question existante (les orphelines sont ignorées). */
export function activeOverrides(ws: Workspace, call: FragmentNode): number {
  const o = call.requiredOverrides;
  return o ? fragmentQuestions(ws, call.ref).filter((q) => o[q.path] !== undefined).length : 0;
}
