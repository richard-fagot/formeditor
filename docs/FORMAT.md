# Format des questionnaires — version 4

Ce document décrit le format JSON produit par l'éditeur de questionnaires. Il s'adresse à l'équipe
de développement (et à l'IA qui l'assiste) chargée de construire le moteur cible et les formulaires
réels. Il se suffit à lui-même : on peut implémenter un moteur conforme sans lire le code de l'outil.

Livrables :

- **Schémas** : `src/format/schemas/*.schema.json` (JSON Schema 2020-12), un par type de fichier, plus
  `common.schema.json` (définitions partagées). Ils fixent la **structure** ; ce document fixe le **sens**.
- **Exemple complet** : `examples/declaration-sinistre/` (projet, bibliothèque, questionnaire, mise en page).
- **Jeux de test** : `examples/declaration-sinistre/chemins/*.json`, parcours attendus par scénario (§15).
- Implémentation de référence (TypeScript, facultative à lire) : moteur de parcours `src/core/runtime`,
  expressions `src/core/expressions`, validation des réponses `src/core/validation` (`validateAnswer`).

Conventions : « doit » marque une règle que le moteur cible doit respecter pour se comporter comme la
prévisualisation de l'outil. L'ordre des propriétés d'un objet n'a pas de sens ; l'ordre des tableaux
en a un (options, champs, variantes, et surtout arêtes, §11.1).

## Sommaire

1. Fichiers et versions — 2. Identifiants et clés — 3. Projet — 4. Questionnaire — 5. Textes,
libellés et interpolation — 6. Nœuds — 7. Questions — 8. Réponses — 9. Validation d'une réponse —
10. Expressions — 11. Navigation — 12. Bibliothèque — 13. Vérifications de l'éditeur —
14. Exemple commenté — 15. Chemins attendus — 16. Évolution du format

## 1. Fichiers et versions

| Fichier | `kind` | Contenu | Utile au moteur |
| --- | --- | --- | --- |
| `projet.json` | `project` | Métadonnées, langues, dictionnaire de l'état du système, scénarios, liste des questionnaires. | oui |
| `bibliotheque.json` | `library` | Questions, blocs et jeux de libellés réutilisables. | oui |
| `<clé>.json` | `questionnaire` | Un questionnaire : nœuds, arêtes, questions locales, références à la bibliothèque. | oui |
| `<clé>.layout.json`, `bloc_<clé>.layout.json` | `layout` | Positions des nœuds dans l'éditeur. | **non** (à ignorer) |
| `<projet>.bundle.json` | `bundle` | `project`, `library`, `questionnaires[]`, `layouts[]` dans un seul fichier. | oui (même contenu) |

- Chaque fichier (et le bundle) porte `formatVersion` (entier, actuellement `4`) et `kind`.
- L'outil migre automatiquement à l'ouverture un fichier d'une version antérieure ; il refuse un fichier
  d'une version plus récente. Un moteur cible peut refuser toute version qu'il ne connaît pas.
- Tout élément (projet, questionnaire, nœud, arête, question, bloc, variable, scénario, jeu de libellés)
  accepte une propriété `description` libre, destinée au lecteur humain ou à une IA, **sans effet** sur le
  comportement.
- Une arête, une variable de l'état du système et un champ de liste d'objets acceptent aussi un
  **libellé de lecture** `caption` (version 4) : chaîne simple non vide, sur une ligne, en une seule langue
  (non traduite, sans interpolation). C'est un nom court affiché par l'éditeur à la place de la condition
  ou à côté de la clé ; il n'est **jamais** montré à l'utilisateur final, n'est pas utilisable dans les
  expressions (on écrit toujours la clé) et n'a **aucun effet** sur le comportement. À ne pas confondre
  avec `label` / `title` (textes multilingues) ni avec `description` (explication longue).
- Le format ne contient aucune donnée de présentation, sauf les fichiers `layout` (outil seulement).
- Les fichiers sont écrits en UTF-8, indentés de 2 espaces, terminés par un saut de ligne.

Squelette d'un questionnaire :

```json
{
  "formatVersion": 4,
  "kind": "questionnaire",
  "id": "q_declaration",
  "key": "declaration_sinistre",
  "title": { "fr": "Déclaration de sinistre", "en": "Claim declaration" },
  "start": "n_intro",
  "nodes": [ … ],
  "edges": [ … ]
}
```

## 2. Identifiants et clés

- **`id`** : identifiant technique, stable, opaque. Les id des nœuds, arêtes, questions et champs de
  structure ne contiennent pas de `/` (réservé aux étapes de bloc, §11.3 ; imposé par le schéma) ; les
  autres id (projet, questionnaire, bloc, jeu de libellés, scénario) ne sont pas contraints. Il sert aux liens structurels : arêtes (`from`, `to`), départ (`start`), références de
  bibliothèque (`ref`, `labelSet`), mise en page. **Jamais** dans une expression.
  Les id sont uniques dans leur graphe ; un nœud question local a le même id que sa question.
- **`key`** : clé lisible en `snake_case` (`^[a-z][a-z0-9_]*$`). C'est elle qu'on écrit dans les
  expressions et qui nomme la réponse. Mots réservés (interdits comme clé) : `sys`, `true`, `false`,
  `null`, `and`, `or`, `in`, `groupe` (§10.3).

Unicité des clés (l'outil le vérifie, §13) :

| Clés | Unique dans |
| --- | --- |
| Clés des questions d'un questionnaire (locales et de bibliothèque) **et** alias de ses instances de bloc | ce questionnaire |
| Clés des questions d'un bloc | ce bloc |
| Clés des questions de la bibliothèque | la bibliothèque |
| Clés des champs d'une structure | cette structure |
| Noms des variables système ; noms des champs d'une variable `list` | le dictionnaire ; la liste |
| Clé d'un questionnaire | le projet (elle donne le nom du fichier `<clé>.json`) |

## 3. Projet (`projet.json`)

| Propriété | Sens |
| --- | --- |
| `id`, `name`, `description?` | Identité du projet. |
| `languages` | Codes des langues des contenus (`fr`, `en`, `pt-BR` : `^[a-z]{2,3}(-[A-Za-z0-9]+)?$`), au moins un. |
| `defaultLanguage` | Langue de repli (§5.1), présente dans `languages`. |
| `systemState[]` | Dictionnaire de l'état du système (§3.1). |
| `scenarios[]` | Jeux de valeurs de l'état du système pour la prévisualisation et les tests (§3.2). |
| `questionnaires[]` | `{ "id", "file" }` : id du questionnaire et nom de son fichier (`<clé>.json`). |

### 3.1 État du système

Le **logiciel hôte** fournit au moteur, au démarrage d'un parcours, un objet de valeurs : c'est l'état
du système, lu dans les expressions par `sys.<nom>`. Le dictionnaire `systemState[]` le décrit :

| Propriété | Sens |
| --- | --- |
| `name` | Nom (clé `snake_case`), unique. |
| `type` | `text`, `number`, `date` (chaîne `AAAA-MM-JJ`), `boolean`, `enum` (chaîne parmi `values`), `list` (tableau d'objets décrits par `fields`). |
| `values` | `enum` : valeurs possibles. |
| `fields` | `list` : champs des objets (mêmes propriétés `name`, `type`…). |
| `caption?` | Libellé de lecture (version 4), ex. `"Profil de l'utilisateur connecté"` ; aussi sur chaque champ de `fields`. Jamais utilisé dans les expressions. |
| `description?`, `example?` | Documentation ; valeur d'exemple. |

Le dictionnaire est **déclaratif** : une variable absente de l'objet fourni est simplement absente dans
les expressions (§10.4). Exemple : `sys.sinistres` est une liste d'objets `{ id, date, nature }`.

### 3.2 Scénarios

`{ "id", "name", "description?", "values": { "<nom>": <valeur>, … } }` : un état du système complet,
nommé (« UD avec 2 sinistres », « Contrat résilié »…). Les chemins attendus (§15) s'y réfèrent.

## 4. Questionnaire (`<clé>.json`)

| Propriété | Sens |
| --- | --- |
| `id` | Identifiant (référencé par `projet.json` et par les chemins attendus). |
| `key` | Clé `snake_case`, nom du fichier. |
| `title` | Titre, texte multilingue simple (§5). |
| `description?` | Libre. |
| `start` | Id du nœud de départ. |
| `nodes[]` | Nœuds (§6). |
| `edges[]` | Arêtes (§11.1) ; **leur ordre compte**. |

Un bloc de bibliothèque (§12) est un graphe de même forme (`start`, `nodes`, `edges`).

## 5. Textes, libellés et interpolation

### 5.1 Texte multilingue

Objet `{ "<langue>": "texte" }`, une entrée par langue du projet. Une langue absente est une
traduction manquante : on affiche alors le texte de la langue par défaut, sinon le premier texte présent.

### 5.2 Libellé

Un **libellé** est soit un texte multilingue, soit un objet **à variantes** : la première variante
(dans l'ordre) dont la condition `when` vaut `true` est retenue, sinon `otherwise`.

```json
{
  "variants": [{ "when": "type_sinistre = 'vol'", "text": { "fr": "Valeur des biens volés", "en": "Value of stolen goods" } }],
  "otherwise": { "fr": "Montant des dommages", "en": "Amount of damage" }
}
```

Résolution d'un libellé : variante → langue (avec repli) → interpolation.

| Propriétés de type **libellé** (variantes possibles, interpolées) | Propriétés **texte multilingue** |
| --- | --- |
| Question : `label`, `help`, `placeholder` ; option : `label` ; groupe d'options : `group` (§7.3) ; `other.label` ; surcharge `label` d'une question de bibliothèque ; `info` : `title`, `text` ; `summary` : `title` ; `end` : `title`, `message` | Interpolées, sans variantes : `messages.<param>`, `constraints[].message` (§9). Non interpolées : `title` d'un questionnaire ou d'un bloc, `unit`, `repeat.addLabel`, `yes`/`no`/`unknown` d'un jeu de libellés, `label` d'une sortie de bloc |

### 5.3 Interpolation

Dans un texte interpolé, `{expression}` est remplacé par la valeur de l'expression (§10), évaluée dans
le contexte de la page affichée (§10.2). Exemples : `Bonjour {sys.nom_assure}`,
`Date de naissance de {prenom}`, `{$count(victimes[hospitalise])} personne(s)`.

- Mise en forme de la valeur : absente ou `null` → chaîne vide ; liste → éléments joints par `, ` ;
  objet → JSON ; nombre, booléen → forme JSON brute (`950.5`, `true`) ; date → chaîne ISO telle quelle.
  C'est la **valeur** qui est affichée, pas le libellé d'une option (`{type_sinistre}` donne `vol`).
- Une expression en erreur donne une chaîne vide.
- `{{` et `}}` produisent des accolades littérales. À l'intérieur d'une expression, les accolades
  s'imbriquent et celles qui figurent entre guillemets ne comptent pas ; une `{` sans fermeture est du texte.

## 6. Nœuds (`kind`)

| `kind` | Rôle | Propriétés (outre `id`, `description?`) | Page affichée |
| --- | --- | --- | --- |
| `question` | Saisie d'une réponse. | Question locale (§7) **ou** `ref` (id d'une question de bibliothèque) + `label?` qui surcharge son intitulé. | oui |
| `block` | Instance d'un bloc de bibliothèque. | `ref` (id du bloc), `alias` (clé : préfixe des clés du bloc vues de l'hôte). | non : on entre dans le bloc |
| `info` | Texte sans saisie. | `title?`, `text`. | oui |
| `summary` | Récapitulatif des réponses (§11.6). | `title?`. | oui |
| `end` | Fin de parcours. | `title?`, `message`, `outcome?` (issue métier libre : `submitted`, `ineligible`…). | oui (dernière) |
| `exit` | Sortie nommée d'un bloc, **dans un bloc uniquement** (règle non vérifiée, §11.3). | `name` (clé, visée par `exit` des arêtes de l'instance), `label?` (texte pour le lecteur, sans effet). | non |

Question locale (le nœud porte la question) et question de bibliothèque :

```json
{ "kind": "question", "id": "n_tiers", "key": "tiers_implique", "type": "boolean",
  "label": { "fr": "Un tiers est-il impliqué ?", "en": "Is a third party involved?" }, "required": true },
{ "kind": "question", "id": "n_tel", "ref": "lq_telephone", "label": { "fr": "Numéro où vous joindre", "en": "Number to reach you" } }
```

Pour une question de bibliothèque, la clé, le type, les contraintes et tout le reste sont ceux de la
bibliothèque ; seul l'intitulé (`label`) peut être surchargé.

## 7. Questions

### 7.1 Propriétés communes

| Propriété | Sens |
| --- | --- |
| `id`, `key`, `type` | Identifiant, clé, type (§7.2). |
| `label` | Intitulé (libellé). |
| `help?`, `placeholder?` | Aide sous l'intitulé ; texte indicatif dans le champ (libellés). |
| `required?` | `true`, `false` (défaut) ou **expression** : obligatoire si elle vaut `true` au moment de la validation. |
| `default?` | Valeur par défaut littérale, de la forme de la réponse (§7.2). |
| `defaultExpr?` | Valeur par défaut calculée (expression), prioritaire sur `default`. |
| `messages?` | `{ "<paramètre>": texte multilingue }` : message d'erreur par contrainte intégrée (§9.2). |
| `constraints?` | Règles libres `[{ "rule": "<expression vraie si valide>", "message"?: {…} }]` (§9). |
| `description?` | Libre. |

**Valeur par défaut** : en arrivant sur une page question dont la réponse est inconnue, le moteur pose
`defaultExpr` (évaluée dans le contexte de la page) sinon `default` ; l'utilisateur peut la changer.
Une réponse déjà connue (retour arrière, boucle) n'est pas remplacée. Les valeurs par défaut des
champs de structure ne sont pas appliquées (comportement actuel de l'outil).

### 7.2 Types et forme de la réponse

| `type` | Réponse | Paramètres propres |
| --- | --- | --- |
| `text` | chaîne | `multiline?` (zone de texte), `minLength?`, `maxLength?`, `pattern?` (expression régulière JavaScript) |
| `date` | chaîne `AAAA-MM-JJ` | `min?`, `max?` : date ISO littérale ou expression (`$today()`, `date_sinistre`, `sys.date_effet_contrat`) |
| `number` | nombre | `numberKind?` (`real` défaut, `natural` = entier ≥ 0, `integer`), `min?`, `max?` (nombre ou expression), `decimals?` (décimales max.), `unit?` (texte multilingue affiché après le champ) |
| `single` | chaîne : `value` de l'option | `options[]` (entrées, §7.3), `other?` |
| `multiple` | tableau de chaînes | `options[]` (entrées, §7.3), `other?`, `minSelected?`, `maxSelected?` |
| `boolean` | `true` / `false` | `labelSet?` (id d'un jeu `boolean` ; défaut « Oui / Non »), `other?` |
| `tristate` | `true` / `false` / `"unknown"` | `labelSet?` (id d'un jeu `tristate` ; défaut « Oui / Non / Ne sait pas »), `other?` |
| `structure` | objet `{ <clé du champ>: réponse }`, ou **tableau** de tels objets si répétable | `fields[]`, `repeat?` |

Avec l'option « Autre » (§7.4), la réponse vaut `"other"` (dans le tableau pour `multiple`).
Une question laissée vide a pour réponse `null` (§8).

### 7.3 Options (`single`, `multiple`)

`options[]` est une suite **ordonnée** d'entrées, affichées strictement dans cet ordre. Chaque entrée est :

- une **option statique** : `{ "value": "vol", "label": {…}, "when"?: "<condition d'affichage>" }`.
  La valeur `other` est réservée ;
- ou une **entrée dynamique**, reconnue à la présence de `from` :
  `{ "from": "<expression>", "label"?: "<expression>", "value"?: "<expression>", "when"?: "<condition>" }` (§7.5) ;
- ou un **groupe d'options** (version 3), reconnu à la présence de `group` :
  `{ "group": <libellé>, "code"?: "SC", "when"?: "<condition>", "options": [ option statique | entrée dynamique ] }`.
  Pas de groupe dans un groupe.

Une entrée dont `when` ne vaut pas `true` n'est pas proposée (entrée dynamique : aucune de ses valeurs ;
une réponse qui la désigne est refusée, §9.1). Les entrées visibles sont déployées dans l'ordre :
une option statique donne une option, une entrée dynamique en donne zéro, une ou plusieurs **à sa position**.
Une valeur vide, `other` ou déjà proposée plus haut dans **le même groupe** (ou parmi les options hors groupe ;
statique ou dynamique) est écartée.
« Autre » (§7.4) vient toujours après toutes les entrées, hors de tout groupe.

**Groupes.** Un groupe dont `when` ne vaut pas `true` ne donne rien ; sinon ses entrées sont déployées comme
ci-dessus, à sa position, chacune rattachée au groupe. `group` est un libellé (§5.2) : multilingue, interpolé,
à variantes ; il s'affiche comme intitulé de section au-dessus de ses options. Un groupe dont aucune option n'est
visible n'est pas affiché. L'**identifiant** du groupe est `code` s'il est présent, sinon le libellé résolu dans la
**langue par défaut** du projet (interpolé dans le contexte de la page) ; il doit être unique dans la question et
`AUTRE` est réservé (§13). Les entrées placées avant le premier groupe n'appartiennent à aucun groupe. Une même
valeur peut figurer dans deux groupes : une option est identifiée par le couple (identifiant du groupe, valeur).

```json
"options": [
  { "from": "sys.sinistres", "label": "date & ' — ' & nature", "value": "id" },
  { "value": "aucun", "label": { "fr": "Non, aucun", "en": "No" } }
]
```

```json
"options": [
  { "group": { "fr": "Victime directe", "en": "Direct victim" }, "code": "SC", "options": [
    { "value": "conjoint", "label": { "fr": "Conjoint", "en": "Spouse" } },
    { "value": "enfant", "label": { "fr": "Enfant", "en": "Child" } } ] },
  { "group": { "fr": "Ayant droit", "en": "Beneficiary" }, "options": [
    { "value": "conjoint", "label": { "fr": "Conjoint", "en": "Spouse" } },
    { "value": "ascendant", "label": { "fr": "Ascendant", "en": "Parent" } } ] }
]
```

### 7.4 « Autre (préciser) » (`single`, `multiple`, `boolean`, `tristate`)

`other: { "label"?, "detailRequired"? }` ajoute, après les autres, un choix de valeur `"other"`
(libellé par défaut « Autre (préciser) ») qui ouvre un champ texte de précision. La précision est
rangée à côté de la réponse sous la clé `<clé>_other` (§8) et se lit ainsi dans les expressions :
`{type_sinistre_other}`. `detailRequired: true` rend la précision obligatoire quand `"other"` est choisi.

### 7.5 Entrée dynamique (`single`, `multiple`)

`{ "from": "<expression>", "label"?: "<expression>", "value"?: "<expression>", "when"?: "<condition>" }`,
placée dans `options[]` (§7.3) : les options proviennent d'une liste, réponse précédente ou variable système.
Plusieurs entrées dynamiques peuvent coexister, à n'importe quelle position.

1. `when` (facultative) est évaluée dans le contexte de la page ; si elle ne vaut pas `true`, l'entrée ne donne rien.
   `from` est évaluée dans le contexte de la page ; une valeur unique est traitée comme une liste d'un
   élément ; une valeur absente ou une liste vide ne donne aucune option (ni erreur).
2. Pour chaque élément non nul, `value` puis `label` sont évaluées **avec l'élément pour seul contexte**
   (`date & ' — ' & nature` lit les champs de l'élément ; `$` est l'élément). Sans `value` (`label`),
   l'élément lui-même sert de valeur (de libellé). Un libellé vide prend la valeur.
3. Les valeurs sont converties en chaînes (objet → JSON). Les valeurs vides, `other` et celles déjà
   proposées plus haut dans la liste (y compris par une option statique) sont écartées.
4. Les options obtenues prennent la place de l'entrée, dans l'ordre de la liste source.

Version 1 : les options dynamiques étaient décrites à part (`source`, sans `when`) et suivaient les options
statiques. La migration 1 → 2 place cette `source` en dernière entrée de `options[]` : l'affichage est inchangé.

### 7.6 Structure

- `fields[]` : questions de tout type **sauf** `structure` (pas d'imbrication), avec en plus `when?`
  (condition d'affichage du champ, évaluée pour chaque occurrence). Un champ masqué n'est pas validé.
- Dans les expressions et libellés d'un champ, les clés des champs de la **même occurrence** s'écrivent
  sans préfixe (`hospitalise = true`) et masquent une clé homonyme du questionnaire.
- `repeat: { "min"?, "max"?, "addLabel"? }` rend la structure répétable : réponse en tableau, bouton
  « Ajouter » (`addLabel`) et « Supprimer » bornés par `min` / `max`.
- La précision « Autre » d'un champ est rangée dans l'occurrence : `{ "canal": "other", "canal_other": "…" }` ;
  de même le groupe de la sélection d'un choix : `{ "lien": "conjoint", "lien_group": "SC" }`.

## 8. Réponses

Les réponses d'un parcours forment un objet indexé par clé :

```json
{
  "type_sinistre": "other", "type_sinistre_other": "Incendie",
  "date_sinistre": "2026-10-01",
  "victimes": [{ "prenom": "Léa", "nom": "Morel", "hospitalise": true, "duree_hospitalisation": 3 }],
  "montant_estime": 950.5,
  "tiers_implique": true,
  "tiers": { "nom": "Dupont", "coordonnees": { "adresse": "12 rue des Lilas", "code_postal": "69003", "ville": "Lyon" }, "assurance_connue": "unknown" },
  "circonstances": null,
  "qualite_declarant": "conjoint", "qualite_declarant_group": "SC",
  "canaux_contact": ["email", "other"], "canaux_contact_other": "Par l'amicale", "canaux_contact_group": ["", "AUTRE"]
}
```

- Question d'un questionnaire (locale ou de bibliothèque) : sous sa clé.
- Question d'un bloc : sous `<alias>.<clé>` (objet de l'alias de l'instance).
- Précision « Autre » : clé `<clé>_other`, à côté de la réponse.
- Groupe de la sélection d'un choix (`single`, `multiple`, version 3) : clé `<clé>_group`, à côté de la réponse
  (la valeur, elle, est inchangée). Il vaut l'identifiant du groupe de l'option choisie (§7.3), `"AUTRE"` pour
  « Autre (préciser) ». Option hors groupe : clé absente (`single`) ou `""` (`multiple`). Pour `multiple`, c'est une
  liste **parallèle** aux valeurs, de même longueur et dans le même ordre (`["conjoint", "conjoint"]` /
  `["SC", "AA"]`). Une réponse sans `<clé>_group` (valeur par défaut, ancien jeu de test) désigne la première
  option visible de cette valeur.
- Question facultative laissée vide (on a cliqué « Suivant » sans répondre) : `null`. Une question
  jamais atteinte, ou dont la réponse a été effacée (§11.5), est **absente**.
- Une page revisitée (retour arrière, boucle) **remplace** la réponse : aucune itération n'est conservée.
  Pour saisir plusieurs occurrences, on utilise une structure répétable.

## 9. Validation d'une réponse

Le moteur doit valider la réponse d'une page question avant de la quitter **vers l'avant** (pas en
retour arrière). Toutes les erreurs sont collectées (plusieurs à la fois possibles), chacune avec un
chemin (`""` pour la question, `victimes[0].prenom`, `coordonnees.ville` pour un champ), un paramètre et un message.

### 9.1 Algorithme

Le contexte de validation est celui de la page (§10.2) où la réponse en cours est placée sous sa clé.

1. **Obligatoire** : `required` vaut `true` (ou son expression vaut `true`).
2. **Vide** : absente, `null`, `""` ou `[]`. Une réponse vide est refusée (`required`) si la question est
   obligatoire, acceptée sinon ; **rien d'autre n'est vérifié** (ni contraintes, ni règles libres).
   Exception : `[]` pour une structure répétable obligatoire avec `repeat.min` ≥ 1 n'est pas « vide » :
   on passe à l'étape 3, qui signale `minOccurrences`. (Une structure répétable **facultative** laissée
   vide est donc acceptée même avec `repeat.min`.)
3. **Paramètres du type** :
   - `text` : `minLength`, `maxLength` (en caractères) ; `pattern` (expression régulière JavaScript, sans
     ancrage implicite ni drapeau ; un motif invalide est ignoré).
   - `date` : date de calendrier valide `AAAA-MM-JJ`, sinon erreur `format` et les bornes ne sont pas
     vérifiées (les règles libres de l'étape 5 le sont toujours) ; puis `min`, `max`.
     Une borne qui a la forme `AAAA-MM-JJ` est littérale, sinon c'est une expression ; une borne dont
     l'évaluation ne donne pas une chaîne est ignorée. Comparaison de chaînes ISO.
   - `number` : `numberKind` (`natural` : entier ≥ 0 ; `integer` : entier) ; `min`, `max` (nombre, ou
     expression : ignorée si elle ne donne pas un nombre) ; `decimals` (nombre de chiffres après la virgule).
   - `single`, `multiple` : chaque valeur doit être parmi les options **visibles** au moment de la
     validation (entrées dont `when` vaut `true`, déployées comme au §7.3, `other` si « Autre » est activé),
     sinon `option`. Si le groupe est renseigné (`<clé>_group`, §8), c'est le couple (groupe, valeur) qui doit
     être visible (`""` : hors groupe ; `"AUTRE"` avec `other`) ; puis `minSelected`, `maxSelected` (nombre de valeurs cochées).
   - `structure` : `repeat.min` / `repeat.max` sur le nombre d'occurrences (`minOccurrences`,
     `maxOccurrences`) ; s'il n'y a pas d'erreur d'occurrences, chaque champ **visible** de chaque
     occurrence est validé par ce même algorithme, dans le contexte de la page complété par les champs
     de l'occurrence.
4. **Précision « Autre »** : `other.detailRequired`, `"other"` choisi et précision vide → `otherDetail`.
5. **Règles libres** : chaque `constraints[i].rule` qui ne vaut pas exactement `true` (erreur comprise)
   → erreur `constraints[i]` avec `constraints[i].message` (défaut « Valeur invalide. »).

### 9.2 Messages

Le message d'une erreur est `messages.<paramètre>` s'il existe, sinon le message par défaut ci-dessous
(`{0}` = valeur de la borne). Les messages sont interpolés (§5.3) dans le contexte de la page.

| Paramètre | Message par défaut (fr) | (en) |
| --- | --- | --- |
| `required` | Réponse obligatoire. | This answer is required. |
| `minLength` / `maxLength` | Au moins / Au plus {0} caractères. | At least / At most {0} characters. |
| `pattern` | Format invalide. | Invalid format. |
| `format` (date) | Date invalide (AAAA-MM-JJ). | Invalid date (YYYY-MM-DD). |
| `min` / `max` | Valeur minimale / maximale : {0}. | Minimum / Maximum value: {0}. |
| `numberKind` | Nombre {0} attendu (entier positif, entier). | {0} number expected. |
| `decimals` | Au plus {0} décimales. | At most {0} decimals. |
| `minSelected` / `maxSelected` | Choisissez au moins / au plus {0} réponses. | Select at least / at most {0} answers. |
| `option` | Cette réponse n'est plus proposée. | This answer is no longer available. |
| `otherDetail` | Précisez votre réponse. | Please specify. |
| `minOccurrences` / `maxOccurrences` | Au moins / Au plus {0} élément(s). | At least / At most {0} item(s). |
| `constraints[i]` | Valeur invalide. | Invalid value. |

```json
"min": "sys.date_effet_contrat", "max": "$today()",
"messages": { "max": { "fr": "La date ne peut pas être dans le futur.", "en": "The date cannot be in the future." } },
"constraints": [{ "rule": "$age(date_naissance) < 120", "message": { "fr": "Date de naissance improbable.", "en": "Unlikely date of birth." } }]
```

## 10. Expressions

### 10.1 Langage

Les expressions sont écrites en **JSONata 1.8** (implémentations en JavaScript, Java, .NET, Python…),
avec les **clés** lisibles. Elles apparaissent dans : `when` des arêtes, des options, des variantes et
des champs de structure ; `required` ; `defaultExpr` ; `min` / `max` non littéraux ; `constraints[].rule` ;
`from` / `label` / `value` des entrées dynamiques ; et entre accolades dans les textes interpolés.

Une **condition** (`when`, `required`, règle libre) est vraie **seulement si** l'expression vaut le
booléen `true`. Toute autre valeur (`false`, absente, chaîne, objet, liste) ou une erreur d'évaluation
la rend fausse. Écrire `$exists(victimes[hospitalise])`, pas `victimes[hospitalise]`.

### 10.2 Contexte d'évaluation

L'expression est évaluée sur un objet racine :

- les réponses (§8), **sans les valeurs `null`** (retirées en profondeur) ;
- `sys` : l'état du système fourni par l'hôte ;
- dans un bloc : les réponses du bloc **aussi** sans préfixe, prioritaires sur une clé homonyme de l'hôte ;
- dans un champ de structure (`when`, règles, libellés du champ) : les champs de l'occurrence sans
  préfixe, prioritaires ;
- dans `label` / `value` d'une entrée dynamique : **uniquement** l'élément de la liste (`from` et `when`
  de l'entrée sont évalués dans le contexte de la page).

Les fonctions de date utilisent la date du jour du moteur (figée par `today` dans les tests, §15).

### 10.3 Noms

| Écriture | Désigne |
| --- | --- |
| `date_sinistre` | Réponse à la question de clé `date_sinistre`. |
| `victimes.nom` | Champ d'une structure (pour une structure répétable : les valeurs de toutes les occurrences). |
| `victimes[0].nom`, `$count(victimes)` | Occurrence d'une structure répétable (indice à partir de 0), nombre d'occurrences. |
| `type_sinistre_other` | Précision « Autre » de `type_sinistre`. |
| `qualite_declarant.groupe` | Groupe de la sélection d'un choix (version 3) : lit `qualite_declarant_group` (§8) — code du groupe, sinon son libellé dans la langue par défaut ; `"AUTRE"` pour « Autre » ; absent (`single`) ou `""` (`multiple`) hors groupe ; liste pour `multiple`. Aussi `tiers.cle.groupe` (bloc), `victimes.lien.groupe`, `lien.groupe` (champ de structure). Un moteur peut, comme l'outil, réécrire toute étape **finale** `groupe` d'un chemin de noms en `<dernier nom>_group` avant d'évaluer, en gardant les indices et filtres du dernier nom (`liens[0].groupe` → `liens_group[0]`). Ailleurs qu'après une question à choix, `.groupe` est une référence inconnue. |
| `sys.profil`, `sys.sinistres.nature` | Variable de l'état du système ; champ des objets d'une liste. |
| `tiers.nom` | Question `nom` du bloc instancié avec l'alias `tiers` (depuis l'hôte, ou dans le bloc). |
| `nom` (dans le bloc) | Question `nom` du bloc lui-même ; une clé du questionnaire hôte reste accessible sans préfixe si le bloc n'a pas de question homonyme. |
| `prenom` (dans un champ de `victimes`) | Champ de la même occurrence. |
| `$$.cle` | Réponse `cle`, depuis la racine ; utile dans un filtre (§10.5). |

### 10.4 Valeurs absentes

Une question non posée, effacée ou laissée vide (`null`) est **absente** du contexte. En JSONata :
une comparaison avec une valeur absente vaut `false` (`absent = 'x'` **et** `absent != 'x'`) ou est
indéfinie (`absent > 2`, `$not(absent)`) donc fausse comme condition ; `'a' in absent` vaut `false` ;
`$count(absent)` vaut `0` ; `$exists(absent)` vaut `false` ; `absent & 'x'` vaut `'x'`.
Une liste d'un seul élément est vue comme cet élément (`victimes.prenom` donne `"Léa"`, pas `["Léa"]`) ;
`$count`, `in` et les filtres fonctionnent dans les deux cas.

### 10.5 Opérateurs et filtres

| Besoin | JSONata |
| --- | --- |
| Égalité, différence | `a = 'x'`, `a != 'x'` (chaînes entre `'…'` ou `"…"`) |
| Comparaisons (nombres, dates ISO) | `<`, `<=`, `>`, `>=` |
| ET / OU / NON | `and`, `or`, `$not(…)` |
| Appartenance (choix multiple, liste) | `'telephone' in canaux_contact`, `sys.type_adherent in ['ud', 'amicale']` |
| Est renseigné | `$exists(cle)` |
| Dénombrement, somme | `$count(canaux_contact)`, `$sum(victimes.duree_hospitalisation)` |
| Filtrage d'une liste d'objets | `sys.sinistres[nature = 'Vol']`, `$count(victimes[hospitalise])` |
| Concaténation, conditionnelle, arithmétique | `date & ' — ' & nature`, `a > 0 ? 'oui' : 'non'`, `+ - * / %` |

Toutes les fonctions standard de JSONata 1.8 sont disponibles (`$string`, `$number`, `$contains`,
`$lowercase`, `$round`…).

**Noms dans un filtre.** Entre crochets, un nom nu désigne un champ de l'élément filtré (sens JSONata) :
dans `sys.sinistres[nature = 'Vol']`, `nature` est `sys.sinistres.nature`. Pour comparer à une réponse,
partir de la racine avec `$$` : `sys.sinistres[date <= $$.date_sinistre]`. Hors d'un filtre, `$$.cle`
équivaut à `cle`.

### 10.6 Fonctions ajoutées

À fournir par le moteur cible (dates en chaînes `AAAA-MM-JJ`) :

| Fonction | Résultat |
| --- | --- |
| `$today()` | Date du jour (locale), `AAAA-MM-JJ`. |
| `$addDays(date, n)` | Date décalée de `n` jours (`n` négatif possible), `AAAA-MM-JJ`. |
| `$daysBetween(d1, d2)` | Nombre de jours de `d1` à `d2` (négatif si `d2` précède `d1`). |
| `$age(date)` | Âge révolu en années à la date du jour (anniversaire compris le jour même). |

## 11. Navigation

Le parcours est une suite de **pages** (nœuds `question`, `info`, `summary`, `end`). Les nœuds `block`
et `exit` ne sont jamais affichés : on les traverse.

### 11.1 Arêtes

`{ "id", "from", "to", "when"?, "exit"?, "caption"?, "description"? }`. `caption` (version 4) est un libellé de
lecture (« Ayant droit adhérent », « Sinon ») que l'éditeur affiche sur le logigramme à la place de la
condition ; il est permis avec ou sans condition, et sans effet sur la navigation. En quittant un nœud :

1. on considère les arêtes dont `from` est ce nœud, **dans l'ordre du tableau `edges`** (leur rang) ;
2. la première arête **avec condition** dont `when` est vraie est suivie ;
3. sinon, la première arête **sans condition** (le « sinon ») est suivie ;
4. sinon, le parcours est **bloqué** (erreur de conception ; l'éditeur la signale, §13).

Les conditions sont évaluées avec les réponses connues, celle de la page quittée comprise.

- **Convergence** : plusieurs arêtes peuvent viser le même nœud.
- **Boucle** : une arête peut viser un nœud déjà visité ; les réponses déjà données sont proposées à
  nouveau et remplacées si elles changent (§8).
- Une arête relie deux nœuds du même graphe (questionnaire ou bloc).

### 11.2 Départ et fin

Le parcours commence au nœud `start` du questionnaire. Il se termine sur un nœud `end`, dont `outcome`
indique l'issue métier au logiciel hôte. Un `end` placé dans un bloc termine tout le questionnaire.

### 11.3 Blocs

Un bloc (`library.blocks[]`) est un sous-graphe avec `start`, des questions et des nœuds `exit`.

- **Entrée** : atteindre une instance (`kind: "block"`) mène au nœud `start` du bloc.
- **Étapes** : une page d'un bloc est identifiée par `<id de l'instance>/<id du nœud du bloc>`
  (ex. `n_bloc_tiers/bn_nom`). Ses réponses sont rangées sous l'alias (§8).
- **Sortie** : atteindre un nœud `exit` du bloc fait quitter l'instance : on applique la règle du §11.1
  aux arêtes sortant de l'instance dont `exit` vaut le `name` de la sortie atteinte **ou** qui n'ont pas
  d'`exit` (valables pour toute sortie). Leurs conditions sont évaluées dans le contexte de l'**hôte**
  (réponses du bloc via `alias.cle`).
- Un bloc ne contient pas d'instance de bloc, et un nœud `exit` n'apparaît que dans un bloc. Ces deux
  règles ne sont imposées ni par le schéma ni par les vérifications du §13 : l'éditeur ne permet pas de
  produire autre chose, mais un fichier écrit à la main pourrait les enfreindre, et le comportement est
  alors indéfini (le moteur cible peut refuser le fichier). Un même bloc peut être instancié plusieurs fois, avec des
  alias différents ; chaque instance a ses propres réponses.

```json
{ "id": "e_bloc_identifie", "from": "n_bloc_tiers", "to": "n_circonstances", "exit": "identifie" },
{ "id": "e_bloc_non_identifie", "from": "n_bloc_tiers", "to": "n_tiers_inconnu", "exit": "non_identifie" }
```

### 11.4 Avancer, revenir

- **Suivant** : valider la page (§9) ; une question sans réponse reçoit `null` ; choisir l'arête (§11.1) ;
  puis effacer les réponses hors chemin (§11.5) ; enfin, sur la nouvelle page, poser la valeur par défaut (§7.1).
- **Précédent** : le moteur garde l'historique des pages visitées ; « précédent » revient à la page
  précédente de l'historique, sans valider ni effacer.

### 11.5 Effacement des réponses hors chemin

Après chaque « Suivant », le moteur calcule le **chemin projeté** : depuis `start`, il suit les arêtes
avec les réponses connues tant que les pages question ont une réponse (`null` compte comme réponse).
À la première page question **sans** réponse, il ajoute toutes les pages encore atteignables depuis
elle en ignorant les conditions (sans repasser par le chemin déjà projeté). La projection s'arrête aussi
lorsqu'elle atteint une page déjà projetée (boucle refermée, par exemple `confirmation = false` qui
renvoie au début) ou une page sans arête applicable (fin, blocage). Les réponses (avec précisions
« Autre » et groupes `<clé>_group`) des questions absentes de cet ensemble sont **effacées**.

Ainsi, après un retour arrière où l'on change `type_sinistre` de `accident` à `vol`, la réponse
`victimes` disparaît dès qu'on avance : la question n'est plus sur le chemin.

### 11.6 Synthèse et retour pour modifier

Une page `summary` liste, dans l'ordre de **première** visite, les questions de l'historique avant
elle qui ont une réponse (y compris `null`, affichée vide) : intitulé et réponse courante. Une option
d'un groupe s'affiche « Groupe — Option » (intitulé du groupe dans la langue affichée).

Depuis une synthèse, l'utilisateur peut revenir à une question pour la modifier. « Revenir à la
synthèse » avance alors (comme « Suivant », avec validation et effacement) sur les pages déjà vues et
répondues, et s'arrête à la synthèse, à la première page qui n'avait pas été vue, à une question sans
réponse, à une réponse devenue invalide (§9) ou à une fin.

**Fin bloquée par une réponse invalide.** Avant d'afficher une fin, le moteur revalide (§9) chaque réponse
connue du chemin effectif (pages du chemin projeté depuis le départ, §11.5), dans le contexte de sa page.
À la première réponse invalide (ex. valeur dynamique disparue après un changement d'état du système ou
d'une réponse précédente), il ramène l'utilisateur à cette question, avec son message (`option`…), au
lieu d'afficher la fin. La réponse n'est pas effacée : l'utilisateur la corrige, puis avance normalement.

## 12. Bibliothèque (`bibliotheque.json`)

- `questions[]` : questions réutilisables (§7), référencées par `{ "kind": "question", "id", "ref" }`.
  Leur clé est vue sans préfixe dans le graphe qui les référence (questionnaire, ou bloc puis `alias.cle`).
- `blocks[]` : `{ id, key, title, description?, start, nodes, edges }` (§11.3) ; nœuds : questions
  (locales ou de bibliothèque), `info`, `summary`, `end`, `exit`.
- `labelSets[]` : `{ id, key, kind: "boolean" | "tristate", yes, no, unknown? }` : libellés des valeurs
  `true`, `false` et `"unknown"` (tri-state) ; référencés par `labelSet` d'une question du même `kind`.

## 13. Vérifications de l'éditeur

L'éditeur signale, sans bloquer l'enregistrement, les problèmes suivants. Un fichier livré peut donc
en contenir : le moteur cible peut les vérifier à son tour.

| Code | Problème |
| --- | --- |
| `invalidExpression` | Expression syntaxiquement invalide. |
| `unknownReference` | Clé, alias, variable système ou champ inconnu (y compris noms relatifs d'une entrée dynamique tirée d'une liste système). |
| `unknownFilterReference` | Clé de question écrite nue dans un filtre (écrire `$$.cle`). |
| `notGuaranteed` | Référence à une question qui n'est pas posée sur tous les chemins menant à l'expression (sauf dans `$exists(…)` ou dans le texte d'une variante dont la condition la teste). |
| `duplicateKey`, `invalidKey` | Clé en double ou hors `snake_case` / réservée (§2). |
| `missingStart`, `unreachable`, `deadEnd` | Départ introuvable, nœud inaccessible, nœud sans sortie qui n'est pas une fin. |
| `noElse`, `multipleElse` | Plusieurs arêtes sortantes sans « sinon » ; plusieurs « sinon ». |
| `loopWithoutExit` | Boucle dont aucune arête ne sort. |
| `exitNotConnected`, `unknownExit` | Sortie de bloc non raccordée ; arête visant une sortie inexistante. |
| `libraryMissing` | Question, bloc ou jeu de libellés de bibliothèque introuvable. |
| `missingTranslation` | Texte sans traduction dans une langue du projet (libellés de groupe compris). |
| `duplicateGroup`, `reservedGroupCode`, `emptyGroup` | Groupes d'options d'une question : identifiant en double ; code `AUTRE` (réservé) ; groupe sans option (§7.3). |

L'exemple fourni ne produit aucun problème.

## 14. Exemple commenté

`examples/declaration-sinistre/` : déclaration d'un sinistre par un adhérent connecté (langues `fr`, `en`).

| Fonctionnalité | Où |
| --- | --- |
| État du système de tous les types, trois scénarios | `projet.json` |
| Page d'information interpolée (`{sys.nom_assure}`), fin de non-éligibilité (`outcome: ineligible`) | `n_intro`, `n_fin_resilie` |
| Choix unique : option conditionnée, « Autre » avec précision obligatoire | `n_type` |
| Question de bibliothèque : date avec bornes calculées, messages, `defaultExpr: "$today()"` | `n_date` → `lq_date_sinistre` |
| Filtre et `$$` : lien demandé s'il existe un sinistre antérieur | `e_date_lien` : `$count(sys.sinistres[date <= $$.date_sinistre]) > 0` |
| Entrée dynamique (liste système d'objets) placée **avant** une option statique | `n_lien` |
| Structure répétable, champ conditionné, libellé `{prenom}`, règles libres (`$age`) | `n_victimes` |
| Groupes d'options : un groupe avec code (`SC`), un sans code ; même valeur `conjoint` dans les deux ; `qualite_declarant.groupe` dans une arête et un texte interpolé | `n_qualite`, `e_qualite_ayant_droit`, `n_ayant_droit` |
| Libellé et aide à variantes, `$exists(victimes[hospitalise])`, nombre réel à 2 décimales | `n_montant` |
| `$addDays` interpolé | `n_expertise` |
| Booléen avec `default: false` | `n_tiers` |
| Bloc avec alias, deux sorties nommées, structure non répétable, tri-state à jeu de libellés, accès à une clé de l'hôte (`{date_sinistre}`) | `n_bloc_tiers` → `blk_identite_tiers` |
| `required` calculé ; aide à variantes (`type_sinistre_other`, `$daysBetween`) | `n_circonstances` |
| Choix multiple avec « Autre » ; `'telephone' in canaux_contact` | `n_canaux`, `e_canaux_tel` |
| Question de bibliothèque à intitulé surchargé | `n_tel` → `lq_telephone` |
| Synthèse, confirmation à jeu de libellés booléen, boucle de correction, fin à variantes | `n_synthese`, `n_confirmation`, `e_confirmation_retour`, `n_fin` |
| Libellés de lecture `caption` (version 4) : arête conditionnée, « sinon », arête de sortie de bloc ; variable et champ de liste | `e_qualite_ayant_droit`, `e_qualite_montant`, `e_bloc_non_identifie` ; `sys.type_adherent`, `sys.sinistres` (`nature`) |

Après la date, on demande le lien avec un sinistre existant s'il y en a un d'antérieur, puis on va aux
victimes (accident) ou au montant :

```json
{ "id": "e_date_lien", "from": "n_date", "to": "n_lien", "when": "$count(sys.sinistres[date <= $$.date_sinistre]) > 0" },
{ "id": "e_date_victimes", "from": "n_date", "to": "n_victimes", "when": "type_sinistre = 'accident'" },
{ "id": "e_date_montant", "from": "n_date", "to": "n_montant" }
```

En fin de parcours, `confirmation = false` renvoie à la première question (boucle) : les réponses déjà
données sont proposées à nouveau et remplacées si elles changent.

## 15. Chemins attendus (jeux de test)

`examples/declaration-sinistre/chemins/*.json` décrit des parcours de référence. Un moteur conforme
doit les rejouer à l'identique.

```json
{
  "description": "UD avec 2 sinistres : …",
  "questionnaire": "q_declaration",
  "scenario": "sc_ud_2_sinistres",
  "today": "2026-10-10",
  "answers": [
    { "step": "n_type", "value": "vol" },
    { "step": "n_bloc_tiers/bn_nom", "value": "Dupont" },
    { "step": "n_qualite", "value": "conjoint", "group": "Ayant droit" },
    { "step": "n_canaux", "value": ["courrier", "other"], "other": "Par l'amicale" }
  ],
  "path": ["n_intro", "n_type", "…", "n_fin"],
  "outcome": "submitted"
}
```

| Propriété | Sens |
| --- | --- |
| `questionnaire`, `scenario` | Id du questionnaire joué ; id du scénario qui fournit l'état du système. |
| `today` | Date du jour à utiliser pour `$today()`, `$age`… |
| `answers[]` | Réponses dans l'ordre de saisie : `step` (id de page ; dans un bloc `idInstance/idNœud`), `value`, `other?` (précision « Autre »), `group?` (groupe de la sélection, rangé sous `<clé>_group`, §8). |
| `path` | Pages visitées (questions, informations, synthèses, fin), boucles comprises, dans l'ordre. |
| `outcome` | `outcome` du nœud `end` atteint. |

Rejeu : partir de `start` ; sur chaque page jusqu'à la fin, si c'est une question et que la prochaine
réponse en file la vise, l'enregistrer (avec sa précision et son groupe) ; une question sans réponse en file garde sa
réponse courante (deuxième passage dans une boucle : l'utilisateur valide sans changer). La réponse doit
alors être valide (§9). Puis « Suivant » (§11.4), qui ne doit jamais être bloqué. À la fin, l'historique
doit égaler `path`, toutes les réponses doivent avoir été consommées et l'issue doit égaler `outcome`.

## 16. Évolution du format

Toute évolution incompatible incrémente `formatVersion` et s'accompagne d'une migration dans l'outil,
des schémas, de ce document et de l'exemple. Les ajouts compatibles (nouvelle propriété facultative)
sont documentés ici. Version actuelle : **4**.

| Version | Changement | Migration |
| --- | --- | --- |
| 2 | Options d'un choix : suite ordonnée d'entrées (statiques ou dynamiques) ; `source` disparaît (EVO-001). | `source` → entrée dynamique placée après les options statiques. |
| 3 | Groupes d'options (`{ group, code?, when?, options }` dans `options[]`), réponse `<clé>_group`, référence `cle.groupe`, mot réservé `groupe` (EVO-003). | Aucune transformation (un document antérieur n'a pas de groupe) ; seul `formatVersion` change. |
| 4 | Libellé de lecture `caption` (chaîne, une ligne) sur l'arête, la variable de l'état du système et le champ de liste d'objets (EVO-005). | Aucune transformation (un document antérieur n'a pas de libellé) ; seul `formatVersion` change. |
