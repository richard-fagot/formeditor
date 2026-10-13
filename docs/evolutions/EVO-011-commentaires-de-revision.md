# EVO-011 — Commentaires de révision sur les questions

Statut : en cours
Dépend de : aucune

## Besoin

Aujourd'hui, la revue d'un questionnaire se fait hors de l'outil : les remarques sur une question
(formulation, choix proposés, règle d'affichage…) circulent par mail ou dans des documents séparés
et perdent le lien avec la question concernée. Je veux pouvoir **commenter une question directement
dans le logigramme**, que ce soit dans un **formulaire**, dans un **fragment** ou dans une
**question réutilisable**, puis **échanger des réponses** dans ce commentaire comme dans une
discussion, afin de mener la revue dans l'outil et de garder la trace des échanges au plus près
de la question.

Je veux aussi une **page des commentaires** qui rassemble tous les commentaires du projet, pour
suivre la revue et répondre sans ouvrir chaque objet.

Exemple d'usage :

```
Formulaire « Déclaration de sinistre »
  Question « Date du sinistre »   — clic droit > Commenter
    Commentaire : « Faut-il borner à la date du jour ? »
      Réponse 1 : « Oui, pas de date future. »
      Réponse 2 : « Et pas avant la date d'effet du contrat. »
```

Affichage attendu : à droite (ou à gauche) du nœud « Date du sinistre », un nœud commentaire
relié à la question par une branche ; le nœud contient le texte initial puis les deux réponses,
chacune dans sa carte, dans l'ordre de saisie. Le nœud question porte une icône *commentaire*.

## Comportement attendu

- **Création** :
  - Un clic droit sur une question (dans un formulaire, un fragment ou une question réutilisable)
    ouvre un menu contextuel proposant *Commenter*.
  - *Commenter* crée le nœud commentaire, l'affiche et place le curseur dans le texte initial.
  - Une question porte au plus un commentaire ; si elle en a déjà un, *Commenter* l'affiche
    au lieu d'en créer un second.
- **Fil de discussion** :
  - Un commentaire = un texte initial suivi de réponses successives, chacune dans sa propre
    carte. Pas d'arborescence : on ne répond pas à une réponse.
  - Nombre de réponses illimité ; une nouvelle réponse s'ajoute en fin de fil.
  - Le texte initial et toutes les réponses restent éditables à tout moment.
  - Une réponse peut être supprimée individuellement.
  - Le texte initial ne peut pas être supprimé seul : pour le retirer, on supprime le
    commentaire entier (texte initial et réponses).
  - Texte brut, multiligne.
- **Affichage dans le logigramme** :
  - Le commentaire est un nœud du logigramme, relié à la question commentée par une branche
    partant du côté gauche ou droit de la question, selon la position du nœud commentaire.
  - Le nœud question porte une icône *commentaire* lorsqu'il a un commentaire : un clic affiche
    le commentaire, un nouveau clic le masque.
  - Le nœud commentaire porte une icône dédiée pour se masquer.
  - Un bouton de la barre d'outils affiche / masque tous les commentaires de l'objet ouvert.
  - Masquer un commentaire ne le supprime pas.
- **Modèle / règles métier** :
  - Le commentaire est rattaché à la question dans l'objet où il a été créé (formulaire,
    fragment ou question réutilisable).
  - Supprimer une question supprime son commentaire (avec confirmation si un commentaire existe).
  - Les commentaires sont sans effet sur le questionnaire : ni expressions, ni règles
    d'affichage, ni wizard.
- **Prévisualisation** : les commentaires n'apparaissent pas dans le wizard.
- **Export développeurs** : les commentaires sont absents du JSON destiné aux développeurs,
  sauf si cette exclusion complexifie trop l'application (voir Analyse) ; ils sont conservés
  dans la sauvegarde du projet.
- **Page des commentaires** :
  - Une page liste tous les commentaires du projet, avec pour chacun l'objet (formulaire,
    fragment, question réutilisable), la question commentée, le texte initial et les réponses.
  - Un bouton sur chaque commentaire ouvre l'objet concerné avec les commentaires affichés ;
    si c'est simple, la vue est centrée sur le commentaire et sa question.
  - Toutes les actions d'édition sont disponibles sur cette page : répondre, modifier le texte
    initial ou une réponse, supprimer une réponse, supprimer le commentaire.
  - Une modification faite sur la page est visible dans le logigramme, et réciproquement.
- **Hors périmètre** : auteur, date, statut « résolu », mentions, notifications.

## Critères d'acceptation

- Quand je fais un clic droit sur une question d'un formulaire, alors un menu propose *Commenter*.
- Quand je fais un clic droit sur une question d'un fragment ou sur une question réutilisable,
  alors le même menu propose *Commenter*.
- Quand je choisis *Commenter*, alors un nœud commentaire apparaît, relié à la question, et je
  peux saisir le texte initial.
- Quand je choisis *Commenter* sur une question déjà commentée, alors le commentaire existant
  s'affiche et aucun second commentaire n'est créé.
- Quand j'ajoute trois réponses, alors elles s'affichent chacune dans sa carte, dans l'ordre
  de saisie, sous le texte initial.
- Quand je modifie le texte initial ou une réponse, alors la modification est conservée après
  sauvegarde et réouverture du projet.
- Quand je supprime une réponse, alors seule cette réponse disparaît.
- Quand je supprime le commentaire, alors le nœud, son texte initial et toutes ses réponses
  disparaissent, ainsi que l'icône *commentaire* de la question.
- Quand je déplace le nœud commentaire de l'autre côté de la question, alors la branche part
  du côté correspondant de la question.
- Quand je clique sur l'icône *commentaire* d'une question, alors son commentaire s'affiche ;
  quand je clique à nouveau, alors il est masqué.
- Quand je clique sur l'icône de masquage d'un nœud commentaire, alors il est masqué et
  l'icône *commentaire* reste présente sur la question.
- Quand j'utilise le bouton afficher / masquer tout, alors tous les commentaires de l'objet
  ouvert s'affichent ou se masquent.
- Quand je supprime une question commentée, alors une confirmation est demandée et le
  commentaire est supprimé avec elle.
- Quand je lance la prévisualisation, alors aucun commentaire n'apparaît dans le wizard.
- Quand j'exporte le JSON développeurs, alors il ne contient aucun commentaire (sous réserve
  de l'Analyse).
- Quand j'ouvre la page des commentaires, alors tous les commentaires du projet y figurent
  avec leur objet et leur question.
- Quand je clique sur le bouton d'ouverture d'un commentaire, alors l'objet s'ouvre avec les
  commentaires affichés (et centré sur le commentaire si retenu en Analyse).
- Quand je réponds, modifie ou supprime depuis la page des commentaires, alors le changement
  est visible dans le logigramme de l'objet.
- Quand je n'utilise pas les commentaires, alors le comportement est identique à aujourd'hui.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur et sans commentaire.
- Quand j'exporte puis réimporte le projet, alors les commentaires, leurs réponses et leur
  position sont identiques.
- Le guide utilisateur décrit la création, l'édition et la suppression des commentaires,
  l'affichage / masquage et la page des commentaires.

## Impacts attendus

- **Format JSON** : nouvelle `formatVersion` et migration de la sauvegarde projet (ajout des
  commentaires), JSON Schema, `docs/FORMAT.md` (structure d'un commentaire et de ses réponses,
  exclusion de l'export développeurs), exemple mis à jour avec une question commentée.
- **Spec** : §… (logigramme — nouveau type de nœud et menu contextuel), §… (fragments et
  questions réutilisables), §… (export développeurs), §… (nouvelle page des commentaires).
- **Guide** : nouvelle section « Commentaires de révision » ; mise à jour des sections
  logigramme et export.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. **Rattachement des commentaires dans les objets réutilisés.** Cible : un commentaire
   appartient à l'objet où il a été créé. Contrainte : une question réutilisable ou un fragment
   apparaît dans plusieurs formulaires. Préciser si leurs commentaires sont visibles depuis un
   formulaire qui les inclut (proposition par défaut : non, ils ne sont visibles et éditables
   que dans l'objet d'origine et sur la page des commentaires), et ce qu'on peut commenter
   depuis un formulaire sur une question issue d'un fragment.
3. **Exclusion de l'export développeurs.** Cible : commentaires dans la sauvegarde projet,
   absents de l'export développeurs. Contrainte : si sauvegarde et export partagent le même
   format, l'exclusion peut demander un second chemin de sérialisation. Alternative si trop
   coûteux : commentaires présents dans l'export sous une clé isolée, documentée comme ignorable.
4. **Nœud commentaire dans le logigramme.** Cible : nœud positionnable, branche gauche / droite
   selon sa position, position mémorisée. Contrainte : le moteur de mise en page du logigramme
   peut ne pas accepter de nœud hors flux. Alternative attendue si irréalisable. Indiquer aussi
   si le centrage sur le commentaire depuis la page est faisable simplement.
5. **État affiché / masqué.** Préciser s'il est mémorisé dans le projet ou propre à la session
   (proposition : propre à la session, commentaires masqués à l'ouverture sauf ouverture depuis
   la page des commentaires).

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
