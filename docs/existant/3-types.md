# Existant — 3. Types de questions et de nœuds

Partie de l'inventaire : index, état au commit et conventions dans `docs/EXISTANT.md`.


### Socle commun

#### Contrat des plugins (`plugin-api`) et registre (`registry`)

**Comportement observable**
- Un plugin de type de question fournit : `type`, `name` ({fr,en}), `shortcut`, `create(base, previous?)`, `Preview` (aperçu
  dans le nœud du logigramme), `Properties` (paramètres propres au type), `Field` (saisie de prévisualisation), `formatAnswer`
  (texte de la synthèse) et `badges?` (contract.ts:81-98).
- Un plugin de type de nœud fournit : `kind`, `name`, `create?(id)`, `Shape`, `shapeClass`, `Properties?`, `Page?`. `ShapeProps.graphId`
  et `NodePropertiesProps.graphId` (EVO-024) transmettent l'id du graphe du nœud (contract.ts:100-139).
- `FieldProps` transmet au champ : `value`, `other` (précision « Autre »), `group` (`<clé>_group`), `country` (`<clé>_pays`),
  `dontKnow` (`<clé>_nsp`), `errors` (messages déjà résolus, par chemin), `env` (RenderEnv), `inputId`. Le champ répond par
  `onChange(value, other?, group?, country?)` et `onDontKnow(on)` (contract.ts:57-79).
- `RenderEnv` : `label()` (variante, langue, interpolation), `text()` (texte multilingue simple), `evaluate`, `condition`,
  `options(q)` (options visibles d'un choix), `scoped(extra)` (contexte d'une occurrence de structure), `checks` (EVO-014),
  `graph` (graphe de la page) (contract.ts:27-44).
- Registre : ordre d'affichage des types : texte, date, nombre, choix unique, choix multiple, booléen, structure, mail,
  téléphone, adresse, civilité (registry/index.ts:23-26). Nœuds : question, info, synthèse, fin, fragment, sortie, Renvoi (l.28).
  Type par défaut d'une nouvelle question : `text` (l.39).

**Règles de gestion**
- Propriétés communes conservées au changement de type (`QuestionBase`) : `id`, `key`, `label`, `description`, `help`,
  `placeholder`, `required`, `messages`, `constraints`, `dontKnow` (contract.ts:47 ; helpers.ts:10-15). `default` et
  `defaultExpr` ne font pas partie de cette liste.
- `tr(t, lang)` : texte de l'outil, repli sur `fr` puis sur la première langue (helpers.ts:5-7).
- `previewText` : texte brut d'un libellé pour l'éditeur (le texte « sinon » d'un libellé à variantes, langue du contenu, puis
  langue par défaut, puis première langue ; pas d'interpolation) (helpers.ts:18-22).
- `dontKnowLabel(q)` : libellé de « Ne sais pas », par défaut `{fr: 'Ne sais pas', en: 'Don’t know'}` (helpers.ts:25 ;
  core/model/question.ts:227).
- Erreurs « à la sortie du champ » (EVO-025, mail, téléphone, adresse) : `useBlurErrors(env, errors)` garde les messages
  calculés à la sortie (`onBlur(formatErrors(…))`, traduits par `env.label`), les efface à la saisie (`reset()`) et expose
  `shown`, vide si les contrôles sont désactivés (`env.checks === false`) ou si la question a déjà une erreur de validation
  (`errors['']`) (blur-errors.ts:11-34). `FieldErrors` (ui-kit) affiche un `<p class="text-sm text-rose-600" role="alert">`
  par message (FieldErrors.tsx:2-4).

**Références** : `src/plugin-api/contract.ts`, `src/plugin-api/helpers.ts`, `src/plugin-api/blur-errors.ts`,
`src/ui-kit/FieldErrors.tsx`, `src/registry/index.ts`.

#### Raccourcis (commandes `app/commands/graph-commands.ts`)

| Action | Raccourci par défaut | Condition |
| --- | --- | --- |
| Nouvelle question (type texte) | `n` | un logigramme est affiché (questionnaire ou fragment) |
| Nouvelle branche (question texte, arête conditionnelle à saisir) | `Shift+N` | un nœud sélectionné |
| Nouvelle page d'information | `Alt+I` | logigramme affiché |
| Nouvelle synthèse | `Alt+S` | logigramme affiché |
| Nouvelle fin | `Alt+F` | logigramme d'un **questionnaire** seulement |
| Nouveau nœud Renvoi (EVO-024) | `Alt+R` | logigramme d'un **questionnaire** seulement (graph-commands.ts:101) |
| Nouvelle sortie nommée | aucun (palette) | logigramme d'un **fragment** seulement (library-item-commands.ts:189-193) |
| « Type : X » (change le type de la question sélectionnée) | `t` texte, `d` date, `r` nombre, `u` choix unique, `m` choix multiple, `b` booléen, `s` structure, `Shift+E` mail, `Shift+T` téléphone, `Shift+A` adresse, `Shift+C` civilité | question **locale** sélectionnée (pas une référence de bibliothèque) |
| Obligatoire oui/non | `o` | question locale |
| « Autre (préciser) » oui/non | `a` | question locale de type choix unique, choix multiple ou booléen (`OTHER_TYPES`) |
| « Ne sais pas » oui/non | aucun (palette) | question locale, sauf structure |

Les raccourcis de type ne **créent** pas une question : ils changent le type de la question sélectionnée
(graph-commands.ts:82-89). Une question se crée toujours en type texte (`n`), puis on change son type.
Une création chaînée s'insère entre le nœud sélectionné et son successeur unique non conditionnel (graph-commands.ts:42-47).

#### Champs communs d'une question (panneau de propriétés)

Rendus par `ui/properties/QuestionProperties.tsx` (hors zone, mais c'est le cadre de chaque plugin) :
- Intitulé (`label`) : `LabelEditor` (multilingue, interpolable, variantes conditionnelles).
- Clé (`key`) : validée (snake_case, unique) ; renommage propagé aux expressions.
- Type : liste de tous les plugins du registre ; changement = `plugin.create(commonQuestionFields(q), q)`.
- Obligatoire (`required: true`) ; sinon « Obligatoire si » (`required` = expression), visible quand la case est décochée.
- Valeur par défaut (`default`) : chaîne brute pour texte, date, choix unique, mail, téléphone, adresse, civilité ; JSON pour
  les autres types (JSON invalide signalé, valeur non enregistrée) (DefaultValueInput.tsx:6-29).
- Valeur par défaut calculée (`defaultExpr`).
- Aide (`help`) : `LabelEditor`.
- Texte indicatif (`placeholder`) : **seulement pour texte et nombre** (QuestionProperties.tsx:85-89).
- Section « Contraintes » : `ConstraintsEditor` (règles libres + messages des contrôles intégrés `messageParams(q)`).
- Description (`description`) : texte interne, non affiché en prévisualisation.
- Puis la section propre au type (`plugin.Properties`).

Page de prévisualisation d'une question (Preview.tsx:165-177) : intitulé interpolé, astérisque rouge si obligatoire
(`requiredAt`), aide, champ du plugin, puis messages d'erreur de la page (affichés après une tentative de « Suivant », si les
contrôles sont actifs).

#### Validation commune (`core/validation/field.ts`)

- « Ne sais pas » cochée (et l'option activée sur la question) : aucune vérification, obligatoire compris (l.46).
- Réponse vide (`undefined`, `null`, `''`, `[]`) : seule l'obligation est vérifiée (`required`) ; exception : liste vide d'une
  structure répétable obligatoire avec `repeat.min` (l.53-57).
- Après les contrôles du type : précision « Autre » obligatoire (`otherDetail`) si `other.detailRequired` et « Autre » choisie,
  puis chaque contrainte libre (`constraints[i]`, message propre ou « Valeur invalide. ») (l.114-117).
- Message d'une erreur : `messages.<param>` de la question, sinon message par défaut (messages.ts:4-26), borne insérée à `{0}`.

#### Saisie d'expressions et de libellés (`ui/expression-editor`)

**Comportement observable**
- `ExpressionInput` : CodeMirror 6 **sur une ligne** (toute transaction qui créerait une 2e ligne est refusée,
  ExpressionInput.tsx:70). Coloration JSONata minimale (chaînes, nombres, mots-clés `and|or|in|true|false|null`, fonctions
  `$…`, chemins, opérateurs). Autocomplétion : clés de la portée par préfixe, puis clés dont le libellé contient le mot tapé
  (casse et accents ignorés, EVO-005) ; mot commençant par `$` : 12 fonctions (`$count`, `$exists`, `$not`, `$sum`,
  `$string`, `$number`, `$length`, `$contains`, `$today`, `$addDays`, `$daysBetween`, `$age`) insérées avec `()`.
  Diagnostics en direct (délai 250 ms) : erreur de syntaxe (position), avertissement « Référence inconnue : x » pour un chemin
  non résolu dans la portée. Survol d'une référence `sys.…` : clé, libellé, description (rien dans un littéral).
  Entrée → `onSubmit` ; Échap → quitte le champ. Lecture seule si `readOnly` (formulaire validé, EVO-015 ; lu au montage).
- `LabelEditor` : une saisie par langue du projet (langue affichée en premier, langue sans texte marquée en orange),
  bouton « Variante conditionnelle » qui transforme le libellé en `{variants: [{when, text}], otherwise}` ; chaque variante a
  sa condition (`ExpressionInput`) et ses textes ; retirer la dernière variante revient au texte « sinon » seul.
- `ConstraintsEditor` : liste de règles (`rule` : expression « vraie si valide », `message` multilingue facultatif), ajout /
  suppression ; puis un champ de message multilingue par contrôle intégré applicable (`messages.<param>`).
- `DontKnowEditor` : case « Option « Ne sais pas » » (`dontKnow: {}`), puis libellé (`LabelEditor`, texte indicatif = libellé
  par défaut dans la langue du contenu) ; libellé vidé → propriété `label` retirée.

**Références** : `src/ui/expression-editor/ExpressionInput.tsx`, `LabelEditor.tsx`, `ConstraintsEditor.tsx`,
`DontKnowEditor.tsx`, `completion.ts`, `hover.ts`, `language.ts`, `context.tsx`.

### Types de questions

#### Texte (`type: "text"`)

**Comportement observable**
- Paramètres : `multiline` (case « Texte long », défaut absent = court), `minLength`, `maxLength` (entiers ≥ 0, vide = absent),
  `pattern` (expression régulière, texte libre), `suggestions` (case « Suggestions » ; cochée = `suggestions: ''`, puis
  « Expression des suggestions » ; décochée = propriété retirée), « Ne sais pas ».
- Aperçu du logigramme : `<texte>` ou `<texte long>` en police mono, icône de filtre si `suggestions` est présente (même
  vide), « + Ne sais pas » en italique si l'option est activée.
- Prévisualisation : `<input>` (court, `autoComplete="off"`) ou `<textarea>` 5 lignes (long) ; texte indicatif interpolé ;
  attribut HTML `maxLength` posé (la frappe au-delà est bloquée par le navigateur). Avec suggestions non vides et sans
  « Ne sais pas » cochée : combobox (`SuggestBox`) : liste ouverte à la prise de focus, filtrée à la frappe (« contient », casse
  ignorée), flèches haut/bas, Entrée choisit, Échap ferme, clic choisit ; saisie libre conservée.
- Valeur : la chaîne saisie ; champ vidé → `null`. Synthèse : la chaîne.

**Règles de gestion et validations**
- `minLength` / `maxLength` : longueur en unités UTF-16 (`String.length`) ; messages « Au moins {0} caractères. » /
  « Au plus {0} caractères. ».
- `pattern` : `new RegExp(pattern).test(s)` : recherche non ancrée ; message « Format invalide. ».
- Suggestions (EVO-016) : expression évaluée à chaque rendu avec les réponses courantes ; résultat mis en liste (valeur
  unique → 1 élément ; `null`/`undefined` → aucun ; listes aplaties d'un niveau) ; nombres et booléens convertis en texte ;
  objets, chaînes vides et la valeur `other` écartés ; doublons supprimés, ordre conservé. Une valeur égale à celle d'une
  option d'une question à choix référencée par l'expression est remplacée par le libellé de l'option dans la langue courante
  (question cherchée dans le graphe de la page, puis questions et fragments de la bibliothèque).

**Cas limites gérés**
- Motif d'expression régulière invalide : le test passe (aucune erreur) (field.ts:142-148).
- Expression de suggestions vide ou sans résultat : champ texte simple.
- « Ne sais pas » cochée : champ désactivé, sans liste de suggestions.

**Références** : `src/plugins/question-types/text/index.tsx`, `suggest-box.tsx`, `src/core/runtime/suggestions.ts`,
`src/core/validation/field.ts:60-66`.

#### Nombre (`type: "number"`)

**Comportement observable**
- Paramètres : `numberKind` (`real` défaut, `natural`, `integer`), `decimals` (entier ≥ 0 ; champ désactivé pour entier naturel
  ou relatif, valeur existante conservée), `min` / `max` (`ExpressionInput` : un texte numérique `-?\d+(\.\d+)?` est
  enregistré comme nombre, sinon comme expression), `unit` (texte multilingue simple), « Ne sais pas ».
- Aperçu : `<réel>` / `<entier naturel>` / `<entier relatif>`, suivi de l'unité dans la langue du contenu, « + Ne sais pas ».
- Prévisualisation : champ texte `inputMode="decimal"` (largeur fixe), unité affichée à droite. La virgule est acceptée comme
  séparateur décimal ; une saisie partielle (« 12, ») n'est pas réécrite.
- Valeur : nombre (`Number(saisie avec , → .)`) ; saisie vide ou non convertible → `null`. Synthèse : `valeur unité`.

**Règles de gestion et validations**
- `natural` : entier ≥ 0, sinon « Nombre entier positif attendu. » ; `integer` : entier, sinon « Nombre entier attendu. ».
- `min` / `max` : nombre littéral ou expression évaluée ; borne ignorée si le résultat n'est pas un nombre ; messages
  « Valeur minimale : {0}. » / « Valeur maximale : {0}. ».
- `decimals` : nombre de chiffres après le point de `String(n)` ; message « Au plus {0} décimales. ».
- Pas d'attribut HTML `min` / `max` sur le champ.

**Cas limites gérés**
- Texte non numérique (« abc ») : la réponse devient `null` sans message de format ; seule l'obligation peut alors échouer
  (number/index.tsx:77-81). Toute chaîne acceptée par `Number()` est un nombre (ex. « 1e3 »).
- « Ne sais pas » cochée : texte local vidé, champ désactivé.

**Références** : `src/plugins/question-types/number/index.tsx`, `src/core/validation/field.ts:79-89`.

#### Date (`type: "date"`)

**Comportement observable**
- Paramètres : `min` (« Au plus tôt »), `max` (« Au plus tard ») : date ISO littérale ou expression (`$today()`, clé,
  `sys.…`), « Ne sais pas ». Pas de texte indicatif.
- Aperçu : `<date>`, « + Ne sais pas ».
- Prévisualisation : `<input type="date">` natif ; bornes évaluées et posées en attributs `min` / `max` si elles donnent une
  chaîne `AAAA-MM-JJ`.
- Valeur : chaîne `AAAA-MM-JJ` ; vide → `null`. Synthèse : la chaîne ISO telle quelle.

**Règles de gestion et validations**
- Format : `AAAA-MM-JJ` et date calendaire réelle, sinon « Date invalide (AAAA-MM-JJ). » (`format`).
- Bornes comparées comme chaînes ; borne ignorée si l'expression ne renvoie pas une chaîne ; messages min / max avec la date.

**Cas limites gérés** : date impossible (`2024-02-30`) refusée par le contrôle `format` (field.ts:29-33).

**Références** : `src/plugins/question-types/date/index.tsx`, `src/core/validation/field.ts:67-78`.

#### Booléen (`type: "boolean"`)

**Comportement observable**
- Paramètres : `labelSet` (jeu de libellés de la bibliothèque, liste limitée aux jeux `kind: 'boolean'` ; vide = « Oui / Non »),
  `other` (case « Autre (préciser) », libellé à variantes, « Précision obligatoire » `detailRequired`), « Ne sais pas »
  (après « Autre »).
- Aperçu : « Oui / Non » (ou libellés du jeu), puis libellé « Autre » s'il est activé, puis « / Ne sais pas » en italique.
- Prévisualisation : boutons radio en cartes, dans l'ordre Oui, Non, Autre, Ne sais pas ; « Autre » choisie → champ de
  précision (focus automatique).
- Valeur : `true`, `false` ou `"other"` (+ `<clé>_other`) ; « Ne sais pas » : `null` + `<clé>_nsp: true`. Synthèse : libellé
  oui/non dans la langue courante, ou « Autre (préciser) : précision ». Badge `other` si l'option est activée.

**Règles de gestion et validations**
- Aucun contrôle de valeur propre au type (pas de branche `boolean` dans `validateAnswer`) : seuls obligatoire,
  `otherDetail` (« Précisez votre réponse. ») et contraintes libres.
- Changement de type vers booléen : `other` repris de la question précédente si elle en avait un (boolean/index.tsx:31-35).

**Cas limites gérés** : `labelSet` introuvable dans la bibliothèque → Oui / Non par défaut (l.21-24).

**Références** : `src/plugins/question-types/boolean/index.tsx`.

#### Choix unique (`type: "single"`) et choix multiple (`type: "multiple"`)

**Comportement observable**
- Paramètres :
  - `options` : suite ordonnée d'entrées : option statique `{value, label, when?}`, entrée dynamique
    `{from, label?, value?, when?}` (EVO-001), groupe `{group, code?, when?, options[]}` (EVO-003, pas de groupe imbriqué).
  - Saisie rapide (zone multi-lignes) : une ligne = une option ; `# Libellé` ouvre un groupe ; `* ` ou `- ` en tête = puce
    retirée ; `$référence` = entrée dynamique ; `\$`, `\#`, `\*`, `\-` = option qui commence par ce caractère ; lignes vides
    ignorées ; options avant le premier `#` hors groupe ; une ligne commençant par `<` reste une option statique.
  - Réconciliation à chaque frappe : ligne identique (même genre, même texte) → entrée conservée même déplacée ; ligne modifiée
    → entrée de même rang conservée si même genre (valeur, condition, traductions gardées ; seul le texte de la langue affichée
    change) ; sinon entrée nouvelle. Valeur d'une nouvelle option = clé dérivée du libellé (`deriveKey`, défaut `option`),
    rendue unique dans son groupe (ou parmi les options hors groupe), `other` exclu.
  - Détail par entrée (repliable) : option statique : valeur (texte mono ; une saisie vide ou `other` est ignorée), libellé
    (`LabelEditor`), condition d'affichage ; entrée dynamique : liste source, libellé et valeur (expressions évaluées sur
    chaque élément, autocomplétion limitée aux sous-champs de la source ; vides = l'élément lui-même), condition. Boutons
    Monter / Descendre (seulement avec une voisine de même genre), Dupliquer (valeur rendue unique), Supprimer.
  - Détail par groupe (placé juste avant ses options) : libellé à variantes, code (texte libre, vide = absent), condition ;
    Monter / Descendre (avec ses options, seulement entre groupes), Supprimer (le groupe et ses options).
  - `other` (« Autre (préciser) », libellé à variantes, précision obligatoire), « Ne sais pas » (après « Autre »).
  - Choix multiple seulement : `minSelected`, `maxSelected` (entiers ≥ 0).
- Aperçu : ○ (unique) ou ☐ (multiple) par option ; groupe en gras avec ses options indentées dessous ; entrée dynamique
  `<from : label>` ; « ? » après un élément conditionné ; « Autre » puis « Ne sais pas » (italique) en dernier ; 4 lignes au
  plus puis « … ».
- Prévisualisation : radios (unique) ou cases (multiple) en cartes ; une section titrée (`role="group"`, `aria-label`) par
  groupe visible ; « Autre » après les options, séparée par un trait et hors section **si au moins un groupe est affiché**
  (EVO-017) ; champ de précision sous la liste quand « Autre » est cochée ; « Ne sais pas » en dernier.
- Valeur : unique : chaîne (`<clé>_group` = identifiant du groupe, absent hors groupe, `AUTRE` pour « Autre ») ; multiple :
  liste des valeurs dans l'ordre de la sélection, `<clé>_group` = liste parallèle (`""` hors groupe, `AUTRE`) ; rien de coché →
  `null`. « Ne sais pas » : `null` (unique) / `[]` (multiple), `<clé>_group: "NSP"`, `<clé>_nsp: true`. Synthèse :
  « Groupe — Option » pour une option groupée, « Autre (préciser) : précision », valeurs jointes par « , ».

**Règles de gestion et validations**
- Options proposées (`choiceOptions`) : entrée dont la condition est vraie ou absente, déployée à sa position ; entrée
  dynamique = un élément par valeur de la source, dans l'ordre (libellé vide → la valeur) ; groupe = ses entrées, chacune
  marquée du groupe ; identifiant de groupe = `code`, sinon libellé dans la langue par défaut, interpolé. Valeurs vides,
  `other` et doublons (même groupe, même valeur) écartés.
- `option` : chaque valeur doit être un couple (groupe, valeur) proposé (groupe non renseigné : la valeur suffit) ;
  message « Cette réponse n'est plus proposée. ».
- `minSelected` / `maxSelected` (multiple, réponse non vide) : « Choisissez au moins / au plus {0} réponses. » ; « Autre » compte
  comme une sélection.
- « Ne sais pas » exclusive : cochée → sélection vidée ; cocher une option → marqueur effacé (l'appelant range la réponse).
- Changement de type unique ↔ multiple : options et `other` conservés ; depuis booléen : `other` conservé, options vides.

**Cas limites gérés**
- Groupe dont aucune option n'est visible : pas de titre de section (les sections sont construites à partir des choix visibles).
- Même valeur dans deux groupes : distinguée par le groupe (sélection et validation par couple).
- Réponse sans groupe enregistré : associée à la première option de même valeur.
- Source dynamique vide ou absente : aucune option, ni ligne vide.

**Références** : `src/plugins/question-types/choice/index.tsx`, `choice-field.tsx`, `selection.ts`, `entries.ts`,
`quick-lines.ts`, `options-editor.tsx`, `entry-detail.tsx`, `group-detail.tsx`, `other-editor.tsx`,
`src/core/runtime/options.ts`, `src/core/validation/field.ts:90-103`.

#### Structure (`type: "structure"`)

**Comportement observable**
- Paramètres : `repeat` (case « Répétable » ; `min` ≥ 0, `max` ≥ 1, `addLabel` libellé du bouton « Ajouter ») ; `fields` :
  liste de champs, ajout (« Champ N », clé dérivée unique, type texte), monter / descendre / supprimer. Par champ : intitulé
  (`LabelEditor`), clé (validée snake_case et unique parmi les champs, appliquée à la sortie du champ ou sur Entrée, renommage
  propagé), type (tous sauf structure ; changement via `create`, `when` conservé), case Obligatoire (`required: true`),
  condition d'affichage `when` (clés sœurs sans préfixe), aide, paramètres propres au type du champ (plugin), contraintes et
  messages. Portée d'autocomplétion des expressions des champs : `structureScope`.
- Pas d'option « Ne sais pas » sur la structure (retirée par `create`), mais chaque champ peut l'avoir.
- Aperçu : « × n » si répétable ; `▸ libellé type` par champ, 4 au plus puis « … » ; `<aucun champ>` si vide.
- Prévisualisation : les champs visibles (condition évaluée avec les clés sœurs), chacun avec intitulé, « * » si
  `required === true`, aide, saisie du plugin du champ, messages d'erreur du champ ; répétable : un cadre « #i » par occurrence
  avec « Supprimer » (désactivé au minimum), bouton « Ajouter » (désactivé au maximum) ; occurrences vides ajoutées
  jusqu'au minimum.
- Valeur : objet `{clé: valeur, clé_other, clé_group, clé_nsp, clé_pays}` (non répétable) ou liste de tels objets
  (répétable). Synthèse : champs visibles « , », occurrences « ; » ; champ « Ne sais pas » → son libellé.

**Règles de gestion et validations**
- `minOccurrences` / `maxOccurrences` (« Au moins / Au plus {0} élément(s). ») ; s'ils échouent, les champs ne sont pas
  validés.
- Puis chaque champ visible de chaque occurrence est validé avec les règles de son type ; erreur rangée sous
  `cle[i].champ` (répétable) ou `cle.champ`.
- Liste vide d'une structure répétable obligatoire : `required` sans `repeat.min`, `minOccurrences` avec.

**Cas limites gérés** : valeur non-objet pour une structure non répétable → occurrence vide `{}` ; réponse non-liste pour
une répétable → liste vide.

**Références** : `src/plugins/question-types/structure/index.tsx`, `fields-editor.tsx`, `occurrences.tsx`,
`src/core/validation/field.ts:150-168`.

#### Mail (`type: "email"`, EVO-007)

**Comportement observable**
- Paramètres propres : aucun (texte d'aide sur le contrôle intégré), « Ne sais pas ».
- Aperçu : icône enveloppe + `<mail>`, « + Ne sais pas ».
- Prévisualisation : `<input type="text" inputMode="email" autoComplete="email">`. À chaque frappe la valeur enregistrée
  est la saisie normalisée ; à la sortie du champ, le texte est remplacé par la valeur enregistrée et le contrôle de format
  s'affiche (si les contrôles sont actifs et qu'aucune erreur de page n'est déjà affichée).
- Valeur : mail valide → espaces de bord retirés, domaine en minuscules (partie locale et littéral IP inchangés) ;
  invalide → saisie sans espaces de bord ; vide → `null`. Synthèse : la valeur.

**Règles de gestion et validations** (`email`, « Adresse mail invalide. »)
- Partie locale : `dot-atom` (atext RFC 5322) ou chaîne entre guillemets (qtextSMTP / paire `\`), 64 caractères max.
- Domaine : labels 1-63 caractères `[A-Za-z0-9-]` sans tiret en bord, ou littéral `[IPv4]` / `[IPv6:…]` (forme complète ou
  compressée, IPv4 finale acceptée).
- Longueur totale ≤ 254 ; dernier `@` séparateur ; ASCII seulement (RFC 6531/6532 non prises en charge).

**Cas limites gérés** : `"jean dupont"@exemple.fr`, `jean@[192.0.2.1]`, `jean@[IPv6:2001:db8::1]` acceptés ; point en
début/fin/doublé, `@@`, domaine accentué refusés.

**Références** : `src/plugins/question-types/email/index.tsx:23, 41` (`useBlurErrors`, `FieldErrors`), `src/core/contact/email.ts`.

#### Téléphone (`type: "phone"`, EVO-007)

**Comportement observable**
- Paramètres : `defaultCountry` (liste de tous les pays, drapeau, nom, indicatif ; `FR` = absent), `countries` (codes ISO
  séparés par virgules/espaces/points-virgules, appliqué à la sortie du champ ; majuscules, codes inconnus et doublons écartés ;
  vide = tous), `lineType` (indifférent, `mobile`, `fixed`), « Ne sais pas ».
- Aperçu : icône téléphone + `<téléphone>`, « · BE » si pays par défaut ≠ FR, « · mobile » / « · fixe », « + Ne sais pas ».
- Prévisualisation : sélecteur d'indicatif (pays autorisés, triés par nom dans la langue du contenu, `🇫🇷 France +33`) puis
  `<input type="tel">`. Pays initial : réponse existante, sinon pays par défaut s'il est autorisé, sinon le premier autorisé.
  À la frappe : valeur = E.164 si le numéro est valide, sinon la saisie ; pays = celui du numéro (`+` / `00`), sinon le
  sélecteur ; le sélecteur suit le pays du numéro s'il est autorisé. À la sortie : affichage au format national, contrôle.
- Valeur : E.164 (`+33612345678`) ; `<clé>_pays` = code ISO. Synthèse et interpolation : format international lisible.

**Règles de gestion et validations**
- Caractères admis : chiffres, espaces, `.`, `-`, `(`, `)`, `+` en tête ; `00` en tête remplacé par `+`.
- `phone` (« Numéro de téléphone invalide. ») : numéro invalide pour le pays (métadonnées `libphonenumber-js/max`), ou pays
  du numéro hors de `countries`.
- `lineType` (« Numéro mobile / fixe attendu. ») : type `MOBILE` ou `FIXED_LINE` exigé ; `FIXED_LINE_OR_MOBILE` accepté pour
  les deux.

**Cas limites gérés** : pays du numéro non autorisé → le sélecteur ne bouge pas, contrôle `phone` en échec ; numéro invalide →
pays du numéro s'il est reconnu, sinon le pays choisi.

**Références** : `src/plugins/question-types/phone/index.tsx`, `phone-field.tsx` (`:25, 63` : `useBlurErrors`, `FieldErrors`), `src/core/contact/phone.ts`,
`countries.ts`.

#### Adresse (`type: "address"`, EVO-007)

**Comportement observable**
- Paramètres : `defaultCountry`, `countries` (comme le téléphone), `minLength` (défaut affiché 5), `maxLength` (défaut
  affiché 200 ; 0 → absent), `verify` (« Adresse à vérifier par un service de normalisation », exporté, sans effet dans
  l'outil), « Ne sais pas ».
- Aperçu : icône repère + `<adresse>`, « · XX » si pays par défaut ≠ FR, « + Ne sais pas ».
- Prévisualisation : sélecteur de pays (drapeau, nom ; **masqué si un seul pays est autorisé**) puis une ligne de texte ;
  contrôle à la sortie du champ.
- Valeur : ligne sans espaces de bord, `<clé>_pays` = pays choisi (rangé seulement si la ligne est non vide). Synthèse : la ligne.

**Règles de gestion et validations**
- `address` (« Adresse invalide : une ligne de {min–max} caractères, avec au moins une lettre. ») : longueur en points de
  code hors bornes (défaut 5–200), aucune lettre Unicode `\p{L}`, ou caractère de contrôle (retour à la ligne compris).
- `postalCode` (« Code postal manquant. ») : pays `FR` (pays rangé, sinon pays par défaut, sinon FR) et aucune suite de
  exactement 5 chiffres.
- Les messages `minLength` / `maxLength` ne sont pas proposés pour ce type (seuls `address` et `postalCode`).

**Cas limites gérés** : alphabets non latins acceptés (`東京都千代田区1-1`) ; `12345` refusé (pas de lettre).

**Références** : `src/plugins/question-types/address/index.tsx:39, 69` (`useBlurErrors`, `FieldErrors`), `src/core/contact/address.ts`.

#### Civilité (`type: "civility"`, EVO-007)

**Comportement observable**
- Paramètres : `short` (libellés courts « Mme », « M. »), `undisclosed` (option « Ne se prononce pas », code `NP`, en
  dernier), `labels` (libellé multilingue modifié par code ; vide = libellé par défaut, affiché en texte indicatif),
  « Ne sais pas ». Codes fixes `MME`, `M`, `NP`.
- Libellés par défaut : long `Madame` / `Monsieur` / `Ne se prononce pas` (en : `Madam` / `Mister` / `Prefer not to say`),
  court `Mme` / `M.` (en : `Mrs` / `Mr`).
- Aperçu : icône personne + libellés séparés par « / », « + Ne sais pas ».
- Prévisualisation : boutons radio sur une ligne (retour à la ligne si la place manque), puis « Ne sais pas ».
- Valeur : code (`MME`, `M`, `NP`). Synthèse et interpolation : libellé dans la langue courante.

**Règles de gestion et validations** : `option` (« Cette réponse n'est plus proposée. ») si la valeur n'est pas un code
proposé (`NP` sans `undisclosed` compris). Pas d'« Autre », pas d'options ajoutées.

**Références** : `src/plugins/question-types/civility/index.tsx`, `src/core/model/question.ts:181-257`,
`src/core/contact/checks.ts`, `display.ts`.

#### Contrôles transverses de `core/contact`

- `contactErrors(q, valeur, pays?)` : point d'entrée des quatre contrôles ; valeur passée en chaîne sans espaces de bord.
- `formatErrors` (core/validation) : contrôles de format seuls, pour la sortie du champ ; réponse vide → aucune erreur.
  Affichage commun aux trois champs par `useBlurErrors` et `FieldErrors` (voir Socle commun).
- `displayFormatters(ws, graph)` : mise en forme de l'interpolation par clé (civilité → libellé, téléphone → international) ;
  clé cherchée dans le graphe courant puis la bibliothèque ; la première question trouvée l'emporte même sans mise en forme.
- Pays : liste de `libphonenumber-js` ; nom via `Intl.DisplayNames` (repli : le code) ; drapeau calculé.

### Types de nœuds

#### Question (`kind: "question"`)

- **Comportement observable** : rectangle blanc ; intitulé en gras (texte brut), clé en mono, aperçu du plugin du type,
  badges fournis par l'éditeur ; « ? » rouge si la question est introuvable. Pas de `create` (création par `n`), pas de
  `Properties` (panneau commun), pas de `Page` (page rendue par `ui/preview`).
- **Règles** : la question effective (locale ou bibliothèque) et le plugin de type sont fournis par l'éditeur.
- **Cas limites gérés** : question manquante → « ? ».
- **Références** : `src/plugins/node-kinds/question/index.tsx`.

#### Information (`kind: "info"`)

- **Comportement observable** : création avec `text` = « Texte d'information » (Alt+I) ; forme bleu ciel « INFORMATION »,
  titre en gras, texte sur 2 lignes. Propriétés : titre (`LabelEditor`, facultatif), texte (`LabelEditor` multi-lignes).
  Page : titre `h2` puis texte (sauts de ligne conservés), interpolés.
- **Règles** : texte vidé → `text: {}`.
- **Références** : `src/plugins/node-kinds/info/index.tsx`.

#### Synthèse (`kind: "summary"`)

- **Comportement observable** : création avec titre « Récapitulatif » (Alt+S) ; forme violette à double bordure.
  Propriétés : titre seul. Pas de `Page` dans le plugin : le récapitulatif est rendu par `ui/preview` (`Summary`).
- **Références** : `src/plugins/node-kinds/summary/index.tsx`.

#### Fin (`kind: "end"`)

- **Comportement observable** : création avec message « Merci, votre réponse est enregistrée. » (Alt+F, questionnaire
  seulement) ; pilule verte « FIN · issue », titre ou message sur 2 lignes. Propriétés : titre (facultatif), message
  (multi-lignes), issue `outcome` (code libre, vide = absent). Page : coche ✓, titre, message.
- **Références** : `src/plugins/node-kinds/end/index.tsx`.

#### Sortie nommée (`kind: "exit"`)

- **Comportement observable** : création par la commande « Nouvelle sortie nommée » (sans raccourci, fragment seulement),
  nom unique dérivé de `sortie`. Forme grise « SORTIE » + nom en mono. Propriétés : nom (snake_case validé ; espaces retirés à
  la frappe ; appliqué à la sortie du champ ou sur Entrée ; Échap annule ; cadre rouge si invalide), libellé multilingue
  facultatif (retiré si toutes les langues sont vides). Pas de `Page`.
- **Références** : `src/plugins/node-kinds/exit/index.tsx`, `src/app/commands/library-item-commands.ts:189-193`.

#### Appel de fragment (`kind: "fragment"`, EVO-008)

- **Comportement observable** : pas de `create` (créé par glisser-déposer / regroupement, hors zone). Forme ambre en
  pointillés : « FRAGMENT », titre du fragment (langue du contenu, langue par défaut, puis clé ; « Fragment introuvable »
  sinon), alias, « N question(s) » (fragments appelés compris), bouton Déplier/Replier : liste en lecture seule des nœuds
  (question : libellé + `alias.clé` ; sortie : « → sortie nom » ; fragment imbriqué : `▣ alias.alias` ; autres : nom du genre).
  Pas de `Properties` ni de `Page` dans le plugin.
- **Cas limites gérés** : cycle d'appels → arrêt du comptage (questionCount, l.23-28).
- **Références** : `src/plugins/node-kinds/fragment/index.tsx`.

#### Renvoi (`kind: "redirect"`, EVO-024)

- **Comportement observable** : création par `Alt+R` (questionnaire seulement) avec `text` = « Texte de renvoi », sans bouton.
  Forme rose, bordure gauche épaisse et coin gauche peu arrondi (distincte de l'information) : « RENVOI », titre en gras,
  texte sur 2 lignes, puis un élément par bouton dans l'ordre (`redirect-button`) : libellé (« … » si vide), « → nom de la
  cible » (`redirect-target` ; « — » sans cible, « ? » si introuvable), icône `ClipboardPaste` (`toggle-prefill`) et/ou
  `Replace` (`toggle-replace`) si le toggle est activé, icône entonnoir (`redirect-button-when`, infobulle = condition)
  si une condition d'affichage existe. Aucune arête n'est tracée vers les cibles (les boutons ne sont pas des arêtes).
- **Propriétés** : « Titre » (`LabelEditor`), « Texte » (`LabelEditor` multi-lignes, vidé → `{}`), « Boutons » : pour chaque
  bouton (`redirect-button-editor`) Monter / Descendre (désactivés aux extrémités), Supprimer (`redirect-remove-<i>`),
  « Libellé » (`LabelEditor`, vidé → `{}`), « Cible » (`<select>` `redirect-target-<i>` : « — choisir une cible — », groupes
  « Questionnaires (déclaration) » et « Nœuds en amont (corriger) »), puis pour une cible questionnaire les cases
  « Pré-remplissage de la cible » (`redirect-prefill-<i>`) et « Annule et remplace » (`redirect-replace-<i>`), et
  « Condition d'affichage » (`ExpressionInput`, vide → propriété retirée) ; bouton « Ajouter un bouton » (`redirect-add`,
  ajoute `{ label: {} }`) ; « Libellé du bouton Terminer » (`LabelEditor`, aide : vide = « Terminer »). Aucun choix de type
  de bouton.
- **Règles** :
  - Cibles proposées (`redirectTargets`) : les autres questionnaires du projet (titre, sinon clé), puis, dans l'ordre du
    graphe, les questions, informations et synthèses en amont (au moins un chemin d'arêtes mène au Renvoi ; le Renvoi
    lui-même exclu), puis les questions des fragments appelés en amont (chemin `appel/question`, récursif). Nom d'une cible
    nœud : clé (`alias.clé` dans un fragment), sinon titre de la page, sinon texte d'une information, sinon id.
  - Choisir une cible questionnaire crée `{ questionnaire, prefill: false, replace: false }` ; une cible nœud `{ node }`
    (sans toggle) ; « — choisir une cible — » retire `target`. Changer de cible recrée la cible (toggles remis à `false`).
  - Une cible courante absente de la liste proposée reste affichée comme option « nom (introuvable) » (ou id) si
    `targetMissing` (questionnaire absent ou égal au questionnaire en cours, nœud absent), sinon « nom (non autorisée) »
    (nœud existant mais hors amont, ou le Renvoi lui-même) (`properties.tsx:24-29`).
  - Les toggles sont documentaires : seule la prévisualisation les mentionne dans son message.
- **Cas limites gérés** : liste de cibles vide sans `graphId` (cible courante alors libellée « (introuvable) ») ; une cible
  questionnaire égale au questionnaire du nœud (possible après un collage) n'est pas proposée, reste conservée, et est
  signalée `buttonTargetMissing` (« introuvable »).
- **Références** : `src/plugins/node-kinds/redirect/index.tsx`, `properties.tsx`, `texts.ts` ; `src/core/model/redirect.ts`,
  `src/core/model/node.ts:64-87` (`RedirectTarget`, `RedirectButton`, `RedirectNode`).
