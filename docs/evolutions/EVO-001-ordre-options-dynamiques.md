# EVO-001 — Options dynamiques placées librement parmi les options

Statut : fait 2026-10-10

## Besoin

L'ordre d'affichage des options d'une question a une importance métier et doit être garanti.

Aujourd'hui, les options statiques s'affichent dans l'ordre saisi, mais les options issues d'une
source dynamique (spec §3.4, « Source dynamique ») sont toujours ajoutées **en fin de liste**.
On ne peut donc pas, par exemple, proposer d'abord les personnes connues du système puis des
choix fixes.

Je veux supprimer la configuration séparée de la source dynamique et pouvoir placer une entrée
dynamique **directement dans la liste des options**, à la position voulue, en la traitant comme
une option ordinaire. Exemple de saisie (syntaxe à confirmer, voir Précisions) :

```
$sys.champ_dynamique
Une de ses amicales
Un tiers
```

Affichage attendu : les valeurs de `sys.champ_dynamique` d'abord, puis « Une de ses amicales »,
puis « Un tiers ».

## Comportement attendu

- La liste des options devient une suite ordonnée d'**entrées**. Chaque entrée est soit une option
  statique, soit une entrée dynamique (une référence : variable système, réponse précédente,
  sous-champ…).
- Dans la saisie rapide (une option par ligne), une ligne écrite avec la syntaxe de référence crée
  une entrée dynamique. Toute autre ligne crée une option statique.
- Une entrée dynamique se comporte comme les autres options :
  - elle peut être déplacée (glisser-déposer, raccourcis), supprimée, dupliquée ;
  - elle peut avoir une condition d'affichage (options conditionnées, spec §3.4) ;
  - ses réglages propres restent dans le panneau de propriétés : pour une liste d'objets,
    l'expression du libellé affiché et celle de la valeur retenue.
- Au rendu, une entrée dynamique se déploie **à sa position** en autant d'options que la référence
  fournit de valeurs (zéro, une ou plusieurs), dans l'ordre de la source.
- Plusieurs entrées dynamiques peuvent coexister dans une même liste, à n'importe quelle position.
- L'aperçu du logigramme (spec §4.2) affiche la référence à sa position, comme les autres options
  (troncature « … » inchangée).
- La prévisualisation (wizard, synthèse) respecte strictement l'ordre des entrées.

## Précisions (décisions métier)

- **Types concernés** : choix unique, choix multiple, booléen et tri-state — tous les types qui
  acceptent une source dynamique.
- **Option « Autre (préciser) »** : inchangée, toujours affichée en dernier. Elle ne devient pas
  une entrée positionnable.
- **Syntaxe de saisie** : une ligne qui commence par `<` doit pouvoir rester une option statique.
  Soit on adopte un autre marqueur (piste : `$sys.champ_dynamique`), soit on prévoit un
  échappement. Choisir la solution la plus simple et la documenter. Une référence inconnue ou mal
  écrite est signalée par les vérifications non bloquantes (§4.6).
- **Doublons** entre valeur dynamique et option statique : hors périmètre, aucun traitement.
- **Réponse devenue invalide** : si une réponse désigne une valeur dynamique qui n'existe plus
  (source modifiée après coup : retour depuis la synthèse, changement de scénario, etc.), elle
  n'est plus valide. L'utilisateur doit repasser par les questions concernées avant de terminer
  le parcours. Le mécanisme est à choisir, en cohérence avec la spec (§5 : les réponses hors
  chemin sont effacées).

## Critères d'acceptation

- Quand je saisis les trois lignes de l'exemple (avec la syntaxe retenue), alors la question
  contient une entrée dynamique suivie de deux options statiques, dans cet ordre.
- Quand `sys.champ_dynamique` vaut `["A", "B"]` dans le scénario de prévisualisation, alors le
  wizard affiche A, B, « Une de ses amicales », « Un tiers », dans cet ordre.
- Quand `sys.champ_dynamique` est vide ou absent, alors seules les deux options statiques
  s'affichent, sans ligne vide ni erreur.
- Quand je déplace l'entrée dynamique en dernière position, alors le logigramme et le wizard
  l'affichent en dernière position, mais toujours avant « Autre (préciser) » si elle est activée.
- Quand une entrée dynamique porte une condition fausse, alors aucune de ses valeurs n'est affichée.
- Quand la source est une liste d'objets (ex. sinistres avec date et nature), alors les expressions
  de libellé et de valeur s'appliquent à chaque objet, à la position de l'entrée.
- ~~Quand une question booléenne ou tri-state contient une entrée dynamique, alors l'ordre saisi
  est respecté de la même façon.~~ Abandonné (arbitrage A, voir Analyse).
- Quand je saisis une option statique dont le libellé commence par `<`, alors elle reste une option
  statique.
- Quand une réponse désigne une valeur dynamique qui a disparu, alors le parcours ne peut pas être
  terminé tant que la question concernée n'a pas été répondue à nouveau.
- Quand j'ouvre un projet enregistré avant cette évolution, alors il se charge sans erreur et ses
  options dynamiques restent affichées **en fin de liste**, comme avant.
- Quand j'exporte puis réimporte un questionnaire, alors l'ordre des entrées est identique.

## Impacts attendus

- **Format JSON** : changement structurel → nouvelle `formatVersion`, migration des anciens
  fichiers (source dynamique convertie en entrée placée après les options statiques), JSON Schema,
  `docs/FORMAT.md` et questionnaire d'exemple mis à jour (l'exemple doit contenir au moins une
  entrée dynamique placée en tête ou au milieu).
- **Spec** : §3.4 (options, source dynamique), §4.2 (aperçu), §5 (réponses invalidées), §6 si besoin.
- **Tests** : un test par critère d'acceptation, test de migration, tests de référence mis à jour.

## Analyse demandée avant de coder

Ajouter en bas de ce fichier une section « Analyse » qui donne :

1. La **faisabilité** dans l'architecture actuelle et les modules impactés (d'après `docs/MAP.md`).
2. La **syntaxe de saisie** retenue (marqueur ou échappement), et pourquoi.
3. Le **mécanisme** choisi pour obliger à repasser par une question dont la réponse est devenue
   invalide.

Décision :
- faisable sans ambiguïté bloquante → noter les choix dans l'analyse et dans `docs/DECISIONS.md`,
  puis réaliser l'évolution ;
- un point remet en cause la demande ou demande un arbitrage métier → statut « à arbitrer »,
  options listées avec leurs conséquences, **arrêt sans coder**.

## Analyse

### 1. Faisabilité et modules impactés

Faisable dans l'architecture actuelle pour le choix unique et le choix multiple. Modules (d'après `docs/MAP.md`) :

- `core/model` : `options` devient une suite d'entrées `ChoiceOption | DynamicEntry`
  (`{ "from", "label"?, "value"?, "when"? }`) ; `source` disparaît.
- `format` : `formatVersion` 2, migration 1 → 2 (`source` convertie en entrée placée après les options
  statiques), JSON Schema ; `docs/FORMAT.md` §7.3 / §7.5 ; exemple (entrée dynamique en tête ou au milieu)
  et chemins attendus.
- `core/runtime` (`choiceOptions`) : déploiement de chaque entrée à sa position.
- `core/references`, `core/validation` : parcours des expressions des entrées (renommage, références
  inconnues), syntaxe de saisie mal écrite signalée (§4.6), vérification de fin de parcours (point 3).
- `plugins/question-types/choice` : saisie rapide, détail par entrée, aperçu du logigramme ; suppression de
  `source-editor.tsx` (ses réglages passent dans le détail de l'entrée).
- `ui/preview` : blocage de la fin de parcours (point 3).

**Point qui demande un arbitrage — booléen et tri-state.** La demande suppose que ces types acceptent
déjà une source dynamique. Ce n'est pas le cas : la spec §3.4 le prévoyait, mais DECISIONS.md (phase 6)
l'a écarté (« une source dynamique n'a pas de sens pour un booléen »). Le format ne le prévoit pas
(FORMAT.md §7.2 / §7.5). Une réponse booléenne vaut `true` / `false` (tri-state : `"unknown"` en plus).
Une entrée dynamique y ajouterait des valeurs texte quelconques, ce qui change le type de la réponse et
le sens des expressions (`assurance_connue = true`). Options :

- **A — Limiter l'évolution au choix unique et au choix multiple.** Booléen et tri-state restent inchangés.
  Le critère « booléen ou tri-state » est abandonné. On aligne la spec §3.4 sur l'existant. Le besoin se
  couvre avec un choix unique dont les options statiques sont « Oui » / « Non ». Changement le plus simple.
- **B — Booléen et tri-state reçoivent des entrées.** Les libellés Oui / Non / Ne sait pas deviennent des
  entrées positionnables, et des entrées dynamiques s'ajoutent entre elles. La réponse devient
  `true` / `false` / `"unknown"` **ou** une chaîne issue de la source. Ce type mixte rend les expressions
  ambiguës, et ce n'est plus vraiment un booléen. Il faut aussi revoir le format, l'aperçu, la validation
  et l'éditeur de ces deux types. Coût élevé.
- **C — Dynamique seulement après les libellés fixes.** Booléen et tri-state reçoivent des entrées dynamiques
  placées après Oui / Non (/ Ne sait pas), avec le même type de réponse mixte que B, mais sans libellés
  déplaçables. Coût moyen, même ambiguïté de type que B.

Recommandation : **A**.

### 2. Syntaxe de saisie retenue

Une ligne qui commence par `$` crée une entrée dynamique. La suite de la ligne est l'expression source :
`$sys.champ_dynamique`, `$couleur_preferee`, `$sys.sinistres[nature = 'vol']`. Une ligne qui commence par `<`
reste toujours une option statique, sans échappement. Pour écrire une option statique qui commence par `$`
(rare : « $100 »), on l'écrit `\$100`. Ce choix est le plus simple : un seul marqueur, proche de la
demande, et `<` reste libre. Une expression invalide ou une référence inconnue est signalée par les
vérifications non bloquantes (§4.6), comme toute expression.

### 3. Réponse devenue invalide

Le contrôle existe déjà à la saisie : une valeur absente des options visibles est refusée (`validateAnswer`,
code `option`). « Revenir à la synthèse » revalide aussi déjà chaque page repassée. Mécanisme ajouté :
avant d'afficher une **fin**, le wizard revalide toutes les réponses du chemin effectif, dans le contexte
de leur page. À la première réponse invalide, il ramène sur cette question avec son message d'erreur.
Le parcours ne peut donc pas se terminer tant qu'elle n'a pas été corrigée. La réponse n'est pas effacée
automatiquement : §5 n'efface que les réponses **hors chemin**. Celle-ci est sur le chemin, l'utilisateur
la corrige. La vérification se trouve dans `ui/preview` (avec `validateAnswer`), et `core/runtime` ne
dépend toujours pas de `core/validation`.

Doublons : une valeur déjà proposée plus haut dans la liste n'est pas répétée. C'est le comportement
actuel, conservé sans autre traitement.

### Décision

Point 1 arbitré le 2026-10-10 : **option A** retenue. L'évolution porte sur le choix unique et le choix
multiple. Booléen et tri-state restent inchangés, et le critère « booléen ou tri-state » est abandonné.
Les choix des points 2 et 3 sont reportés dans `docs/DECISIONS.md`.

### Écart accepté à la réalisation

Déplacer, dupliquer et supprimer une entrée se font avec les boutons du panneau de propriétés, ou en
réordonnant les lignes de la saisie rapide. Il n'y a ni glisser-déposer ni raccourci dédié, comme pour
les options statiques existantes. Écart mineur, à rouvrir dans une évolution si le besoin se confirme.
