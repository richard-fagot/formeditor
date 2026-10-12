# EVO-005 — Libellé personnalisé des branches et des variables système

Statut : fait 2026-10-12
Dépend de : aucune

## Besoin

Sur le logigramme, une branche affiche aujourd'hui sa condition brute
(`relation.groupe = "AA" and sys.profil = "UD"`). Sur un graphe chargé, c'est illisible et ça ne
dit pas l'intention métier. Je veux pouvoir donner à une branche un **libellé personnalisé**
(« Ayant droit adhérent », « Sinon », « Sinistre ancien »).

De même, une variable de l'état du système n'est connue que par sa clé technique (`sys.profil`).
Je veux pouvoir lui donner un **libellé personnalisé** (« Profil de l'utilisateur connecté »),
pour savoir de quoi il s'agit sans revenir à la documentation du logiciel hôte.

Ces libellés servent à la **lecture de la spécification** (moi, l'équipe de dev). Ils ne sont jamais
affichés à l'utilisateur final du formulaire.

## Comportement attendu

### Branches (arêtes)

- Toute arête peut porter un libellé facultatif, qu'elle ait une condition ou non (utile pour
  « Sinon »). Cela vaut aussi pour les arêtes issues d'une sortie de bloc.
- Saisie dans le panneau de propriétés de l'arête, au-dessus de la condition. Texte libre sur une
  ligne, sans interpolation, en une seule langue (pas d'internationalisation : ce n'est pas un
  texte destiné à l'utilisateur final).
- **Affichage sur le logigramme** :
  - avec libellé → le libellé est affiché à la place de la condition ;
  - sans libellé → comportement inchangé ;
  - la condition reste consultable au survol de l'arête (infobulle), et le libellé au survol s'il
    est tronqué.
- Le libellé n'a aucun effet sur la navigation : seuls la condition et le rang comptent.

### Variables de l'état du système

- Toute variable du dictionnaire peut porter un libellé facultatif, en une seule langue.
  Pour une variable de type liste d'objets, chaque champ de l'objet peut aussi en porter un.
- Saisie dans l'écran du dictionnaire de l'état du système, à côté de la clé.
- Le libellé apparaît :
  - dans le dictionnaire ;
  - dans l'**autocomplétion** des expressions, à côté de la clé ; la recherche porte aussi sur le
    libellé (taper « profil » propose `sys.profil` même si la clé était `sys.prf`) ;
  - au survol d'une référence `sys.…` dans un éditeur d'expression ;
  - dans l'éditeur de scénarios, en face de chaque valeur à saisir.
- Le libellé ne s'utilise **pas** dans les expressions : on écrit toujours la clé.

## Critères d'acceptation

- Quand je saisis le libellé « Ayant droit » sur une arête conditionnée, alors le logigramme
  affiche « Ayant droit » sur l'arête, et la condition au survol.
- Quand j'efface ce libellé, alors l'arête affiche de nouveau sa condition.
- Quand je mets un libellé sur une arête sans condition, alors il s'affiche.
- Quand je mets un libellé sur une arête issue d'une sortie de bloc, alors il s'affiche.
- Quand le libellé est plus long que l'espace disponible, alors il est tronqué avec « … » et
  complet au survol.
- Quand je prévisualise un parcours, alors les libellés d'arêtes ne changent rien au chemin suivi
  et n'apparaissent pas dans le wizard.
- Quand je donne le libellé « Profil connecté » à `sys.profil`, alors il s'affiche dans le
  dictionnaire, dans l'autocomplétion, au survol de `sys.profil` dans une expression et dans
  l'éditeur de scénarios.
- Quand je tape « connecté » dans un éditeur d'expression, alors l'autocomplétion propose
  `sys.profil`.
- Quand je donne un libellé à un champ d'une variable liste d'objets, alors il apparaît dans
  l'autocomplétion de ce champ.
- Quand j'ouvre un projet antérieur, alors il se charge sans erreur (aucun libellé).
- Quand j'exporte puis réimporte, alors les libellés d'arêtes et de variables sont identiques.
- Toute action d'annulation (undo) annule bien une saisie ou un effacement de libellé.
- Le guide utilisateur décrit les deux actions.

## Impacts attendus

- **Format JSON** : propriété facultative de libellé sur l'arête, sur la variable système et sur
  les champs d'une liste d'objets ; selon la convention du projet, `formatVersion` et migration,
  JSON Schema, `docs/FORMAT.md`, exemple mis à jour (au moins une arête et une variable libellées).
  Le libellé est exporté pour que l'équipe de dev en profite à la lecture du JSON.
- **Spec** : §2 glossaire (arête, état du système), §3.1 (graphe), §3.5 ou §3.6 si l'état du
  système y est décrit, partie IHM du logigramme et de l'autocomplétion.
- **Guide** : sections Arêtes, État du système, Expressions.

## Analyse demandée avant de coder

Ajouter une section « Analyse » en bas de ce fichier :

1. Faisabilité et modules impactés (d'après `docs/MAP.md`).
2. Le nom de la propriété dans le JSON, cohérent avec les noms existants (un libellé non traduit
   ne doit pas être confondu avec un texte multilingue).
3. Le rendu d'un libellé d'arête avec la bibliothèque de graphe utilisée : placement, troncature,
   infobulle.

Faisable sans ambiguïté bloquante → choix notés dans l'analyse et `docs/DECISIONS.md`, puis
réalisation. Sinon → statut « à arbitrer », options et conséquences, arrêt sans coder.

## Analyse

### 1. Faisabilité et modules impactés

Faisable : changement additif (une propriété facultative, en texte simple), sans effet sur la navigation
ni sur les expressions. Aucune contradiction avec la spec : §3.9 n'exige le multilingue que pour les textes
destinés à l'utilisateur final, ce que ces libellés ne sont pas ; §6.2 (« aucune donnée de présentation »)
n'est pas touché, le libellé exprime une intention métier, pas une mise en forme.

Existant à connaître : l'arête (`Edge`) et la variable (`SystemVariable`, champs de liste compris, qui
réutilisent le même type et le même `$defs/variable` du schéma) portent déjà `description?: string`. Ce
texte libre reste distinct (explication longue pour le lecteur), le libellé est un nom court affiché à
la place de la clé ou de la condition. La description d'arête n'est pas éditée dans l'interface ; celle
d'une variable l'est (dictionnaire) et sert d'info-bulle dans l'autocomplétion.

Modules (d'après `docs/MAP.md`, matrices « Faire évoluer le format », « Logigramme », « Panneau de propriétés »,
« Dictionnaire de l'état du système », « Grammaire des expressions » pour l'éditeur, « Annuler / rétablir ») :

| Module | Changement |
| --- | --- |
| `core/model` | `caption?: string` sur `Edge` et `SystemVariable` ; `FORMAT_VERSION = 4`. |
| `format` | Schémas `common.schema.json#/$defs/edge` et `project.schema.json#/$defs/variable` (`additionalProperties: false` : la propriété doit y être déclarée) ; migration `3: (doc) => bump(doc, 4)` ; test de migration d'un document v3. |
| `core/references` | `RefInfo.caption` rempli par `addSystem` (variables et champs `sys.liste.champ`). Le libellé n'est ni une expression ni une clé : `collectExpressions` et `renameKey` ne le touchent pas. |
| `core/runtime` | Aucun changement de code ; un test Vitest prouve que le libellé ne change pas le chemin. |
| `core/validation` | Aucun (pas de `LocalizedText`, donc pas de traduction manquante). |
| `ui/diagram` | `EdgeView.tsx` : affichage du libellé, troncature, infobulle (voir 3). `autoLayout.ts`, `useImageExport.ts` inchangés. |
| `ui/properties` | `EdgeProperties.tsx` : champ « Libellé » au-dessus de « Condition » ; `useGraphEdit.patchEdge` accepte `caption`. |
| `ui/system-state` | `VariableCard.tsx` : champ libellé à côté du nom, et une saisie par champ de liste (`FieldsEditor`) ; `ValueInput.tsx` (`SystemValuesEditor`) : libellé en face de `sys.<nom>` (scénarios ; le même composant sert au panneau d'état du système de la prévisualisation, outil du concepteur et non wizard). |
| `ui/expression-editor` | `completion.ts` : libellé affiché à côté de la clé, recherche sur la clé **ou** le libellé ; `ExpressionInput.tsx` : nouvelle infobulle de survol (`hoverTooltip` de `@codemirror/view`, rien de tel n'existe aujourd'hui). |
| `app/i18n` | Textes de l'interface (« Libellé », indications). |
| `app/store` | Rien de structurel : saisies par `store.edit(…, clé)` (historique du projet pour les variables, du graphe pour les arêtes), donc annulables. Clés de regroupement distinctes : `<edgeId>:caption`, `sys:<nom>:caption`, `sys:<nom>:field<i>:caption`. |
| `app/commands` | Aucune commande nouvelle : saisie dans un champ du panneau, comme la description et la condition (la condition a `C` pour le focus, le libellé n'a pas de raccourci). Donc pas de nouvelle balise `[cmd: …]`, ni de `npm run guide`. |
| Docs, exemple | `docs/FORMAT.md` (§1, §3.1, §11.1, §16, version 4), `examples/declaration-sinistre` (`formatVersion: 4`, au moins une arête et une variable libellées, un champ de liste libellé), `docs/GUIDE.md` §4, §8, §11 (date « jusqu'à EVO-005 »). |

Duplication, copier-coller et regroupement en bloc recopient les arêtes par décomposition (`{ ...e }`) : le
libellé suit sans changement de code. Les arêtes de sortie recréées par le regroupement en bloc naissent
sans libellé ni condition (comportement existant).

### 2. Nom de la propriété JSON

Noms existants : `label` est un `Label` (multilingue, interpolable, à variantes : question, option, groupe,
surcharge de bibliothèque) ou un `LocalizedText` (`label` d'une sortie de bloc) ; `title`, `text`, `message`,
`yes`/`no`/`unknown` sont multilingues ; `name` est la **clé technique** d'une variable et d'une sortie ;
`description` est le texte libre déjà présent partout. Aucun de ces noms ne convient.

Retenu : **`caption`** (chaîne simple), identique sur l'arête, la variable et le champ de liste.
Court, parlant (« légende » : ce qu'on lit sur l'arête, à côté de la clé), sans homonyme dans le format,
donc pas de confusion avec un texte multilingue (`label`, `title`) ni avec la documentation longue
(`description`). Écarté : `devLabel` (contient `label`, laisse penser à une variante d'un `Label`),
`note` (évoque un commentaire long, doublon de `description`), `name` (déjà la clé).

Schéma : `"caption": { "type": "string", "minLength": 1, "pattern": "^[^\\r\\n]*$", "description": "Libellé de lecture, une ligne, une seule langue ; jamais affiché à l'utilisateur final, sans effet sur le comportement." }`.
Absent = pas de libellé ; une saisie vide retire la propriété (comme `description`). Texte enregistré tel
que saisi (pas d'interpolation, pas de rognage imposé).

`formatVersion` : **3 → 4**. La propriété étant inconnue des schémas v3 (`additionalProperties: false`), un
fichier v4 libellé serait refusé par un outil v3 : la montée de version est donc nécessaire. Migration
triviale : `3: (doc) => bump(doc, 4)` (un document antérieur n'a pas de libellé ; seul `formatVersion`
change, bundle compris). Ligne « 4 » ajoutée au tableau de `docs/FORMAT.md` §16.

### 3. Rendu d'un libellé d'arête (React Flow)

État actuel (`EdgeView.tsx`) : pastille HTML dans `EdgeLabelRenderer`, centrée au milieu de la courbe de
Bézier (`getBezierPath` → `x, y`, `translate(-50%, -50%)`), classes `truncate max-w-56` (troncature CSS à
224 px) **et** coupure JavaScript de la condition à 32 caractères ; `title={edge.when}` ; pastille rendue
seulement si l'arête est conditionnée (ou a des sœurs) ou porte une sortie de bloc.

Rendu retenu :

- **Condition d'affichage** : pastille rendue si `caption` **ou** conditionnée **ou** `exit` (une arête seule
  sans condition, aujourd'hui sans pastille, affiche donc son libellé).
- **Placement** : inchangé (milieu de la courbe). Contenu : nom de sortie (ambre) et rang comme aujourd'hui,
  puis le libellé **à la place** du texte de la condition (ou de « sinon » / « ? »). Libellé en police normale
  (non monospace, non italique) pour le distinguer d'une condition brute.
- **Troncature** : CSS seule pour le libellé (`max-w-56` + `truncate` = `overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap`), qui affiche « … » ; pas de coupure à 32 caractères pour le
  libellé (la condition sans libellé garde son comportement actuel). Le libellé est dans un `span` dédié
  (`data-edge-caption`) pour les tests.
- **Infobulle** : attribut `title` natif de la pastille. Avec libellé : `title` = libellé complet, saut de
  ligne, puis la condition (ou « sinon » si l'arête n'en a pas). *Précisé par le correctif de relecture : « ? » si
  la condition est vide, « sinon » parmi plusieurs sorties, rien pour une arête seule sans condition (spec §4.2).* Le libellé figure toujours dans l'infobulle,
  tronqué ou non : plus simple qu'une détection de débordement, et le critère « complet au survol s'il est
  tronqué » est satisfait. Sans libellé : `title={edge.when}` inchangé. L'infobulle est sur la pastille, pas
  sur le tracé (comme aujourd'hui).
- **Export PNG (EVO-004)** : la pastille garde `data-edge-label={edge.id}` (y compris la nouvelle pastille
  d'une arête seule libellée) : le filtre « sélection seule » la traite comme les autres ; `html-to-image`
  reproduit la troncature CSS (déjà le cas avec `truncate`) ; l'image montre le libellé, pas la condition,
  « tel qu'affiché » (§6.4). L'attribut `title` n'a pas d'effet sur l'image. Le test `evo-004.spec.ts` ne
  sonde que le premier `[data-edge-label]` : à revérifier si l'exemple ajoute une pastille.
- **ELK** : les libellés d'arêtes ne sont pas transmis à ELK aujourd'hui (pastilles superposées) ; largeur
  maximale inchangée (224 px), donc aucun changement de `autoLayout.ts`.

### Points d'attention pour la réalisation

- **Autocomplétion** : CodeMirror filtre et classe les options sur leur `label` (la clé) ; une recherche sur le
  libellé impose `filter: false` dans le `CompletionResult` et un filtrage maison (clé par préfixe comme
  aujourd'hui, **ou** libellé contenant le mot tapé, sans tenir compte de la casse ni des accents ; options
  dont la clé correspond d'abord). Le motif du mot (`/[$\w][\w.]*/`) et `validFor` sont en ASCII : « connecté »
  ne serait pas reconnu ; passer à `\p{L}` avec le drapeau `u`. Choisir l'option remplace le mot tapé par la clé.
- Le libellé s'affiche dans `detail` à côté de la clé (le type et les valeurs d'énumération restent visibles) ;
  la description reste en `info`.
- **Survol** : `hoverTooltip` sur une référence `sys.…` résolue dans la portée (chemin complet, `sys.liste.champ`
  compris) : libellé, et description si elle existe ; rien pour une référence sans libellé ni description.
- Le panneau de débogage de la prévisualisation reste inchangé (conditions brutes).

### Où chaque critère est testé

| Critère | Test |
| --- | --- |
| Libellé « Ayant droit » affiché, condition au survol | Playwright (`tests/smoke/evo-005.spec.ts`) : texte de `[data-edge-caption]`, attribut `title` contenant la condition. |
| Effacement → condition de nouveau | Playwright (même fichier). |
| Arête sans condition libellée affichée | Playwright. |
| Arête de sortie de bloc libellée affichée | Playwright (instance de bloc de l'exemple). |
| Troncature « … » et libellé complet au survol | Playwright : `scrollWidth > clientWidth`, `text-overflow: ellipsis` calculé, `title` contenant le libellé complet. |
| Chemin inchangé, absent du wizard | Vitest `core/runtime` (même graphe avec et sans `caption` → même chemin) ; référence : chemins attendus de l'exemple libellé inchangés ; Playwright : le texte du libellé absent de la prévisualisation. |
| Libellé de `sys.profil` : dictionnaire, autocomplétion, survol, scénarios | Vitest `core/references` (`RefInfo.caption`) ; Vitest `ui/expression-editor` (`completeReferences` : `detail`) ; Playwright pour le dictionnaire, la liste d'autocomplétion, l'infobulle de survol et l'éditeur de scénarios. |
| « connecté » propose `sys.profil` | Vitest `completeReferences` (accents, casse) ; Playwright (saisie réelle dans CodeMirror). |
| Libellé d'un champ de liste dans l'autocomplétion | Vitest `core/references` + `completeReferences` (`sys.liste.champ`) ; Playwright. |
| Projet antérieur chargé sans erreur | Vitest `format` (migration 3 → 4 d'un document et d'un bundle, validation par le schéma) ; référence (exemple validé en v4). |
| Export / réimport identiques | Référence (aller-retour de l'exemple, qui contient arête, variable et champ libellés) ; Vitest `format` (validation d'un `caption` ; refus d'un saut de ligne). |
| Undo d'une saisie ou d'un effacement | Playwright (`Ctrl+Z` après saisie puis après effacement, arête et variable). |
| Guide décrit les deux actions | Relecture ; `npm run guide:check` reste vert (pas de nouvelle commande). |

### Conclusion

**Faisable sans ambiguïté bloquante.** Choix notés dans `docs/DECISIONS.md` ; spec mise à jour (§2, §3.1,
§3.6, §4.2, §4.5, §6.2).
