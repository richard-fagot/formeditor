import { tinykeys } from 'tinykeys';
import { commands, type Command } from '../commands';
import { useStore } from '../store';

/**
 * Saisie en cours : champ, zone de texte, CodeMirror, contenteditable
 * (et, avec `dialog`, tout élément situé dans une boîte de dialogue).
 */
export function isTyping(el: Element | null, opts: { dialog?: boolean } = {}): boolean {
  if (!el) return false;
  const h = el as HTMLElement;
  return h.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(h.tagName)
    || !!h.closest(opts.dialog ? '.cm-editor, [role=dialog]' : '.cm-editor');
}

/** Un logigramme est-il affiché (questionnaire en vue logigramme, ou bloc dans l'onglet Bibliothèque) ? */
function diagramShown(): boolean {
  const s = useStore.getState();
  if (s.activeTab === 'library') return s.libraryItem?.kind === 'block';
  return s.activeTab.startsWith('q:') && (s.view[s.activeTab.slice(2)] ?? 'diagram') === 'diagram';
}

/**
 * Le focus est-il sur le logigramme, nulle part, ou sur un élément non saisissable (bouton du panneau
 * des problèmes, de la barre…) hors dialogue alors que le logigramme est affiché ?
 */
function graphHasFocus(): boolean {
  const el = document.activeElement;
  if (!el || el === document.body || el.closest('[data-graph-focus]')) return true;
  return diagramShown() && !isTyping(el, { dialog: true });
}

/** Entrée / Espace sur un bouton ou un lien focalisé l'activent : aucune commande ne s'en empare. */
function activatesFocused(e: KeyboardEvent): boolean {
  if (e.key !== 'Enter' && e.key !== ' ') return false;
  const el = document.activeElement;
  return !!el && !el.closest('[data-graph-focus]') && !!el.closest('button, a[href], [role=button], [role=tab], summary');
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
        const allowed = typing ? !!c.allowInInput : !activatesFocused(e) && (c.scope === 'global' || graphHasFocus());
        if (allowed && (!c.enabled || c.enabled())) {
          e.preventDefault();
          c.run();
        } else previous?.(e);
      };
    }
  }
  return tinykeys(target, map, { ignore: () => false });
}
