import type { MessageKey, Translate } from '../i18n';

/** Action utilisateur, déclarée une seule fois : palette, menus et raccourcis s'appuient dessus. */
export interface Command {
  id: string;
  /** Libellé : clé du dictionnaire, ou fonction (libellés paramétrés). */
  label: MessageKey | ((t: Translate) => string);
  /** Raccourcis par défaut (syntaxe tinykeys : `n`, `Shift+N`, `$mod+k`, `Alt+i`). */
  keys: string[];
  /** `graph` : actif seulement quand le focus est sur le logigramme (raccourcis à une lettre). */
  scope: 'global' | 'graph';
  /** Le raccourci reste actif pendant une saisie (Ctrl+K, Ctrl+S). */
  allowInInput?: boolean;
  /** Masquée de la palette (navigation aux flèches). */
  hidden?: boolean;
  enabled?(): boolean;
  run(): void;
}

export const labelOf = (c: Command, t: Translate) => (typeof c.label === 'function' ? c.label(t) : t(c.label));
