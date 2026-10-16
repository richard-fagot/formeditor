---
id: EVO-028
titre: Signaler les éléments de bibliothèque inutilisés
statut: à faire
version: 1.0
qualificatif: final
derniere_exigence: EVO-028-014
depend_de: []
---

# EVO-028 — Signaler les éléments de bibliothèque inutilisés

## Contexte

*Section non normative : elle explique, les exigences font foi.*

Aujourd'hui, l'usage d'un élément de bibliothèque ne se voit qu'élément par élément (EXISTANT « Onglet Bibliothèque »,
« Onglet d'un fragment », « Vérifications non bloquantes du graphe ») : une question de bibliothèque affiche « utilisée
dans » ou « inutilisée » seulement quand on l'ouvre ; un fragment sans appelant porte l'avertissement `unusedFragment` dans
le panneau des problèmes de son onglet et son bandeau indique « aucun appelant » ; un jeu de libellés n'a aucune indication
d'usage. La liste de la Bibliothèque ne distingue pas les éléments inutilisés, et les problèmes d'une question de
bibliothèque ne sont affichés dans aucun panneau (EXISTANT § 6 « 2. Édition »).

Demain, l'utilisateur voit d'un coup d'œil, dans la Bibliothèque, les éléments que rien ne référence, avec un message qui
l'explique, afin de faire le ménage.

### Glossaire

| Terme | Définition |
| --- | --- |
| Élément inutilisé | Élément de bibliothèque qu'aucun autre élément du projet ne référence directement (voir EVO-028-001 à 005). |

### Exemple

```
Questions (1 inutilisée)
  Date du sinistre          date_sinistre
  Montant estimé  ⚠         montant_estime   ← infobulle : « Inutilisée : aucun questionnaire ni fragment ne l'utilise. »
```

### Hors périmètre

- Panneau des problèmes dans l'onglet Bibliothèque.
- Suppression groupée des éléments inutilisés.

## Exigences

### Définition

| ID | Exigence |
| --- | --- |
| EVO-028-001 | Une question de bibliothèque est inutilisée quand aucun questionnaire ni fragment ne la référence. |
| EVO-028-002 | Un fragment est inutilisé quand aucun questionnaire ni fragment ne l'appelle. |
| EVO-028-003 | Un jeu de libellés est inutilisé quand aucune question booléenne, locale, de bibliothèque ou champ de structure, ne l'utilise. |
| EVO-028-004 | Seul l'usage direct compte : un élément référencé par un fragment lui-même inutilisé n'est pas inutilisé. |
| EVO-028-005 | Le statut (validé ou provisoire) de l'élément ou de ce qui le référence n'entre pas dans la définition. |

### Indicateurs

| ID | Exigence |
| --- | --- |
| EVO-028-006 | Quand une question de bibliothèque ou un fragment est inutilisé, l'éditeur affiche dans la liste de l'onglet Bibliothèque un indicateur aux couleurs des avertissements à côté de lui. |
| EVO-028-007 | Quand un jeu de libellés est inutilisé, l'éditeur affiche le même indicateur à côté de lui dans la liste des jeux de libellés. |
| EVO-028-008 | Quand l'utilisateur survole un indicateur, l'éditeur affiche un message propre au type d'élément expliquant que rien ne l'utilise. |
| EVO-028-009 | Quand une rubrique de la liste (Jeux de libellés, Questions, Fragments) contient des éléments inutilisés, l'éditeur affiche leur nombre à côté de son titre. |
| EVO-028-010 | Quand la bibliothèque contient des éléments inutilisés, l'éditeur affiche leur nombre total sur l'onglet « Bibliothèque », ou sur le lien « Bibliothèque » de la barre d'onglets tant que l'onglet n'est pas ouvert. |
| EVO-028-011 | Quand aucun élément n'est inutilisé, l'éditeur n'affiche ni compteur de rubrique ni compteur total. |

### Mise à jour

| ID | Exigence |
| --- | --- |
| EVO-028-012 | Quand une modification du projet (insertion, suppression, collage, annuler, rétablir, ouverture d'un projet) rend un élément utilisé ou inutilisé, l'éditeur met à jour aussitôt indicateurs et compteurs. |

### Existant inchangé

| ID | Exigence |
| --- | --- |
| EVO-028-013 | Quand l'utilisateur affiche une question de bibliothèque, l'éditeur présente « utilisée dans » ou « inutilisée » comme avant cette évolution. |
| EVO-028-014 | Quand un fragment n'a pas d'appelant, l'éditeur signale toujours l'avertissement « fragment sans appelant » dans le panneau des problèmes de son onglet et son bandeau indique « aucun appelant ». |

## Impacts attendus

- **Format JSON** : aucun changement (formatVersion 15).
- **Règles existantes touchées** : définition de l'usage (« utilisée dans », `unusedFragment`) partagée avec les nouveaux
  indicateurs ; barre d'onglets (onglet et lien « Bibliothèque »).
- **Spec** : § de l'onglet Bibliothèque — **Guide** : section Bibliothèque.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :
1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. EVO-028-001 et 002 : vérifier que la définition coïncide avec « utilisée dans » et `unusedFragment` (un fragment qui
   s'appelle lui-même, une question utilisée seulement par elle-même via une autre question de bibliothèque).
3. EVO-028-003 : jeux de libellés utilisés par un champ booléen d'une structure de bibliothèque.
4. Matrice de couverture : `| ID | Test(s) |`.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis réalisation.
Sinon → statut « à arbitrer », exigences concernées citées, options et conséquences, arrêt sans coder.

## Exigences abrogées

Aucune.

## Historique

| Version | Date | Ajoutées | Abrogées | Motif |
| --- | --- | --- | --- | --- |
| 1.0 | 2026-10-16 | 001 à 014 | — | Création depuis la fiche littérale validée |
