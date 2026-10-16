---
id: EVO-026
titre: Retirer l'exemple « déclaration de sinistre » de la barre de projet
statut: fait 2026-10-16
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

## Analyse

**Faisabilité** : faisable, sans ambiguïté bloquante ; aucun changement de format.

**Modules impactés** (`docs/MAP.md`) :
- `app/commands` : commande `project.example` retirée de `project-commands.ts` ; `example.ts` (exemple embarqué dans
  le build) supprimé. Ses deux utilisateurs de test (`app/issues/issues.test.ts`, `app/commands/issues-caracterisation.test.ts`)
  passent à `tests/reference/example.ts`, qui lit les mêmes fichiers ; `feedback-caracterisation.test.ts` vérifie la
  confirmation de perte avec « Nouveau projet » au lieu de l'exemple.
- `app/i18n` : libellé `project.example` retiré. `ui/shell` : icône étincelles retirée de `TopBar`.
- Tests de fumée : 20 specs ouvraient l'exemple par la palette (« exemple » + Entrée). Elles l'ouvrent désormais
  comme un utilisateur, par « Ouvrir / importer… » avec les fichiers du dossier `examples/declaration-sinistre`
  (aide partagée `tests/smoke/support/example.ts`, qui attend le chargement : l'import est asynchrone).
- `docs/spec.md` §4.1 et §4.4, `docs/GUIDE.md` (entrée et index des raccourcis).

**EVO-026-005** — comportement actuel : la restauration (`app/persistence`) recopie `keymap` tel quel, sans contrôle ni
message ; `bindShortcuts` ne parcourt que les commandes du catalogue, donc une entrée d'une commande inconnue n'est
jamais liée ; l'écran des raccourcis ne liste que le catalogue. L'exigence est donc déjà satisfaite : aucun code
ajouté, comportement verrouillé par un test. L'entrée orpheline reste dans la session (et active « Réinitialiser
tout ») : choix le plus simple, noté dans `docs/DECISIONS.md`.

**EVO-026-006** : l'import d'un `projet.json` et de ses fichiers remplace le projet (même chemin que tout projet,
confirmation si non exporté) ; aucun changement.

| ID | Test(s) |
| --- | --- |
| EVO-026-001 | `tests/smoke/evo-026.spec.ts` « EVO-026-001 — barre de projet sans icône… » |
| EVO-026-002 | `tests/smoke/evo-026.spec.ts` « EVO-026-002 — Nouveau projet, Ouvrir / importer…, Exporter (bundle), Exporter les fichiers unitaires : ordre et effet » |
| EVO-026-003 | `tests/smoke/evo-026.spec.ts` « EVO-026-003 — palette… » ; `src/app/commands/commands.test.ts` « EVO-026-003, EVO-026-004 — aucune commande du catalogue… » |
| EVO-026-004 | `tests/smoke/evo-026.spec.ts` « EVO-026-004 — Paramètres… » ; `src/app/commands/commands.test.ts` (même test) |
| EVO-026-005 | `tests/smoke/evo-026.spec.ts` « EVO-026-005 — session restaurée avec un raccourci de l'exemple… » |
| EVO-026-006 | `tests/smoke/evo-026.spec.ts` « EVO-026-006 — fichiers de l'exemple ouverts avec « Ouvrir / importer… »… » (et toutes les specs de fumée qui ouvrent l'exemple) |
