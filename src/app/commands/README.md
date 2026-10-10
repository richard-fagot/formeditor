# app/commands

Catalogue unique des actions utilisateur (spec §4.4). Palette, menus et raccourcis s'appuient tous dessus :
**toute action passe par une commande**.

## API
- `commands()`, `command(id)`, `runCommand(id)` ; `Command` : `id`, `label`, `keys` (défauts tinykeys),
  `scope` (`global` | `graph` : actif seulement focus sur le logigramme), `allowInInput`, `hidden`, `enabled()`, `run()`.
- `connectSelectedTo(nodeId)` (palette en mode « relier »), `download`.

## Fichiers
- `project-commands.ts` : projet (nouveau, ouvrir/importer, exemple, exporter), onglets, palette.
- `graph-commands.ts` : création chaînée (N, Shift+N, Alt+I/S/F), types (générés depuis `registry`),
  obligatoire, « Autre », intitulé, condition, relier, départ, dupliquer, supprimer.
- `nav-commands.ts` : flèches, annuler/rétablir, ajuster la vue, logigramme ↔ prévisualisation.
- `example.ts` : exemple embarqué ; `files.ts` : téléchargement et sélection de fichiers.

## Ajouter une action
Ajouter un objet `Command` dans le fichier adéquat, la clé de libellé dans `app/i18n/messages.ts`.
