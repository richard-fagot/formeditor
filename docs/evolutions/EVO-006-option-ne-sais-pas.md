# EVO-006 — Option « Ne sais pas » sur tous les types de questions

Statut : en cours
Dépend de : aucune (s'articule avec EVO-003 pour les groupes et EVO-004 pour la table de décision)

## Besoin

Aujourd'hui, une personne qui ne connaît pas la réponse n'a pas de moyen explicite de le dire :
elle laisse la question vide (bloquant si la question est obligatoire) ou choisit une réponse
au hasard. Je veux pouvoir **activer une option « Ne sais pas »** sur **n'importe quelle question**,
quel que soit son type, afin de distinguer « je ne sais pas » de « pas de réponse » et de
l'exploiter dans les conditions et les expressions.

Exemple d'usage, sur deux questions :

```
Date du sinistre : [__/__/____]   ☐ Ne sais pas

Lien avec l'assuré :
  ○ Conjoint
  ○ Enfant
  ○ Autre (préciser)
  ○ Ne sais pas
```

Dans le paramétrage de chaque question, j'active « Ne sais pas » ; le libellé par défaut est
« Ne sais pas », je peux le modifier (ex. « Je ne sais pas », « Inconnu »).

Affichage attendu :
- question à choix : « Ne sais pas » est la **dernière** option, après « Autre (préciser) », hors de
  tout groupe (EVO-003) ;
- question à saisie (texte, nombre, date…) : une case à cocher « Ne sais pas » sous le champ.

## Comportement attendu

- **Paramétrage** :
  - Une propriété « Ne sais pas » (désactivée par défaut) est proposée sur tous les types de
    questions, au même endroit que « Autre (préciser) » pour les questions à choix.
  - Son libellé se comporte **exactement comme celui d'une option** : multilingue, interpolation
    `{…}`, signalement des traductions manquantes.
  - Les éléments qui n'attendent pas de réponse (s'il en existe : texte d'information…) ne
    proposent pas la propriété.
- **Modèle / règles métier** :
  - « Ne sais pas » est **exclusive** : en choix multiple, la cocher décoche les autres options, et
    cocher une autre option la décoche. En saisie, la cocher vide et désactive le champ ; la
    décocher réactive le champ vide.
  - Elle **satisfait** une question obligatoire.
  - Les contrôles de saisie (format, min/max, longueur…) ne s'appliquent pas quand elle est cochée.
  - Ce n'est pas une option saisie dans la liste : elle n'apparaît pas dans la zone de saisie des
    options et ne peut pas être conditionnée individuellement.
- **Expressions** :
  - `ma_question` renvoie une **valeur vide** quand « Ne sais pas » est choisie, comme une question
    sans réponse, afin de ne pas casser les expressions typées (nombre, date) ;
  - une nouvelle référence renvoie **vrai** si « Ne sais pas » est choisie, faux sinon. Syntaxe
    visée : `ma_question.nsp` (voir Analyse) ;
  - `ma_question.groupe` (EVO-003) renvoie le code réservé `NSP`, comme `AUTRE` pour
    « Autre (préciser) » ;
  - choix multiple : liste vide, et `ma_question.nsp` vrai.
- **Table de décision (EVO-004)** : si la question a une table, une ligne « Ne sais pas » est
  générée automatiquement, comme les lignes « Autre » et « Sans réponse », et suit
  l'activation / la désactivation de la propriété.
- **Logigramme** : l'aperçu du nœud affiche « Ne sais pas » en italique, en dernier, pour les
  questions à choix ; un indicateur discret pour les questions à saisie.
- **Prévisualisation** : rendu tel que décrit dans l'affichage attendu ; le passage à l'étape
  suivante du wizard est possible avec « Ne sais pas » sur une question obligatoire.
- **Panneau de propriétés** : la propriété est visible sur toutes les questions concernées ; elle
  n'est pas réordonnable (toujours en dernier).

## Critères d'acceptation

- Quand j'active « Ne sais pas » sur une question à choix unique avec « Autre (préciser) », alors
  « Ne sais pas » s'affiche en dernière position, après « Autre (préciser) ».
- Quand la question a des groupes (EVO-003), alors « Ne sais pas » s'affiche après tous les
  groupes, hors de tout groupe.
- Quand j'active « Ne sais pas » sur une question date, alors une case « Ne sais pas » s'affiche
  sous le champ ; la cocher vide et désactive le champ.
- Quand, en choix multiple, je coche « Ne sais pas » puis une autre option, alors « Ne sais pas »
  est décochée (et inversement).
- Quand une question obligatoire a « Ne sais pas » cochée, alors elle est considérée comme
  répondue et le wizard permet de continuer.
- Quand une question nombre avec un minimum a « Ne sais pas » cochée, alors aucune erreur de
  contrôle n'est affichée.
- Quand « Ne sais pas » est choisie, alors `ma_question` est vide et `ma_question.nsp` est vrai ;
  sinon `ma_question.nsp` est faux.
- Quand « Ne sais pas » est choisie sur une question à groupes, alors `ma_question.groupe` vaut
  `NSP`.
- Quand la question a une table de décision, alors une ligne « Ne sais pas » y apparaît à
  l'activation de la propriété et disparaît à sa désactivation.
- Quand je modifie le libellé ou ajoute une traduction, alors il se comporte comme le libellé
  d'une option (même rendu, même signalement des traductions manquantes).
- Quand je n'active pas « Ne sais pas », alors le comportement est identique à aujourd'hui.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur, sans « Ne sais pas » sur
  aucune question.
- Quand j'exporte puis réimporte, alors l'activation, le libellé et ses traductions sont
  identiques.
- Le guide utilisateur décrit l'activation de « Ne sais pas », son comportement par type de
  question et la référence `.nsp`.

## Impacts attendus

- **Format JSON** : nouvelle `formatVersion` et migration (propriété absente = désactivée),
  JSON Schema, `docs/FORMAT.md` (propriété de question, représentation d'une réponse
  « Ne sais pas »), exemple mis à jour avec une question à choix et une question à saisie
  utilisant « Ne sais pas ».
- **Spec** : propriétés communes des questions, options spéciales (« Autre (préciser) »),
  validation et caractère obligatoire, références et espaces de noms (§3.5), table de décision.
- **Guide** : paramétrage des questions, expressions, table de décision.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`), en listant les types de questions
   existants et le rendu retenu pour chacun.
2. Valeur renvoyée par `ma_question` : la cible est une valeur vide plus une référence booléenne
   `ma_question.nsp`. Vérifier que le suffixe est réalisable et cohérent avec les espaces de noms
   du §3.5 (comme `.groupe`) ; sinon proposer l'écriture la plus lisible et réserver le mot `nsp`.
   Vérifier aussi que « vide » ne crée pas d'ambiguïté avec « sans réponse » dans les conditions
   existantes.
3. Format de stockage d'une réponse « Ne sais pas » (marqueur distinct d'une valeur, y compris
   pour un type texte où « Ne sais pas » pourrait être une saisie littérale) et sa migration.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
