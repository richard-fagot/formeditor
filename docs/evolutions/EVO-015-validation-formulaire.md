# EVO-015 — Marquer un formulaire comme validé

Statut : en cours
Dépend de : aucune

## Besoin

Aujourd'hui, rien ne distingue un formulaire encore en cours de construction d'un formulaire relu et
approuvé par les métiers : tous restent modifiables en permanence, et rien n'empêche une retouche
involontaire après accord. Je veux pouvoir **marquer un formulaire comme validé**, afin de signaler
qu'il est **validé par les métiers et livrable aux développeurs**, et de le **protéger contre toute
modification** tant qu'il est dans cet état. Je veux aussi pouvoir **le dévalider** si une
correction s'avère nécessaire.

Exemple d'usage :

```
Formulaire « Déclaration de sinistre » relu en atelier avec le métier.
→ je clique sur « Valider le formulaire »
→ l'onglet et la vue logigramme affichent un marqueur « Validé »
→ toute tentative de modification est impossible
→ une erreur est remontée par les développeurs : je clique sur « Dévalider »,
  je corrige, puis je valide à nouveau
```

Affichage attendu : un marqueur visuel distinctif (icône et/ou badge « Validé ») sur l'onglet du
formulaire et dans la vue logigramme, visible d'un coup d'œil sans ouvrir le formulaire. Un
formulaire non validé s'affiche exactement comme aujourd'hui.

## Comportement attendu

- **Modèle / règles métier** :
  - Un formulaire possède un état : **non validé** (par défaut) ou **validé**.
  - Un formulaire validé est **en lecture seule** : aucune modification de son contenu (questions,
    réponses, propriétés, expressions, enchaînements du logigramme, ordre, renommage, suppression
    d'éléments).
  - La consultation reste possible : navigation, sélection, lecture des propriétés,
    prévisualisation, export, copie vers un autre formulaire.
  - La validation porte sur un formulaire, indépendamment des autres formulaires du projet.
- **Actions** :
  - Un bouton « Valider le formulaire » passe le formulaire à l'état validé.
  - Un bouton « Dévalider » le repasse à l'état non validé ; une confirmation est demandée.
  - Seul le bouton actif selon l'état est proposé.
- **Logigramme** : le marqueur « Validé » est visible dans la vue logigramme ; les nœuds et liens
  ne peuvent plus être déplacés, créés, reliés ou supprimés.
- **Onglets** : l'onglet du formulaire porte le marqueur « Validé ».
- **Panneau de propriétés** : les champs s'affichent en lecture seule (non éditables), le
  réordonnancement est désactivé.
- **Prévisualisation** : inchangée, le wizard reste utilisable sur un formulaire validé.
- **Annuler / rétablir** : la validation et la dévalidation sont des actions annulables comme les
  autres ; aucune action annulée ne peut modifier un formulaire validé sans le dévalider.
- **Export / import** : l'état de validation fait partie du formulaire exporté, afin que les
  développeurs sachent quels formulaires sont livrables.

## Critères d'acceptation

- Quand je clique sur « Valider le formulaire », alors le marqueur « Validé » apparaît sur son
  onglet et dans la vue logigramme.
- Quand un formulaire est validé, alors je ne peux modifier ni ses questions, ni ses réponses, ni
  ses propriétés, ni ses expressions, ni son logigramme, quel que soit le moyen utilisé (panneau de
  propriétés, logigramme, raccourcis clavier, glisser-déposer, coller).
- Quand un formulaire est validé, alors je peux toujours le consulter, le prévisualiser, l'exporter
  et copier ses éléments vers un autre formulaire.
- Quand je clique sur « Dévalider » et confirme, alors le marqueur disparaît et le formulaire
  redevient modifiable.
- Quand j'annule la confirmation de dévalidation, alors le formulaire reste validé.
- Quand un formulaire est validé, alors les autres formulaires du projet restent modifiables.
- Quand j'utilise annuler / rétablir autour d'une validation, alors l'état de validation suit
  l'historique et aucun contenu d'un formulaire validé n'est modifié.
- Quand je n'utilise pas la validation, alors le comportement est identique à aujourd'hui.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur et tous ses formulaires sont
  non validés.
- Quand j'exporte puis réimporte, alors l'état de validation de chaque formulaire est identique.
- Le guide utilisateur décrit la validation, ses effets (lecture seule) et la dévalidation.

## Impacts attendus

- **Format JSON** : nouvelle `formatVersion` et migration (formulaires existants → non validés),
  JSON Schema (propriété d'état de validation du formulaire), `docs/FORMAT.md` (description de la
  propriété), exemple mis à jour avec un formulaire validé.
- **Spec** : sections relatives au formulaire (état et cycle de vie), aux onglets, au logigramme
  et au panneau de propriétés (lecture seule).
- **Guide** : nouvelle section « Valider un formulaire ».

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Mise en lecture seule : la cible est un verrou appliqué au niveau du modèle (toute commande de
   modification sur un formulaire validé est refusée), et non une simple désactivation des
   contrôles d'interface, pour couvrir tous les chemins d'édition (raccourcis, collage,
   glisser-déposer, annuler / rétablir). Si un point d'entrée échappe à ce verrou, le lister et
   proposer le traitement.
3. Format de stockage : représentation de l'état (booléen ou statut énuméré, en prévision d'états
   futurs), migration des projets antérieurs, et opportunité de stocker la date de validation.
4. Interactions entre formulaires : préciser si une modification d'un autre formulaire peut
   affecter un formulaire validé (références croisées, éléments partagés) et le comportement
   attendu dans ce cas.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.

## Analyse

Conclusion : **faisable sans ambiguïté bloquante**. Choix ci-dessous, reportés dans `docs/DECISIONS.md`.

1. **Faisabilité, modules** (matrice de `docs/MAP.md`) : `core/model` (état du questionnaire, règle du verrou,
   fonction pure testée), `format` (schéma, migration 10 → 11, exemple, `docs/FORMAT.md`), `app/store` (verrou
   dans `edit`, `transact`, `silent`, `undo`, `redo` ; écriture de l'état ; la duplication ne reprend pas l'état),
   `app/commands` (« Valider le formulaire », « Dévalider » avec confirmation), `app/i18n`, `ui/shell` (marqueur sur
   l'onglet, bouton et marqueur dans la barre du logigramme), `ui/diagram` (mode verrouillé : sélection gardée,
   ni déplacement, ni liaison, ni dépôt, ni édition en place), `ui/properties` et `ui/expression-editor` (champs
   en lecture seule), `docs/spec.md`, `docs/GUIDE.md`, tests.
2. **Verrou au niveau du modèle** : toute modification du projet passe par l'une des actions du store
   (`edit`, `transact`, `silent`, `undo` / `redo`) ; `loadWorkspace` remplace tout le projet (ouvrir, nouveau, exemple).
   Chacune compare l'état avant / après : si le contenu d'un questionnaire validé avant la modification a changé
   (questionnaire hors état de validation, sa mise en page hors commentaires, son entrée dans le projet) ou s'il a
   disparu, la modification est **annulée en bloc** et un message l'explique. Raccourcis, palette, panneau, collage,
   glisser-déposer, dépôt depuis la bibliothèque, import de fichiers unitaires (qui passe par `edit`), mise en page
   automatique et annuler / rétablir sont donc tous couverts. Seule l'action de dévalidation (qui ne change que l'état)
   passe. Points d'entrée qui échappent au verrou : aucun pour le contenu ; l'ouverture d'un projet (`loadWorkspace`)
   n'est pas une modification. Côté interface, les champs non contrôlés (CodeMirror) sont mis en lecture seule pour
   que l'affichage ne diverge pas du modèle. Annuler / rétablir : la validation est un point de l'historique du
   questionnaire ; tant qu'il est validé, ce point est en tête de sa pile (aucune autre modification n'y est
   enregistrée), donc on ne peut remonter à une version antérieure qu'en annulant d'abord la validation ; le verrou
   vérifie en plus chaque annuler / rétablir (transactions multi-portées comprises).
   **Commentaires de révision** (§4.7) : hors verrou (sans effet sur le questionnaire) ; ils restent éditables et
   déplaçables sur un formulaire validé, utiles pour remonter une erreur.
3. **Stockage** : statut énuméré facultatif `status` (`"draft"` | `"validated"`, absent = `"draft"`), prêt pour des
   états futurs ; date `validatedAt` (`AAAA-MM-JJ`) posée à la validation, retirée à la dévalidation (renseigne les
   développeurs à moindre coût). Dévalider retire les deux propriétés : le fichier redevient identique à l'octet près.
   Version 11 ; migration 10 → 11 sans transformation (propriété absente = non validé).
4. **Interactions entre formulaires** : un questionnaire ne référence jamais un autre questionnaire ; les éléments
   partagés sont la bibliothèque (questions, fragments, jeux de libellés) et le dictionnaire de l'état du système.
   La validation porte sur le fichier du questionnaire. Bibliothèque et dictionnaire restent modifiables : une
   modification sans réécriture du formulaire validé (intitulé d'une question de bibliothèque, contenu d'un fragment)
   s'y applique par référence, comme aujourd'hui (règle §3.8 : l'utilisateur reste garant de la cohérence) ; une
   modification qui **réécrirait** le formulaire validé (renommage propagé d'une clé de bibliothèque ou d'une
   variable qu'il utilise) est **refusée en bloc** avec le message du verrou. Une référence rendue cassée (élément
   supprimé) est signalée par les vérifications (§4.6). Copier des nœuds d'un formulaire validé ou le dupliquer est
   permis ; la copie n'est pas validée.
