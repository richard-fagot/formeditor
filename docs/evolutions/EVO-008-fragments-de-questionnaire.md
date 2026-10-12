# EVO-008 — Fragments de questionnaire réutilisables

Statut : en cours
Dépend de : aucune (réutilise la bibliothèque, les instances nommées des blocs et le logigramme)

## Besoin

Aujourd'hui, une séquence de questions commune à plusieurs questionnaires (identification de
l'assuré, coordonnées bancaires, circonstances d'un sinistre…) doit être ressaisie dans chacun,
ou passer par un bloc. Je veux pouvoir définir dans la bibliothèque des **fragments de
questionnaire** : des morceaux de parcours que j'édite **exactement comme un questionnaire**
(même logigramme, mêmes raccourcis, même panneau de propriétés), mais **sans nœud de départ ni
nœud de fin**. C'est le **questionnaire appelant** qui décide où le parcours commence et où il se
termine.

Deux cas structurent le besoin :

- le fragment est **au milieu** du parcours : le départ est porté par un nœud du questionnaire
  appelant, qui mène au fragment ;
- le fragment est **en première position** : c'est le nœud du fragment, dans le questionnaire
  appelant, qui porte le départ.

Exemple d'usage :

```
Bibliothèque
  Fragment « identification-assure »
    nom → prenom → date_naissance → [majeur ?] ─oui→ num_secu
                                               └non→ representant_legal

Questionnaire « declaration-sinistre »
  [départ] ident (fragment identification-assure)
           → type_sinistre → … → [fin]

Questionnaire « demande-remboursement »
  [départ] motif → ident (fragment identification-assure) → montant → [fin]
```

Affichage attendu : dans le logigramme de l'appelant, le fragment apparaît comme **un seul nœud**
(forme distincte, nom du fragment et alias `ident`). Dans la prévisualisation, ses questions
s'enchaînent page par page comme si elles étaient saisies directement dans l'appelant.

## Comportement attendu

- **Modèle / règles métier** :
  - Un fragment est un objet de la bibliothèque, au même titre que les questions et les blocs.
    Les questionnaires y font **référence** (pas de copie) : une modification du fragment
    s'applique à tous les appelants.
  - Un fragment peut contenir tous les types de nœuds **sauf** le départ et la fin.
  - **Entrée du fragment** : le nœud du fragment sans arête entrante. S'il y en a zéro (le
    fragment boucle sur son premier nœud) ou plusieurs, l'outil le signale ; le choix de la
    règle de repli relève de l'analyse (voir point 3).
  - **Sortie du fragment** : tout nœud du fragment sans arête sortante. Quand le parcours atteint
    une sortie, il reprend sur les arêtes sortantes du nœud fragment dans l'appelant, évaluées
    par rang comme d'habitude.
  - Les conditions de ces arêtes sortantes peuvent porter sur les réponses saisies dans le
    fragment (ex. `ident.majeur = false`).
  - **Instances** : un même fragment peut être utilisé plusieurs fois dans un questionnaire, et
    dans plusieurs questionnaires. Chaque usage porte un **alias** unique dans l'appelant, qui
    préfixe les clés des questions du fragment.
  - **Imbrication** : un fragment peut appeler un autre fragment. Un cycle d'appels (A appelle B
    qui appelle A) est refusé.
  - Un fragment peut référencer des questions de l'appelant et l'état du système, comme un bloc.
    Si un appelant ne fournit pas une clé attendue, l'outil le signale sans bloquer.
- **Saisie / édition** :
  - Création d'un fragment depuis la bibliothèque (nouveau, ou « extraire une sélection en
    fragment » depuis un questionnaire).
  - Le fragment s'ouvre dans un onglet, comme un questionnaire, avec un bandeau indiquant qu'il
    s'agit d'un fragment et le nombre d'appelants.
  - Les actions « définir comme départ » et « nouvelle fin » sont indisponibles dans un fragment.
  - Insertion dans un questionnaire par la palette (Ctrl+K), le raccourci d'insertion depuis la
    bibliothèque ou le glisser depuis le panneau latéral.
- **Départ dans l'appelant** : le marqueur de départ peut être posé sur un nœud fragment ; le
  parcours démarre alors sur l'entrée du fragment.
- **Expressions** : les réponses d'un fragment sont référencées par `alias.cle`
  (ex. `ident.date_naissance`). À l'intérieur du fragment, ses propres questions sont désignées
  sans préfixe.
- **Logigramme** : le nœud fragment affiche le nom du fragment, l'alias, un badge « référence
  bibliothèque » et le nombre de questions. Une action permet d'ouvrir le fragment.
- **Prévisualisation** : les pages du fragment s'enchaînent sans rupture ; le panneau de débogage
  indique qu'on est dans le fragment (alias) et affiche les réponses sous leur clé préfixée. Le
  retour arrière traverse le fragment normalement.
- **Panneau de propriétés** (nœud fragment dans l'appelant) : fragment référencé, alias,
  liste des sorties du fragment, clés attendues de l'appelant.
- **Vérifications** (§4.6) : fragment sans entrée unique, fragment sans sortie, cycle d'appels,
  alias en double, clé attendue absente chez l'appelant, fragment inutilisé.

## Critères d'acceptation

- Quand je crée un fragment dans la bibliothèque, alors il s'ouvre dans un onglet et s'édite
  comme un questionnaire, sans possibilité de poser un départ ou une fin.
- Quand j'insère le fragment `identification-assure` avec l'alias `ident` au milieu de
  `demande-remboursement`, alors le logigramme affiche un seul nœud fragment entre `motif` et
  `montant`, et la prévisualisation enchaîne `motif`, les questions du fragment, puis `montant`.
- Quand je pose le départ de `declaration-sinistre` sur le nœud `ident`, alors la
  prévisualisation commence par la première question du fragment.
- Quand le parcours atteint une sortie du fragment (`num_secu` ou `representant_legal`), alors il
  reprend sur les arêtes sortantes du nœud fragment dans l'appelant.
- Quand une arête sortante du nœud fragment porte la condition `ident.majeur = false`, alors elle
  est suivie si et seulement si la réponse du fragment vaut faux.
- Quand j'utilise deux fois le même fragment dans un questionnaire avec les alias `assure` et
  `conjoint`, alors leurs réponses sont distinctes (`assure.nom`, `conjoint.nom`).
- Quand je saisis un alias déjà utilisé dans le questionnaire, alors l'outil le refuse.
- Quand je modifie une question du fragment, alors la modification apparaît dans tous les
  questionnaires appelants.
- Quand un fragment A appelle un fragment B qui appelle A, alors l'outil refuse l'insertion.
- Quand un fragment n'a pas d'entrée unique ou pas de sortie, alors l'outil le signale sans
  bloquer l'édition.
- Quand le fragment référence une clé absente d'un appelant, alors l'outil le signale dans cet
  appelant.
- Quand je n'utilise pas de fragment, alors le comportement est identique à aujourd'hui.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur.
- Quand j'exporte puis réimporte un projet contenant des fragments, alors les fragments, leurs
  instances, alias et départs sont identiques.
- Le guide utilisateur décrit la création d'un fragment, son insertion, le départ sur un
  fragment, la syntaxe `alias.cle` et la différence avec un bloc.

## Impacts attendus

- **Format JSON** : nouvelle `formatVersion` et migration, JSON Schema (objet fragment dans la
  bibliothèque, nœud d'instance de fragment, départ pouvant viser une instance),
  `docs/FORMAT.md` (section bibliothèque, section nœuds), exemple mis à jour avec un fragment
  utilisé en première position et un fragment utilisé au milieu.
- **Spec** : glossaire (Fragment), §3.1 (graphe : départ sur un fragment, entrée et sorties),
  section bibliothèque et blocs, §4.2 (aperçu du nœud), §4.3 (insertion, extraction d'une
  sélection), §4.6 (nouvelles vérifications), section prévisualisation.
- **Guide** : bibliothèque, insertion depuis la bibliothèque, expressions (références préfixées).

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. **Fragment ou bloc** : le bloc est déjà un sous-graphe réutilisable de la bibliothèque, avec
   instance nommée et sorties nommées. Cible : un seul concept, si le fragment n'est qu'un bloc
   édité comme un questionnaire. Contrainte : ce qui distingue réellement les deux aujourd'hui
   (édition, sorties nommées, rendu). Alternative attendue : si les deux doivent coexister,
   décrire la différence en une phrase pour le guide ; si le fragment remplace le bloc, prévoir
   la migration des blocs existants.
3. **Entrée du fragment** : cible, une entrée implicite (nœud sans arête entrante). Contrainte :
   un fragment qui boucle sur son premier nœud n'a pas de tel nœud. Alternative attendue : une
   propriété « nœud d'entrée » réglable dans le fragment, distincte du départ d'un questionnaire.
4. **Sorties** : cible, une sortie implicite unique (toute feuille du fragment rejoint les arêtes
   sortantes de l'appelant). Si les sorties nommées des blocs sont reprises, préciser comment
   l'appelant branche chaque sortie.
5. **Format de stockage** : instance référençant le fragment par identifiant (pas de copie),
   départ du questionnaire visant une instance, et migration des projets antérieurs.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.

## Analyse

Conclusion : **faisable sans arbitrage**. Le fragment **remplace** le bloc (un seul concept) ; choix
ci-dessous, reportés dans `docs/DECISIONS.md`.

1. **Faisabilité, modules impactés** (`docs/MAP.md`, ligne « Questions et blocs de bibliothèque ») :
   `core/model` (types, entrée et sorties d'un fragment, appels), `format` (schéma, migration 6 → 7,
   fichiers de mise en page), `core/references` (portée et renommage imbriqués), `core/runtime`
   (étapes `i1/i2/nœud`, entrée, sorties implicites), `core/validation` (nouvelles vérifications),
   `app/store` (onglet `f:<id>`, insertion, refus de cycle, extraction), `app/commands`, `app/i18n`,
   `plugins/node-kinds/fragment` (ex-`block`), `registry`, `ui/shell` (onglet), `ui/library`, `ui/diagram`,
   `ui/properties`, `ui/preview` (débogage), `ui/settings` (traductions), exemple, spec, FORMAT, guide.
2. **Fragment ou bloc** : aujourd'hui le bloc s'édite déjà avec le même logigramme, les mêmes
   commandes et le même panneau (dans l'onglet Bibliothèque) ; il ne s'en distingue que par un départ
   explicite, des sorties nommées obligatoires, l'absence d'imbrication et l'emplacement de l'édition.
   Le fragment n'est donc qu'un bloc édité dans un onglet, à entrée et sorties implicites, imbricable :
   **un seul concept, le fragment**, qui remplace le bloc. Migration : chaque bloc devient un fragment
   (même id, clé, titre, nœuds, arêtes, sorties nommées ; `start` devient `entry` seulement s'il n'est
   pas l'unique nœud sans arête entrante), chaque instance `kind: "block"` devient `kind: "fragment"`.
   « Grouper la sélection en bloc » devient « Extraire la sélection en fragment » (même raccourci).
3. **Entrée** : implicite, le nœud sans arête entrante. Repli : propriété facultative `entry` (« nœud
   d'entrée »), réglée par la commande « Définir comme entrée du fragment » (distincte du départ d'un
   questionnaire). Sans `entry` et avec zéro ou plusieurs nœuds sans arête entrante, l'outil le signale
   et le parcours entre par le premier de ces nœuds dans l'ordre des nœuds (le premier nœud s'il n'y en
   a aucun).
4. **Sorties** : implicites, tout nœud sans arête sortante ; le parcours y reprend sur les arêtes
   sortantes du nœud fragment qui ne portent pas de nom de sortie, évaluées par rang. Les **sorties
   nommées** des blocs sont conservées (facultatives) : un nœud « Sortie » nommé `x` reprend sur les
   arêtes de l'appelant marquées `exit: "x"` ou sans nom de sortie (règle actuelle). Un nœud fragment
   sans arête sortante dans un fragment est lui-même une sortie implicite de ce fragment (imbrication).
5. **Stockage** : `bibliotheque.json` → `fragments[]` (`id`, `key`, `title`, `description?`, `entry?`,
   `nodes`, `edges`, sans `start`) ; nœud d'instance `{ kind: "fragment", id, ref, alias }` (référence
   par id, pas de copie) ; le `start` d'un questionnaire peut viser ce nœud. Réponses rangées sous
   `alias` (imbriqué : `a.b.cle`). Mise en page : `fragment_<clé>.layout.json`. `formatVersion` 7 ;
   migration 6 → 7 décrite au point 2. Une fin dans un fragment (bloc migré) reste valide au format
   et terminera le parcours ; elle est signalée.
