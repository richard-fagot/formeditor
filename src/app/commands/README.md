# app/commands

Catalogue unique des actions utilisateur (spec §4.4). Palette, menus et raccourcis s'appuient tous dessus :
**toute action passe par une commande**.

## API
- `commands()`, `command(id)`, `runCommand(id, arg?)` ; `Command` : `id`, `label`, `keys` (défauts tinykeys),
  `scope` (`global` | `graph` : actif seulement focus sur le logigramme), `allowInInput`, `hidden`, `enabled()`, `run(arg?)`.
  `arg` : paramètre fourni par un bouton ou un champ (onglet, langue, valeur saisie) ; les commandes qui
  l'exigent sont `hidden` (absentes de la palette).
- `download`.

## Fichiers
- `project-commands.ts` : projet (nouveau, ouvrir/importer, exemple, exporter), onglets, palette.
- `graph-commands.ts` : création chaînée (N, Shift+N, Alt+I/S/F), types (générés depuis `registry`),
  obligatoire, « Autre », intitulé, condition, relier (`node.connect`, `node.connectTo`), départ, dupliquer,
  supprimer (`node.delete` : nœuds sélectionnés, sinon l'arête sélectionnée).
- `shell-commands.ts` : `tab.open` (rouvrir un questionnaire fermé), `tab.show`, `tab.close`, `lang.content`, `lang.ui`
  (sans paramètre : langue suivante).
- `edit-commands.ts` : `edge.moveUp` / `edge.moveDown` (Alt+↑ / Alt+↓, arête sélectionnée), `edge.create`
  (glisser sur le logigramme), `questionnaire.properties`, `questionnaire.setTitle` / `rename` / `setDescription`,
  `project.rename`.
- `nav-commands.ts` : flèches, annuler/rétablir, ajuster la vue, logigramme ↔ prévisualisation.
- `example.ts` : exemple embarqué ; `files.ts` : téléchargement et sélection de fichiers.

## Tests
`commands.test.ts` (onglets, langues, rang et suppression d'arête, propriétés du questionnaire).

## Ajouter une action
Ajouter un objet `Command` dans le fichier adéquat, la clé de libellé dans `app/i18n/messages.ts`.
