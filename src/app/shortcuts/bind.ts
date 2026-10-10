import { tinykeys } from 'tinykeys';
import { commands, type Command } from '../commands';
import { useStore } from '../store';

/** Élément de saisie (champ, zone de texte, CodeMirror, contenteditable). */
function isTyping(el: Element | null): boolean {
  if (!el) return false;
  const h = el as HTMLElement;
  return h.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(h.tagName) || !!h.closest('.cm-editor');
}

/** Le focus est-il sur le logigramme (ou nulle part) ? */
function graphHasFocus(): boolean {
  const el = document.activeElement;
  return !el || el === document.body || !!el.closest('[data-graph-focus]');
}

/** Raccourcis effectifs d'une commande : personnalisés s'il y en a, sinon par défaut. */
export function keysOf(c: Command): string[] {
  return useStore.getState().keymap[c.id] ?? c.keys;
}

/** Installe les raccourcis clavier sur la fenêtre ; renvoie la fonction de désinstallation. */
export function bindShortcuts(target: Window = window): () => void {
  const map: Record<string, (e: KeyboardEvent) => void> = {};
  for (const c of commands()) {
    for (const key of keysOf(c)) {
      const previous = map[key];
      map[key] = (e) => {
        if (useStore.getState().palette.open) return;
        const typing = isTyping(document.activeElement);
        const allowed = typing ? !!c.allowInInput : c.scope === 'global' || graphHasFocus();
        if (allowed && (!c.enabled || c.enabled())) {
          e.preventDefault();
          c.run();
        } else previous?.(e);
      };
    }
  }
  return tinykeys(target, map, { ignore: () => false });
}
