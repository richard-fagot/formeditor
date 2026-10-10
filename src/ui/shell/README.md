# ui/shell

Cadre de l'application. Dépend de `app/*`, `ui/*`, `ui-kit`.

## Composants
- `App` : restauration de la session et sauvegarde automatique (`app/persistence`), liaison des raccourcis
  (`app/shortcuts`, relancée si `keymap` change), barre, onglets, contenu, palette, fenêtre d'erreurs d'import.
- `TopBar` : nom du projet, nouveau / ouvrir / exemple / exporter (bundle, fichiers), langue du contenu,
  langue de l'interface, indicateur « modifications non exportées », bouton de palette.
- `Tabs` : questionnaires ouverts (fermer, rouvrir), nouveau questionnaire, bibliothèque (`ui/library`), état du système (`ui/system-state`),
  paramètres (`ui/settings`, ouverts par le bouton engrenage de la barre).
- `QuestionnaireView` : sous-onglets Logigramme / Prévisualisation ; boutons mise en page automatique (`view.layout`) et vue
  côte à côte (`view.compare`) ; panneau latéral de la bibliothèque (`ui/library`, affiché / masqué par `view.libraryPanel`,
  masqué pendant la vue côte à côte), graphe + panneau Problèmes (`ui/diagram`), propriétés à droite.
- `ComparePane` : vue côte à côte, logigramme d'un autre questionnaire en lecture seule (`Diagram readOnly`), choix du questionnaire, fermeture.
- `Palette` (cmdk) : commandes disponibles, insertion depuis la bibliothèque (« Insérer : … ») et recherche de nœud ;
  mode « relier » (commande E) ; mode « bibliothèque » (commande I : questions et blocs seulement).

Tous les boutons, sélecteurs (langues), onglets (afficher, fermer, rouvrir) et le nom du projet appellent
des commandes (`runCommand`) : aucune action n'est câblée en dehors du catalogue. Restent hors catalogue,
par choix (DECISIONS.md) : la sélection (clic sur un problème, un nœud de la palette), la fermeture des fenêtres.
