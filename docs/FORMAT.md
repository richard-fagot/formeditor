# Format des questionnaires — version 1

Ce document décrit le format JSON produit par l'éditeur de questionnaires. Il s'adresse à l'équipe
de développement (et à l'IA qui l'assiste) chargée de générer les formulaires réels.

- Schémas : `src/format/schemas/*.schema.json` (JSON Schema 2020-12).
- Exemple complet : `examples/declaration-sinistre/` (sert aussi de jeu de test).
- Implémentation de référence du moteur de parcours : `src/core/runtime` ; des expressions : `src/core/expressions`.

## 1. Fichiers

| Fichier | `kind` | Contenu |
| --- | --- | --- |
| `projet.json` | `project` | Métadonnées, langues, dictionnaire de l'état du système, scénarios, liste des questionnaires. |
| `bibliotheque.json` | `library` | Questions, blocs et jeux de libellés réutilisables. |
| `<questionnaire>.json` | `questionnaire` | Nœuds, arêtes, questions locales, références à la bibliothèque. |
| `<questionnaire>.layout.json`, `bloc_<cle>.layout.json` | `layout` | Positions des nœuds dans l'éditeur. **Sans intérêt pour le formulaire final.** |
| `<projet>.bundle.json` | `bundle` | `project`, `library`, `questionnaires[]`, `layouts[]` dans un seul fichier. |

Chaque fichier porte `formatVersion` (entier, actuellement `1`) et `kind`. L'outil migre
automatiquement les versions antérieures à l'ouverture. Tout élément accepte une propriété
`description` libre, destinée au lecteur (humain ou IA), sans effet sur le comportement.

## 2. Identifiants et clés

- `id` : identifiant technique, stable, opaque. Sert aux liens structurels (arêtes, départ, références
  de bibliothèque, mise en page). Ne jamais l'utiliser dans une expression.
- `key` : clé lisible en `snake_case` (`^[a-z][a-z0-9_]*$`), unique dans le questionnaire (ou dans le
  bloc). C'est elle qu'on écrit dans les expressions. Mots réservés : `sys`, `true`, `false`, `null`,
  `and`, `or`, `in`.

## 3. Textes multilingues et libellés

Un **texte multilingue** est un objet `{ "<langue>": "texte" }` dont les langues sont celles du projet
(`project.languages`, langue par défaut `project.defaultLanguage`). Une langue absente signifie une
traduction manquante : on affiche alors la langue par défaut.

Un **libellé** (intitulé, aide, placeholder, texte d'information, option, message de fin) est :

- soit un texte multilingue ;
- soit un objet à variantes : la première variante dont `when` est vraie est retenue, sinon `otherwise`.

```json
{
  "variants": [{ "when": "type_sinistre = 'vol'", "text": { "fr": "Valeur des biens volés" } }],
  "otherwise": { "fr": "Montant des dommages" }
}
```

**Interpolation** : dans un libellé, `{expression}` est remplacé par la valeur de l'expression
(ex. `Date de naissance de {victime.prenom} ?`). Une valeur absente donne une chaîne vide ; une liste
est jointe par des virgules ; une date ISO est affichée telle quelle. `{{` et `}}` produisent des accolades littérales.

## 4. Graphe et navigation

Un questionnaire (et un bloc) est un graphe : `start` (id du nœud de départ), `nodes[]`, `edges[]`.

### 4.1 Nœuds (`kind`)

| `kind` | Rôle | Propriétés |
| --- | --- | --- |
| `question` | Une page de saisie. | Question locale (§5) ou référence `ref` à une question de bibliothèque avec `label` facultatif qui surcharge l'intitulé. |
| `block` | Instance d'un bloc de bibliothèque. | `ref` (id du bloc), `alias` (préfixe des clés du bloc). |
| `info` | Page de texte sans saisie. | `title?`, `text`. |
| `summary` | Récapitulatif des réponses du parcours effectif jusqu'ici. | `title?`. |
| `end` | Fin de parcours. | `title?`, `message`, `outcome?` (issue métier libre : `submitted`, `ineligible`…). |
| `exit` | Sortie nommée d'un bloc (dans un bloc uniquement). | `name` (clé `snake_case`, visée par `exit` des arêtes de l'instance), `label?` (texte multilingue facultatif, pour le lecteur ; sans effet sur le parcours). |

### 4.2 Arêtes

`{ "id", "from", "to", "when"?, "exit"? }`. Règle de navigation, appliquée en quittant un nœud :

1. on considère les arêtes dont `from` est le nœud quitté, **dans l'ordre du tableau `edges`** (c'est leur rang) ;
2. la première arête **avec condition** dont `when` est vraie est suivie ;
3. sinon, l'arête **sans condition** (le « sinon ») est suivie ;
4. sinon, le parcours est bloqué (l'éditeur le signale comme incohérence).

Une condition qui échoue à l'évaluation (référence absente…) est considérée comme fausse.

- **Convergence** : plusieurs arêtes peuvent viser le même nœud.
- **Boucle** : une arête peut viser un nœud déjà visité. La nouvelle réponse **remplace** la
  précédente : aucune itération n'est conservée. Pour saisir plusieurs occurrences, on utilise une
  structure répétable (§5.8).

### 4.3 Blocs

Un bloc (`library.blocks[]`) est un sous-graphe avec `start`, des questions et des nœuds `exit`.
Une instance (`kind: "block"`) déroule le bloc à partir de son `start`. Quand le parcours atteint un
nœud `exit` du bloc, on quitte l'instance en appliquant la règle du §4.2 aux arêtes sortant de
l'instance dont `exit` vaut le nom de la sortie atteinte (ou sans `exit` : valables pour toute sortie).

Un bloc ne contient pas d'instance de bloc. Un même bloc peut être instancié plusieurs fois avec des alias différents.

### 4.4 Retour arrière et effacement

Le parcours garde l'historique des pages visitées ; « précédent » revient à la page précédente.
Après une modification (retour arrière, retour depuis une synthèse), le **chemin projeté** est
recalculé depuis le départ avec les réponses connues ; les réponses des questions qui n'y figurent
plus sont **effacées**. Après un retour depuis une synthèse, « revenir à la synthèse » avance sur les
pages déjà vues et répondues, et s'arrête à la synthèse, à la première page nouvelle du chemin, à une
question sans réponse, à une réponse devenue invalide ou à une fin (`resume`, `src/core/runtime`).

## 5. Questions

Propriétés communes : `id`, `key`, `label`, `type`, `description?`, `help?`, `placeholder?`,
`required?` (booléen ou expression, défaut `false`), `default?` (valeur littérale),
`defaultExpr?` (valeur calculée, prioritaire), `messages?`, `constraints?`.

**Contraintes** : chaque paramètre de contrainte intégré (`min`, `max`, `minLength`, `pattern`,
`minSelected`, `required`…) peut avoir un message d'erreur dans `messages.<paramètre>` (texte
multilingue) ; sans message, un message par défaut est généré. `constraints[]` ajoute des règles
libres : `{ "rule": "<expression booléenne vraie si valide>", "message"?: {…} }`. Dans une règle,
la réponse en cours est accessible par sa clé.

Deux règles de validation complètent les paramètres (implémentation de référence : `validateAnswer`, `src/core/validation`) :

- **Choix hors des options visibles** : une réponse de `single` ou `multiple` dont une valeur n'est pas
  parmi les options visibles au moment de la validation (options statiques dont `when` est vraie, source
  dynamique, `other` si « Autre » est activé) est refusée, avec le paramètre de message `option`
  (`messages.option`). Une option devenue invisible ne permet donc plus de valider la question.
- **Structure répétable facultative** : `repeat.min` ne s'applique pas à une structure répétable
  facultative laissée vide (aucune occurrence saisie). Il s'applique si la question est obligatoire
  ou dès qu'une occurrence est saisie. Une structure répétable obligatoire sans `repeat.min` (ou avec
  `min: 0`) laissée vide (`[]`) est refusée avec le paramètre `required`.

| `type` | Valeur de la réponse | Paramètres |
| --- | --- | --- |
| `text` | chaîne | `multiline?`, `minLength?`, `maxLength?`, `pattern?` (expression régulière JavaScript) |
| `date` | chaîne `AAAA-MM-JJ` | `min?`, `max?` : date ISO littérale ou expression (`$today()`, `date_sinistre`, `sys.date_effet_contrat`) |
| `number` | nombre | `numberKind?` (`real`, `natural` ≥ 0 entier, `integer`), `min?`, `max?` (nombre ou expression), `decimals?`, `unit?` |
| `single` | chaîne (valeur de l'option) | `options[]`, `other?`, `source?` |
| `multiple` | tableau de chaînes | `options[]`, `other?`, `source?`, `minSelected?`, `maxSelected?` |
| `boolean` | `true` / `false` | `labelSet?` (id d'un jeu de libellés ; défaut « Oui / Non »), `other?` |
| `tristate` | `true` / `false` / `"unknown"` | `labelSet?` (défaut « Oui / Non / Ne sait pas »), `other?` |
| `structure` | objet (ou tableau d'objets si répétable) | `fields[]`, `repeat?` |

Une question facultative laissée vide a pour réponse `null` (dans les réponses et le chemin). Dans les
expressions, une réponse `null` est absente : `$exists(cle)` est faux, `cle` vaut « rien » (§6).

### 5.1 Options

`{ "value": "vol", "label": {…}, "when"?: "<condition d'affichage>" }`. La valeur `other` est réservée.

### 5.2 « Autre (préciser) »

`other: { "label"?, "detailRequired"? }` ajoute une option de valeur `"other"` qui ouvre un champ
texte. La précision est accessible dans les expressions par la clé `<cle>_other`.

### 5.3 Source dynamique

`source: { "from": "<liste>", "label"?: "<expr>", "value"?: "<expr>" }` : les options proviennent
d'une liste (réponse précédente ou variable système). `label` et `value` sont évaluées sur chaque
élément (l'élément est le contexte : `date & ' — ' & nature`). Les options dynamiques suivent les
options statiques ; leurs valeurs sont converties en chaînes, et les doublons, valeurs vides et `other` sont écartés.
Implémentation de référence : `choiceOptions` (`src/core/runtime`).

### 5.4 Structure

`fields[]` : questions de tout type sauf `structure`, chacune avec `when?` (condition d'affichage).
Dans un champ, les clés des autres champs de la même occurrence s'écrivent sans préfixe (`hospitalise = true`).
`repeat: { "min"?, "max"?, "addLabel"? }` rend la structure répétable (bouton « Ajouter »).

## 6. Expressions

Les expressions sont écrites en **JSONata 1.8** (implémentations disponibles en JavaScript, Java,
.NET, Python). Elles sont évaluées sur un contexte :

| Écriture | Désigne |
| --- | --- |
| `date_sinistre` | Réponse à la question de clé `date_sinistre`. |
| `victime.nom` | Sous-champ d'une structure. |
| `temoins[0].nom`, `$count(temoins)` | Occurrences d'une structure répétable (indice à partir de 0). |
| `sys.profil` | Variable de l'état du système. |
| `tiers.nom` | Question `nom` du bloc instancié avec l'alias `tiers`. |

À l'intérieur d'un bloc, ses propres clés s'écrivent sans préfixe ; les clés du questionnaire hôte
sont aussi accessibles ; en cas d'homonymie, la question du bloc prime.

Opérateurs utiles :

| Besoin | JSONata |
| --- | --- |
| Égalité, différence | `a = 'x'`, `a != 'x'` |
| Comparaisons (nombres, dates ISO) | `<`, `<=`, `>`, `>=` |
| ET / OU / NON | `and`, `or`, `$not(…)` |
| Contient (choix multiple, liste) | `'telephone' in canaux_contact` |
| Est renseigné (réponse non vide ; une réponse `null` est retirée du contexte) | `$exists(cle)` |
| Dénombrement | `$count(canaux_contact)`, `$count(victimes)` |
| Filtrage d'une liste d'objets | `sys.sinistres[nature = 'Vol']`, `$count(victimes[hospitalise])` |

**Noms dans un filtre.** Entre crochets, un nom nu désigne un champ de l'élément filtré (sens JSONata) :
dans `sys.sinistres[nature = 'Vol']`, `nature` est `sys.sinistres.nature`. Pour comparer à une réponse
ou à une autre valeur du contexte, partir de la racine avec `$$` : `sys.sinistres[nature = $$.type_sinistre]`.
L'outil vérifie ces noms (champ inconnu signalé ; une clé de question écrite nue dans un filtre est signalée
avec la suggestion `$$.cle`) et les suit au renommage. `$$.cle` équivaut à `cle` hors d'un filtre.

Fonctions ajoutées par l'outil (à fournir par l'implémentation cible) :

| Fonction | Résultat |
| --- | --- |
| `$today()` | Date du jour, `AAAA-MM-JJ`. |
| `$addDays(date, n)` | Date ISO décalée de `n` jours. |
| `$daysBetween(d1, d2)` | Nombre de jours de `d1` à `d2`. |
| `$age(date)` | Âge révolu en années à la date du jour. |

## 7. Projet

- `languages`, `defaultLanguage`.
- `systemState[]` : dictionnaire des variables fournies par le logiciel hôte : `name`, `type`
  (`text`, `number`, `date`, `boolean`, `enum` avec `values`, `list` avec `fields`), `description?`, `example?`.
  Les noms des variables et des champs d'une liste sont des clés (`^[a-z][a-z0-9_]*$`), uniques
  (dans le dictionnaire, dans la liste). Quand `source.from` désigne une liste système dont les champs
  sont déclarés, les noms relatifs de `source.label` / `source.value` doivent être de ces champs
  (sinon « référence inconnue »).
- `scenarios[]` : `{ id, name, values }` — jeux de valeurs de l'état du système pour la prévisualisation.
- `questionnaires[]` : `{ id, file }`.

## 8. Bibliothèque

- `questions[]` : questions réutilisables, référencées par les nœuds `{ "kind": "question", "ref": "<id>" }`.
  La clé, le type et les contraintes restent ceux de la bibliothèque ; seul l'intitulé (`label`) est surchargeable.
- `blocks[]` : `{ id, key, title, start, nodes, edges }` (§4.3).
- `labelSets[]` : `{ id, key, kind: "boolean" | "tristate", yes, no, unknown? }`.

## 9. Exemple commenté

Extrait de `examples/declaration-sinistre/declaration_sinistre.json` : après la date, on demande le
lien avec un sinistre existant si l'adhérent en a déjà déclaré, puis on converge vers le montant.

```json
{ "id": "e_date_lien", "from": "n_date", "to": "n_lien", "when": "$count(sys.sinistres) > 0" },
{ "id": "e_date_victimes", "from": "n_date", "to": "n_victimes", "when": "type_sinistre = 'accident'" },
{ "id": "e_date_montant", "from": "n_date", "to": "n_montant" }
```

La question `sinistre_lie` propose « Non, aucun » puis un choix par sinistre existant :

```json
"options": [{ "value": "aucun", "label": { "fr": "Non, aucun" } }],
"source": { "from": "sys.sinistres", "label": "date & ' — ' & nature", "value": "id" }
```

En fin de parcours, `confirmation = false` renvoie à la première question (boucle) : les réponses
déjà données sont proposées à nouveau et remplacées si elles changent.

## 10. Chemins attendus (jeux de test)

`examples/declaration-sinistre/chemins/*.json` décrit des parcours de référence, réutilisables pour
tester une implémentation du moteur :

```json
{
  "questionnaire": "q_declaration",
  "scenario": "sc_ud_2_sinistres",
  "today": "2026-10-10",
  "answers": [{ "step": "n_type", "value": "vol" }, { "step": "n_bloc_tiers/bn_nom", "value": "Dupont" }],
  "path": ["n_intro", "n_type", "…", "n_fin"],
  "outcome": "submitted"
}
```

- `step` : id de page ; dans un bloc, `idInstance/idNœudDuBloc`.
- Les réponses sont consommées dans l'ordre. Une page question sans réponse en file garde sa réponse
  courante (cas d'un deuxième passage dans une boucle : l'utilisateur valide sans changer).
- `path` : pages visitées (questions, informations, synthèses, fin), boucles comprises.
