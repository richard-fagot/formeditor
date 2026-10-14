import { extractReferences } from '../expressions';
import { isLocalQuestion, OTHER_VALUE, type Graph, type Question, type Workspace } from '../model';

/** Élément affichable : texte, nombre ou booléen converti en texte (règle de l'interpolation) ; sinon rien. */
function asText(v: unknown): string | undefined {
  if (typeof v === 'string') return v.trim() ? v : undefined;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return undefined;
}

/**
 * Suggestions d'un champ texte (EVO-016) : résultat de l'expression mis en liste de textes.
 * Valeur unique → un élément ; vide, `undefined` (non renseigné, erreur) → aucun. Les nombres, booléens et dates (chaînes ISO)
 * deviennent du texte ; objets, éléments vides et la valeur réservée `other` (« Autre (préciser) ») sont écartés,
 * comme dans les entrées dynamiques d'un choix. `labelOf` : libellé affiché (et inséré) à la place d'une valeur
 * d'option d'un choix référencé ; les autres valeurs restent telles quelles. Doublons supprimés après ce remplacement,
 * ordre conservé (première occurrence).
 */
export function suggestionList(raw: unknown, labelOf?: (value: string) => string | undefined): string[] {
  const items = raw === undefined || raw === null ? [] : Array.isArray(raw) ? raw.flat() : [raw];
  const out: string[] = [];
  for (const item of items) {
    const t = asText(item);
    if (t === undefined || t === OTHER_VALUE) continue;
    const shown = labelOf?.(t) || t;
    if (!out.includes(shown)) out.push(shown);
  }
  return out;
}

const isChoice = (q: Question) => q.type === 'single' || q.type === 'multiple';

/**
 * Questions à choix référencées par l'expression : clé égale au dernier nom d'une référence (`marques`,
 * `alias.marques`) hors variables système. Chaque clé est cherchée d'abord dans `graph` (questionnaire ou fragment
 * courant, références de bibliothèque comprises), puis dans la bibliothèque (questions, puis fragments) ; la première
 * question trouvée l'emporte (si ce n'est pas un choix, la clé n'a pas de libellés).
 */
export function referencedChoices(ws: Workspace, expr: string, graph?: Graph): Question[] {
  const keys = new Set(extractReferences(expr).filter((p) => p[0] !== 'sys').map((p) => p[p.length - 1]));
  if (!keys.size) return [];
  const found = new Map<string, Question>();
  const add = (q: Question | undefined) => {
    if (q && keys.has(q.key) && !found.has(q.key)) found.set(q.key, q);
  };
  const addGraph = (g: Graph) => {
    for (const n of g.nodes) {
      if (n.kind === 'question') add(isLocalQuestion(n) ? n : ws.library.questions.find((x) => x.id === n.ref));
    }
  };
  if (graph) addGraph(graph);
  ws.library.questions.forEach(add);
  ws.library.fragments.forEach(addGraph);
  return [...found.values()].filter(isChoice);
}

/** Suggestions qui contiennent la saisie, casse ignorée (saisie vide : toutes). */
export function filterSuggestions(list: string[], typed: string): string[] {
  const needle = typed.trim().toLocaleLowerCase();
  return needle ? list.filter((s) => s.toLocaleLowerCase().includes(needle)) : list;
}
