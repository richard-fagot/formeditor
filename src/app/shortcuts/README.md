# app/shortcuts

Liaisons clavier (tinykeys) vers les commandes de `app/commands`.

## API
- `bindShortcuts(window)` → désinstallation. À relancer quand `store.keymap` change.
- `keysOf(command)` : raccourcis personnalisés (`store.keymap[id]`) sinon par défaut.
- `formatKey('$mod+k')` → `Ctrl+K` (`KeyI` → `I`).
- `comboOf(event)` : combinaison tinykeys d'une frappe (écran des raccourcis ; avec Alt, touche physique `KeyX`).
- `normalizeKey(key)` : forme comparable (doublons). Tests : `format.test.ts`.
- `isTyping(el, { dialog? })` : saisie en cours (champ, CodeMirror, contenteditable ; avec `dialog`, tout élément
  d'une boîte de dialogue). Seule détection de saisie de l'application.

## Règles
- Pendant une saisie (champ, CodeMirror) : seules les commandes `allowInInput` (Ctrl+K, Ctrl+S…). La saisie se juge sur
  l'élément focalisé **et** sur la cible de la frappe : l'`Entrée` qui valide la palette (champ démonté entre-temps) ne
  déclenche pas « Éditer l’intitulé ».
- Commandes `scope: 'graph'` (raccourcis à une lettre, flèches) : si le focus est dans un élément
  `[data-graph-focus]` (le logigramme), nulle part, ou sur un élément non saisissable hors dialogue (bouton du
  panneau des problèmes, de la barre…) pendant qu'un logigramme est affiché (questionnaire en vue logigramme, ou bloc dans l'onglet Bibliothèque).
- Entrée / Espace sur un bouton, lien ou onglet focalisé hors logigramme : l'élément est activé, aucune commande.
- Palette ouverte : aucun raccourci.
- Plusieurs commandes sur une même touche : la dernière disponible l'emporte, sinon la précédente.
