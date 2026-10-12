import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { RefInfo, Scope } from '../../core/references';

/** Fonctions proposées (JSONata + fonctions de l'outil). */
const FUNCTIONS = [
  ['$count', 'nombre d’éléments'], ['$exists', 'est renseigné'], ['$not', 'négation'], ['$sum', 'somme'],
  ['$string', 'en texte'], ['$number', 'en nombre'], ['$length', 'longueur'], ['$contains', 'contient (texte)'],
  ['$today', 'date du jour'], ['$addDays', 'date + n jours'], ['$daysBetween', 'jours entre deux dates'], ['$age', 'âge en années'],
] as const;

/** Mot en cours de saisie : clé (`sys.x`), fonction (`$f`) ou mot d'un libellé (lettres accentuées comprises). */
const WORD = /[$\p{L}\w][\p{L}\w.]*/u;

/** Comparaison sans casse ni accents. */
export const normalize = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function option(r: RefInfo, boost: number): Completion {
  const type = r.values?.length ? `${r.type} : ${r.values.join(' | ')}` : r.type ?? '';
  return {
    label: r.path,
    type: r.kind === 'system' ? 'variable' : 'property',
    detail: r.caption ? (type ? `${r.caption} · ${type}` : r.caption) : type,
    boost,
    ...(r.description ? { info: r.description } : {}),
  };
}

/**
 * Autocomplétion des clés (`victimes.prenom`, `sys.…`, `alias.cle`) et des fonctions.
 * Clé par préfixe, ou libellé (EVO-005) contenant le mot tapé ; filtrage maison (`filter: false`), clés d'abord.
 */
export function completeReferences(getScope: () => Scope) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const word = ctx.matchBefore(WORD);
    if (!word && !ctx.explicit) return null;
    const from = word?.from ?? ctx.pos;
    const text = word?.text ?? '';
    if (text.startsWith('$')) {
      return { from, options: FUNCTIONS.map(([label, detail]) => ({ label, detail, type: 'function', apply: `${label}()` })) };
    }
    const refs = [...getScope().values()].filter((r) => r.path !== text);
    const byKey = refs.filter((r) => r.path.startsWith(text));
    const needle = normalize(text);
    const byCaption = needle ? refs.filter((r) => !byKey.includes(r) && r.caption && normalize(r.caption).includes(needle)) : [];
    const options = [...byKey.map((r) => option(r, 1)), ...byCaption.map((r) => option(r, 0))];
    return { from, options, filter: false };
  };
}
