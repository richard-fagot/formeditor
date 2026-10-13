import { OTHER_VALUE } from '../model';

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
 * comme dans les entrées dynamiques d'un choix. Doublons supprimés, ordre conservé (première occurrence).
 */
export function suggestionList(raw: unknown): string[] {
  const items = raw === undefined || raw === null ? [] : Array.isArray(raw) ? raw.flat() : [raw];
  const out: string[] = [];
  for (const item of items) {
    const t = asText(item);
    if (t !== undefined && t !== OTHER_VALUE && !out.includes(t)) out.push(t);
  }
  return out;
}

/** Suggestions qui contiennent la saisie, casse ignorée (saisie vide : toutes). */
export function filterSuggestions(list: string[], typed: string): string[] {
  const needle = typed.trim().toLocaleLowerCase();
  return needle ? list.filter((s) => s.toLocaleLowerCase().includes(needle)) : list;
}
