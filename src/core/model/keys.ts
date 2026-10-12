/** Mots ignorés lors de la dérivation d'une clé à partir d'un intitulé. */
const STOP_WORDS = new Set([
  'a', 'au', 'aux', 'de', 'des', 'du', 'd', 'l', 'la', 'le', 'les', 'un', 'une', 'et', 'en', 'ou',
  'the', 'of', 'an', 'to', 'votre', 'vos', 'son', 'sa', 'ses',
]);
const MAX_WORDS = 5;
/** Clés réservées par la grammaire des expressions. */
export const RESERVED_KEYS = new Set(['sys', 'true', 'false', 'null', 'and', 'or', 'in', 'groupe']);

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

export function isValidKey(key: string): boolean {
  return KEY_PATTERN.test(key) && !RESERVED_KEYS.has(key);
}

/** « Date du sinistre » → `date_sinistre`. */
export function deriveKey(label: string): string {
  const words = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .slice(0, MAX_WORDS);
  if (words.length === 0) return 'question';
  const key = words.join('_');
  return /^[0-9]/.test(key) || RESERVED_KEYS.has(key) ? `q_${key}` : key;
}

/** Ajoute `_2`, `_3`… si la clé existe déjà. */
export function uniqueKey(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

/** Id technique court et aléatoire, préfixé (`n_…`, `e_…`). */
export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
