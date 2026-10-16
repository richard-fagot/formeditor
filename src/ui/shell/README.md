# ui/shell

Cadre de l'application. Dépend de `app/*`, `ui/*`, `ui-kit`.

## Composants
- `App` : restauration de la session et sauvegarde automatique (`app/persistence`), liaison des raccourcis
  (`app/shortcuts`, relancée si `keymap` change), barre, onglets, contenu, palette, fenêtre d'erreurs d'import.
- `TopBar` : nom du projet, nouveau / ouvrir / exporter (bundle, fichiers), langue du contenu,
  langue de l'interface, indicateur « modifications non exportées », bouton de palette.
- `Tabs` : questionnaires ouverts (fermer, rouvrir), fragments ouverts (`f:<id>`, icône ambre ; contenu : `FragmentView` de `ui/library`, EVO-008), nouveau questionnaire, bibliothèque (`ui/library`), état du système (`ui/system-state`),
  paramètres (`ui/settings`, ouverts par le bouton engrenage de la barre), commentaires (`comments` : `CommentsPage` de `ui/comments`, lien « Commentaires » à droite, EVO-011). Clic droit sur un onglet de questionnaire (ou un questionnaire fermé)
  ou de fragment : « Dupliquer » (`questionnaire.duplicate`, `library.duplicate`, EVO-010). Marqueur « Validé » (`validated-badge`, date au survol) sur l'onglet
  ou le bouton de réouverture d'un questionnaire validé (EVO-015).
- `QuestionnaireView` : sous-onglets Logigramme / Prévisualisation ; boutons mise en page automatique (`view.layout`), image du logigramme
  (`view.exportImage`, grisé sur un questionnaire vide ou pendant l'export : « Export en cours… ») vue
  côte à côte (`view.compare`) et « Commentaires » (`comment.toggleAll`, grisé sans commentaire, EVO-011), « Valider le formulaire » (`validate`) ou « Dévalider » (`unvalidate`) selon l'état (EVO-015),
  marqueur « Validé » en haut à gauche du logigramme (`diagram-validated`), dessous l'alerte de dépendance `VersionAlert` (`version-alert`, EVO-022 : `versionAlerts`) ; panneau latéral de la bibliothèque (`ui/library`, affiché / masqué par `view.libraryPanel`,
  masqué pendant la vue côte à côte), graphe + panneau Problèmes (`ui/diagram` ; problèmes : `useIssues` d'`app/issues`), propriétés à droite.
- `ComparePane` : vue côte à côte, logigramme d'un autre questionnaire en lecture seule (`Diagram readOnly`), choix du questionnaire, fermeture.
- `CopyDialog` (EVO-009) : copie en bibliothèque dont la clé est prise (`copyRequest`) : « Nouvelle clé » proposée suffixée,
  « Copier » grisé tant qu'elle est invalide ou prise (bibliothèque, graphe), puis `node.toLibrary` avec la clé.
- `Palette` (cmdk) : commandes disponibles, insertion depuis la bibliothèque (« Insérer : … ») et recherche de nœud ;
  mode « relier » (commande E) ; mode « bibliothèque » (commande I : questions et fragments seulement, sans ceux qui créeraient un cycle d'appels).

Tous les boutons, sélecteurs (langues), onglets (afficher, fermer, rouvrir) et le nom du projet appellent
des commandes (`runCommand`) : aucune action n'est câblée en dehors du catalogue. Restent hors catalogue,
par choix (DECISIONS.md) : la sélection (clic sur un problème, un nœud de la palette), la fermeture des fenêtres.
