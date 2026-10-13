# EVO-018 — Supprimer le type tristate

Statut : en cours
Dépend de : EVO-006 (option « ne sait pas » du type booléen) — réutilisée comme cible de remplacement

## Besoin

Aujourd'hui, l'éditeur propose deux façons de modéliser une question à trois réponses
« oui / non / ne sait pas » : le type **tristate** et le type **booléen avec « ne sait pas »**.
Ce doublon complique le paramétrage, les expressions et la maintenance. Je veux **supprimer le
type tristate**, afin de n'avoir plus qu'une seule façon de modéliser ce cas.

Les projets existants contenant des tristate ne doivent pas être perdus : chaque tristate est
**remplacé automatiquement** par un booléen avec « ne sait pas » activé, dans deux situations :

- à l'**ouverture d'un projet existant** ;
- au **rafraîchissement de la page** alors qu'un projet est déjà chargé.

Exemple : un projet contient la question

```
Q12 — Le sinistre a-t-il fait l'objet d'un constat ? (tristate)
```

Affichage attendu après ouverture ou rafraîchissement : Q12 est de type **booléen**, option
« ne sait pas » cochée ; les trois réponses proposées dans le wizard sont identiques (Oui, Non,
Ne sait pas, dans cet ordre).

## Comportement attendu

- **Saisie / types disponibles** :
  - Le type tristate n'apparaît plus dans la liste des types proposés à la création ou au changement de type d'une question.
  - Compatibilité : les projets contenant des tristate restent ouvrables (conversion, voir ci-dessous).
- **Modèle / règles métier** :
  - Conversion tristate → booléen avec « ne sait pas » activé, en conservant tout le reste de la question : identifiant, libellé, aide, caractère obligatoire, conditions d'affichage, valeur par défaut, position.
  - Une valeur par défaut tristate (oui / non / ne sait pas) devient la valeur booléenne équivalente.
  - La conversion est silencieuse : aucun message n'est affiché à l'utilisateur.
  - Après conversion, le projet ne contient plus aucun tristate ; une conversion déjà faite n'est pas rejouée.
- **Expressions** :
  - Toute expression qui référence une question tristate (conditions d'affichage, calculs, branchements) continue de produire le même résultat après conversion.
  - Si les valeurs renvoyées diffèrent entre tristate et booléen (ex. codes, casse, valeur pour « ne sait pas »), les expressions sont réécrites lors de la conversion.
- **Logigramme** : le nœud d'une question convertie s'affiche comme un booléen avec « ne sait pas » ; les branches sortantes sont conservées.
- **Prévisualisation** : rendu identique à celui d'un booléen avec « ne sait pas » ; réponses déjà saisies dans le wizard conservées si l'état de prévisualisation est persisté.
- **Panneau de propriétés** : la question convertie affiche les propriétés du booléen, option « ne sait pas » cochée et modifiable.

## Critères d'acceptation

- Quand je crée une question ou change son type, alors le type tristate n'est pas proposé.
- Quand j'ouvre un projet contenant des tristate, alors chacun est remplacé par un booléen avec « ne sait pas » activé, propriétés conservées.
- Quand je rafraîchis la page avec un projet chargé contenant des tristate, alors la même conversion est appliquée.
- Quand une conversion a lieu, alors aucun message n'est affiché.
- Quand un tristate avait une valeur par défaut, alors le booléen converti a la valeur par défaut équivalente.
- Quand une condition d'affichage ou un calcul référençait un tristate, alors il donne le même résultat après conversion, pour chacune des trois réponses.
- Quand un tristate avait des branches dans le logigramme, alors le booléen converti a les mêmes branches vers les mêmes cibles.
- Quand je rafraîchis à nouveau ou rouvre le projet converti, alors il n'y a pas de nouvelle conversion ni de modification.
- Quand j'ouvre un projet sans tristate, alors il se charge exactement comme aujourd'hui.
- Quand j'exporte un projet converti puis le réimporte, alors questions, expressions et logigramme sont identiques.
- Quand j'importe un JSON produit par une version antérieure et contenant des tristate, alors il est converti comme à l'ouverture.
- Le guide utilisateur ne mentionne plus le type tristate et indique comment modéliser « oui / non / ne sait pas ».

## Impacts attendus

- **Format JSON** : nouvelle `formatVersion` et migration tristate → booléen, retrait de tristate du JSON Schema, `docs/FORMAT.md` (types de question, historique des versions), exemples sans tristate.
- **Spec** : § types de question (retrait du tristate), § expressions (valeurs du booléen « ne sait pas »), § ouverture / persistance du projet (migration).
- **Guide** : section types de question ; retrait des mentions du tristate.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`), en recensant tous les endroits où le type tristate est connu (modèle, palette, panneau, wizard, logigramme, expressions, export).
2. Points d'entrée de la migration : cible = un seul point de passage commun à l'ouverture, au rafraîchissement (projet persisté côté navigateur) et à l'import. Vérifier que le projet persisté au rafraîchissement passe bien par la migration de format ; sinon, proposer comment l'y faire passer.
3. Équivalence des valeurs : comparer les valeurs renvoyées par tristate et par booléen « ne sait pas » dans les expressions. Si identiques → simple changement de type ; sinon → réécriture des expressions, à spécifier, ou statut « à arbitrer » si une réécriture fiable n'est pas possible (expressions libres non analysables).
Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.
