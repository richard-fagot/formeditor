---
id: EVO-028
titre: Signaler les éléments de bibliothèque inutilisés
statut: en cours
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

## Analyse

### 1. Faisabilité et modules impactés

Faisable sans ambiguïté bloquante, sans changement de format (formatVersion 15). Modules (d'après `docs/MAP.md`) :
- `core/model` : nouvelle définition unique `usage.ts` (`unusedLibraryItems`, `unusedCount`), pure, testée avant le code.
- `app/i18n` : `messages-unused.ts` (infobulles par type, compteurs de rubrique, total).
- `ui/library` : `Unused.tsx` (hook et indicateurs), `Library` (indicateur des questions et fragments, compteurs de rubrique),
  `LabelSets` (indicateur sur la carte d'un jeu de libellés).
- `ui/shell` : `Tabs` (pastille du total sur l'onglet « Bibliothèque » ou sur son lien quand il est fermé).
- Mise à jour (EVO-028-012) : le calcul dépend seulement du projet (`ws`) ; toute modification, annulation, rétablissement ou
  ouverture remplace `ws` et recalcule indicateurs et compteurs. Aucune commande nouvelle (affichage seul).
- Inchangés : « Utilisé dans » / « Utilisé nulle part. » (`itemUsages`), `unusedFragment` et le bandeau « aucun appelant »
  (`fragmentCallers`).

### 2. EVO-028-001 et 002 — coïncidence avec « utilisée dans » et `unusedFragment`

- Fragment : la définition réutilise `fragmentCallers`, comme `unusedFragment` et le bandeau ; un fragment qui s'appelle
  lui-même a donc un appelant (lui-même, un fragment) : il n'est pas inutilisé, ni par l'indicateur ni par l'avertissement.
  Les deux signalements coïncident toujours.
- Question : un nœud question à référence (`ref`) dans un questionnaire ou un fragment, exactement comme « Utilisé dans ».
  Une question de bibliothèque ne peut pas en référencer une autre (les champs d'une structure sont portés par la structure,
  pas par référence) : le cas « utilisée seulement par elle-même via une autre question de bibliothèque » n'existe pas dans le
  modèle. La liste « Utilisé dans » est vide exactement quand la question est inutilisée.

### 3. EVO-028-003 — champs booléens d'une structure de bibliothèque

Un jeu de libellés est utilisé dès qu'une question booléenne le désigne, qu'elle soit locale (questionnaire ou fragment), de
bibliothèque, ou champ booléen d'une structure (locale ou de bibliothèque). Usage direct (004) : la structure de bibliothèque
« souscripteur » de l'exemple, elle-même inutilisée, rend utilisé le jeu « oui_non_nsp » de son champ booléen.

### 4. Choix (aussi dans `docs/DECISIONS.md`)

- Indicateur : triangle ambre (couleur des avertissements du panneau Problèmes), infobulle native, texte propre au type :
  « Inutilisée : aucun questionnaire ni fragment ne l'utilise. » (question), « Inutilisé : aucun questionnaire ni fragment ne
  l'appelle. » (fragment), « Inutilisé : aucune question booléenne ne l'utilise. » (jeu de libellés).
- Jeux de libellés : la liste de gauche n'a qu'une entrée « Jeux de libellés » ; l'indicateur est sur chaque carte de la liste
  des jeux (vue de droite), le compteur après le titre de la rubrique de gauche.
- Compteur de rubrique « (n inutilisée(s)) » / « (n inutilisé(s)) » ; total en pastille ambre (infobulle « n éléments de
  bibliothèque inutilisés »), masquée aux technologies d'assistance pour garder le nom du lien « Bibliothèque ».

### 5. Matrice de couverture

| ID | Test(s) |
| --- | --- |
| EVO-028-001 | `src/core/model/usage.test.ts` « EVO-028-001 — question inutilisée… » ; `tests/smoke/evo-028.spec.ts` « EVO-028-001, … — question inutilisée » |
| EVO-028-002 | `usage.test.ts` « EVO-028-002 — fragment inutilisé… (un appel de lui-même compte) » ; `evo-028.spec.ts` « EVO-028-002, … — fragment et jeu de libellés inutilisés » |
| EVO-028-003 | `usage.test.ts` « EVO-028-003 — jeu de libellés inutilisé… » ; `evo-028.spec.ts` « EVO-028-002, EVO-028-003, … » |
| EVO-028-004 | `usage.test.ts` « EVO-028-004 — seul l'usage direct compte… » |
| EVO-028-005 | `usage.test.ts` « EVO-028-005 — le statut validé ou provisoire n'entre pas dans la définition » |
| EVO-028-006 | `evo-028.spec.ts` « EVO-028-001, EVO-028-006, … » (question), « EVO-028-002, …, EVO-028-006, … » (fragment) |
| EVO-028-007 | `evo-028.spec.ts` « EVO-028-002, …, EVO-028-007, … » |
| EVO-028-008 | `evo-028.spec.ts` « EVO-028-001, …, EVO-028-008, … » (question), « EVO-028-002, …, EVO-028-008, … » (fragment, jeu de libellés) |
| EVO-028-009 | `evo-028.spec.ts` « EVO-028-001, …, EVO-028-009, … » (Questions), « EVO-028-002, …, EVO-028-009, … » (Fragments, Jeux de libellés) |
| EVO-028-010 | `evo-028.spec.ts` « EVO-028-001, …, EVO-028-010, … » (lien puis onglet), « EVO-028-002, …, EVO-028-010, … » (total 3) |
| EVO-028-011 | `usage.test.ts` « EVO-028-011 — compte total ; nul quand tout est utilisé » ; `evo-028.spec.ts` « EVO-028-012, EVO-028-011 — … » |
| EVO-028-012 | `evo-028.spec.ts` « EVO-028-012, EVO-028-011 — insertion, annuler, rétablir, suppression, collage… » ; ouverture : chaque test (exemple ouvert, total 1) |
| EVO-028-013 | `evo-028.spec.ts` « EVO-028-001, …, EVO-028-013 — … « utilisée dans » inchangé » |
| EVO-028-014 | `evo-028.spec.ts` « EVO-028-002, …, EVO-028-014 — … » ; `src/core/validation/fragments.test.ts` (`unusedFragment`, existant) |
