---
id: EVO-024
titre: Nœud de renvoi
statut: en cours
version: 1.0
qualificatif: final
derniere_exigence: EVO-024-074
depend_de: []
---

# EVO-024 — Nœud de renvoi

## Contexte

*Section non normative : elle explique, les exigences font foi.*

Un nouveau type de nœud dans le logigramme d'un questionnaire est nécessaire, le nœud Renvoi, affiche un texte et des boutons de renvoi. Il sert à spécifier deux situations demandées par les métiers :

1. **Mauvais questionnaire** : les réponses données par le déclarant montrent qu'il s'est trompé de questionnaire. Il est orienté vers le bon, qui remplace celui en cours (annule et remplace), ou il revient corriger sa réponse.
2. **Déclarations liées** : à la fin d'un questionnaire, on l'invite à en déclarer d'autres. Il en choisit une ou décline avec « Terminer » ; dans les deux cas, le questionnaire en cours passe par la fin.

Le spécifieur reste responsable de ses choix : l'éditeur signale les incohérences, sans les interdire.

### Glossaire

| Terme | Définition |
| --- | --- |
| Nœud Renvoi | Nouveau type de nœud portant un titre, un texte et des boutons de renvoi. |
| Bouton de renvoi | Bouton d'un nœud Renvoi, défini par un libellé, une cible et une condition d'affichage facultative ; il n'a pas de type, son effet découle de sa cible. |
| Cible questionnaire | Cible désignant un questionnaire du projet ouvert, autre que le questionnaire en cours : le bouton spécifie une déclaration. |
| Cible nœud | Cible désignant un nœud du questionnaire en cours : le bouton spécifie un retour pour corriger. |
| En amont | Se dit d'un nœud depuis lequel au moins un chemin mène au nœud Renvoi. |
| Juste avant une fin | Se dit d'un nœud qui a au moins une arête sortante et dont toutes les arêtes sortantes mènent directement à un nœud fin. |
| Toggle | Propriété documentaire activable d'un bouton à cible questionnaire : « Pré-remplissage de la cible », « Annule et remplace » ; appelée « option » dans les messages de prévisualisation. |
| Documentaire | Propriété saisie dans l'éditeur et présente dans le JSON exporté, dont la prévisualisation n'implémente pas le comportement. |
| Bouton Terminer | Bouton fixe de navigation, affiché à la place de « Suivant » sur un nœud Renvoi juste avant une fin. |
| Bouton en erreur | Bouton faisant l'objet d'une erreur (EVO-024-031 à 033) ; un avertissement ne met pas le bouton en erreur. |

### Exemple (cas 1)

Déclaration RC dont le bien endommagé appartient à l'assuré :

```
Nœud Renvoi — texte : Le bien vous appartient : cette déclaration ne convient pas.

Bouton 1
  Libellé                     : Déclarer plutôt un dommage à votre bien
  Cible                       : questionnaire dommage-au-bien
  Pré-remplissage de la cible : activé
  Annule et remplace          : activé
Bouton 2
  Libellé                     : Rectifier ma déclaration
  Cible                       : question proprietaireDuBien
```

### Hors périmètre

- L'annulation par le déclarant (suppression du questionnaire en cours, retour à la liste des formulaires) : elle relève de l'application cible.
- La correspondance des réponses pré-remplies entre questionnaires.
- L'exécution de la confirmation, de la sauvegarde, de la suppression et du pré-remplissage en prévisualisation.

## Exigences

Formulation : « Quand \<situation>, l'éditeur \<résultat observable> », ou une règle invariante. Une exigence = un comportement = au moins un test.

### Modèle

| ID | Exigence |
| --- | --- |
| EVO-024-001 | L'éditeur propose un type de nœud « Renvoi », qui peut être créé dans un questionnaire par les mêmes moyens que les autres types de nœuds. |
| EVO-024-002 | L'éditeur ne propose pas la création d'un nœud Renvoi dans un fragment. |
| EVO-024-003 | Un nœud Renvoi porte un titre facultatif et un texte multi-lignes, saisis comme ceux du nœud information. |
| EVO-024-004 | Un nœud Renvoi porte une liste ordonnée de boutons de renvoi. |
| EVO-024-005 | Un bouton de renvoi porte un libellé obligatoire, multilingue comme le texte du nœud. |
| EVO-024-006 | Un bouton de renvoi porte une cible obligatoire. |
| EVO-024-007 | Une cible est soit un questionnaire du projet ouvert autre que le questionnaire en cours, soit un nœud du questionnaire en cours. |
| EVO-024-008 | Une cible nœud est une question, un nœud information ou une synthèse situé en amont du nœud Renvoi. |
| EVO-024-009 | Une cible nœud n'est jamais le nœud Renvoi lui-même. |
| EVO-024-010 | Une cible nœud peut être une question d'un fragment appelé en amont du nœud Renvoi. |
| EVO-024-011 | Quand je renomme la cible d'un bouton, l'éditeur conserve la même cible sur le bouton. |
| EVO-024-012 | Quand je choisis une cible questionnaire pour un bouton, l'éditeur lui donne le toggle « Pré-remplissage de la cible », désactivé. |
| EVO-024-013 | Quand je choisis une cible questionnaire pour un bouton, l'éditeur lui donne le toggle « Annule et remplace », désactivé. |
| EVO-024-014 | Un bouton à cible nœud ne porte aucun toggle. |
| EVO-024-015 | Quand je remplace une cible questionnaire par une cible nœud, l'éditeur désactive les deux toggles. |
| EVO-024-016 | Les toggles « Pré-remplissage de la cible » et « Annule et remplace » sont documentaires. |
| EVO-024-018 | Quand j'atteins un nœud Renvoi en prévisualisation, l'éditeur n'affiche que les boutons sans condition d'affichage ou dont la condition est vraie. |
| EVO-024-019 | L'éditeur ne propose aucun bouton de renvoi comme référence dans une expression. |
| EVO-024-020 | Le bouton Terminer n'a ni cible ni condition d'affichage propre. |
| EVO-024-021 | Le libellé du bouton Terminer est personnalisable pour chaque nœud Renvoi et multilingue, comme celui des boutons de renvoi ; non renseigné, il vaut « Terminer ». |
| EVO-024-070 | Un bouton de renvoi porte une condition d'affichage facultative, exprimée comme les autres conditions de l'éditeur. |

### Paramétrage

| ID | Exigence |
| --- | --- |
| EVO-024-022 | Quand je sélectionne un nœud Renvoi, le panneau de propriétés affiche le titre, le texte, puis la liste des boutons. |
| EVO-024-023 | Quand je sélectionne un nœud d'un autre type, le panneau de propriétés ne propose aucun bouton de renvoi. |
| EVO-024-024 | Le panneau de propriétés permet d'ajouter un bouton à un nœud Renvoi. |
| EVO-024-025 | Le panneau de propriétés permet de réordonner les boutons d'un nœud Renvoi. |
| EVO-024-026 | Le panneau de propriétés permet de supprimer un bouton d'un nœud Renvoi. |
| EVO-024-027 | Pour chaque bouton, le panneau de propriétés affiche son libellé et sa cible. |
| EVO-024-028 | Pour un bouton à cible questionnaire, le panneau de propriétés affiche aussi les deux toggles. |
| EVO-024-029 | Quand je choisis une cible, l'éditeur ne propose que les cibles autorisées par EVO-024-007 à EVO-024-010. |
| EVO-024-030 | Quand je choisis une cible, aucune saisie libre n'est possible. |
| EVO-024-065 | Le panneau de propriétés ne propose aucun choix de type de bouton. |
| EVO-024-071 | Pour chaque bouton, le panneau de propriétés permet de saisir sa condition d'affichage avec l'éditeur d'expression existant. |
| EVO-024-074 | Quand je sélectionne un nœud Renvoi, le panneau de propriétés permet de saisir le libellé du bouton Terminer. |

### Problèmes signalés

Signalés par les vérifications du graphe existantes (panneau des problèmes, badge du nœud).

| ID | Exigence |
| --- | --- |
| EVO-024-068 | Quand un nœud Renvoi n'a aucun bouton, l'éditeur signale l'erreur « Le nœud Renvoi n'a aucun bouton. » |
| EVO-024-031 | Quand le libellé d'un bouton est vide, l'éditeur signale l'erreur « Le bouton n'a pas de libellé. » |
| EVO-024-032 | Quand la cible d'un bouton est vide, l'éditeur signale l'erreur « Le bouton n'a pas de cible. » |
| EVO-024-033 | Quand la cible d'un bouton est introuvable (questionnaire absent du projet, ou nœud absent du questionnaire qui contient le bouton), l'éditeur signale l'erreur « La cible du bouton « {libellé} » est introuvable. » |
| EVO-024-034 | Quand je supprime le questionnaire ou le nœud ciblé par un bouton, l'éditeur conserve le bouton. |
| EVO-024-017 | Quand deux boutons d'un même nœud Renvoi visent la même cible, l'éditeur signale l'avertissement « Plusieurs boutons de ce nœud visent la cible « {cible} ». » |
| EVO-024-035 | L'éditeur signale l'avertissement « Une déclaration liée doit précéder une fin : activez annule et remplace ou déplacez le nœud. » sur un bouton si et seulement si sa cible est un questionnaire, son toggle « Annule et remplace » est désactivé et son nœud Renvoi n'est pas juste avant une fin. |
| EVO-024-036 | Quand une cible nœud n'est pas parcourue sur tous les chemins menant au nœud Renvoi, l'éditeur signale l'avertissement « La cible du bouton « {libellé} » n'est pas toujours parcourue avant ce nœud. » |
| EVO-024-072 | Les vérifications existantes des expressions s'appliquent à la condition d'affichage d'un bouton. |

### Logigramme

| ID | Exigence |
| --- | --- |
| EVO-024-037 | Le nœud Renvoi a une forme propre, distincte de celle du nœud information. |
| EVO-024-038 | L'aperçu d'un nœud Renvoi liste, dans l'ordre, le libellé et le nom de la cible de chaque bouton. |
| EVO-024-039 | Quand un toggle d'un bouton est activé, l'aperçu affiche sur ce bouton une icône propre à ce toggle. |
| EVO-024-040 | Le logigramme ne trace aucun lien d'un nœud Renvoi vers les cibles de ses boutons. |
| EVO-024-073 | Quand un bouton a une condition d'affichage, l'aperçu du nœud Renvoi l'indique sur ce bouton. |

### Prévisualisation

| ID | Exigence |
| --- | --- |
| EVO-024-041 | Quand j'atteins un nœud Renvoi, l'éditeur affiche le titre, le texte, puis les boutons dans l'ordre. |
| EVO-024-042 | Sur la page d'un nœud Renvoi, l'éditeur affiche sur chaque bouton les mêmes icônes de toggle que dans le logigramme. |
| EVO-024-043 | Quand je clique sur un bouton à cible questionnaire dont au moins un toggle est activé, l'éditeur affiche un message indiquant la cible et les options activées. |
| EVO-024-067 | Quand je clique sur un bouton à cible questionnaire sans toggle activé, l'éditeur affiche un message indiquant la cible et qu'aucune option n'est activée. |
| EVO-024-044 | Quand je clique sur un bouton à cible questionnaire, l'éditeur reste sur la page et conserve les réponses. |
| EVO-024-045 | Quand je clique sur un bouton dont la cible nœud a été parcourue dans la session, l'éditeur affiche ce nœud en conservant les réponses, comme pour un clic sur une réponse de la synthèse. |
| EVO-024-046 | Quand je clique sur un bouton dont la cible nœud n'a pas été parcourue dans la session, l'éditeur affiche un message l'indiquant et reste sur la page. |
| EVO-024-064 | Quand un bouton est en erreur, l'éditeur l'affiche quand même sur la page. |
| EVO-024-047 | Quand je clique sur un bouton en erreur, l'éditeur ne fait rien. |
| EVO-024-048 | Quand le nœud Renvoi est juste avant une fin, l'éditeur affiche « Terminer » à la place de « Suivant ». |
| EVO-024-049 | Quand le nœud Renvoi n'est pas juste avant une fin, l'éditeur affiche « Suivant » et n'affiche pas « Terminer ». |
| EVO-024-050 | Quand je clique sur « Terminer », l'éditeur affiche la fin, sous réserve de la garde de fin existante. |
| EVO-024-051 | Quand je clique sur « Précédent » sur un nœud Renvoi, l'éditeur revient à la page précédente comme aujourd'hui. |

### Copier-coller et duplication

| ID | Exigence |
| --- | --- |
| EVO-024-052 | Quand je copie-colle un nœud Renvoi, l'éditeur copie ses boutons avec lui. |
| EVO-024-053 | Quand je copie-colle une sélection contenant un nœud Renvoi et la cible nœud de l'un de ses boutons, l'éditeur fait viser à ce bouton collé la copie de cette cible. |
| EVO-024-054 | Quand la sélection copiée ne contient pas la cible nœud d'un bouton, l'éditeur conserve sur le bouton collé la cible d'origine. |
| EVO-024-066 | Quand je duplique un questionnaire, l'éditeur copie ses nœuds Renvoi avec leurs boutons. |
| EVO-024-055 | Quand je duplique un questionnaire, l'éditeur fait viser aux cibles nœud de ses boutons les nœuds de la copie. |

### Format et compatibilité

| ID | Exigence |
| --- | --- |
| EVO-024-056 | Quand j'exporte puis réimporte un projet, l'éditeur restitue à l'identique ses nœuds Renvoi (titre, texte, libellé du bouton Terminer) et leurs boutons (libellé, cible, toggles, condition d'affichage, ordre). |
| EVO-024-057 | Quand j'ouvre un projet antérieur, l'éditeur le charge sans erreur. |
| EVO-024-058 | Le comportement du nœud information est inchangé. |
| EVO-024-059 | Quand un questionnaire ne contient aucun nœud Renvoi, son comportement est identique à aujourd'hui. |
| EVO-024-061 | Quand j'annule ou rétablis une modification d'un nœud Renvoi ou de ses boutons, l'éditeur se comporte comme pour les autres types de nœuds. |
| EVO-024-062 | Quand un questionnaire est validé, l'éditeur interdit la modification de ses nœuds Renvoi et de leurs boutons, comme pour les autres nœuds. |
| EVO-024-063 | Quand une traduction manque pour le titre ou le texte d'un nœud Renvoi, ou pour le libellé d'un bouton ou du bouton Terminer, l'éditeur la signale comme les autres traductions manquantes. |
| EVO-024-060 | Le guide utilisateur décrit le nœud Renvoi, ses boutons, les deux toggles, le bouton Terminer et ce que la prévisualisation ne simule pas. |

## Impacts attendus

- **Format JSON** : nouveau type de nœud ; nouvelle `formatVersion` et migration (ajout seul) ; JSON Schema ; `docs/FORMAT.md` (nœud Renvoi, boutons, référence à un questionnaire par identifiant) ; exemple mis à jour avec une cible questionnaire et une cible nœud.
- **Règles existantes touchées** : vérifications du graphe (`checkWorkspace`, nouveaux codes), page du wizard, copier-coller et duplication, garde de fin.
- **Spec** : § types de nœuds, § vérifications du graphe, § logigramme, § prévisualisation, § copier-coller et duplication.
- **Guide** : section « Nœud Renvoi ».
- **Tests** : chaque test cite l'ID de l'exigence qu'il couvre.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`) ; nom du type de nœud et raccourci de création, cohérents avec les types existants.
2. EVO-024-036 : réutilisation du principe de `notGuaranteed` pour un nœud ; alternative attendue s'il ne s'applique pas.
3. EVO-024-045 : réutilisation du retour depuis la synthèse, y compris vers une question de fragment (EVO-024-010) ; désignation de cette cible (alias du fragment et clé).
4. EVO-024-053 à 055 : repointage des cibles avec les mécanismes existants de collage et de duplication.
5. Matrice de couverture : pour chaque ID, le ou les tests qui le couvrent.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis réalisation. Sinon → statut « à arbitrer », exigences concernées citées, options et conséquences, arrêt sans coder.

## Exigences abrogées

Aucune.

## Historique

| Version | Date | Ajoutées | Abrogées | Motif |
| --- | --- | --- | --- | --- |
| 1.0 | 2026-10-16 | 001 à 068, 070 à 074 | — | Création depuis la fiche littérale validée ; 069 non attribué |

## Analyse

**Conclusion : faisable sans ambiguïté bloquante.** Choix ci-dessous, reportés dans `docs/DECISIONS.md`.

### 1. Faisabilité, modules, nom et raccourci

- Type de nœud `kind: "redirect"` (noms techniques anglais comme `info`, `summary`, `end`), nom affiché « Renvoi » ;
  commande `node.newRedirect` « Nouveau nœud Renvoi », raccourci **Alt+R** (libre ; même famille qu'Alt+I/S/F),
  création chaînée comme les autres pages, indisponible dans un fragment (comme `node.newEnd`).
- Modules (matrice « Ajouter un type de nœud » de `docs/MAP.md`) : `core/model` (`RedirectNode`, `RedirectButton`,
  `redirect.ts` : cibles autorisées, amont, nœud juste avant une fin, cible parcourue sur tous les chemins, repointage),
  `format` (schéma, version 15, migration sans transformation), `core/references` (`visit.ts` : titre, texte,
  libellés et conditions des boutons parcourus : traductions manquantes, vérifications des expressions, renommage),
  `core/validation` (nouveaux codes), `plugins/node-kinds/redirect` (forme, aperçu, propriétés), `plugin-api`
  (`graphId` transmis à la forme et aux propriétés), `registry`, `app/commands`, `app/i18n`, `app/store`
  (collage, duplication, extraction en fragment), `ui/diagram`, `ui/properties`, `ui/preview` (page Renvoi).
- Modèle : `buttons[]` de `{ label, target?, when? }` ; `target` = `{ questionnaire, prefill, replace }` ou
  `{ node }`. Les toggles n'existent que dans une cible questionnaire : 014 et 015 sont structurels (changer de cible
  recrée la cible, toggles à `false`). `finishLabel?` : libellé du bouton Terminer (absent = « Terminer » / « Finish »).
- Pas de lien du logigramme vers les cibles (040) : les boutons ne sont pas des arêtes ; la navigation du moteur
  (Suivant / Terminer) suit les arêtes sortantes comme pour un nœud information.
- Un nœud Renvoi collé dans un fragment est écarté (comme une fin), et l'extraction en fragment refuse une sélection
  qui en contient un (002 : un fragment n'en contient pas).

### 2. EVO-024-036 et `notGuaranteed`

`notGuaranteed` raisonne sur des **clés** posées (`guaranteedBefore`, intersection sur les prédécesseurs) : il ne
s'applique pas à un nœud information ou synthèse, sans clé. Alternative retenue : même principe « sur tous les chemins »,
par dominance : la cible est parcourue sur tous les chemins si, en la retirant du graphe, le nœud Renvoi n'est plus
atteignable depuis le départ. Question d'un fragment (`appel/nœud`) : le nœud fragment domine le Renvoi **et** la
question domine, dans le fragment, toutes ses sorties depuis son entrée (récursivement pour un fragment imbriqué).
Une cible non située en amont n'est jamais parcourue avant le Renvoi : elle est aussi signalée par 036.

### 3. EVO-024-045 et le retour depuis la synthèse

Réutilisation telle quelle : `goTo(session, cible)` puis `returnTo` = étape du Renvoi ; le bouton de retour
(« Revenir au renvoi » sur une page atteinte depuis un Renvoi) appelle `resume` comme « Revenir à la synthèse ».
La cible nœud est désignée par le **chemin d'identifiants** qui est déjà l'id d'étape du moteur : `n_type` dans le
questionnaire, `n_appel/n_question` pour une question de fragment (`a/b/n` imbriqué) ; « parcourue dans la session » =
présente dans l'historique de la session. Ce chemin est stable au renommage (011), contrairement à `alias.cle` qui
sert seulement d'affichage (nom de la cible : clé, `alias.cle`, titre d'une page, titre d'un questionnaire).

### 4. EVO-024-053 à 055 : repointage

Le collage (`pasteNodes`) et la duplication de questionnaire (`cloneGraph`) construisent déjà une table
ancien id → nouvel id. Après copie, le premier segment du chemin d'une cible nœud présent dans la table est remplacé
(`retargetButtons`) ; sinon la cible est conservée (054). Ctrl+D passe par le même collage.

### Choix complémentaires

- Libellé vide (031) : aucun texte non vide dans aucune langue ; une langue manquante seule est une traduction
  manquante (063). Bouton en erreur (047, 064) : 031, 032 ou 033 (calculés par `redirectButtonError`, partagé par
  les vérifications et la prévisualisation).
- Messages de la prévisualisation (043, 046, 067) : `inform` d'`app/feedback` (boîte de message), la page reste affichée.
- Une cible questionnaire égale au questionnaire en cours (après un collage) n'est pas proposée au choix et n'est pas
  signalée.

### 5. Matrice de couverture

Chaque test cite dans son titre les ID qu'il couvre (`tests/smoke/evo-024.spec.ts` : Playwright ; les autres : Vitest).

| ID | Test(s) |
| --- | --- |
| EVO-024-001 | `src/app/commands/redirect-commands.test.ts`, `tests/smoke/evo-024.spec.ts` |
| EVO-024-002 | `src/app/commands/redirect-commands.test.ts` |
| EVO-024-003 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-004 | `src/format/redirect.test.ts` |
| EVO-024-005 | `src/core/validation/redirect.test.ts` |
| EVO-024-006 | `src/core/validation/redirect.test.ts` |
| EVO-024-007 | `src/core/model/redirect.test.ts` |
| EVO-024-008 | `src/core/model/redirect.test.ts` |
| EVO-024-009 | `src/core/model/redirect.test.ts` |
| EVO-024-010 | `src/core/model/redirect.test.ts` |
| EVO-024-011 | `src/core/model/redirect.test.ts`, `src/core/validation/redirect.test.ts` |
| EVO-024-012 | `src/core/model/redirect.test.ts` |
| EVO-024-013 | `src/core/model/redirect.test.ts` |
| EVO-024-014 | `src/core/model/redirect.test.ts` |
| EVO-024-015 | `src/core/model/redirect.test.ts` |
| EVO-024-016 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-017 | `src/core/validation/redirect.test.ts` |
| EVO-024-018 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-019 | `src/core/validation/redirect.test.ts` |
| EVO-024-020 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-021 | `src/core/validation/redirect.test.ts`, `tests/smoke/evo-024.spec.ts` |
| EVO-024-022 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-023 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-024 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-025 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-026 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-027 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-028 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-029 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-030 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-031 | `src/core/model/redirect.test.ts`, `src/core/validation/redirect.test.ts` |
| EVO-024-032 | `src/core/model/redirect.test.ts`, `src/core/validation/redirect.test.ts` |
| EVO-024-033 | `src/core/model/redirect.test.ts`, `src/core/validation/redirect.test.ts` |
| EVO-024-034 | `src/core/validation/redirect.test.ts` |
| EVO-024-035 | `src/core/validation/redirect.test.ts` |
| EVO-024-036 | `src/core/model/redirect.test.ts`, `src/core/validation/redirect.test.ts` |
| EVO-024-037 | `src/app/commands/redirect-commands.test.ts`, `tests/smoke/evo-024.spec.ts` |
| EVO-024-038 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-039 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-040 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-041 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-042 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-043 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-044 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-045 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-046 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-047 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-048 | `src/core/model/redirect.test.ts`, `tests/smoke/evo-024.spec.ts` |
| EVO-024-049 | `src/core/model/redirect.test.ts`, `tests/smoke/evo-024.spec.ts` |
| EVO-024-050 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-051 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-052 | `src/app/commands/redirect-commands.test.ts` |
| EVO-024-053 | `src/app/commands/redirect-commands.test.ts`, `src/core/model/redirect.test.ts` |
| EVO-024-054 | `src/app/commands/redirect-commands.test.ts`, `src/core/model/redirect.test.ts` |
| EVO-024-055 | `src/app/commands/redirect-commands.test.ts` |
| EVO-024-056 | `src/format/redirect.test.ts` |
| EVO-024-057 | `src/format/redirect.test.ts` |
| EVO-024-058 | `src/app/commands/redirect-commands.test.ts`, `tests/smoke/evo-024.spec.ts` |
| EVO-024-059 | `src/core/validation/redirect.test.ts` (exemple avec Renvoi sans problème ; questionnaire sans Renvoi `q_remboursement` : aucun problème, chemins attendus `remboursement_majeur`/`remboursement_mineur` inchangés) |
| EVO-024-060 | `scripts/guide/evo-024.test.ts` |
| EVO-024-061 | `src/app/commands/redirect-commands.test.ts` |
| EVO-024-062 | `src/app/commands/redirect-commands.test.ts` |
| EVO-024-063 | `src/core/validation/redirect.test.ts` |
| EVO-024-064 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-065 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-066 | `src/app/commands/redirect-commands.test.ts` |
| EVO-024-067 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-068 | `src/core/validation/redirect.test.ts` |
| EVO-024-070 | `src/core/validation/redirect.test.ts` |
| EVO-024-071 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-072 | `src/core/validation/redirect.test.ts` |
| EVO-024-073 | `tests/smoke/evo-024.spec.ts` |
| EVO-024-074 | `tests/smoke/evo-024.spec.ts` |
