import type { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import type { Scope } from '../../core/references';

/** Fonctions proposées (JSONata + fonctions de l'outil). */
const FUNCTIONS = [
  ['$count', 'nombre d’éléments'], ['$exists', 'est renseigné'], ['$not', 'négation'], ['$sum', 'somme'],
  ['$string', 'en texte'], ['$number', 'en nombre'], ['$length', 'longueur'], ['$contains', 'contient (texte)'],
  ['$today', 'date du jour'], ['$addDays', 'date + n jours'], ['$daysBetween', 'jours entre deux dates'], ['$age', 'âge en années'],
] as const;

/** Autocomplétion des clés (`victimes.prenom`, `sys.…`, `alias.cle`) et des fonctions. */
export function completeReferences(getScope: () => Scope) {
  return (ctx: CompletionContext): CompletionResult | null => {
    const word = ctx.matchBefore(/[$\w][\w.]*/);
    if (!word && !ctx.explicit) return null;
    const from = word?.from ?? ctx.pos;
    const text = word?.text ?? '';
    if (text.startsWith('$')) {
      return { from, options: FUNCTIONS.map(([label, detail]) => ({ label, detail, type: 'function', apply: `${label}()` })) };
    }
    const options = [...getScope().values()]
      .filter((r) => r.path.startsWith(text) && r.path !== text)
      .map((r) => ({ label: r.path, type: r.kind === 'system' ? 'variable' : 'property', detail: r.values?.length ? `${r.type} : ${r.values.join(' | ')}` : r.type ?? '', ...(r.description ? { info: r.description } : {}) }));
    return { from, options, validFor: /^[\w.]*$/ };
  };
}
