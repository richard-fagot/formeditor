import {
  deriveKey, isDynamicEntry, isVariantLabel, OTHER_VALUE, uniqueKey,
  type ChoiceEntry, type ChoiceOption, type LocalizedText,
} from '../../../core/model';
import { previewText, type EditorEnv } from '../../../plugin-api';

type Env = Pick<EditorEnv, 'contentLang' | 'defaultLang'>;

/**
 * Ligne de la saisie rapide : `$<référence>` pour une entrée dynamique ; une option statique dont le
 * libellé commence par `$` s'écrit `\$…` ; toute autre ligne (y compris `<…>`) est une option statique.
 */
export function lineOf(e: ChoiceEntry, env: Env): string {
  if (isDynamicEntry(e)) return `$${e.from}`;
  const t = previewText(e.label, env);
  return t.startsWith('$') ? `\\${t}` : t;
}

type Parsed = { from: string } | { text: string };
function parseLine(line: string): Parsed {
  if (line.startsWith('\\$')) return { text: line.slice(1) };
  if (line.startsWith('$')) return { from: line.slice(1).trim() };
  return { text: line };
}

const valuesOf = (entries: ChoiceEntry[]) => entries.filter((e): e is ChoiceOption => !isDynamicEntry(e)).map((o) => o.value);

/** Remplace le texte de la langue affichée d'un libellé (variantes : le texte « sinon »). */
function relabel(o: ChoiceOption, text: string, lang: string): ChoiceOption {
  const label = isVariantLabel(o.label) ? { ...o.label, otherwise: { ...o.label.otherwise, [lang]: text } } : { ...o.label, [lang]: text };
  return { ...o, label };
}

/**
 * Réconcilie les lignes saisies avec les entrées existantes : une ligne identique garde son entrée,
 * une ligne modifiée garde l'entrée de même rang si elle est du même genre (statique : valeur, condition,
 * traductions ; dynamique : libellé, valeur, condition), sinon entrée nouvelle.
 */
export function reconcile(lines: string[], entries: ChoiceEntry[], env: Env): ChoiceEntry[] {
  const texts = lines.map((l) => l.trim()).filter(Boolean);
  const used = new Set<number>();
  const match = texts.map((t) => {
    const i = entries.findIndex((e, j) => !used.has(j) && lineOf(e, env) === t);
    if (i >= 0) used.add(i);
    return i;
  });
  const taken = new Set([OTHER_VALUE, ...valuesOf(entries)]);
  return texts.map((t, k): ChoiceEntry => {
    const parsed = parseLine(t);
    let i = match[k]!;
    const same = entries[k] && !used.has(k) && isDynamicEntry(entries[k]) === 'from' in parsed;
    if (i < 0 && same) (i = k), used.add(k);
    if (i >= 0) {
      const e = entries[i]!;
      if (lineOf(e, env) === t) return e;
      if (isDynamicEntry(e)) return { ...e, from: (parsed as { from: string }).from };
      return relabel(e, (parsed as { text: string }).text, env.contentLang);
    }
    if ('from' in parsed) return { from: parsed.from };
    const value = uniqueKey(deriveKey(parsed.text) || 'option', taken);
    taken.add(value);
    return { value, label: { [env.contentLang]: parsed.text } as LocalizedText };
  });
}

/** Déplace l'entrée `i` en position `to` (hors limites : liste inchangée). */
export function moveEntry(entries: ChoiceEntry[], i: number, to: number): ChoiceEntry[] {
  if (to < 0 || to >= entries.length || i === to || !entries[i]) return entries;
  const next = [...entries];
  const [e] = next.splice(i, 1);
  next.splice(to, 0, e!);
  return next;
}

/** Duplique l'entrée `i` juste après elle ; une option statique reçoit une valeur libre. */
export function duplicateEntry(entries: ChoiceEntry[], i: number): ChoiceEntry[] {
  const e = entries[i];
  if (!e) return entries;
  const copy = isDynamicEntry(e) ? { ...e } : { ...e, value: uniqueKey(e.value, [OTHER_VALUE, ...valuesOf(entries)]) };
  return [...entries.slice(0, i + 1), copy, ...entries.slice(i + 1)];
}
