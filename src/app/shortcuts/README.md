# app/shortcuts

Liaisons clavier (tinykeys) vers les commandes de `app/commands`.

## API
- `bindShortcuts(window)` → désinstallation. À relancer quand `store.keymap` change.
- `keysOf(command)` : raccourcis personnalisés (`store.keymap[id]`) sinon par défaut.
- `formatKey('$mod+k')` → `Ctrl+K`.

## Règles
- Pendant une saisie (champ, CodeMirror) : seules les commandes `allowInInput` (Ctrl+K, Ctrl+S…).
- Commandes `scope: 'graph'` (raccourcis à une lettre, flèches) : seulement si le focus est dans un élément
  `[data-graph-focus]` (le logigramme) ou nulle part.
- Palette ouverte : aucun raccourci.
- Plusieurs commandes sur une même touche : la dernière disponible l'emporte, sinon la précédente.
