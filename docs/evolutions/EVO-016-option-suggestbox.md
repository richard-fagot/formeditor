# EVO-016 — Option « suggestions » sur les champs texte

Statut : en cours
Dépend de : aucune (réutilise le moteur d'expressions existant)

## Besoin

Aujourd'hui, un champ texte est une saisie libre sans aucune aide : l'utilisateur du questionnaire
doit tout taper, même quand les valeurs probables sont déjà connues (réponses précédentes, données
du système). À l'inverse, une liste de choix impose des valeurs fermées. Je veux pouvoir
**proposer des suggestions sur un champ texte** (comportement « suggestbox » / autocomplétion),
calculées par une **expression qui renvoie une liste**, afin d'accélérer et de fiabiliser la
saisie **tout en laissant la saisie libre possible**.

L'expression s'écrit comme les autres expressions de l'outil : elle s'appuie sur les **réponses
aux questions précédentes** ou sur des **variables de l'état du système**.

Exemple de saisie / d'usage :

```
Q1 « Marques de véhicules possédées » — choix multiple : Peugeot, Renault, Toyota, Autre (préciser)
Q2 « Marque du véhicule principal »   — texte
     [x] Suggestions
     Expression des suggestions : réponse de Q1
```

Affichage attendu : en Q2, si l'utilisateur a coché Peugeot et Toyota en Q1, le champ affiche
« Peugeot » et « Toyota » en suggestions à la prise de focus ; la frappe filtre la liste ;
l'utilisateur peut en choisir une ou taper une autre valeur (ex. « Dacia »).

## Comportement attendu

- **Paramétrage** :
  - Nouvelle case à cocher « Suggestions » dans les propriétés d'un champ texte (décochée par défaut).
  - Cochée : un champ « Expression des suggestions » apparaît, avec la même aide à la saisie et la
    même validation que les autres expressions.
  - Décochée : l'expression est masquée et n'est ni utilisée ni exportée.
  - Option réservée aux champs texte (pas aux nombres, dates, listes de choix).
- **Modèle / règles métier** :
  - La valeur de la réponse reste **le texte saisi**, qu'il provienne d'une suggestion ou non ;
    aucune contrainte d'appartenance à la liste.
  - Les validations existantes du champ texte (obligatoire, longueur, format…) s'appliquent à
    l'identique.
- **Expressions** :
  - L'expression doit renvoyer une liste. Cas particuliers :
    - valeur unique → liste d'un élément ;
    - vide / non renseigné → aucune suggestion, le champ se comporte comme un texte simple ;
    - éléments non texte (nombres, dates) → convertis en texte selon les règles d'affichage existantes ;
    - doublons supprimés ; ordre de l'expression conservé.
  - Elle ne peut référencer que des questions situées **avant** le champ et des variables de
    l'état du système (même règle que les autres expressions) ; une référence invalide est
    signalée à l'édition comme ailleurs.
  - Les suggestions sont recalculées à l'affichage de l'étape, avec les réponses courantes.
  - Les autres expressions qui référencent ce champ renvoient le texte saisi, comme aujourd'hui.
  - Syntaxe visée : celle des expressions existantes, sans syntaxe spécifique à cette option.
- **Logigramme** : le nœud d'un champ texte avec suggestions porte un indicateur discret ; les
  dépendances introduites par l'expression sont prises en compte comme les autres.
- **Prévisualisation** : dans le wizard, liste déroulante de suggestions à la prise de focus,
  filtrée à la frappe (contient, insensible à la casse) ; sélection à la souris ou au clavier ;
  saisie libre toujours possible.
- **Panneau de propriétés** : la case et l'expression sont visibles uniquement pour les champs texte.

## Critères d'acceptation

- Quand je coche « Suggestions » sur un champ texte, alors le champ « Expression des suggestions » apparaît.
- Quand Q1 vaut {Peugeot, Toyota} et que je place le focus sur Q2 en prévisualisation, alors « Peugeot » et « Toyota » sont proposés.
- Quand je tape « toy » dans Q2, alors seule « Toyota » reste proposée.
- Quand je saisis « Dacia » (hors liste), alors la valeur est acceptée et enregistrée telle quelle.
- Quand l'expression renvoie une liste vide ou une valeur non renseignée, alors aucune suggestion n'est affichée et le champ reste saisissable.
- Quand l'expression renvoie une valeur unique, alors elle est proposée comme seule suggestion.
- Quand l'expression renvoie des doublons, alors chaque valeur n'est proposée qu'une fois.
- Quand l'expression référence une question située après le champ, alors l'éditeur signale l'erreur comme pour les autres expressions.
- Quand je modifie Q1 puis reviens sur l'étape de Q2, alors les suggestions reflètent la nouvelle réponse.
- Quand une expression référence Q2, alors elle renvoie le texte saisi.
- Quand je décoche « Suggestions », alors le champ se comporte comme un texte simple et l'expression n'est pas exportée.
- Quand je n'utilise pas l'option, alors le comportement est identique à aujourd'hui.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur et ses champs texte n'ont pas de suggestions.
- Quand j'exporte puis réimporte, alors l'option et l'expression des suggestions sont identiques.
- Le guide utilisateur décrit l'option « Suggestions », la forme attendue de l'expression et ses cas limites.

## Impacts attendus

- **Format JSON** : nouvelles propriétés sur le champ texte (activation + expression), nouvelle
  `formatVersion` et migration si nécessaire, JSON Schema, `docs/FORMAT.md` (champ texte),
  exemple mis à jour avec un champ texte à suggestions.
- **Spec** : § champ texte (nouvelle option), § expressions (expressions renvoyant une liste).
- **Guide** : sections champ texte et expressions.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Expressions renvoyant une liste : le moteur sait-il aujourd'hui produire et typer une liste
   (réponse d'un choix multiple, variable système de type liste, littéral de liste) ? Si non,
   proposer le périmètre minimal (ex. référence à une réponse multiple ou à une variable liste,
   sans fonctions de liste) et ce qui serait reporté à une évolution ultérieure.
3. Valeur renvoyée par un choix multiple contenant « Autre (préciser) » : libellé « Autre » ou
   texte précisé dans la liste de suggestions ? Aligner sur le comportement existant des
   expressions et le noter.
4. Format de stockage : propriété optionnelle sans incrément de `formatVersion`, ou incrément
   avec migration ? Justifier selon la politique de version du format.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.

## Analyse

Conclusion : **faisable sans ambiguïté bloquante**. Choix ci-dessous, reportés dans `docs/DECISIONS.md`.

1. **Faisabilité, modules** (matrice de `docs/MAP.md`) : `core/model` (propriété `suggestions?` de `TextQuestion`),
   `core/references` (`visit.ts` : l'expression est parcourue comme les autres, donc vérifications — syntaxe, référence
   inconnue, `notGuaranteed` pour une question située après —, renommage propagé, usages et dépendances du logigramme
   sans code supplémentaire), `core/runtime` (`suggestions.ts` : mise en liste, conversion en texte, doublons, filtrage ;
   fonctions pures testées), `format` (schéma `params_text`, migration 11 → 12, exemple, `docs/FORMAT.md`),
   `plugins/question-types/text` (case et `ExpressionInput` dans les propriétés, indicateur dans l'aperçu du nœud,
   liste déroulante dans la saisie, champs de structure compris), `docs/spec.md`, `docs/GUIDE.md`, tests.
   Aucune nouvelle commande : la case se règle dans le panneau de propriétés, comme les autres paramètres du type.
2. **Expressions renvoyant une liste** : le moteur (JSONata) produit déjà des listes — réponse d'un choix multiple
   (liste des valeurs), variable système de type liste, champ d'une liste d'objets (`sys.sinistres.date`), littéral
   (`["a", "b"]`), fonctions (`$append`, filtres) ; les entrées dynamiques des choix s'en servent depuis EVO-001.
   Le typage se limite à la syntaxe et aux références (`core/validation`) : rien à ajouter. Le résultat est normalisé
   à l'affichage : valeur unique → liste d'un élément, vide / erreur → aucune suggestion, nombres, booléens et dates
   → texte (`formatValue`, règle de l'interpolation ; une date est déjà une chaîne ISO), objets écartés (pas de
   texte lisible), chaînes vides écartées, doublons supprimés en gardant la première occurrence. Rien n'est reporté.
3. **« Autre (préciser) »** : dans les expressions, un choix multiple vaut la liste de ses **valeurs** (codes), où
   « Autre » est la valeur réservée `other` et la précision est rangée à part sous `<clé>_other`. On s'aligne sur
   les entrées dynamiques des choix (`choiceOptions`), qui écartent `other` : la valeur `other` n'est pas proposée,
   ni le libellé « Autre » ; la précision n'est pas ajoutée d'office, l'auteur l'inclut s'il le veut
   (`$append(marques, marques_other)`). Les valeurs restent des codes dans l'expression, mais à l'affichage une valeur
   égale à celle d'une option d'une question à choix référencée par l'expression est remplacée par le **libellé** de
   l'option dans la langue courante, et c'est ce libellé qui est inséré dans le champ (`peugeot` → « Peugeot ») ;
   les autres valeurs restent telles quelles.
4. **Stockage** : propriété facultative `suggestions` (expression) du champ texte ; présente = option activée
   (même chaîne vide), absente = désactivée ; décocher la retire, donc rien n'est exporté. Politique du format
   (`docs/FORMAT.md` §16, précédents EVO-005 à EVO-015) : schémas en `additionalProperties: false`, un fichier qui
   utilise l'option serait refusé par un outil antérieur → **version 12**, migration 11 → 12 sans transformation
   (propriété absente = pas de suggestions).
