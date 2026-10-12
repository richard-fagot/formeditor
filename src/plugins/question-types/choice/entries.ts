import {
  deriveKey, isChoiceGroup, isDynamicEntry, isVariantLabel, OTHER_VALUE, uniqueKey,
  type ChoiceEntry, type ChoiceGroup, type ChoiceItem, type ChoiceOption, type Label, type LocalizedText,
} from '../../../core/model';
import { flatLines, formatLine, itemLine, parseLines, type Env } from './quick-lines';

export { linesOf, normalizeQuick } from './quick-lines';

/**
 * Ligne de la saisie rapide d'un élément : `$<référence>` pour une entrée dynamique ; une option statique dont le
 * libellé commence par `$`, `#` ou une puce s'écrit `\…` ; toute autre ligne (y compris `<…>`) est une option statique.
 */
export const lineOf = (e: ChoiceItem, env: Env): string => formatLine(itemLine(e, env));

const valuesOf = (items: ChoiceEntry[]) => items.filter((e): e is ChoiceOption => !isDynamicEntry(e) && !isChoiceGroup(e)).map((o) => o.value);

/** Remplace le texte de la langue affichée d'un libellé (variantes : le texte « sinon »). */
function relabel(l: Label, text: string, lang: string): Label {
  return isVariantLabel(l) ? { ...l, otherwise: { ...l.otherwise, [lang]: text } } : { ...l, [lang]: text };
}

const key = (l: { kind: string; text: string }) => `${l.kind}:${l.text}`;

/**
 * Réconcilie les lignes saisies avec les entrées existantes : une ligne identique (même genre, même texte) garde
 * son entrée, même déplacée ; une ligne modifiée garde l'entrée de même rang si elle est du même genre (groupe :
 * code, condition, traductions ; option : valeur, condition, traductions ; dynamique : libellé, valeur, condition) ;
 * sinon entrée nouvelle. Une valeur nouvelle est unique dans son groupe (ou parmi les options hors groupe).
 */
export function reconcile(lines: string[], entries: ChoiceEntry[], env: Env): ChoiceEntry[] {
  const parsed = parseLines(lines);
  const flat = flatLines(entries, env);
  const used = new Set<number>();
  const match = parsed.map((p) => {
    const i = flat.findIndex((f, j) => !used.has(j) && key(f.line) === key(p));
    if (i >= 0) used.add(i);
    return i;
  });
  parsed.forEach((p, k) => {
    if (match[k]! < 0 && flat[k] && !used.has(k) && flat[k].line.kind === p.kind) (match[k] = k), used.add(k);
  });

  const out: ChoiceEntry[] = [];
  /** Valeurs déjà prises, par liste cible (hors groupe : toutes les options hors groupe existantes). */
  const taken = new Map<ChoiceEntry[], Set<string>>([[out, new Set([OTHER_VALUE, ...valuesOf(entries)])]]);
  const pending: { list: ChoiceEntry[]; index: number; text: string }[] = [];
  let target = out;
  parsed.forEach((p, k) => {
    const found = match[k]! >= 0 ? flat[match[k]!]! : undefined;
    const same = found && key(found.line) === key(p);
    if (p.kind === 'group') {
      const old = found?.entry as ChoiceGroup | undefined;
      const g: ChoiceGroup = old ? { ...old, ...(same ? {} : { group: relabel(old.group, p.text, env.contentLang) }), options: [] } : { group: { [env.contentLang]: p.text }, options: [] };
      out.push(g);
      target = g.options;
      taken.set(target, new Set([OTHER_VALUE, ...(old ? valuesOf(old.options) : [])]));
      return;
    }
    const e = found?.entry as ChoiceItem | undefined;
    if (e && same) return void target.push(e);
    if (e) return void target.push(isDynamicEntry(e) ? { ...e, from: p.text } : { ...e, label: relabel(e.label, p.text, env.contentLang) });
    if (p.kind === 'dynamic') return void target.push({ from: p.text });
    pending.push({ list: target, index: target.length, text: p.text });
    target.push({ value: '', label: { [env.contentLang]: p.text } as LocalizedText });
  });
  for (const { list, index, text } of pending) {
    const set = taken.get(list)!;
    valuesOf(list).forEach((v) => v && set.add(v));
    const value = uniqueKey(deriveKey(text) || 'option', set);
    set.add(value);
    list[index] = { value, label: { [env.contentLang]: text } as LocalizedText };
  }
  return out;
}

/** Déplace l'entrée `i` en position `to` (hors limites : liste inchangée). Un groupe se déplace avec ses options. */
export function moveEntry<E extends ChoiceEntry>(entries: E[], i: number, to: number): E[] {
  if (to < 0 || to >= entries.length || i === to || !entries[i]) return entries;
  const next = [...entries];
  const [e] = next.splice(i, 1);
  next.splice(to, 0, e!);
  return next;
}

/** Duplique l'élément `i` juste après lui ; une option statique reçoit une valeur libre dans sa liste. */
export function duplicateEntry<E extends ChoiceEntry>(entries: E[], i: number): E[] {
  const e = entries[i];
  if (!e || isChoiceGroup(e)) return entries;
  const copy = isDynamicEntry(e) ? { ...e } : { ...e, value: uniqueKey(e.value, [OTHER_VALUE, ...valuesOf(entries)]) };
  return [...entries.slice(0, i + 1), copy, ...entries.slice(i + 1)];
}
