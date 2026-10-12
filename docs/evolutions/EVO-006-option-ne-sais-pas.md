# EVO-006 — Option « Ne sais pas » sur tous les types de questions

Statut : fait 2026-10-12
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

## Analyse

### 1. Faisabilité et modules impactés

Faisable sans ambiguïté bloquante. Types de questions existants et rendu retenu :

| Type | Rendu « Ne sais pas » (prévisualisation) | Aperçu du logigramme |
| --- | --- | --- |
| Texte, date, nombre | Case à cocher sous le champ ; cochée, le champ est vidé et désactivé | Mention discrète « + Ne sais pas » en italique |
| Choix unique, choix multiple | Dernière option (radio / case), après « Autre », hors de tout groupe | Dernière ligne, en italique |
| Booléen, tri-state | Dernière option, après « Autre » (le « Ne sait pas » d'un tri-state reste sa 3e valeur `unknown`) | Dernier libellé, en italique |
| Structure | Pas de propriété sur la structure elle-même (conteneur) ; chacun de ses champs peut l'avoir | — |

Les pages d'information, de synthèse et de fin ne sont pas des questions : pas de propriété.

Modules (d'après `docs/MAP.md`) :
- `core/model` : `dontKnow?: { label?: Label }` sur toute question sauf structure ; constantes `DONT_KNOW_SUFFIX` (`nsp`),
  `DONT_KNOW_REF` (`nsp`), `DONT_KNOW_GROUP` (`NSP`), `DONT_KNOW_LABEL` ; `nsp` ajouté à `RESERVED_KEYS`.
- `format` : `formatVersion` 5, migration 4 → 5 (identité), schéma (`questionCore.dontKnow`, refusé sur une structure),
  `docs/FORMAT.md`, exemple et chemins attendus.
- `core/expressions` : réécriture de `<chemin>.nsp` (point 2).
- `core/references` : `.nsp` dans la portée des questions qui ont l'option ; libellé `dontKnow.label` parcouru
  (renommage propagé, traductions manquantes).
- `core/runtime` : `setAnswer(…, dontKnow)`, marqueur `<clé>_nsp` (point 3), effacement hors chemin, synthèse ;
  `dontKnowAnswer(q)` (valeur et groupe d'une réponse « Ne sais pas »).
- `core/validation` : aucune vérification de saisie (obligatoire compris) quand « Ne sais pas » est cochée ;
  code `NSP` réservé pour un groupe (`reservedGroupCode`).
- `plugin-api` : `FieldProps.dontKnow` / `onDontKnow`, `formatAnswer` inchangé (la synthèse affiche le libellé).
- Plugins `text`, `date`, `number`, `choice`, `boolean`, `tristate` (aperçu, propriétés, saisie), `structure`
  (marqueur dans l'occurrence, synthèse) ; `ui/expression-editor` (`DontKnowEditor`, partagé par les plugins) ;
  `ui/preview` (réponse, validation, synthèse) ; `app/commands` (`node.toggleDontKnow`) ; `docs/GUIDE.md`, `docs/spec.md`.
- **Table de décision** : aucune n'existe dans l'outil (EVO-004 est l'export en image) ; rien à générer. Le critère
  correspondant est sans objet (DECISIONS.md).

### 2. Valeur de `ma_question` et référence `ma_question.nsp`

- `ma_question` vaut une **valeur vide** : `null` (retiré du contexte, comme une facultative laissée vide : `$exists`
  faux), `[]` pour un choix multiple (liste vide, `$count` = 0). Les expressions typées ne cassent pas.
- `ma_question.nsp` est **réalisable** comme `.groupe` (EVO-003) : `core/expressions` réécrit toute étape **finale** `nsp`
  d'un chemin de noms en `(<chemin>_nsp = true)` (`ma_question.nsp` → `(ma_question_nsp = true)`, `decl.cle.nsp` →
  `(decl.cle_nsp = true)`, `victimes[0].lien.nsp` → `(victimes[0].lien_nsp = true)`). En JSONata, une comparaison avec
  une valeur absente vaut `false` : la référence vaut donc `true` ou `false`, jamais vide. `nsp` devient un **mot
  réservé** (aucune clé ne peut s'appeler `nsp`) : pas d'ambiguïté avec un sous-champ de structure.
- Portée : `.nsp` n'est connu que sur une question (ou un champ) dont l'option est activée ; ailleurs, référence
  inconnue (signalée, §4.6). Même règle « posée sur tous les chemins » que la question.
- « Vide » et « sans réponse » : les conditions existantes ne changent pas (sans l'option, rien n'est stocké). Avec
  l'option, `$exists(ma_question)` est faux dans les deux cas ; on les distingue par `ma_question.nsp`. Pour le moteur,
  une question « Ne sais pas » **a** une réponse (`null` / `[]` posé, marqueur présent) : le parcours avance.
- `ma_question.groupe` vaut `NSP` (choix unique et multiple, chaîne seule : la liste des valeurs est vide) ; `NSP`
  devient un code de groupe réservé, comme `AUTRE`.

### 3. Stockage d'une réponse « Ne sais pas »

- Marqueur **distinct de la valeur** : `<clé>_nsp: true` à côté de la réponse (comme `<clé>_other`, `<clé>_group`),
  valeur `null` (`[]` en choix multiple), `<clé>_group: "NSP"` pour un choix unique ou multiple. Une saisie texte
  littérale « Ne sais pas » reste une valeur ordinaire sans marqueur : aucune ambiguïté.
- Cocher une autre option, ou saisir, efface le marqueur ; décocher « Ne sais pas » efface marqueur et valeur
  (champ vide, question sans réponse). Dans une structure, le marqueur est rangé dans l'occurrence.
- Chemins attendus : une étape porte `dontKnow: true` à côté de `value`.
- **Migration** : `formatVersion` 5, migration 4 → 5 sans transformation (propriété absente = désactivée). Les
  réponses ne sont pas stockées dans le projet : rien d'autre à migrer.

Forme JSON : `"dontKnow": {}` (libellé par défaut « Ne sais pas ») ou `"dontKnow": { "label": <libellé> }` — libellé
comme celui d'une option (§5.2 de FORMAT.md) : multilingue, interpolé, à variantes.

### Choix secondaires

- Panneau de propriétés : case « Option « Ne sais pas » » et libellé, juste après « Autre (préciser) » pour les
  choix, booléen et tri-state, à la fin des paramètres du type pour texte, date, nombre (champs de structure compris).
- Commande `node.toggleDontKnow` (palette, sans raccourci par défaut) ; la spec §4.4 n'en fixe pas.
- « Ne sais pas » cochée : aucune contrainte (intégrée ou libre) ni obligation n'est évaluée pour la question.
- Synthèse et débogage : le libellé « Ne sais pas » de la question.

Conclusion : faisable, choix notés dans `docs/DECISIONS.md` ; réalisation.
