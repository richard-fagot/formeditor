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

## Analyse

Conclusion : **à arbitrer**. La suppression du type et la conversion structurelle sont faisables, mais le
booléen « ne sait pas » ne sait pas représenter tout ce qu'un tri-state exprime (valeur par défaut « ne sait
pas », quatrième réponse), et la conversion exige un choix d'architecture contraire au §8.2 de la spec.
Aucun code n'est écrit avant arbitrage.

### 1. Faisabilité et endroits où le tri-state est connu

| Où | Ce qui est connu |
| --- | --- |
| `core/model` | `QUESTION_TYPES` (`tristate`), `TristateQuestion`, `UNKNOWN_VALUE` (`"unknown"`), `OTHER_TYPES`, `LabelSet.kind: 'boolean' \| 'tristate'` et `unknown?` |
| `plugins/question-types/tristate` | Plugin complet (aperçu du logigramme, propriétés, saisie du wizard, `formatAnswer`, raccourci `3`) |
| `registry` | Import et liste du plugin (d'où la commande `node.type.tristate`, la palette et la liste des types) ; `registry.test.ts` |
| `core/validation` | `workspace-check.ts` : jeu de libellés inconnu d'un booléen ou d'un tri-state |
| `app/commands`, `app/i18n`, `ui/library` | `labelSet.addTristate`, libellés `library.kind.tristate`, champ « Troisième valeur » de `LabelSets.tsx` ; `commands.test.ts` |
| `format` | `common.schema.json` (énumération des types, `params_tristate`, branche `if`), `library.schema.json` (`kind`, `unknown`) |
| Exemple, tests | `bibliotheque.json` (`assurance_connue`, jeu `ls_oui_non_nsp`), chemin `ud_tiers_inconnu.json` (`"value": "unknown"`), `tests/smoke/app.spec.ts` (jeu tri-state) |
| Documentation | `docs/spec.md` (§2, §3.4, §3.3 « Autre » / « Ne sais pas », §4.2, §4.4), `docs/FORMAT.md` (§7.2, §7.4, exemple de réponses, `labelSets`), `docs/GUIDE.md` (section « Tri-state », jeux de libellés, index) |

Logigramme, panneau de propriétés, wizard et expressions n'ont pas de code propre au tri-state hors du plugin :
supprimer le plugin suffit côté interface. Les branches sont des arêtes rattachées à l'id du nœud : la
conversion les conserve d'elle-même. L'état du wizard n'est pas persisté (`app/persistence` ne garde que
le bundle, les onglets et les réglages) : aucune réponse à convertir au rafraîchissement.

### 2. Point d'entrée de la migration

Point de passage commun existant : `importFiles` (`format`). L'ouverture et l'import (`project-commands.ts`),
le rafraîchissement (`restoreSession` relit le bundle persisté par `importFiles`, donc par `migrate`) et
l'exemple y passent tous. Le rafraîchissement est donc bien couvert.

Mais la conversion ne peut pas être une migration de document ordinaire (`MIGRATIONS[12]`) :
- elle doit réécrire des expressions, ce qui demande l'analyse JSONata (`core/expressions`) et la
  résolution des portées (`core/references` : `alias.cle` chez les appelants d'un fragment, question de
  bibliothèque référencée par un questionnaire, champs de structure, masquage) ;
- elle est **inter-documents** en fichiers unitaires : une expression d'un `<questionnaire>.json` peut viser
  un tri-state défini dans `bibliotheque.json` ;
- le schéma v13 sans tri-state impose qu'elle ait lieu **avant** la validation de chaque document.

Or le §8.2 de la spec (et la règle dependency-cruiser `format-sur-model`) limite `format` à `core/model`.
Solution envisagée : `convertTristates(ws)` pur dans `core/references`, appelé par `importFiles` entre la
migration et la validation, sur l'ensemble des documents importés (plus le projet courant pour un import
partiel) ; `MIGRATIONS[12]` ne change que `formatVersion`. Cela ajoute la dépendance `format → core/references`
(spec §8.2 et règle à modifier).

### 3. Équivalence des valeurs dans les expressions

Les valeurs **diffèrent** :

| Réponse | `cle` tri-state | `cle` booléen « ne sait pas » | `cle.nsp` |
| --- | --- | --- | --- |
| Oui / Non | `true` / `false` | `true` / `false` | `false` |
| Ne sait pas | `"unknown"` | vide (`null`, marqueur `cle_nsp`) | `true` |
| Sans réponse | vide | vide | `false` |

Un simple changement de type change donc des résultats (vérifié avec JSONata) : `cle ? a : b`, `$exists(cle)`,
`cle != true`, `cle = "unknown"`, `{cle}` dans un libellé, `$string(cle)`…

Réécriture **possible et exacte** pour toute expression analysable, en s'appuyant sur le parcours des
références de `renameKey` (`core/references/rename.ts`) :
- `cle = "unknown"` (ou `"unknown" = cle`) → `cle.nsp` ;
- `cle = true`, `cle = false`, `cle = "other"` (et symétriques) → inchangés (même résultat) ;
- tout autre emploi de `cle` → `(cle.nsp ? "unknown" : cle)` (étape de chemin : `alias.(cle.nsp ? "unknown" : cle)`,
  `$$.(…)`, filtres compris) : reproduit exactement l'ancienne valeur, au prix d'une écriture lourde qui garde le
  code `"unknown"` dans l'expression ;
- expressions dynamiques non analysables (`$lookup($$, "cle")`) : non réécrites, comme pour le renommage
  (limite déjà assumée).

Ce qui **ne peut pas** être reproduit, faute d'équivalent dans le booléen « ne sait pas » :
1. **Valeur par défaut « ne sait pas »** (critère d'acceptation explicite) : `default: "unknown"`, ou un
   `defaultExpr` qui renvoie `"unknown"`. Une valeur par défaut est une valeur ; « Ne sais pas » est un marqueur
   à part, qu'aucune propriété ne permet de présélectionner. Oui / Non se convertissent, « ne sait pas » non.
2. **Tri-state avec « Ne sais pas » activé** (EVO-006) : quatre réponses distinctes (`"unknown"` et `cle.nsp`)
   pour trois possibles après conversion ; les expressions qui les distinguent changent de résultat.
3. **Ordre avec « Autre (préciser) »** : Oui / Non / Ne sait pas / Autre devient Oui / Non / Autre / Ne sait pas
   (« Ne sais pas » est toujours dernière, EVO-006).
4. **Jeux de libellés tri-state** : le troisième libellé partagé disparaît (un jeu booléen n'en a pas) ; il serait
   recopié dans `dontKnow.label` de chaque question, donc plus partagé. Le libellé par défaut diffère aussi
   (« Ne sait pas » pour le tri-state, « Ne sais pas » pour l'option) : recopie explicite nécessaire.

### Options

| Option | Contenu | Conséquences |
| --- | --- | --- |
| **A** (la plus simple) | Conversion dans `core/references`, appelée par `importFiles` (dépendance `format → core/references` ajoutée au §8.2) ; réécriture exacte ci-dessus ; `default: "unknown"` supprimé, `defaultExpr` réécrit (un résultat `"unknown"` ne présélectionne plus rien) ; tri-state + « Ne sais pas » fusionnés en une seule réponse ; jeux tri-state → jeux booléens, troisième libellé recopié dans chaque question. | Critère « valeur par défaut équivalente » non tenu pour « ne sait pas » ; cas des quatre réponses et ordre avec « Autre » non équivalents ; expressions parfois lourdes (`(cle.nsp ? "unknown" : cle)`). |
| **B** | A, plus une propriété « Ne sais pas par défaut » (ex. `defaultDontKnow: true`) sur toute question qui a l'option : modèle, schéma, migration, `core/runtime` (présélection), panneau de propriétés, `docs/FORMAT.md`, guide. | Critère des valeurs par défaut tenu (littérales ; un `defaultExpr` renvoyant `"unknown"` reste non convertible) ; nouvelle fonction offerte à tous les types, hors du besoin initial. |
| **C** | A, mais réécriture limitée aux formes lisibles (`= "unknown"` → `.nsp`, `= true / false` inchangés) ; les autres emplois restent tels quels et sont signalés (nouvelle vérification non bloquante « expression à revoir après conversion »). | Expressions lisibles, sans `"unknown"` résiduel ; résultat non garanti pour les formes signalées, à corriger à la main. |

À trancher aussi, quelle que soit l'option : l'ajout de la dépendance `format → core/references` (ou un autre
point de passage, par ex. la conversion après `importFiles` dans `app`, au prix d'un schéma v13 qui accepterait
encore `tristate` en entrée) ; la règle de fusion d'un tri-state qui avait déjà « Ne sais pas ».

## Arbitrage (utilisateur, 2026-10-13)

Remplace les options A, B et C ci-dessus.

- Conversion **minimale**, à l'import d'un projet, par une migration de format ordinaire dans `format`
  (`formatVersion` 12 → 13). Toute question (ou champ de structure) `tristate` devient un `boolean` avec l'option
  « Ne sais pas » (EVO-006) activée. C'est tout. L'ouverture, l'import et le rechargement (session restaurée par
  `importFiles`) passent tous par cette migration.
- Non fait :
  - pas de réécriture d'expressions, donc pas de dépendance `format → core/references` ;
  - pas de reprise de la valeur par défaut « ne sait pas » : `default: "unknown"` est simplement retiré ;
  - pas de traitement des cas limites (quatre réponses, ordre avec « Autre ») : le seul projet réel n'en a pas.
- Jeux de libellés : un jeu tri-state devient un jeu booléen ; son troisième libellé est abandonné, le booléen
  « Ne sais pas » ayant déjà son propre libellé.

Critères d'acceptation **abandonnés** (contraires à l'arbitrage) :
- « Quand un tristate avait une valeur par défaut, alors le booléen converti a la valeur par défaut équivalente » :
  tenu seulement pour oui / non ; « ne sait pas » est retiré.
- « Quand une condition d'affichage ou un calcul référençait un tristate, alors il donne le même résultat après
  conversion, pour chacune des trois réponses » : les expressions ne sont pas réécrites (`cle = true` / `false`
  inchangés ; `cle = "unknown"` est à remplacer à la main par `cle.nsp`).

Tests des critères retenus : `src/format/migrate-tristate.test.ts` (migration, défaut, jeux de libellés, import
unitaire, pas de nouvelle conversion, projet sans tri-state, schéma), `src/registry/registry.test.ts` et
`src/app/commands/commands.test.ts` (type et jeu tri-state retirés), `tests/smoke/evo-018.spec.ts` (types proposés,
ouverture et rechargement silencieux, propriétés, wizard Oui / Non / Ne sais pas, branches, export stable),
`tests/reference` (exemple converti, chemin `ud_tiers_inconnu.json` en « Ne sais pas »), `scripts/guide` (guide).
