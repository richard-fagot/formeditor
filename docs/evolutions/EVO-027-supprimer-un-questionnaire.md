---
id: EVO-027
titre: Supprimer un questionnaire
statut: fait 2026-10-16
version: 1.0
qualificatif: final
derniere_exigence: EVO-027-022
depend_de: []
---

# EVO-027 — Supprimer un questionnaire

## Contexte

*Section non normative : elle explique, les exigences font foi.*

Aujourd'hui, aucune commande ne supprime un questionnaire : seule la fermeture d'onglet existe (EXISTANT § 6
« 1. Coque, commandes et transverse »). Un questionnaire fermé reste listé en bouton grisé après le « + » (EXISTANT
« Onglets (`Tabs`) et navigation entre onglets »). Un questionnaire créé par erreur avec « Nouveau questionnaire »
(« Questionnaire sans titre ») reste donc dans le projet et dans l'export.

Demain, l'utilisateur supprime un questionnaire complet du projet, depuis le menu contextuel de son onglet ou de son bouton
de réouverture, depuis la palette ou depuis Propriétés du questionnaire, après une confirmation. La suppression s'annule
juste après, depuis n'importe quel onglet : c'est une exception à la limite connue selon laquelle une modification du projet
ne s'annule pas depuis un onglet de questionnaire (EXISTANT § 6 « 1. Coque, commandes et transverse »), car un onglet de
questionnaire est souvent actif après la suppression.

### Exemple

Confirmation :
```
Supprimer le questionnaire « Questionnaire sans titre » ?
Il est validé.
2 commentaires seront supprimés.
3 boutons de renvoi le ciblent.
```

### Hors périmètre

- Aucune suppression en cascade dans la bibliothèque.
- Suppression de plusieurs questionnaires en une fois.

## Exigences

### Accès

| ID | Exigence |
| --- | --- |
| EVO-027-001 | Quand l'utilisateur fait un clic droit sur l'onglet d'un questionnaire, l'éditeur propose « Supprimer » dans le menu contextuel, à côté de « Dupliquer ». |
| EVO-027-002 | Quand l'utilisateur fait un clic droit sur le bouton de réouverture d'un questionnaire fermé, l'éditeur propose « Supprimer » dans le menu contextuel, à côté de « Dupliquer ». |
| EVO-027-003 | Quand un questionnaire est actif, l'éditeur propose dans la palette de commandes « Supprimer le questionnaire », qui vise ce questionnaire. |
| EVO-027-004 | Quand Propriétés du questionnaire sont affichées, l'éditeur présente un bouton « Supprimer » qui vise ce questionnaire. |

### Confirmation

| ID | Exigence |
| --- | --- |
| EVO-027-005 | Quand l'utilisateur demande la suppression d'un questionnaire, l'éditeur demande une confirmation qui cite son titre. |
| EVO-027-006 | Quand le questionnaire à supprimer est validé, la confirmation l'indique. |
| EVO-027-007 | Quand le questionnaire à supprimer porte des commentaires de révision, la confirmation indique combien seront supprimés. |
| EVO-027-008 | Quand des boutons de renvoi d'autres questionnaires ciblent le questionnaire à supprimer, la confirmation indique leur nombre. |
| EVO-027-009 | Quand l'utilisateur refuse la confirmation, l'éditeur laisse le projet inchangé. |

### Effets de la suppression

| ID | Exigence |
| --- | --- |
| EVO-027-010 | Quand l'utilisateur confirme, l'éditeur retire le questionnaire du projet : il n'apparaît plus dans les onglets, les boutons de réouverture, la palette ni les exports. |
| EVO-027-011 | Quand l'utilisateur confirme, l'éditeur supprime les commentaires de révision du questionnaire, que l'onglet Commentaires ne liste plus. |
| EVO-027-012 | Quand le questionnaire supprimé était celui de l'onglet actif, l'éditeur active l'onglet précédent, ou la Bibliothèque s'il ne reste aucun onglet. |
| EVO-027-013 | Quand le questionnaire supprimé était affiché dans la vue côte à côte, l'éditeur ferme cette vue. |
| EVO-027-014 | Quand la suppression est confirmée, l'éditeur affiche « Modifications non exportées ». |
| EVO-027-015 | Quand le questionnaire est validé, l'éditeur permet sa suppression sans dévalidation préalable. |
| EVO-027-016 | Quand le projet ne compte qu'un questionnaire, l'éditeur permet sa suppression ; le projet n'a alors plus de questionnaire et l'onglet Bibliothèque s'affiche. |
| EVO-027-017 | Quand un questionnaire est supprimé, l'éditeur laisse la bibliothèque inchangée ; « utilisée dans » d'une question de bibliothèque ne cite plus sa clé. |

### Problèmes signalés

| ID | Exigence |
| --- | --- |
| EVO-027-018 | Quand un bouton de renvoi d'un autre questionnaire ciblait le questionnaire supprimé, l'éditeur signale sur ce bouton l'erreur existante de cible absente. |
| EVO-027-019 | Quand un fragment n'était appelé que par le questionnaire supprimé, l'éditeur signale l'avertissement existant de fragment sans appelant. |

### Annuler

| ID | Exigence |
| --- | --- |
| EVO-027-020 | Quand l'utilisateur lance Annuler juste après une suppression, quel que soit l'onglet affiché, l'éditeur restaure le questionnaire, ses commentaires de révision et son onglet. |

### Existant inchangé

| ID | Exigence |
| --- | --- |
| EVO-027-021 | Quand l'utilisateur lance Fermer l'onglet sur un questionnaire, l'éditeur ne le supprime pas et le présente parmi les questionnaires fermés. |
| EVO-027-022 | Quand l'utilisateur lance Nouveau questionnaire ou Dupliquer le questionnaire, l'éditeur se comporte comme avant cette évolution. |

## Impacts attendus

- **Format JSON** : aucun changement de schéma (formatVersion 15) ; le fichier du questionnaire supprimé n'est plus
  exporté ni cité par le projet.
- **Règles existantes touchées** : limite « aucune commande pour supprimer un questionnaire » levée (EXISTANT § 6.1) ;
  règle d'Annuler selon l'onglet affiché (exception EVO-027-020) ; resynchronisation des onglets après annuler / rétablir ;
  vérifications `buttonTargetMissing` et `unusedFragment` (inchangées, déclenchées par la suppression).
- **Spec** : § des onglets et des propriétés du questionnaire — **Guide** : nouvelle commande, menus contextuels,
  Propriétés du questionnaire.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :
1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. EVO-027-020 : définir « juste après » (aucune autre modification depuis la suppression ?) et le devenir de l'historique
   propre du questionnaire restauré ; Rétablir correspondant.
3. EVO-027-006 à 008 : lignes de la confirmation absentes quand le compte est nul.
4. Matrice de couverture : `| ID | Test(s) |`.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis réalisation.
Sinon → statut « à arbitrer », exigences concernées citées, options et conséquences, arrêt sans coder.

## Exigences abrogées

Aucune.

## Historique

| Version | Date | Ajoutées | Abrogées | Motif |
| --- | --- | --- | --- | --- |
| 1.0 | 2026-10-16 | 001 à 022 | — | Création depuis la fiche littérale validée |

## Analyse

### 1. Faisabilité et modules impactés

Faisable sans ambiguïté bloquante, sans changement de format (formatVersion 15). Modules (d'après `docs/MAP.md`) :
- `app/store` : `delete-questionnaire.ts` (impact, retrait, onglets), action `deleteQuestionnaire` et état `lastDeletion` dans `store.ts`,
  redirection d'`undo` / `redo` juste après une suppression ; `history.ts` et `travel.ts` inchangés.
- `app/commands` : `delete-commands.ts` (`questionnaire.delete`, palette « Supprimer le questionnaire », clé i18n déjà présente).
- `app/feedback` : `confirm(question, ...lignes)` pour la confirmation multiligne ; `app/i18n` : lignes de la confirmation.
- `ui/shell` (`Tabs` : « Supprimer » dans le menu contextuel des onglets et boutons de réouverture de questionnaire),
  `ui/properties` (`PropertiesPanel` : bouton « Supprimer » hors du `fieldset` verrouillé, EVO-027-015).
- Vérifications `buttonTargetMissing` et `unusedFragment`, « utilisée dans » (`itemUsers`), page des commentaires, exports :
  inchangés, ils lisent le projet sans le questionnaire.
- Verrou des formulaires validés (EVO-015) : `lockedChanges` compte une disparition comme une modification ; la suppression
  passe donc par une action dédiée du store, hors `refused`, ainsi que son annulation et son rétablissement juste après.

### 2. EVO-027-020 — « juste après », historique propre, Rétablir

- La suppression est un point lié (même transaction) des historiques `project` et `q:<id>`.
- « Juste après » : aucune autre modification du projet (édition, transaction, point d'historique, déplacement silencieux),
  annulation ni rétablissement effectifs depuis la suppression (un Annuler / Rétablir sans effet ne la referme pas). Dans ce cas, Annuler, quel que soit l'onglet affiché (Bibliothèque,
  autre questionnaire, État du système…), annule la suppression.
- Restauration : questionnaire, mise en page (commentaires) et entrée du projet à leur rang (projet identique à
  l'avant-suppression) ; l'onglet reprend sa place (un questionnaire fermé reste fermé), actif s'il l'était.
- Historique propre du questionnaire : conservé pendant la suppression et retrouvé à la restauration (ses modifications
  antérieures s'annulent ensuite depuis son onglet).
- Rétablir : juste après l'annulation d'une suppression, Rétablir la refait depuis tout onglet. Passé ce moment, la
  suppression reste un point de l'historique du projet (annulable et rétablissable depuis un onglet qui vise cet historique,
  comme État du système, même pour un formulaire validé) ou du questionnaire restauré ; un questionnaire qui réapparaît
  par annuler / rétablir reprend son rang.

### 3. EVO-027-006 à 008 — lignes à compte nul

Chaque ligne est absente quand son compte est nul (questionnaire non validé, aucun commentaire, aucun bouton) ; un compte de 1
s'écrit au singulier. Seuls les boutons de renvoi des autres questionnaires sont comptés.

### 4. Matrice de couverture

| ID | Test(s) |
| --- | --- |
| EVO-027-001 | `tests/smoke/evo-027.spec.ts` « EVO-027-001, … — supprimer un formulaire validé depuis son onglet, puis annuler » |
| EVO-027-002 | `tests/smoke/evo-027.spec.ts` « EVO-027-002, EVO-027-009, EVO-027-021 — bouton de réouverture » |
| EVO-027-003 | `src/app/commands/delete-commands.test.ts` « EVO-027-003 — palette » ; `evo-027.spec.ts` « EVO-027-004, EVO-027-003, … » |
| EVO-027-004 | `tests/smoke/evo-027.spec.ts` « EVO-027-004, EVO-027-003, EVO-027-012, EVO-027-016 — Propriétés du questionnaire et palette » |
| EVO-027-005 | `delete-commands.test.ts` « EVO-027-005, EVO-027-006, EVO-027-007, EVO-027-008 — confirmation » ; `evo-027.spec.ts` (onglet) |
| EVO-027-006 | `delete-commands.test.ts` « EVO-027-005… — confirmation », « EVO-027-006, EVO-027-007, EVO-027-008 — lignes absentes » ; `evo-027.spec.ts` |
| EVO-027-007 | `delete-commands.test.ts` « EVO-027-005… — confirmation », « … — lignes absentes quand le compte est nul » |
| EVO-027-008 | `delete-commands.test.ts` « EVO-027-005… — confirmation », « … — lignes absentes quand le compte est nul » |
| EVO-027-009 | `delete-commands.test.ts` « EVO-027-009 — confirmation refusée » ; `evo-027.spec.ts` (bouton de réouverture) |
| EVO-027-010 | `delete-commands.test.ts` « EVO-027-010 — retiré du projet » ; `evo-027.spec.ts` (onglet) |
| EVO-027-011 | `delete-commands.test.ts` « EVO-027-011 — commentaires de révision supprimés » |
| EVO-027-012 | `delete-commands.test.ts` « EVO-027-012 — onglet actif supprimé », « EVO-027-012 — premier onglet supprimé… » ; `evo-027.spec.ts` (Propriétés) |
| EVO-027-013 | `delete-commands.test.ts` « EVO-027-013 — vue côte à côte » |
| EVO-027-014 | `delete-commands.test.ts` « EVO-027-014 » ; `evo-027.spec.ts` (onglet, pastille) |
| EVO-027-015 | `delete-commands.test.ts` « EVO-027-015 — validé sans dévalidation », « EVO-027-015 — fenêtre passée… » ; `evo-027.spec.ts` (onglet, formulaire validé) |
| EVO-027-016 | `delete-commands.test.ts` « EVO-027-016 — seul questionnaire » ; `evo-027.spec.ts` (Propriétés et palette) |
| EVO-027-017 | `delete-commands.test.ts` « EVO-027-017 — bibliothèque inchangée » |
| EVO-027-018 | `delete-commands.test.ts` « EVO-027-018 — cible introuvable » ; `redirect-commands.test.ts` « EVO-024-034, EVO-024-033 — questionnaire ciblé supprimé » |
| EVO-027-019 | `delete-commands.test.ts` « EVO-027-019 — Fragment inutilisé » |
| EVO-027-020 | `delete-commands.test.ts` « EVO-027-020 — Annuler juste après… », « … — validé : annuler et rétablir… », « … — après une autre modification… », « … — un Annuler ou Rétablir sans effet… », « EVO-027-020 (voisin) — … reprend son rang » ; `evo-027.spec.ts` (onglet) |
| EVO-027-021 | `delete-commands.test.ts` « EVO-027-021 — Fermer l’onglet ne supprime pas » ; `evo-027.spec.ts` (bouton de réouverture) |
| EVO-027-022 | `delete-commands.test.ts` « EVO-027-022 — Nouveau questionnaire et Dupliquer inchangés » |
