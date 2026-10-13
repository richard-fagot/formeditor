# app/commands

Catalogue unique des actions utilisateur (spec §4.4). Palette, menus et raccourcis s'appuient tous dessus :
**toute action passe par une commande**.

## API
- `commands()`, `command(id)`, `runCommand(id, arg?)` ; `Command` : `id`, `label`, `keys` (défauts tinykeys),
  `scope` (`global` | `graph` : actif seulement focus sur le logigramme), `allowInInput`, `hidden`, `enabled()`, `run(arg?)`.
  `arg` : paramètre fourni par un bouton ou un champ (onglet, langue, valeur saisie) ; les commandes qui
  l'exigent sont `hidden` (absentes de la palette).
- `setPastePoint(graphe, position?)` : position du pointeur sur le logigramme (collage, EVO-010).
- `download(name, texte | Blob)` ; `imageFileName(projet, titre, date)` (`<projet> - <titre> - AAAAMMJJ.png`, caractères
  interdits → `_`), `imageTitle(questionnaire, langue, langueParDéfaut)` (`image-file.ts`, fonctions pures).

## Fichiers
- `project-commands.ts` : projet (nouveau, ouvrir/importer, exemple, exporter), onglets, palette.
- `graph-commands.ts` : création chaînée (N, Shift+N, Alt+I/S/F), types (générés depuis `registry`),
  obligatoire, « Autre », « Ne sais pas » (`node.toggleDontKnow`, sans raccourci), intitulé, condition, relier (`node.connect`, `node.connectTo`), départ, dupliquer,
  supprimer (`node.delete` : nœuds sélectionnés, sinon l'arête sélectionnée).
- `shell-commands.ts` : `tab.open` (rouvrir un questionnaire fermé), `tab.show`, `tab.close`, `lang.content`, `lang.ui`
  (sans paramètre : langue suivante).
- `edit-commands.ts` : `edge.moveUp` / `edge.moveDown` (Alt+↑ / Alt+↓, arête sélectionnée), `edge.create`
  (glisser sur le logigramme), `questionnaire.properties`, `questionnaire.setTitle` / `rename` / `setDescription`,
  `project.rename`.
- `library-commands.ts` : jeux de libellés (`labelSet.addBoolean`, `labelSet.addTristate`, `labelSet.delete` avec l'id).
- `library-item-commands.ts` : `library.newQuestion`, `library.newFragment` (ouvre l'onglet `f:<id>`), `library.openRef` (EVO-013, badge « bib. » : `{ kind, id }`, objet introuvable → `notice`, sinon comme `library.show`), `library.show` (question : onglet
  Bibliothèque ; fragment : son onglet) / `library.delete` (`arg` = `{ kind, id }` ; ferme l'onglet du fragment),
  `library.insert` (I : palette en mode bibliothèque), `library.insertItem` (`{ kind, id, graph?, position? }` : à la suite de
  la sélection, ou à la position d'un dépôt), `view.libraryPanel`, `node.group` (Ctrl+G, questionnaire seulement ;
  transaction questionnaire + bibliothèque via `edit` ; « Extraire la sélection en fragment », refus avec message : plusieurs entrées, fin ou sortie),
  `node.toLibrary` (« Copier dans la bibliothèque », EVO-009 : question locale ; clé prise → `copyRequest` (dialogue de `ui/shell`) puis
  `runCommand('node.toLibrary', { graph, nodeId, key })` ; références réécrites listées dans `notice`), `node.openInLibrary` (question de bibliothèque), `node.resetRequired` (« Revenir à la valeur héritée », EVO-012 : retire la surcharge du caractère obligatoire de la référence sélectionnée, ou toutes celles de l'appel sélectionné ; `resetRequired`), `node.openFragment` (nœud fragment), `node.setEntry` (fragment seulement :
  règle `entry`, ou la retire sur l'entrée réglée), `node.newExit` (fragment seulement). `library.insertItem` refuse un cycle d'appels (message `insert.cycle`).
- Les commandes du graphe agissent sur le graphe actif (`activeGraphRef`) : questionnaire, ou fragment ouvert dans son onglet. Dans un
  fragment, `node.setStart` et `node.newEnd` sont indisponibles.
- `system-commands.ts` : `system.addVariable` (ouvre l'onglet, focus sur le nom), `system.deleteVariable`, `system.renameVariable`, `system.renameField`
  (`{ name, next }` ; transaction `transact` : un seul Ctrl+Z annule tout le renommage), `scenario.add` (sans paramètre : valeurs d'exemple ; avec un id :
  copie), `scenario.delete`, `preview.saveScenario` (prévisualisation affichée ; `arg` = nom), `preview.toggleSystem`, `preview.toggleDebug`.
- `settings-commands.ts` : `tab.settings`, langues (`lang.add`, `lang.remove`, `lang.default`, `arg` = code),
  `preview.lang` (langue de la prévisualisation affichée ; sans paramètre : la suivante), raccourcis (`shortcut.set` avec
  `{ id, keys }`, `shortcut.reset` avec un id ou sans paramètre pour tout rétablir), `view.layout` (L, logigramme affiché :
  incrémente `layoutRequest`), `view.compare` (`arg` = questionnaire comparé ; sans paramètre : bascule).
- `image-commands.ts` (EVO-004) : `view.exportImage` (X, logigramme ; questionnaire non vide en vue Logigramme) ouvre le
  dialogue ; `view.exportImageRun` (cachée, `arg` = `{ scope, title }`) mémorise les choix, ferme le dialogue et incrémente
  `imageRequest`, que `ui/diagram` exécute (capture).
- `clipboard-commands.ts` (EVO-010) : `node.copy` (Ctrl+C, logigramme ; inactif si du texte est sélectionné dans la page), `node.paste` (Ctrl+V ; `arg` = `{ position }`,
  sinon pointeur posé par `setPastePoint` de `ui/diagram` ; indisponible si le presse-papiers vient d'un autre projet ; éléments écartés listés dans `notice`),
  `questionnaire.duplicate` (`arg` = id, sinon le questionnaire affiché ; ouvre la copie), `library.duplicate` (`arg` = `{ kind, id }`, sinon le fragment de l'onglet
  actif ou la question affichée ; ouvre la copie).
- `comment-commands.ts` (EVO-011) : `comment.add` (« Commenter » : `arg` `{ host, node }` ou question sélectionnée ; existant → affiché ; question de
  bibliothèque → vue de la question), `comment.toggle`, `comment.toggleAll` (graphe affiché : tout afficher si l'un est masqué, sinon tout masquer),
  `comment.reply`, `comment.deleteReply` (`{ host, node, index }`), `comment.delete`, `comment.open` (page → objet, commentaires affichés, `centerRequest`),
  `tab.comments`. `node.delete` et `library.delete` (question) demandent confirmation (`window.confirm`) si un commentaire existe.
- `enabled(arg?)` reçoit le paramètre de `runCommand` (commande appelée depuis un menu sur un autre objet que la sélection).
- `nav-commands.ts` : flèches, annuler/rétablir (portée `global` : actifs hors du logigramme, pas pendant une saisie ; onglet Bibliothèque → historique `library`), ajuster la vue, logigramme ↔ prévisualisation.
- `example.ts` : exemple embarqué ; `files.ts` : téléchargement et sélection de fichiers.

## Tests
`commands.test.ts` (jeux de libellés, onglets, langues, rang et suppression d'arête, propriétés du questionnaire) ;
`system-commands.test.ts` (dictionnaire, scénarios, enregistrement depuis la prévisualisation, panneaux) ;
`settings-commands.test.ts` (langues, langue de la prévisualisation, raccourcis, vue côte à côte, mise en page) ;
`image-file.test.ts` (nom du fichier image, commandes d'export, entrée du guide) ;
`clipboard-commands.test.ts` (EVO-010 : copier-coller, renommage, fragment, annulation, duplication, export / réimport, guide) ;
`comment-commands.test.ts` (EVO-011 : un test par critère d'acceptation testable sans navigateur, entrée du guide) ;
`library-commands.test.ts` (insertion, dépôt, regroupement et annulation, fragment : onglet, entrée, cycle refusé, ouverture, sortie nommée ; question vers la bibliothèque ; entrée du guide EVO-008).

## Ajouter une action
Ajouter un objet `Command` dans le fichier adéquat, la clé de libellé dans `app/i18n/messages.ts`, puis l’entrée balisée
`[cmd: id]` dans `docs/GUIDE.md` et `npm run guide` (index des raccourcis) : sinon `npm run check` échoue.
