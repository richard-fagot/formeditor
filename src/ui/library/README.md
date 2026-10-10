# ui/library

Onglet Bibliothèque. Dépend de `app/commands`, `app/store`, `core/model`, `ui-kit`.

- `Library` : contenu de l'onglet.
- `LabelSets` : jeux de libellés (`kind` booléen ou tri-state, clé, libellés multilingues vrai / faux /
  « ne sait pas »). Création et suppression par les commandes `labelSet.addBoolean`, `labelSet.addTristate`,
  `labelSet.delete` ; saisie des libellés par `store.edit('library', …)` (frappes regroupées).

## À venir (phase 7)
Questions et blocs de la bibliothèque.
