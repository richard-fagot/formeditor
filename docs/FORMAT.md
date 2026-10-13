# Format des questionnaires — version 12

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
| `bibliotheque.json` | `library` | Questions, fragments et jeux de libellés réutilisables. | oui |
| `<clé>.json` | `questionnaire` | Un questionnaire : nœuds, arêtes, questions locales, références à la bibliothèque. | oui |
| `<clé>.layout.json`, `fragment_<clé>.layout.json`, `question_<clé>.layout.json` | `layout` | Positions des nœuds dans l'éditeur et commentaires de révision (version 9, §1.1). | **non** (à ignorer) |
| `<projet>.bundle.json` | `bundle` | `project`, `library`, `questionnaires[]`, `layouts[]` dans un seul fichier. | oui (même contenu) |

- Chaque fichier (et le bundle) porte `formatVersion` (entier, actuellement `12`) et `kind`.
- L'outil migre automatiquement à l'ouverture un fichier d'une version antérieure ; il refuse un fichier
  d'une version plus récente. Un moteur cible peut refuser toute version qu'il ne connaît pas.
- Tout élément (projet, questionnaire, nœud, arête, question, fragment, variable, scénario, jeu de libellés)
  accepte une propriété `description` libre, destinée au lecteur humain ou à une IA, **sans effet** sur le
  comportement.
- Une arête, une variable de l'état du système et un champ de liste d'objets acceptent aussi un
  **libellé de lecture** `caption` (version 4) : chaîne simple non vide, sur une ligne, en une seule langue
  (non traduite, sans interpolation). C'est un nom court affiché par l'éditeur à la place de la condition
  ou à côté de la clé ; il n'est **jamais** montré à l'utilisateur final, n'est pas utilisable dans les
  expressions (on écrit toujours la clé) et n'a **aucun effet** sur le comportement. À ne pas confondre
  avec `label` / `title` (textes multilingues) ni avec `description` (explication longue).
- Le format ne contient aucune donnée de présentation, sauf les fichiers `layout` (outil seulement).
- Les **commentaires de révision** (version 9, §1.1) ne figurent que dans les fichiers `layout` : jamais dans `projet.json`,
  `bibliotheque.json` ni `<clé>.json`.
- Les fichiers sont écrits en UTF-8, indentés de 2 espaces, terminés par un saut de ligne.

### 1.1 Mise en page et commentaires de révision (`layout`, outil seulement)

```json
{
  "formatVersion": 9,
  "kind": "layout",
  "graph": "q_declaration",
  "nodes": { "n_date": { "x": 0, "y": 320 } },
  "comments": [
    {
      "node": "n_date",
      "x": -320,
      "y": 300,
      "text": "Faut-il borner à la date du jour ?",
      "replies": ["Oui, pas de date future.", "Et pas avant la date d'effet du contrat."]
    }
  ]
}
```

- `graph` : id du questionnaire, du fragment, ou (commentaires seulement, `nodes` vide) de la question de bibliothèque
  commentée (`question_<clé>.layout.json`).
- `nodes` : position de chaque nœud dans l'éditeur (`collapsed` : nœud fragment déplié ou non).
- `comments` (facultatif, version 9) : commentaires de révision, au plus un par question. `node` : nœud question commenté
  (pour une question de bibliothèque : son id) ; `x`, `y` : position du nœud commentaire (absente pour une question de
  bibliothèque) ; `text` : texte initial ; `replies` : réponses, dans l'ordre de saisie. Texte brut, multiligne.
- **Le moteur cible ignore entièrement ces fichiers** (et `layouts[]` d'un bundle) : les commentaires n'ont aucun effet
  sur le questionnaire (navigation, validation, expressions).

Squelette d'un questionnaire :

```json
{
  "formatVersion": 6,
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
  structure ne contiennent pas de `/` (réservé aux étapes de fragment, §11.3 ; imposé par le schéma) ; les
  autres id (projet, questionnaire, fragment, jeu de libellés, scénario) ne sont pas contraints. Il sert aux liens structurels : arêtes (`from`, `to`), départ (`start`), références de
  bibliothèque (`ref`, `labelSet`), mise en page. **Jamais** dans une expression.
  Les id sont uniques dans leur graphe ; un nœud question local a le même id que sa question.
- **`key`** : clé lisible en `snake_case` (`^[a-z][a-z0-9_]*$`). C'est elle qu'on écrit dans les
  expressions et qui nomme la réponse. Mots réservés (interdits comme clé) : `sys`, `true`, `false`,
  `null`, `and`, `or`, `in`, `groupe`, `nsp` (§10.3).

Unicité des clés (l'outil le vérifie, §13) :

| Clés | Unique dans |
| --- | --- |
| Clés des questions d'un questionnaire (locales et de bibliothèque) **et** alias de ses nœuds fragment | ce questionnaire |
| Clés des questions d'un fragment **et** alias de ses propres nœuds fragment | ce fragment |
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
| `status?` | État de validation (version 11, EVO-015) : `"draft"` (non validé, valeur par défaut si absent) ou `"validated"` : relu et approuvé par les métiers, **livrable aux développeurs** ; l'éditeur le garde en lecture seule jusqu'à sa dévalidation. Sans effet sur le parcours. |
| `validatedAt?` | Date de validation `AAAA-MM-JJ` (version 11), présente seulement si `status` vaut `"validated"`. |
| `start` | Id du nœud de départ ; peut être un nœud `fragment` (le parcours commence alors sur l'entrée du fragment, §11.3). |
| `nodes[]` | Nœuds (§6). |
| `edges[]` | Arêtes (§11.1) ; **leur ordre compte**. |

Un fragment de bibliothèque (§12) est un graphe de même forme (`nodes`, `edges`), **sans** `start` : son entrée est implicite ou donnée par `entry` (§11.3).

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
| Question : `label`, `help`, `placeholder` ; option : `label` ; groupe d'options : `group` (§7.3) ; `other.label` ; `dontKnow.label` (§7.7) ; surcharge `label` d'une question de bibliothèque ; `info` : `title`, `text` ; `summary` : `title` ; `end` : `title`, `message` | Interpolées, sans variantes : `messages.<param>`, `constraints[].message` (§9). Non interpolées : `title` d'un questionnaire ou d'un fragment, `unit`, `repeat.addLabel`, `yes`/`no`/`unknown` d'un jeu de libellés, `label` d'une sortie nommée |

### 5.3 Interpolation

Dans un texte interpolé, `{expression}` est remplacé par la valeur de l'expression (§10), évaluée dans
le contexte de la page affichée (§10.2). Exemples : `Bonjour {sys.nom_assure}`,
`Date de naissance de {prenom}`, `{$count(victimes[hospitalise])} personne(s)`.

- Mise en forme de la valeur : absente ou `null` → chaîne vide ; liste → éléments joints par `, ` ;
  objet → JSON ; nombre, booléen → forme JSON brute (`950.5`, `true`) ; date → chaîne ISO telle quelle.
  C'est la **valeur** qui est affichée, pas le libellé d'une option (`{type_sinistre}` donne `vol`).
  Exceptions (version 6, §7.8), quand l'expression est une simple référence (`civilite`, `souscripteur.civilite`,
  `x[0].civilite`) dont le dernier nom est la clé d'une question ou d'un champ `civility` ou `phone` : une civilité
  affiche son **libellé** dans la langue affichée (`{civilite} {nom}` → « Madame Dupont »), un téléphone son format
  international lisible (`+33 6 12 34 56 78`).
- Une expression en erreur donne une chaîne vide.
- `{{` et `}}` produisent des accolades littérales. À l'intérieur d'une expression, les accolades
  s'imbriquent et celles qui figurent entre guillemets ne comptent pas ; une `{` sans fermeture est du texte.

## 6. Nœuds (`kind`)

| `kind` | Rôle | Propriétés (outre `id`, `description?`) | Page affichée |
| --- | --- | --- | --- |
| `question` | Saisie d'une réponse. | Question locale (§7) **ou** `ref` (id d'une question de bibliothèque) + `label?` qui surcharge son intitulé + `hiddenFields?` (structure : champs masqués, version 8) + `required?` (booléen : surcharge du caractère obligatoire, version 10, §6.1). | oui |
| `fragment` | Appel d'un fragment de bibliothèque, par référence (version 7, ex-`block`). | `ref` (id du fragment), `alias` (clé : préfixe des clés du fragment vues de l'appelant), `requiredOverrides?` (surcharges du caractère obligatoire de ses questions, version 10, §6.1). | non : on entre dans le fragment |
| `info` | Texte sans saisie. | `title?`, `text`. | oui |
| `summary` | Récapitulatif des réponses (§11.6). | `title?`. | oui |
| `end` | Fin de parcours. | `title?`, `message`, `outcome?` (issue métier libre : `submitted`, `ineligible`…). | oui (dernière) |
| `exit` | Sortie nommée (facultative) d'un fragment, **dans un fragment uniquement** (règle non vérifiée, §11.3). | `name` (clé, visée par `exit` des arêtes du nœud fragment), `label?` (texte pour le lecteur, sans effet). | non |

Question locale (le nœud porte la question) et question de bibliothèque :

```json
{ "kind": "question", "id": "n_tiers", "key": "tiers_implique", "type": "boolean",
  "label": { "fr": "Un tiers est-il impliqué ?", "en": "Is a third party involved?" }, "required": true },
{ "kind": "question", "id": "n_tel", "ref": "lq_telephone", "label": { "fr": "Numéro où vous joindre", "en": "Number to reach you" } }
```

Pour une question de bibliothèque, la clé, le type, les contraintes et tout le reste sont ceux de la
bibliothèque ; seuls l'intitulé (`label`) et le caractère obligatoire (`required`, §6.1) peuvent être surchargés.

**Champs masqués** (`hiddenFields`, version 8) : sur un nœud qui référence une question `structure`, liste des
**clés** des champs masqués dans cette instance (sans doublon) ; absente = tous les champs affichés. La question
effective de l'instance est la définition de la bibliothèque **sans** ces champs, dans l'ordre de la bibliothèque :

- un champ masqué n'est ni présenté, ni validé, ni exigé (même `required`), et n'a pas de réponse ;
- une clé de `hiddenFields` qui ne désigne aucun champ de la définition est ignorée ; un champ ajouté plus tard
  à la définition est affiché ;
- si aucun champ ne resterait affiché, `hiddenFields` est ignorée (tous les champs affichés) ;
- sur une question qui n'est pas une structure, `hiddenFields` est sans effet.

L'export conserve la référence et `hiddenFields` : le moteur cible résout l'instance par cette règle.

```json
{ "kind": "question", "id": "n_rappel", "ref": "lq_identite", "hiddenFields": ["civilite", "date_naissance", "adresse", "telephone"] }
```

### 6.1 Surcharge du caractère obligatoire (version 10)

Une question **utilisée** (référence de bibliothèque, ou question d'un fragment vue depuis un appel) peut voir son
caractère obligatoire surchargé à l'endroit où elle est utilisée, sans toucher à sa définition. Seule la surcharge
est stockée ; absente, la valeur est **héritée**. Une surcharge vaut `true` (obligatoire) ou `false` (facultatif) et
remplace la valeur héritée, y compris un `required` calculé (expression). Rien d'autre (intitulé, type, options,
contraintes) n'est surchargé ici.

- `required?` d'un nœud `question` qui a un `ref` : surcharge pour cet usage (dans un questionnaire ou un fragment).
- `requiredOverrides?` d'un nœud `fragment` : `{ "<chemin>": true | false }`, surcharges des questions du fragment
  appelé pour **cet appel**. Le chemin est la suite des `id` de nœuds, séparés par `/`, à partir du fragment appelé :
  `fn_num_secu` (question du fragment), `n_adresse/an_ville` (question du fragment appelé par le nœud `n_adresse` de
  ce fragment), sur toute la profondeur. Toute question du fragment est adressable, locale ou de bibliothèque.

**Résolution** (le niveau le plus proche de l'utilisation l'emporte) pour une question atteinte par les appels
`c1` (dans le questionnaire), `c2` (dans le fragment de `c1`)… `cn`, puis le nœud question `q` du dernier fragment :

1. `c1.requiredOverrides["c2/…/cn/q"]`, puis `c2.requiredOverrides["c3/…/cn/q"]`, …, puis `cn.requiredOverrides["q"]` :
   la première valeur présente l'emporte ;
2. sinon `q.required` si `q` est une référence de bibliothèque qui le porte ;
3. sinon la définition : `required` de la question de bibliothèque, ou de la question locale.

Une surcharge reste figée quand la valeur héritée change, même si elle lui était égale. Un chemin (ou une
référence) qui ne désigne plus aucune question est **ignoré** sans erreur. La valeur résolue n'est pas exportée :
le moteur cible applique cette règle (implémentation de référence : `resolveRequired`, `src/core/model/required.ts`).
Une question non présentée (chemin non emprunté, champ masqué) n'est jamais exigée.

```json
{ "kind": "question", "id": "bn_telephone", "ref": "lq_telephone", "required": false },
{ "kind": "fragment", "id": "n_ident", "ref": "frg_identification_assure", "alias": "ident", "requiredOverrides": { "fn_num_secu": false } }
```

## 7. Questions

### 7.1 Propriétés communes

| Propriété | Sens |
| --- | --- |
| `id`, `key`, `type` | Identifiant, clé, type (§7.2). |
| `label` | Intitulé (libellé). |
| `help?`, `placeholder?` | Aide sous l'intitulé ; texte indicatif dans le champ (libellés). |
| `required?` | `true`, `false` (défaut) ou **expression** : obligatoire si elle vaut `true` au moment de la validation. Surchargeable là où la question est utilisée (version 10, §6.1). |
| `default?` | Valeur par défaut littérale, de la forme de la réponse (§7.2). |
| `defaultExpr?` | Valeur par défaut calculée (expression), prioritaire sur `default`. |
| `messages?` | `{ "<paramètre>": texte multilingue }` : message d'erreur par contrainte intégrée (§9.2). |
| `constraints?` | Règles libres `[{ "rule": "<expression vraie si valide>", "message"?: {…} }]` (§9). |
| `dontKnow?` | Option « Ne sais pas » (version 5, §7.7) : `{}` ou `{ "label": <libellé> }`. Tous types **sauf** `structure` (ses champs peuvent l'avoir). |
| `description?` | Libre. |

**Valeur par défaut** : en arrivant sur une page question dont la réponse est inconnue, le moteur pose
`defaultExpr` (évaluée dans le contexte de la page) sinon `default` ; l'utilisateur peut la changer.
Une réponse déjà connue (retour arrière, boucle) n'est pas remplacée. Les valeurs par défaut des
champs de structure ne sont pas appliquées (comportement actuel de l'outil).

### 7.2 Types et forme de la réponse

| `type` | Réponse | Paramètres propres |
| --- | --- | --- |
| `text` | chaîne | `multiline?` (zone de texte), `minLength?`, `maxLength?`, `pattern?` (expression régulière JavaScript), `suggestions?` (expression, v12, §7.9) |
| `date` | chaîne `AAAA-MM-JJ` | `min?`, `max?` : date ISO littérale ou expression (`$today()`, `date_sinistre`, `sys.date_effet_contrat`) |
| `number` | nombre | `numberKind?` (`real` défaut, `natural` = entier ≥ 0, `integer`), `min?`, `max?` (nombre ou expression), `decimals?` (décimales max.), `unit?` (texte multilingue affiché après le champ) |
| `single` | chaîne : `value` de l'option | `options[]` (entrées, §7.3), `other?` |
| `multiple` | tableau de chaînes | `options[]` (entrées, §7.3), `other?`, `minSelected?`, `maxSelected?` |
| `boolean` | `true` / `false` | `labelSet?` (id d'un jeu `boolean` ; défaut « Oui / Non »), `other?` |
| `tristate` | `true` / `false` / `"unknown"` | `labelSet?` (id d'un jeu `tristate` ; défaut « Oui / Non / Ne sait pas »), `other?` |
| `structure` | objet `{ <clé du champ>: réponse }`, ou **tableau** de tels objets si répétable | `fields[]`, `repeat?` |
| `email` (v6) | chaîne : le mail, nom de domaine en minuscules | aucun (§7.8) |
| `phone` (v6) | chaîne E.164 (`"+33612345678"`) ; pays sous `<clé>_pays` | `defaultCountry?` (défaut `"FR"`), `countries?` (pays autorisés, défaut : tous), `lineType?` (`"mobile"` \| `"fixed"`) (§7.8) |
| `address` (v6) | chaîne : la ligne saisie ; pays sous `<clé>_pays` | `defaultCountry?` (défaut `"FR"`), `countries?`, `minLength?` (défaut 5), `maxLength?` (défaut 200), `verify?` (§7.8) |
| `civility` (v6) | chaîne : code `"MME"`, `"M"` ou `"NP"` | `labels?`, `short?`, `undisclosed?` (§7.8) |

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
  de même le groupe de la sélection d'un choix : `{ "lien": "conjoint", "lien_group": "SC" }`, et le marqueur
  « Ne sais pas » : `{ "age": null, "age_nsp": true }`.
- Une instance d'une structure de bibliothèque peut masquer des champs (`hiddenFields`, version 8, §6) : ils sont
  absents de la question effective (ni présentés, ni exigés, ni dans la réponse).

### 7.7 « Ne sais pas » (version 5, tous types sauf `structure`)

`dontKnow: { "label"? }` ajoute un choix « Ne sais pas » (libellé par défaut « Ne sais pas », sinon `label`, un
libellé comme celui d'une option, §5.2) qui permet de répondre explicitement « je ne sais pas » ; absent = désactivé.

- Affichage : pour `single`, `multiple`, `boolean`, `tristate`, `civility`, dernier choix, après « Autre », hors de tout groupe ;
  pour `text`, `date`, `number`, `email`, `phone`, `address`, case à cocher sous le champ (cochée : champ vidé et désactivé).
- **Exclusive** : la choisir remplace toute autre réponse ; toute autre réponse l'annule.
- Réponse (§8) : valeur **vide** (`null` ; `[]` pour `multiple`), marqueur `<clé>_nsp: true` à côté, et pour
  `single` / `multiple` groupe `"NSP"` sous `<clé>_group`. Une saisie littérale « Ne sais pas » reste une valeur
  ordinaire, sans marqueur.
- Validation (§9) : marqueur présent et `dontKnow` activé → réponse acceptée, aucune vérification (ni `required`,
  ni contraintes, ni règles libres).
- Expressions (§10.3) : `cle` est absente (ou `[]`), `cle.nsp` vaut `true` ; sans « Ne sais pas », `cle.nsp` vaut `false`.
- Ce n'est pas une entrée de `options[]` : pas de condition, pas de position, pas de valeur propre. `NSP` est un code de
  groupe réservé (§13).

### 7.8 Mail, téléphone, adresse, civilité (version 6)

Types dédiés, utilisables comme question et comme champ de structure. Leurs **contrôles de format** sont intégrés
au type (§9.1, étape 3) ; leurs messages se surchargent par `messages` (§9.2). Les codes pays sont ceux de
l'ISO 3166-1 alpha-2 (`"FR"`, `"BE"`, `"GB"`), en majuscules. Les espaces de début et de fin de saisie sont retirés
avant contrôle et enregistrement.

- **`email`** : adresse conforme à la syntaxe `addr-spec` de la RFC 5322 restreinte par la forme `Mailbox` de la
  RFC 5321 : partie locale en `dot-atom` (caractères `atext`, points ni en début, ni en fin, ni doublés) ou en chaîne
  entre guillemets (`"jean dupont"@exemple.fr`, `qtextSMTP` ou paire `\x`) ; domaine en noms de domaine (labels de
  1 à 63 lettres ASCII, chiffres ou tirets, sans tiret en début ni en fin) ou littéral d'adresse
  (`[192.0.2.1]`, `[IPv6:2001:db8::1]`) ; partie locale de 64 caractères au plus, adresse de 254 au plus ; ni
  commentaire, ni espace repliable, ni syntaxe obsolète, ni caractère non ASCII (RFC 6531 / 6532 non prises en
  charge). Réponse : le **nom de domaine en minuscules**, la partie locale telle que saisie. Pas de vérification
  d'existence de la boîte.
- **`phone`** : saisie d'un indicatif pays et d'un numéro (chiffres, espaces, points, tirets, parenthèses, `+` en
  tête). Un numéro qui commence par `+` ou `00` fixe le pays, quel que soit le pays choisi. Contrôles : numéro
  **valide pour son pays** (longueur et préfixes du plan de numérotation ; l'outil utilise les métadonnées complètes de
  libphonenumber) et pays dans `countries` s'il est renseigné (`phone`) ; si `lineType` est renseigné, numéro de ce
  type (`lineType`) — un numéro qu'un pays ne permet pas de classer (fixe ou mobile, ex. États-Unis) est accepté.
  Réponse : format international **E.164** (`"+33612345678"` pour une saisie FR `06 12 34 56 78`) ; pays du numéro
  sous `<clé>_pays` (§8). Une saisie invalide est enregistrée telle quelle (et refusée par la validation).
- **`address`** : un pays et **une seule ligne** de texte libre (numéro, voie, code postal, ville). Contrôles : au
  moins une lettre (tout alphabet), longueur entre `minLength` (5) et `maxLength` (200) caractères, ni retour à la
  ligne ni caractère de contrôle (`address`) ; si le pays est `FR`, la ligne contient un code postal de 5 chiffres
  (`postalCode`). Réponse : la ligne ; pays sous `<clé>_pays`. `verify: true` signale une adresse **à vérifier par
  un service de normalisation** (BAN pour la France, ou autre) : c'est une consigne pour le moteur cible, l'outil
  n'appelle aucun service.
- **`civility`** : choix unique prédéfini, codes **fixes** `"MME"` (Madame), `"M"` (Monsieur) et, si
  `undisclosed: true`, `"NP"` (Ne se prononce pas, en dernier). Libellés par défaut (fr / en) : longs « Madame » /
  « Madam », « Monsieur » / « Mister » ; courts (`short: true`) « Mme » / « Mrs », « M. » / « Mr » ; « Ne se prononce
  pas » / « Prefer not to say ». `labels: { "MME"?: …, "M"?: …, "NP"?: … }` (textes multilingues) remplace un
  libellé ; le code ne change pas. Pas d'« Autre », d'option ajoutée ni de source dynamique. Contrôle : réponse
  parmi les codes proposés (`option`).

```json
{ "id": "lq_souscripteur", "key": "souscripteur", "type": "structure", "label": { "fr": "Souscripteur" }, "fields": [
  { "id": "lf_civilite", "key": "civilite", "type": "civility", "label": { "fr": "Civilité" }, "required": true },
  { "id": "lf_mail", "key": "mail", "type": "email", "label": { "fr": "Adresse mail" } },
  { "id": "lf_telephone", "key": "telephone", "type": "phone", "label": { "fr": "Téléphone" }, "defaultCountry": "FR", "lineType": "mobile" },
  { "id": "lf_adresse", "key": "adresse", "type": "address", "label": { "fr": "Adresse" }, "defaultCountry": "FR", "verify": true }
] }
```

### 7.9 Suggestions d'un champ texte (version 12)

`suggestions` (expression, §10) sur une question ou un champ de structure `text` : textes **proposés** pendant la saisie
(autocomplétion), la saisie libre restant possible. Présente (même vide) = option activée ; absente = aucune suggestion.

- L'expression doit renvoyer une **liste** : réponse d'un choix multiple, variable de l'état du système de type
  liste, champ d'une liste d'objets (`sys.sinistres.nature`), littéral (`["a", "b"]`), fonctions (`$append(…)`).
  Mêmes références que les autres expressions (§10.3) ; une question non garantie avant le champ est signalée (§13).
- Mise en liste, à l'affichage de la page, avec les réponses courantes : valeur unique → un élément ; vide, absente ou
  erreur → aucune suggestion (texte simple) ; nombres, booléens, dates (chaînes ISO) → texte ; objets, éléments
  vides et valeur réservée `"other"` d'un choix (« Autre », comme pour une entrée dynamique, §7.5) écartés ;
  doublons supprimés, ordre de l'expression conservé (première occurrence). Ce sont les **valeurs** des options
  d'un choix qui sont proposées, pas leurs libellés ; la précision d'« Autre » s'ajoute par l'expression
  (`$append(marques, marques_other)`).
- Affichage (outil) : liste ouverte à la prise de focus, filtrée à la frappe (« contient », casse ignorée), choix à la
  souris ou au clavier.
- Réponse et validation : inchangées (§8, §9). La réponse est le texte saisi, qu'il vienne d'une suggestion ou non ;
  aucune contrainte d'appartenance à la liste. Les autres expressions qui référencent le champ lisent ce texte.

```json
{ "id": "n_marque", "key": "marque", "type": "text", "label": { "fr": "Marque du véhicule principal" }, "suggestions": "marques" }
```

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

Avec « Ne sais pas » (§7.7) : `"montant_estime": null, "montant_estime_nsp": true` ;
`"canaux_contact": [], "canaux_contact_group": "NSP", "canaux_contact_nsp": true`.

Types de la version 6 (§7.8) : `"souscripteur": { "civilite": "MME", "mail": "Jean.Dupont@exemple.fr",
"telephone": "+32470123456", "telephone_pays": "BE", "adresse": "12 rue des Lilas 31000 Toulouse", "adresse_pays": "FR" }`.

- Question d'un questionnaire (locale ou de bibliothèque) : sous sa clé.
- Question d'un fragment : sous `<alias>.<clé>` (objet de l'alias du nœud fragment) ; fragment appelé par un fragment : `<alias>.<sous-alias>.<clé>`. Deux appels du même fragment ont des alias distincts, donc des réponses distinctes.
- Précision « Autre » : clé `<clé>_other`, à côté de la réponse.
- Groupe de la sélection d'un choix (`single`, `multiple`, version 3) : clé `<clé>_group`, à côté de la réponse
  (la valeur, elle, est inchangée). Il vaut l'identifiant du groupe de l'option choisie (§7.3), `"AUTRE"` pour
  « Autre (préciser) ». Option hors groupe : clé absente (`single`) ou `""` (`multiple`). Pour `multiple`, c'est une
  liste **parallèle** aux valeurs, de même longueur et dans le même ordre (`["conjoint", "conjoint"]` /
  `["SC", "AA"]`). Une réponse sans `<clé>_group` (valeur par défaut, ancien jeu de test) désigne la première
  option visible de cette valeur.
- « Ne sais pas » (version 5, §7.7) : clé `<clé>_nsp` (`true`), à côté de la réponse vide (`null`, `[]` pour
  `multiple`) ; groupe `"NSP"` pour `single` et `multiple` (chaîne, pas une liste). Absente sinon.
- Pays d'un téléphone ou d'une adresse (version 6, §7.8) : clé `<clé>_pays` (code ISO 3166-1 alpha-2), à côté de la
  réponse, effacée avec elle ; absente si la question n'a pas de réponse.
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

0. **Ne sais pas** : si `dontKnow` est activé et `<clé>_nsp` vaut `true` (lu à côté de la réponse ; dans une
   structure, dans l'occurrence), la réponse est acceptée : rien d'autre n'est vérifié.
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
   - `email`, `phone`, `address`, `civility` (version 6) : contrôles du §7.8, sur la réponse sans espaces de bord
     (`email` ; `phone` puis `lineType` ; `address` puis, en France, `postalCode` ; `option`). Le pays est lu sous
     `<clé>_pays` (dans une structure, dans l'occurrence), sinon `defaultCountry`, sinon `"FR"`.
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
| `email` | Adresse mail invalide. | Invalid email address. |
| `phone` | Numéro de téléphone invalide. | Invalid phone number. |
| `lineType` | Numéro {0} attendu (mobile, fixe). | {0} number expected (Mobile, Landline). |
| `address` | Adresse invalide : une ligne de {0} caractères, avec au moins une lettre. ({0} = `5–200`) | Invalid address: one line of {0} characters, with at least one letter. |
| `postalCode` | Code postal manquant. | Postal code missing. |
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
- dans un fragment : les réponses de chaque appel traversé **aussi** sans préfixe, la plus interne prioritaire (celles du fragment, puis de son appelant s'il est lui-même un fragment…) sur une clé homonyme de l'appelant ;
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
| `qualite_declarant.groupe` | Groupe de la sélection d'un choix (version 3) : lit `qualite_declarant_group` (§8) — code du groupe, sinon son libellé dans la langue par défaut ; `"AUTRE"` pour « Autre » ; absent (`single`) ou `""` (`multiple`) hors groupe ; liste pour `multiple`. Aussi `tiers.cle.groupe` (fragment), `victimes.lien.groupe`, `lien.groupe` (champ de structure). Un moteur peut, comme l'outil, réécrire toute étape **finale** `groupe` d'un chemin de noms en `<dernier nom>_group` avant d'évaluer, en gardant les indices et filtres du dernier nom (`liens[0].groupe` → `liens_group[0]`). Ailleurs qu'après une question à choix, `.groupe` est une référence inconnue. |
| `montant_estime.nsp` | « Ne sais pas » choisie (version 5, §7.7) : `true` si `montant_estime_nsp` vaut `true`, `false` sinon (jamais absent). Aussi `tiers.cle.nsp`, `victimes[0].age.nsp`, `age.nsp` (champ de structure). Un moteur peut, comme l'outil, réécrire tout chemin de noms terminé par `.nsp` en `(<chemin>_nsp = true)` (`victimes[0].age.nsp` → `(victimes[0].age_nsp = true)`). Sur une structure répétable sans indice (`victimes.age.nsp`), la comparaison d'une liste vaut `false` : utiliser un indice ou un filtre (`victimes[age.nsp]`). Connu seulement sur une question dont `dontKnow` est activé ; ailleurs, référence inconnue. |
| `telephone.pays` | Pays d'un téléphone ou d'une adresse (version 6, §7.8) : lit `telephone_pays` (§8), code ISO ; absent si non répondu. Aussi `tiers.cle.pays`, `souscripteur.telephone.pays`, `souscripteurs[0].telephone.pays`. L'outil réécrit tout chemin de noms terminé par `.pays` en `($exists(<chemin>_pays) ? <chemin>_pays : <chemin>.pays)` (`_pays` inséré après l'avant-dernier nom, comme `.groupe`) : un champ de structure nommé `pays` reste lisible (`pays` n'est pas réservé). Connu seulement après une question `phone` ou `address` ; ailleurs, référence inconnue. |
| `sys.profil`, `sys.sinistres.nature` | Variable de l'état du système ; champ des objets d'une liste. |
| `tiers.nom` | Question `nom` du fragment appelé avec l'alias `tiers` (depuis l'appelant, ou dans le fragment). `ident.adresse.ville` : fragment `adresse` appelé par le fragment `ident`. |
| `nom` (dans le fragment) | Question `nom` du fragment lui-même ; une clé de l'appelant reste accessible sans préfixe si le fragment n'a pas de question homonyme (« clé attendue de l'appelant », vérifiée chez chaque appelant, §13). |
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

Le parcours est une suite de **pages** (nœuds `question`, `info`, `summary`, `end`). Les nœuds `fragment`
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
- Une arête relie deux nœuds du même graphe (questionnaire ou fragment).

### 11.2 Départ et fin

Le parcours commence au nœud `start` du questionnaire (sur l'entrée du fragment si `start` est un nœud `fragment`). Il se termine sur un nœud `end`, dont `outcome`
indique l'issue métier au logiciel hôte. Un fragment ne contient pas de `end` ; dans un fichier antérieur (bloc migré), un `end` placé dans un fragment termine tout le questionnaire (signalé, §13).

### 11.3 Fragments

Un fragment (`library.fragments[]`, version 7) est un morceau de parcours sans départ ni fin : des questions,
des pages, éventuellement des appels d'autres fragments et des sorties nommées (`exit`).

- **Entrée** : atteindre un nœud `fragment` mène à l'**entrée** du fragment : `entry` si elle est donnée
  (et désigne un nœud), sinon le nœud du fragment sans arête entrante. S'il n'y en a pas ou plusieurs (et pas
  d'`entry`), le moteur prend le premier de ces nœuds dans l'ordre de `nodes` (le premier nœud s'il n'y en a
  aucun) ; l'éditeur le signale (`fragmentEntry`).
- **Étapes** : une page d'un fragment est identifiée par `<id du nœud fragment>/<id du nœud du fragment>`
  (ex. `n_bloc_tiers/bn_nom`) ; dans un fragment appelé par un fragment, `<id1>/<id2>/<id du nœud>`.
  Ses réponses sont rangées sous l'alias (§8).
- **Sortie implicite** : un nœud du fragment **sans arête sortante** est une sortie. Après sa page, on
  applique la règle du §11.1 aux arêtes sortant du nœud fragment **sans** `exit`. Leurs conditions sont
  évaluées dans le contexte de l'**appelant** (réponses du fragment via `alias.cle`, ex. `ident.majeur = false`).
- **Sortie nommée** (facultative, héritée des blocs) : atteindre un nœud `exit` fait quitter le fragment :
  on applique la règle du §11.1 aux arêtes sortant du nœud fragment dont `exit` vaut le `name` de la sortie
  atteinte **ou** qui n'ont pas d'`exit` (valables pour toute sortie).
- **Imbrication** : un fragment peut appeler un autre fragment. Si le nœud fragment intérieur n'a aucune
  arête sortante, la sortie remonte : on applique la règle aux arêtes du nœud fragment extérieur. Un cycle
  d'appels (A appelle B qui appelle A) est invalide (signalé, `fragmentCycle`) ; le moteur peut refuser le fichier.
- Un nœud `exit` n'apparaît que dans un fragment. Cette règle n'est imposée ni par le schéma ni par les
  vérifications du §13 : l'éditeur ne permet pas de produire autre chose, mais un fichier écrit à la main
  pourrait l'enfreindre, et le comportement est alors indéfini. Un même fragment peut être appelé plusieurs
  fois, avec des alias différents ; chaque appel a ses propres réponses.

```json
{ "kind": "fragment", "id": "n_ident", "ref": "frg_identification_assure", "alias": "ident" },
{ "id": "e_ident_mineur", "from": "n_ident", "to": "n_mineur", "when": "ident.majeur = false" },
{ "id": "e_ident_montant", "from": "n_ident", "to": "n_montant_demande" },
{ "id": "e_bloc_identifie", "from": "n_bloc_tiers", "to": "n_circonstances", "exit": "identifie" }
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
« Autre », groupes `<clé>_group` et marqueurs `<clé>_nsp`) des questions absentes de cet ensemble sont **effacées**.

Ainsi, après un retour arrière où l'on change `type_sinistre` de `accident` à `vol`, la réponse
`victimes` disparaît dès qu'on avance : la question n'est plus sur le chemin.

### 11.6 Synthèse et retour pour modifier

Une page `summary` liste, dans l'ordre de **première** visite, les questions de l'historique avant
elle qui ont une réponse (y compris `null`, affichée vide) : intitulé et réponse courante. Une option
d'un groupe s'affiche « Groupe — Option » (intitulé du groupe dans la langue affichée) ; une réponse « Ne sais pas »,
par le libellé de l'option.

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

- `questions[]` : questions réutilisables (§7), référencées par `{ "kind": "question", "id", "ref", "label"?, "hiddenFields"?, "required"? }` (§6).
  Leur clé est vue sans préfixe dans le graphe qui les référence (questionnaire, ou fragment puis `alias.cle`).
- `fragments[]` (version 7) : `{ id, key, title, description?, entry?, nodes, edges }` (§11.3) ; nœuds : questions
  (locales ou de bibliothèque), `info`, `summary`, `fragment` (appel d'un autre fragment), `exit` ; pas de `start`
  ni de `end`. Les questionnaires et fragments y font **référence** (`ref`) : une modification s'applique à tous les appelants.
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
| `missingStart`, `unreachable`, `deadEnd` | Départ introuvable, nœud inaccessible (depuis le départ, ou l'entrée d'un fragment), nœud sans sortie qui n'est pas une fin (hors fragment : ses nœuds sans arête sortante sont ses sorties). |
| `noElse`, `multipleElse` | Plusieurs arêtes sortantes sans « sinon » ; plusieurs « sinon ». |
| `loopWithoutExit` | Boucle dont aucune arête ne sort. |
| `exitNotConnected`, `unknownExit`, `implicitExitNotConnected` | Sortie nommée d'un fragment non raccordée ; arête visant une sortie inexistante ; sorties implicites sans arête sans `exit`. |
| `fragmentEntry`, `fragmentNoExit`, `fragmentCycle`, `unusedFragment`, `endInFragment` | Fragment sans entrée unique (et sans `entry`) ; sans sortie ; cycle d'appels ; appelé nulle part ; contenant une fin. |
| `hiddenField` | Référence à un champ masqué (`hiddenFields`) d'une instance de structure du graphe (`identite.telephone`, `alias.identite.telephone` chez l'appelant d'un fragment) : il ne sera jamais renseigné. Les références internes à la définition (champ frère) ne sont pas signalées. |
| `expectedKeyMissing` | Clé attendue par un fragment (référence hors de ses propres clés) absente chez un appelant : signalée dans cet appelant, sur le nœud fragment. |
| `libraryMissing` | Question, fragment ou jeu de libellés de bibliothèque introuvable. |
| `missingTranslation` | Texte sans traduction dans une langue du projet (libellés de groupe et `dontKnow.label` compris). |
| `duplicateGroup`, `reservedGroupCode`, `emptyGroup` | Groupes d'options d'une question : identifiant en double ; code `AUTRE` ou `NSP` (réservés) ; groupe sans option (§7.3). |

L'exemple fourni ne produit aucun problème.

## 14. Exemple commenté

`examples/declaration-sinistre/` : déclaration d'un sinistre par un adhérent connecté (langues `fr`, `en`), et demande de remboursement (`demande_remboursement.json`, version 7 ; champs masqués, version 8).

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
| Fragment **au milieu** du parcours, avec alias, deux sorties nommées, structure non répétable, tri-state à jeu de libellés, accès à une clé de l'appelant (`{date_sinistre}`) | `n_bloc_tiers` → `blk_identite_tiers` |
| Fragment **en première position** (`start` sur le nœud fragment), sorties implicites (`num_secu`, `representant_legal`), arête de l'appelant `ident.majeur = false` (version 7) | `q_remboursement` : `n_ident` → `frg_identification_assure` ; chemins `remboursement_majeur.json`, `remboursement_mineur.json` |
| `required` calculé ; aide à variantes (`type_sinistre_other`, `$daysBetween`) | `n_circonstances` |
| Choix multiple avec « Autre » ; `'telephone' in canaux_contact` | `n_canaux`, `e_canaux_tel` |
| Question de bibliothèque à intitulé surchargé | `n_tel` → `lq_telephone` |
| Synthèse, confirmation à jeu de libellés booléen, boucle de correction, fin à variantes | `n_synthese`, `n_confirmation`, `e_confirmation_retour`, `n_fin` |
| « Ne sais pas » (version 5) : nombre obligatoire avec minimum et libellé traduit ; choix multiple obligatoire avec « Autre » et libellé par défaut ; `montant_estime.nsp` dans une arête | `n_montant`, `n_canaux`, `e_montant_expertise` ; chemin `amicale_ne_sais_pas.json` |
| Libellés de lecture `caption` (version 4) : arête conditionnée, « sinon », arête de sortie nommée ; variable et champ de liste | `e_qualite_ayant_droit`, `e_qualite_montant`, `e_bloc_non_identifie` ; `sys.type_adherent`, `sys.sinistres` (`nature`) |
| Mail, téléphone, adresse, civilité (version 6) : structure de bibliothèque non utilisée par le questionnaire (civilité obligatoire, téléphone mobile, adresse à vérifier) | `lq_souscripteur` (bibliothèque) |
| Champs masqués (version 8) : structure `identite` (7 champs, tous obligatoires) réduite à nom, prénom, mail dans une instance ; `{identite.mail}` dans la fin | `q_remboursement` : `n_rappel` → `lq_identite`, `n_fin_remboursement` ; chemins `remboursement_*.json` |
| Commentaire de révision (version 9) : question commentée, deux réponses, nœud commentaire à gauche de la question | `declaration_sinistre.layout.json` : `comments` sur `n_date` |
| Surcharge du caractère obligatoire (version 10, §6.1) : téléphone obligatoire en bibliothèque, rendu facultatif dans un fragment (laissé vide) ; question d'un fragment rendue facultative depuis un questionnaire | `blk_identite_tiers` : `bn_telephone` → `lq_telephone` (chemins `ud_tiers_inconnu.json`, `ud_vol_avec_boucle.json`) ; `q_remboursement` : `n_ident.requiredOverrides` |
| Formulaire validé (version 11) : `status: "validated"`, `validatedAt` ; la déclaration de sinistre reste non validée | `demande_remboursement.json` |
| Suggestions d'un champ texte (version 12) : nom d'une victime, suggestion tirée du nom de l'assuré (`$substringAfter(sys.nom_assure, ' ')`, valeur unique) | `n_victimes` : champ `nom` |

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
    { "step": "n_canaux", "value": ["courrier", "other"], "other": "Par l'amicale" },
    { "step": "n_montant", "dontKnow": true }
  ],
  "path": ["n_intro", "n_type", "…", "n_fin"],
  "outcome": "submitted"
}
```

| Propriété | Sens |
| --- | --- |
| `questionnaire`, `scenario` | Id du questionnaire joué ; id du scénario qui fournit l'état du système. |
| `today` | Date du jour à utiliser pour `$today()`, `$age`… |
| `answers[]` | Réponses dans l'ordre de saisie : `step` (id de page ; dans un fragment `idNœudFragment/idNœud`), `value`, `other?` (précision « Autre »), `group?` (groupe de la sélection, rangé sous `<clé>_group`, §8), `dontKnow?` (`true` : « Ne sais pas » choisie, sans `value` ; valeur, groupe et marqueur posés comme au §7.7). |
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
sont documentés ici. Version actuelle : **12**.

| Version | Changement | Migration |
| --- | --- | --- |
| 2 | Options d'un choix : suite ordonnée d'entrées (statiques ou dynamiques) ; `source` disparaît (EVO-001). | `source` → entrée dynamique placée après les options statiques. |
| 3 | Groupes d'options (`{ group, code?, when?, options }` dans `options[]`), réponse `<clé>_group`, référence `cle.groupe`, mot réservé `groupe` (EVO-003). | Aucune transformation (un document antérieur n'a pas de groupe) ; seul `formatVersion` change. |
| 4 | Libellé de lecture `caption` (chaîne, une ligne) sur l'arête, la variable de l'état du système et le champ de liste d'objets (EVO-005). | Aucune transformation (un document antérieur n'a pas de libellé) ; seul `formatVersion` change. |
| 5 | Option « Ne sais pas » `dontKnow` (toute question sauf structure), réponse `<clé>_nsp`, groupe réservé `NSP`, référence `cle.nsp`, mot réservé `nsp` (EVO-006). | Aucune transformation (propriété absente = désactivée) ; seul `formatVersion` change. |
| 6 | Types `email`, `phone`, `address`, `civility` et leurs paramètres, réponse `<clé>_pays`, référence `cle.pays`, contrôles intégrés `email`, `phone`, `lineType`, `address`, `postalCode` (EVO-007). | Aucune transformation (un document antérieur n'utilise pas ces types) ; seul `formatVersion` change. |
| 7 | Fragments de questionnaire (EVO-008) : `library.blocks` → `library.fragments` (`entry?`, sans `start`), nœud `block` → `fragment`, sorties implicites (nœuds sans arête sortante), départ possible sur un nœud fragment, imbrication. | Chaque bloc devient un fragment (mêmes id, clé, titre, nœuds, arêtes, sorties nommées ; `start` devient `entry` seulement s'il n'est pas l'unique nœud sans arête entrante) ; chaque nœud `block` devient `fragment`. Navigation inchangée pour un projet antérieur, sauf un nœud de bloc sans arête sortante (impasse déjà signalée en v6) : il arrêtait le parcours, il reprend désormais sur les arêtes sortantes du nœud fragment chez l'appelant. |
| 8 | Champs masqués `hiddenFields` (clés) d'une instance d'une structure de bibliothèque ; code de vérification `hiddenField` (EVO-009). | Aucune transformation (propriété absente = tous les champs affichés) ; seul `formatVersion` change. |
| 9 | Commentaires de révision `comments` (`{ node, x?, y?, text, replies[] }`) d'un document `layout` ; fichier `question_<clé>.layout.json` pour une question de bibliothèque commentée (EVO-011). Outil seulement, à ignorer par le moteur. | Aucune transformation (propriété absente = aucun commentaire) ; seul `formatVersion` change. |
| 10 | Surcharge du caractère obligatoire (EVO-012) : `required?` (booléen) d'une référence de bibliothèque, `requiredOverrides?` (chemin d'ids → booléen) d'un nœud fragment ; résolution du plus proche au plus lointain (§6.1). | Aucune transformation (propriétés absentes = hérité) ; seul `formatVersion` change. |
| 11 | État de validation d'un questionnaire (EVO-015) : `status?` (`"draft"` \| `"validated"`) et `validatedAt?` (date). | Aucune transformation (propriétés absentes = non validé) ; seul `formatVersion` change. |
| 12 | Suggestions d'un champ texte (EVO-016) : `suggestions?` (expression renvoyant une liste, §7.9). | Aucune transformation (propriété absente = pas de suggestions) ; seul `formatVersion` change. |
