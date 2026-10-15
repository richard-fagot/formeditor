# ui/system-state

Onglet « État du système » (spec §4.5) : dictionnaire des variables du projet et scénarios nommés.
Fournit aussi la saisie des valeurs, réutilisée par le panneau d'état du système de `ui/preview`.
Dépend de `app/commands`, `app/store`, `core/model`, `core/references` (usages), `ui-kit`, `ui/properties` (`KeyInput`).

## API
- `SystemState` : écran complet (variables à gauche, scénarios à droite).
- `ValueInput` : saisie d'une valeur selon le type déclaré (texte, nombre, date, booléen, énumération ;
  liste d'objets en JSON, transmise seulement si valide) ; signale un écart au type (`valueError`, non bloquant).
- `SystemValuesEditor` : une `ValueInput` par variable du dictionnaire (`id` = `<idPrefix>-<nom>`), libellé de la variable
  en face de `sys.<nom>` (scénarios et panneau de la prévisualisation).

## Fichiers
- `VariableCard.tsx` : nom (renommage propagé : commande `system.renameVariable`), libellé `caption` (EVO-005, clé
  d'historique `sys:<nom>:caption` ; `sys:<nom>:field<i>:caption` pour un champ de liste), type (`setVariableType`),
  description, valeurs d'une énumération (une par ligne), schéma d'une liste (champs de types simples ; nom validé
  par `KeyInput`, renommage propagé : `system.renameField`), problèmes du dictionnaire (`useIssues` d'`app/issues`, propriétaire `system`),
  valeur d'exemple, nombre d'usages (`findUsages`), suppression (`system.deleteVariable`).
- `ScenarioCard.tsx` : nom, description, valeurs ; dupliquer (`scenario.add` avec l'id), supprimer (`scenario.delete`).

## Invariants
- Création, suppression, renommage passent par les commandes ; la saisie continue passe par
  `store.edit('project', …, clé)` (frappes regroupées, annulable dans l'historique du projet).
- L'autocomplétion des expressions lit le dictionnaire via la portée de `core/references` (`sys.…`,
  description en info-bulle, libellé et valeurs d'une énumération en détail ; recherche aussi sur le libellé).
