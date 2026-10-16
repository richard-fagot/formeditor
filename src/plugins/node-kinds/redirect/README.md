# plugins/node-kinds/redirect

Nœud Renvoi (`kind: "redirect"`, EVO-024) : `title?`, `text`, `buttons[]` (`label`, `target?`, `when?`), `finishLabel?`.
Raccourci de création : Alt+R (questionnaire seulement, commande `node.newRedirect`).

- `index.tsx` : forme (bordure rose épaisse à gauche), aperçu des boutons dans l'ordre (`redirect-button` : libellé, `redirect-target` = nom
  de la cible par `targetName`, icônes `toggle-prefill` / `toggle-replace`, `redirect-button-when` si condition). `ShapeProps.graphId` : questionnaire du nœud.
- `properties.tsx` : titre, texte, boutons (`redirect-button-editor` : libellé, cible `redirect-target-<i>` = `<select>` des cibles de `redirectTargets`
  (`core/model`), une cible devenue invalide reste affichée « (introuvable) » ; toggles `redirect-prefill-<i>` / `redirect-replace-<i>` pour une cible
  questionnaire ; condition `ExpressionInput` ; monter, descendre, `redirect-remove-<i>`), « Ajouter un bouton » (`redirect-add`), libellé du bouton Terminer.
- `texts.ts` : textes de l'outil (`{ fr, en }`).
- Pas de `Page` : la page de prévisualisation (clics, messages, retour) est rendue par `ui/preview` (`Redirect.tsx`).
