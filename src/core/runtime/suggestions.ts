import { extractReferences } from '../expressions';
import { isLocalQuestion, OTHER_VALUE, type Question, type Workspace } from '../model';

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
 * `alias.marques`) hors variables système, cherchée dans les questionnaires, fragments et la bibliothèque.
 */
export function referencedChoices(ws: Workspace, expr: string): Question[] {
  const keys = new Set(extractReferences(expr).filter((p) => p[0] !== 'sys').map((p) => p[p.length - 1]));
  if (!keys.size) return [];
  const local = [...ws.questionnaires, ...ws.library.fragments].flatMap((g) => g.nodes.filter(isLocalQuestion));
  return [...local, ...ws.library.questions].filter((q) => isChoice(q) && keys.has(q.key));
}

/** Suggestions qui contiennent la saisie, casse ignorée (saisie vide : toutes). */
export function filterSuggestions(list: string[], typed: string): string[] {
  const needle = typed.trim().toLocaleLowerCase();
  return needle ? list.filter((s) => s.toLocaleLowerCase().includes(needle)) : list;
}
