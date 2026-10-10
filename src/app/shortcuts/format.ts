const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** Affichage d'un raccourci tinykeys : `$mod+Shift+z` → `Ctrl+Shift+Z` (⌘ sur Mac). */
export function formatKey(key: string): string {
  return key
    .split('+')
    .map((p) => {
      if (p === '$mod') return IS_MAC ? '⌘' : 'Ctrl';
      if (p === 'Control') return 'Ctrl';
      const arrows: Record<string, string> = { ArrowDown: '↓', ArrowUp: '↑', ArrowLeft: '←', ArrowRight: '→', Enter: 'Entrée' };
      return arrows[p] ?? (p.length === 1 ? p.toUpperCase() : p);
    })
    .join('+');
}
