---
id: EVO-026
titre: Retirer l'exemple « déclaration de sinistre » de la barre de projet
statut: en cours
version: 1.0
qualificatif: final
derniere_exigence: EVO-026-006
depend_de: []
---

# EVO-026 — Retirer l'exemple « déclaration de sinistre » de la barre de projet

## Contexte

*Section non normative : elle explique, les exigences font foi.*

Aujourd'hui, la barre de projet affiche l'icône « Ouvrir l'exemple » (EXISTANT « Barre de projet (`TopBar`) »). Elle lance
la commande « Ouvrir l'exemple « déclaration de sinistre » », aussi proposée dans la palette (EXISTANT « Catalogue des
commandes »). Cette commande remplace le projet courant, avec une confirmation seulement s'il y a des modifications non
exportées, et ce remplacement n'est pas annulable (EXISTANT § 6 « 1. Coque, commandes et transverse »).

Demain, l'outil ne propose plus l'exemple, afin de ne plus risquer de remplacer son projet d'un clic malheureux. Pour une
démonstration ou un test, on ouvre l'exemple comme tout autre projet avec « Ouvrir / importer… ».

### Hors périmètre

- Les fichiers de l'exemple restent dans le dépôt (tests de référence, kit développeurs).

## Exigences

### Barre de projet

| ID | Exigence |
| --- | --- |
| EVO-026-001 | Quand la barre de projet est affichée, l'éditeur n'y présente pas d'icône « Ouvrir l'exemple ». |
| EVO-026-002 | Quand la barre de projet est affichée, l'éditeur présente, dans cet ordre et avec leur effet actuel, les boutons Nouveau projet, Ouvrir / importer…, Exporter (bundle) et Exporter les fichiers unitaires. |

### Palette de commandes et raccourcis

| ID | Exigence |
| --- | --- |
| EVO-026-003 | Quand l'utilisateur cherche « exemple » dans la palette de commandes, l'éditeur ne propose aucune commande d'ouverture de l'exemple. |
| EVO-026-004 | Quand l'onglet Paramètres liste les raccourcis, l'éditeur n'y présente aucune commande d'ouverture de l'exemple. |
| EVO-026-005 | Quand une session restaurée contient un raccourci personnalisé affecté à l'ouverture de l'exemple, l'éditeur démarre sans message et ce raccourci reste sans effet. |

### Ouverture de l'exemple

| ID | Exigence |
| --- | --- |
| EVO-026-006 | Quand l'utilisateur ouvre les fichiers de l'exemple « déclaration de sinistre » avec Ouvrir / importer…, l'éditeur charge le projet comme tout autre projet. |

## Impacts attendus

- **Format JSON** : aucun changement (formatVersion 15).
- **Règles existantes touchées** : catalogue des commandes (retrait de l'ouverture de l'exemple) ; restauration de la
  session (raccourci personnalisé d'une commande disparue).
- **Spec** : § de la barre de projet — **Guide** : retrait de l'entrée « Ouvrir l'exemple » et index des raccourcis.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :
1. Faisabilité et modules impactés (d'après `docs/MAP.md`), y compris les tests et le test de fumée qui utilisent l'ouverture de l'exemple.
2. EVO-026-005 : comportement actuel de la restauration face à un raccourci d'une commande inconnue.
3. Matrice de couverture : `| ID | Test(s) |`.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis réalisation.
Sinon → statut « à arbitrer », exigences concernées citées, options et conséquences, arrêt sans coder.

## Exigences abrogées

Aucune.

## Historique

| Version | Date | Ajoutées | Abrogées | Motif |
| --- | --- | --- | --- | --- |
| 1.0 | 2026-10-16 | 001 à 006 | — | Création depuis la fiche littérale validée |
