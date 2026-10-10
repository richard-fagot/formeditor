# ui/shell

Cadre de l'application. Dépend de `app/*`, `ui/*`, `ui-kit`.

## Composants
- `App` : restauration de la session et sauvegarde automatique (`app/persistence`), liaison des raccourcis
  (`app/shortcuts`, relancée si `keymap` change), barre, onglets, contenu, palette, fenêtre d'erreurs d'import.
- `TopBar` : nom du projet, nouveau / ouvrir / exemple / exporter (bundle, fichiers), langue du contenu,
  langue de l'interface, indicateur « modifications non exportées », bouton de palette.
- `Tabs` : questionnaires ouverts (fermer, rouvrir), nouveau questionnaire, bibliothèque, état du système.
- `QuestionnaireView` : sous-onglets Logigramme / Prévisualisation ; graphe + panneau Problèmes à gauche,
  propriétés à droite.
- `Palette` (cmdk) : commandes disponibles + recherche de nœud ; mode « relier » (commande E).
- `ProblemsPanel` : vérifications du §4.6 du questionnaire ; clic = sélection.

Tous les boutons appellent des commandes (`runCommand`) : rien n'est câblé en dehors du catalogue.
