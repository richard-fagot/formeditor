# EVO-014 — Désactivation des contrôles de surface en prévisualisation

Statut : en cours
Dépend de : aucune

## Besoin

Aujourd'hui, en prévisualisation, je ne peux passer à l'étape suivante que si les champs et
questions de l'étape courante respectent leurs **contrôles de surface** (caractère obligatoire,
format, bornes, longueur, nombre de réponses…). Pour vérifier l'enchaînement des écrans d'un
questionnaire, je dois donc saisir des valeurs valides à chaque étape, ce qui est long et sans
intérêt quand je teste uniquement la navigation.

Je veux pouvoir **activer ou désactiver les contrôles de surface** depuis la prévisualisation,
à l'aide d'un **bouton toggle**, afin de **naviguer librement** dans le questionnaire sans être
obligé de saisir des valeurs.

Les **conditions de navigation** (branchements du logigramme, affichage conditionnel) ne sont
pas des contrôles de surface : elles continuent de s'appliquer, y compris sur des réponses
vides.

Exemple d'usage :

```
Étape 1 : « Nom » (obligatoire), « Âge » (numérique, 18 à 99)
Étape 2 : « Situation familiale » (choix unique, obligatoire)
          → si « Marié(e) » : étape 3 « Conjoint », sinon étape 4
```

Contrôles désactivés : je clique sur « Suivant » à l'étape 1 sans rien saisir, j'arrive à
l'étape 2 ; je clique sur « Suivant » sans choisir de situation, j'arrive à l'étape 4 (la
condition « Marié(e) » est fausse sur une réponse vide).

Affichage attendu : le toggle est visible en permanence dans la barre de la prévisualisation,
libellé « Contrôles de saisie », activé par défaut. Quand il est désactivé, un bandeau discret
« Contrôles de saisie désactivés » rappelle le mode en cours.

## Comportement attendu

- **Toggle** :
  - Activé par défaut à la première ouverture de la prévisualisation.
  - Son état est conservé tant que l'éditeur reste ouvert (fermeture / réouverture de la
    prévisualisation, changement de questionnaire), et n'est pas enregistré dans le projet.
  - Il peut être basculé à tout moment, à n'importe quelle étape.
- **Contrôles désactivés** :
  - Aucun contrôle de surface ne bloque la navigation (« Suivant », « Précédent », fin de
    questionnaire), quelle que soit la nature du champ ou de la question.
  - Aucun message d'erreur de saisie n'est affiché.
  - Les valeurs saisies, même invalides, sont conservées.
- **Contrôles réactivés** :
  - Les contrôles s'appliquent de nouveau à la prochaine tentative de navigation depuis l'étape
    courante ; les étapes déjà franchies ne sont pas revérifiées rétroactivement.
  - Les valeurs déjà saisies sont conservées.
- **Expressions / navigation** :
  - Les conditions de branchement et d'affichage sont évaluées normalement, sur les valeurs
    présentes, y compris vides ou invalides.
  - Une évaluation impossible (ex. comparaison numérique sur une valeur vide) ne bloque pas la
    prévisualisation : la condition est considérée comme fausse.
- **Prévisualisation** : seul le comportement de validation change ; le rendu des champs est
  identique.

## Critères d'acceptation

- Quand j'ouvre la prévisualisation pour la première fois, alors le toggle est activé et les
  contrôles s'appliquent comme aujourd'hui.
- Quand je désactive le toggle et clique sur « Suivant » sans remplir un champ obligatoire,
  alors je passe à l'étape suivante sans message d'erreur.
- Quand les contrôles sont désactivés et que je saisis une valeur hors bornes ou hors format,
  alors je peux passer à l'étape suivante et la valeur reste affichée si je reviens en arrière.
- Quand les contrôles sont désactivés et qu'une question conditionnant un branchement est
  laissée vide, alors la navigation suit la branche correspondant à une réponse vide (exemple
  du Besoin : étape 4).
- Quand une condition ne peut pas être évaluée sur une valeur vide ou invalide, alors la
  prévisualisation ne génère pas d'erreur et la condition est considérée comme fausse.
- Quand les contrôles sont désactivés, alors le bandeau « Contrôles de saisie désactivés » est
  visible ; quand je les réactive, il disparaît.
- Quand je réactive les contrôles sur une étape contenant un champ invalide et clique sur
  « Suivant », alors le message d'erreur s'affiche et la navigation est bloquée.
- Quand je ferme puis rouvre la prévisualisation sans fermer l'éditeur, alors le toggle a
  conservé son état.
- Quand j'enregistre puis rouvre le projet, alors le fichier ne contient aucune information
  liée au toggle.
- Quand je n'utilise pas le toggle, alors le comportement est identique à aujourd'hui.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur.
- Quand j'exporte puis réimporte, alors les questionnaires sont identiques.
- Le guide utilisateur décrit le toggle, son effet sur les contrôles et le fait que les
  conditions de navigation restent appliquées.

## Impacts attendus

- **Format JSON** : aucun (état non persisté).
- **Spec** : §… (Prévisualisation — navigation et validation).
- **Guide** : section Prévisualisation.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Séparation contrôles de surface / logique de navigation : la cible est un point unique de
   bascule qui court-circuite la validation sans toucher à l'évaluation des conditions. Si
   validation et navigation sont imbriquées dans le code actuel, proposer le découpage minimal
   nécessaire, ou à défaut la liste des contrôles qui ne pourraient pas être désactivés.
3. Évaluation des expressions sur valeurs vides ou invalides : vérifier que le moteur
   d'expressions renvoie « faux » sans lever d'erreur ; sinon, préciser le traitement retenu
   (valeur invalide traitée comme vide, par exemple) et ses effets sur les branchements.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
