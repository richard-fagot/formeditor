# ui/comments

Commentaires de révision (EVO-011). Dépend de `app/commands`, `app/store`, `core/model`, `core/references`, `plugin-api`, `ui-kit`.

## API
- `CommentThread({ cref, actions?, className? })` : fil d'un commentaire (`CommentRef` = objet + nœud) : texte initial puis une carte par
  réponse, multilignes, modifiables (`store.edit` dans la portée de l'objet, `hostScope`, frappes regroupées par champ) ; « Répondre »
  (`comment.reply`), suppression d'une réponse (`comment.deleteReply`) et du commentaire (`comment.delete`). Un champ prend le focus quand
  `focusRequest` vaut `{ kind: 'comment', id: commentKey }` (texte initial) ou `commentKey#i` (réponse i). Utilisé par le nœud commentaire
  du logigramme (`ui/diagram`), la vue d'une question de bibliothèque (`ui/library`) et la page des commentaires.
- `HideCommentButton({ cref })` : icône « Masquer le commentaire » (`comment.toggle`).
- `CommentsPage` : onglet `comments` (`ui/shell`) : tous les commentaires du projet (`allComments`), avec l'objet (questionnaire, fragment,
  question réutilisable), la question commentée, le fil éditable et « Ouvrir » (`comment.open`).

## Pièges
- Les champs portent `nodrag nowheel nopan` (dans un nœud React Flow) et arrêtent la propagation des touches.
