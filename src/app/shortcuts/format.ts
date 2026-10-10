const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Affichage d'un raccourci tinykeys : `$mod+Shift+z` → `Ctrl+Shift+Z` (⌘ sur Mac). */
export function formatKey(key: string): string {
  return key
    .split('+')
    .map((p) => {
      if (p === '$mod') return IS_MAC ? '⌘' : 'Ctrl';
      if (p === 'Control') return 'Ctrl';
      const arrows: Record<string, string> = { ArrowDown: '↓', ArrowUp: '↑', ArrowLeft: '←', ArrowRight: '→', Enter: 'Entrée' };
      const physical = /^(?:Key([A-Z])|Digit(\d))$/.exec(p);
      if (physical) return physical[1] ?? physical[2]!;
      return arrows[p] ?? (p.length === 1 ? p.toUpperCase() : p);
    })
    .join('+');
}

const MODIFIERS = ['Control', 'Shift', 'Alt', 'Meta', 'AltGraph', 'CapsLock'];

/**
 * Combinaison tinykeys d'une frappe (écran des raccourcis) : `Ctrl+Shift+Z` → `$mod+Shift+z`.
 * Avec Alt, la touche physique (`KeyI`) : sur Mac, Alt change le caractère produit. Touche de modification seule : rien.
 */
export function comboOf(e: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>): string | undefined {
  if (MODIFIERS.includes(e.key)) return undefined;
  const mods = [e.ctrlKey || e.metaKey ? '$mod' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : ''].filter(Boolean);
  let key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (e.altKey && /^(Key[A-Z]|Digit\d)$/.test(e.code)) key = e.code;
  return [...mods, key].join('+');
}

/** Forme comparable d'une combinaison (détection des doublons) : `Shift+N` = `shift+n`, `$mod` = `Control`. */
export function normalizeKey(key: string): string {
  return key
    .split('+')
    .map((p) => (p === '$mod' ? (IS_MAC ? 'meta' : 'control') : p.replace(/^Key([A-Z])$/, '$1').replace(/^Digit(\d)$/, '$1').toLowerCase()))
    .sort()
    .join('+');
}
