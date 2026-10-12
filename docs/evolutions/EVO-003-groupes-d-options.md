# EVO-003 — Groupes d'options dans les choix unique et multiple

Statut : fait 2026-10-12
Dépend de : EVO-001 (liste ordonnée d'entrées, entrées dynamiques)

## Besoin

La zone de saisie des options n'accepte qu'une option par ligne. Je veux pouvoir **regrouper**
les options sous des intitulés de groupe, avec une syntaxe minimale inspirée du Markdown, et
pouvoir identifier chaque groupe par un **code** facultatif, défini dans le paramétrage. Une même
option peut exister dans deux groupes avec une signification différente selon le groupe.

Exemple de saisie :

```
# Victime directe
* Conjoint
* Enfant

# Ayant droit
* Conjoint
* Ascendant
```

Puis, dans le paramétrage sous la liste, le groupe « Victime directe » reçoit le code `SC` et le
groupe « Ayant droit » le code `AA`.

Affichage attendu : deux sections titrées « Victime directe » et « Ayant droit », chacune avec ses
options, dans l'ordre saisi. « Autre (préciser) », si activée, reste en dernier, hors de tout groupe.

## Comportement attendu

- **Syntaxe de saisie** :
  - `# Libellé du groupe` ouvre un groupe. La ligne ne contient que le libellé : aucune syntaxe
    supplémentaire n'y est introduite (les accolades restent réservées à l'interpolation et à
    l'i18n, comme pour les options).
  - `* option` ou `- option` ajoute une option au groupe courant. Une ligne sans puce reste acceptée
    (compatibilité avec la saisie actuelle).
  - Les entrées dynamiques d'EVO-001 sont autorisées dans un groupe, comme une option.
  - Les lignes vides sont ignorées.
  - Des options placées avant le premier groupe n'appartiennent à aucun groupe.
- **Groupes** : le libellé d'un groupe se comporte **exactement comme celui d'une option** :
  multilingue, interpolation de références (`{…}`), variantes conditionnelles. Un groupe a en plus
  un code facultatif et une condition d'affichage facultative. Un groupe dont toutes les options
  sont masquées n'est pas affiché.
- **Paramétrage** : chaque option dispose déjà d'une ligne de paramétrage sous la liste. Chaque
  groupe y reçoit aussi sa ligne, placée **juste avant les lignes de ses options** : on y règle
  le code, la condition et les traductions du groupe, comme pour une option.
- **Unicité** : une valeur d'option est unique dans son groupe, mais peut se répéter d'un groupe
  à l'autre. La réponse enregistrée identifie donc l'option **et** son groupe.
- **Expressions** :
  - `ma_question` renvoie la valeur sélectionnée (liste de valeurs pour un choix multiple), comme
    aujourd'hui ;
  - une nouvelle référence renvoie le **groupe** de la sélection : son code s'il est défini, sinon
    son libellé ; le code réservé `AUTRE` si « Autre (préciser) » est choisie ; vide si l'option
    n'a pas de groupe. Choix multiple : liste des groupes des options sélectionnées.
  - Syntaxe visée : `ma_question.groupe` (voir Analyse).
- **Logigramme** : l'aperçu du nœud affiche les intitulés de groupe en gras, options dessous,
  avec la troncature « … » habituelle.
- **Prévisualisation** : les groupes s'affichent comme des sections titrées dans la liste.
- **Panneau de propriétés** : les groupes sont visibles et réordonnables comme les options
  (déplacer un groupe déplace ses options).

## Critères d'acceptation

- Quand je saisis l'exemple, alors la question contient deux groupes de deux options chacun, dans
  l'ordre saisi, et le paramétrage affiche la ligne de chaque groupe juste avant celles de ses options.
- Quand je saisis le code `SC` sur la ligne de paramétrage du groupe « Victime directe », alors ce
  groupe a le code SC.
- Quand le libellé d'un groupe contient une interpolation ou a une traduction, alors il se comporte
  comme le libellé d'une option (même rendu, même signalement des traductions manquantes).
- Quand je saisis une liste sans aucun `#`, alors le comportement est identique à aujourd'hui.
- Quand je choisis « Conjoint » dans « Ayant droit », alors `ma_question` vaut « Conjoint » et
  `ma_question.groupe` vaut « AA ».
- Quand je choisis « Conjoint » dans « Victime directe », alors `ma_question.groupe` vaut « SC » :
  la même valeur dans deux groupes est bien distinguée.
- Quand un groupe n'a pas de code, alors `ma_question.groupe` renvoie son libellé.
- Quand je choisis « Autre (préciser) », alors `ma_question.groupe` vaut « AUTRE ».
- Quand la question est à choix multiple et que je coche une option de chaque groupe, alors
  `ma_question.groupe` vaut la liste [« SC », « AA »].
- Quand toutes les options d'un groupe sont masquées par leurs conditions, alors l'intitulé du
  groupe n'est pas affiché.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur (options sans groupe).
- Quand j'exporte puis réimporte, alors groupes, codes et ordre sont identiques.
- Le guide utilisateur décrit la syntaxe de saisie et la référence au groupe.

## Impacts attendus

- **Format JSON** : nouvelle `formatVersion` et migration, JSON Schema, `docs/FORMAT.md` (groupes,
  réponse = groupe + valeur, référence au groupe), exemple mis à jour avec une question groupée.
- **Spec** : §3.4 (options, groupes), §3.5 (référence au groupe), §3.6 si besoin, §4.2 (aperçu).
- **Guide** : sections Options et Expressions.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. **Syntaxe de la référence au groupe** : `ma_question.groupe` est la cible, mais la valeur d'une
   question est déjà utilisée telle quelle dans les expressions JSONata, et `.` sert aux
   sous-champs de structure. Vérifier que c'est réalisable ; sinon proposer l'écriture la plus
   lisible et cohérente avec les espaces de noms du §3.5, et réserver le mot `groupe`.
3. Le format de stockage d'une réponse « groupe + valeur », et sa migration.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.

## Analyse

### 1. Faisabilité et modules impactés

Faisable sans ambiguïté bloquante. Modules (d'après `docs/MAP.md`, ligne « Options d'un choix ») :

- `core/model` : nouvelle entrée de groupe dans `options[]` ; mot `groupe` ajouté à `RESERVED_KEYS`.
- `format` : `formatVersion` 3, migration 2 → 3 (identité : un projet antérieur n'a pas de groupe), schéma
  (`choiceEntry` : option | dynamique | groupe), `docs/FORMAT.md` (§7.3, §8, §11, chemins), exemple + chemin attendu.
- `core/expressions` : réécriture de `<chemin>.groupe` (point 2) dans `compile`, `extractReferences` inchangé
  côté chemin (`['ma_question','groupe']`).
- `core/references` : `resolvePath` accepte `.groupe` après une question à choix (questionnaire, bloc, champ
  de structure) ; parcours des expressions des groupes (`when`, libellé interpolé) pour le renommage et les usages.
- `core/runtime` : `choiceOptions` déploie les groupes (option résolue + son groupe) ; réponse et `_group` (point 3) ;
  synthèse.
- `core/validation` : réponse = (valeur, groupe) parmi les options visibles ; vérifications §4.6 (groupes en double,
  code `AUTRE`, groupe vide, traductions manquantes des libellés de groupe).
- `plugins/question-types/choice` : saisie rapide (`#`, `*`, `-`), ligne de paramétrage du groupe, déplacement,
  aperçu du logigramme, rendu des sections dans le champ de prévisualisation.
- `ui/preview` : réponse avec groupe (`setAnswer`), chemin de fin (`path-check`).
- `docs/GUIDE.md` (§7 Options, §8 Expressions), `docs/spec.md`.

### 2. Syntaxe de la référence au groupe

`ma_question.groupe` est **réalisable**, mais pas tel quel en JSONata : la valeur de `ma_question` est une chaîne
(ou une liste de chaînes), et `.groupe` sur une chaîne ne renvoie rien. Mécanisme retenu :

- le groupe de la sélection est rangé à côté de la réponse sous la clé `<clé>_group`, comme la précision
  « Autre » sous `<clé>_other` ;
- avant compilation, `core/expressions` réécrit toute étape finale `groupe` d'un chemin nommé :
  `ma_question.groupe` → `ma_question_group`, `decl.ma_question.groupe` → `decl.ma_question_group`,
  `victime.lien.groupe` → `victime.lien_group`, `temoins.lien.groupe` → `temoins.lien_group` (une valeur par occurrence) ;
- `groupe` devient un **mot réservé** : aucune clé de question ni de champ de structure ne peut s'appeler `groupe`.
  Il n'y a donc jamais d'ambiguïté avec un sous-champ de structure. (Une clé existante `groupe` est signalée par la
  vérification « clé invalide » ; l'exemple n'en contient pas.)

L'écriture reste celle de la demande, cohérente avec `victime.nom` (§3.5). Le renommage de `ma_question` est
propagé comme pour tout chemin. `.groupe` sur une question qui n'est pas un choix est signalé comme référence inconnue.

### 3. Stockage de la réponse « groupe + valeur »

- **Valeur** : inchangée (`"Conjoint"`, ou liste pour un choix multiple, `"other"` pour « Autre »).
- **Groupe** : sous `<clé>_group`, l'**identifiant** du groupe = son code s'il est défini, sinon son libellé
  dans la langue par défaut (interpolé). `"AUTRE"` pour « Autre (préciser) ». Option hors groupe : clé absente
  (choix unique) ou `""` (choix multiple). Choix multiple : liste **parallèle** à la liste des valeurs, même
  longueur et même ordre (`["Conjoint","Conjoint"]` / `["SC","AA"]`). C'est aussi ce que renvoie `ma_question.groupe`.
- Une option est identifiée par le couple (identifiant du groupe, valeur) : la même valeur dans deux groupes est
  distincte. Les identifiants de groupe sont uniques dans une question (sinon vérification §4.6) ; une valeur est
  unique dans son groupe (la règle « déjà proposée plus haut » s'applique par groupe).
- **Chemins attendus** (`examples/*/chemins`) : une étape porte `group` à côté de `value` et `other`.
- **Migration** : `formatVersion` 3, migration 2 → 3 sans transformation (pas de groupe = comportement actuel).
  Les réponses n'étant pas stockées dans le projet (seulement en prévisualisation et dans les chemins de test),
  aucune réponse n'est à migrer.

Forme JSON d'un groupe, dans `options[]`, reconnue à la présence de `group` :
`{ "group": <libellé comme celui d'une option>, "code"?: "SC", "when"?: "<condition>", "options": [option | entrée dynamique] }`.
Pas de groupe dans un groupe. Les options placées avant le premier groupe restent des entrées de premier niveau.

### Choix secondaires

- Saisie rapide : `#` en tête ouvre un groupe (espaces après `#` ignorés) ; `* ` ou `- ` en tête est retiré
  (puce) ; `\#`, `\*`, `\-` écrivent une option qui commence par ce caractère (comme `\$`). Une puce est donc
  retirée même sans `#` : seule différence avec la saisie actuelle, sans effet sur les projets existants (la saisie
  rapide réaffiche les options stockées en échappant ces caractères).
- Une ligne `#` modifiée garde son groupe de même rang avec ses réglages (code, condition, traductions),
  comme les options (`reconcile`).
- Ligne de paramétrage du groupe : libellé multilingue à variantes, code, condition, monter / descendre
  (le groupe et ses options), supprimer (le groupe **et** ses options ; Ctrl+Z). Monter / descendre une option
  la déplace dans son groupe ; pour changer une option de groupe, on réordonne les lignes de la saisie rapide.
- Code : texte libre non vide, unique dans la question ; `AUTRE` réservé (vérification §4.6).
- Synthèse et débogage : une réponse groupée s'affiche « Groupe — Option ».
- Prévisualisation : un intitulé de section par groupe visible ; un groupe sans option visible (condition
  fausse, toutes options masquées ou source dynamique vide) n'est pas affiché.

Conclusion : faisable, choix notés dans `docs/DECISIONS.md` ; réalisation.
