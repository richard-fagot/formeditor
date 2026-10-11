# EVO-002 — Guide utilisateur : catalogue des actions

Statut : en cours

## Besoin

L'interface a été conçue pendant la réalisation : je ne connais pas toutes les actions possibles,
ni la façon de les faire. Quand je pose la question, Claude repart du code, ce qui est long et coûteux.

Je veux un **guide utilisateur** sous forme de catalogue concis d'actions, qui sert à deux usages :
- moi : trouver en quelques secondes comment faire une action, ou savoir qu'elle n'existe pas ;
- claude.ai : répondre à mes questions dans une conversation **à partir de ce seul fichier**,
  sans accès au code.

Le guide est construit une fois à partir de l'existant, puis tenu à jour à chaque évolution.

## Livrable : `docs/GUIDE.md`

### Structure (dans cet ordre)

```markdown
# Guide utilisateur — Éditeur de questionnaires
Mis à jour le AAAA-MM-JJ — jusqu'à EVO-NNN

## Mode d'emploi du guide          (5 lignes : organisation, conventions, notation des raccourcis)
## Notions                         (glossaire court : projet, questionnaire, nœud, arête, bloc,
                                    état du système, scénario, référence… 1 ligne chacun)
## 1. Projet et fichiers           (créer, ouvrir, importer, exporter, sauvegarde automatique)
## 2. Onglets et navigation
## 3. Logigramme — nœuds           (créer, relier, sélectionner, déplacer, dupliquer, supprimer…)
## 4. Logigramme — arêtes et conditions
## 5. Questions — propriétés communes  (intitulé, clé, obligatoire, aide, valeur par défaut…)
## 6. Types de questions           (un sous-titre par type : ce qui est paramétrable et comment)
## 7. Options                      (saisie, ordre, options dynamiques, « Autre », conditions)
## 8. Expressions et références    (syntaxe, opérateurs, espaces de noms, 10 exemples prêts à copier)
## 9. Contraintes et messages d'erreur
## 10. Bibliothèque et blocs
## 11. État du système et scénarios
## 12. Prévisualisation
## 13. Langues
## 14. Paramètres et raccourcis
## 15. Vérifications                (chaque avertissement : signification → comment le corriger)
## Ce que l'outil ne fait pas      (limites connues, actions souvent cherchées mais absentes)
## Index des raccourcis            (tableau généré, voir plus bas)
```

Les sections sans contenu réel sont supprimées plutôt que laissées vides. De nouvelles sections
peuvent être ajoutées si l'outil le justifie.

### Format d'une entrée

Une entrée par action, sur une à trois lignes :

```markdown
- **Créer une question à la suite** — Sélectionner un nœud puis `N`, ou palette (`Ctrl+K`)
  « Nouvelle question ». La question est reliée au nœud sélectionné et son intitulé passe
  en édition. `[cmd: node.createAfter]`
```

Règles :
- Le titre de l'entrée est un **verbe d'action à l'infinitif**, formulé comme l'utilisateur le
  chercherait (« Changer l'ordre des options », pas « Réordonnancement »).
- Le « comment » donne tous les chemins disponibles : raccourci, palette, souris, panneau de
  propriétés (avec le nom exact du champ ou du bouton tel qu'affiché).
- Préciser les préconditions et les effets non évidents (ce qui est supprimé, ce qui est annulable).
- Toute action issue du catalogue de commandes (`app/commands`) porte sa balise
  `[cmd: identifiant]`. Les actions hors catalogue (glisser-déposer, saisie dans un panneau)
  n'ont pas de balise.
- Pas de capture d'écran, pas d'explication technique, pas de référence au code.
- Cible : guide complet en 400 à 700 lignes.

### Index des raccourcis (partie générée)

Le tableau « Action | Raccourci par défaut | Identifiant » est **généré** depuis le catalogue de
commandes, entre deux marqueurs :

```markdown
<!-- debut:raccourcis (généré par npm run guide, ne pas modifier à la main) -->
...
<!-- fin:raccourcis -->
```

## Harnais

- Script `npm run guide` : régénère l'index des raccourcis.
- Script de contrôle, ajouté à `npm run check` : échoue si une commande du catalogue n'a pas
  d'entrée `[cmd: …]` dans le guide, si une balise du guide ne correspond à aucune commande,
  ou si l'index des raccourcis n'est pas à jour.

Le guide ne peut donc plus prendre de retard sur les commandes sans que le harnais passe au rouge.
Les actions hors catalogue restent sous la responsabilité du processus (ci-dessous).

## Mise à jour du processus

- `CLAUDE.md` : ajouter `docs/GUIDE.md` aux invariants (« toute action ajoutée, modifiée ou
  supprimée met à jour le guide ») et une étape « mettre à jour le guide » dans le processus
  Évolutions, avant la relecture.
- Sous-agent `relecteur` : ajouter un contrôle « le guide décrit-il fidèlement les actions
  touchées par la phase ou l'évolution ? », sur **l'ensemble des changements depuis le début
  de la branche** (`git diff main...`), pas seulement sur le dernier tour de correction.
  Un guide qui ne décrit pas fidèlement une action existante est un écart **majeur** (bloquant),
  et non un écart mineur de documentation.
- Sous-agent `realisateur` : ajouter la règle « tout changement de comportement visible, y compris
  pendant une correction demandée par le relecteur, met à jour `docs/GUIDE.md` dans le même
  commit ».
- Spec §8.3 : mentionner le guide et son contrôle.

## Méthode de construction (pour limiter le coût)

1. Partir du **catalogue de commandes** : il recense déjà les actions avec leur libellé et leur
   raccourci. Il donne le squelette des sections 1 à 14.
2. Compléter avec les **panneaux de propriétés des plugins** (types de questions, types de nœuds)
   et les interactions souris du logigramme et de la prévisualisation.
3. Recouper avec la spec (§3 à §5) pour la section « Ce que l'outil ne fait pas » : ce qui est
   spécifié mais absent, et les besoins classiques non couverts.
4. Lire le détail du code uniquement quand le comportement d'une action est ambigu.
5. Ne rien corriger dans l'application pendant cette évolution. Les anomalies constatées
   (action qui ne fait pas ce que dit son libellé, commande sans raccourci…) sont listées dans une
   section « Anomalies relevées » en bas de ce fichier, pour en faire de futures évolutions.

## Critères d'acceptation

- `docs/GUIDE.md` existe, suit la structure et le format ci-dessus.
- Chaque commande du catalogue a son entrée balisée ; `npm run check` échoue si on en retire une.
- L'index des raccourcis est généré et `npm run check` échoue s'il est périmé.
- Une personne qui ne connaît pas l'outil trouve, en lisant seulement le guide, comment :
  créer une question à la suite, créer une branche conditionnée, ajouter une option dynamique,
  insérer un bloc de la bibliothèque, simuler un scénario d'état du système, exporter le projet.
  (Le relecteur vérifie ces six cas dans l'application.)
- La section « Ce que l'outil ne fait pas » existe, même courte.
- `CLAUDE.md`, les sous-agents `relecteur` et `realisateur`, et la spec §8.3 sont mis à jour.
- Dans la grille du `relecteur`, un écart entre le guide et l'application est classé « majeur ».

## Anomalies relevées

Constatées en construisant le guide (2026-10-11), sans correction. Chacune peut devenir une évolution.

1. **Aucune action pour supprimer un questionnaire** (ni pour le dupliquer). Le texte « Supprimer le questionnaire »
   existe dans le dictionnaire de l'interface mais n'est relié à aucune commande.
2. **Actions de la prévisualisation hors catalogue de commandes** : « Suivant », « Précédent », « Recommencer »,
   « Revenir à la synthèse », « Rétablir les valeurs du scénario », choix du scénario. Ni palette ni raccourci, contrairement
   à l'invariant « toute action utilisateur passe par le catalogue de commandes ».
3. **Copier / coller de nœuds entre questionnaires absent**, alors que la spec §4.3 le prévoit.
4. **« Éditer l’intitulé » (`Entrée`, double-clic) est disponible sur tous les nœuds mais n'agit que sur les questions** :
   sur une page d'information, de synthèse, de fin, une instance ou une sortie, rien ne se passe.
5. **Historique d'annulation limité à 500 étapes par historique** (spec §4.3 : « illimité ») et perdu au rechargement de la page.
6. **`Ctrl+Tab` / `Ctrl+Shift+Tab` (défauts de la spec §4.4)** sont en général réservés par Firefox et Chrome au changement
   d'onglet du navigateur et n'atteignent pas la page (à confirmer à la main ; les tests Playwright ne passent pas par le
   navigateur). `Alt+→` / `Alt+←` fonctionnent.
7. **Libellés de commandes en double** dans l'écran des raccourcis et l'index : `tab.open` et `tab.show` (« Rouvrir un
   questionnaire fermé », alors que `tab.show` affiche n'importe quel onglet) ; `node.connect`, `node.connectTo` et
   `edge.create` (« Relier à un nœud… ») ; `tab.library` et `library.show` (« Bibliothèque »).
8. **Boutons à icône sans info-bulle** : monter / descendre / dupliquer / supprimer une entrée d'options et un champ de
   structure, retrait d'une variante (libellé accessible « × »), retrait d'un champ de liste d'objets. L'utilisateur
   doit deviner leur rôle. La croix de fermeture d'un onglet n'apparaît qu'au survol.
9. **`C` sur un nœud sélectionné** ouvre la condition de la première arête **entrante** du nœud, ce qui n'est pas évident
   (on s'attend plutôt aux arêtes sortantes).
10. **Suppression d'un élément de bibliothèque sans confirmation ni avertissement** alors qu'il est utilisé : les références
    deviennent « Élément de bibliothèque introuvable » (annulable par `Ctrl+Z` dans l'onglet Bibliothèque seulement).
11. **`Ctrl+Z` dépend de l'onglet affiché** : une modification du projet (nom, langue, variable) ne s'annule pas depuis un
    onglet de questionnaire ; il faut aller dans « État du système » ou « Paramètres ».
12. **La palette n'affiche que le premier raccourci** d'une commande (ex. `Ctrl+Shift+Z` pour « Rétablir », pas `Ctrl+Y`).
13. **Changer le type d'une question efface sa valeur par défaut** (« Valeur par défaut » et « Valeur par défaut calculée »),
    sans avertissement.
14. **Actions fréquentes sans raccourci par défaut** : « Définir comme départ », « Placer la question dans la bibliothèque »,
    « Nouvelle sortie de bloc », « Vue côte à côte » (palette seulement).
