# Existant — 4. Parcours : prévisualisation, moteur, validation, état du système, expressions

Partie de l'inventaire : index, état au commit et conventions dans `docs/EXISTANT.md`.


### Prévisualisation : barre et panneaux (`Preview`)

**Comportement observable**
- Barre : sélecteur de langue du contenu (commande `preview.lang`), compteur de textes non traduits dans la langue affichée (`preview-missing-translations`, masqué à 0), bouton « Recommencer », puis quatre bascules (`aria-pressed`) : Outline (`preview.toggleOutline`), Contrôles de saisie (`preview.toggleChecks`), État du système (`preview.toggleSystem`), Débogage (`preview.toggleDebug`).
- Contrôles désactivés : bandeau ambre `preview-checks-off` (« Contrôles de saisie désactivés »).
- Mise en page : le wizard au centre, l'outline à droite (`w-[28rem]`, au plus 45 % de la largeur), puis une colonne latérale (`w-80`) qui contient l'état du système et/ou le débogage. Le panneau de débogage ne s'affiche que si l'historique n'est pas vide.

**Règles de gestion et validations**
- Valeurs par défaut des panneaux : système affiché, débogage et outline masqués ; contrôles activés (`store.ts:172-173`). Ces réglages sont dans l'état de l'application (hors `initialState(ws)`) : ils survivent au chargement d'un autre projet et ne sont pas enregistrés dans le projet.
- `preview.toggleChecks` inverse `previewChecks` et remet `attempted = false` dans toutes les prévisualisations, donc efface les erreurs affichées (`system-commands.ts:103-107`).
- `preview.lang` : sans argument, passe à la langue suivante ; avec un argument, l'applique seulement s'il fait partie des langues du projet. La commande n'est active qu'avec plus d'une langue (`settings-commands.ts:43-51`).
- « Recommencer » : nouvelle session `start(input)` ; `attempted`, `returnTo` et `unchecked` sont remis à zéro et `visited` vidé (`Preview.tsx:43`). Ce bouton n'est pas une commande du catalogue.
- Compteur de traductions manquantes : problèmes `missingTranslation` dont le propriétaire est le questionnaire ou un élément de bibliothèque qu'il référence directement (nœuds `ref`), pour la langue affichée (`Preview.tsx:85-97`).

**Cas limites gérés**
- Session enregistrée dont une page n'existe plus (graphe modifié) : le parcours recommence automatiquement (`usePreview.ts:26-30`).
- Questionnaire sans départ atteignable : message `preview.empty` (`Preview.tsx:115`).

**Références** : `src/ui/preview/Preview.tsx:20-97`, `src/ui/preview/usePreview.ts`, `src/app/commands/system-commands.ts:77-108`, `src/app/commands/settings-commands.ts:43-51`, `src/app/store/store.ts:29-43`.

---

### Wizard : page, Suivant / Précédent, progression

**Comportement observable**
- Une page par étape : question (intitulé interpolé, astérisque si obligatoire effective, aide, champ du plugin), information ou fin (`Page` du plugin de nœud), synthèse (`Summary`), nœud Renvoi (`Redirect`, EVO-024, voir plus bas).
- Barre de progression en haut de la page.
- Boutons « Précédent » (désactivé quand l'historique compte moins de 2 pages), « Suivant » (absent sur une fin ; remplacé par « Terminer » sur un nœud Renvoi juste avant une fin) et « Revenir à la synthèse » / « Revenir au renvoi » (voir plus bas).
- Message « Aucune arête ne s'applique : parcours bloqué. » quand `session.blocked`.
- Un clic dans la page sélectionne le nœud dans le logigramme. Sur une page de fragment, c'est le nœud fragment le plus externe du questionnaire qui est sélectionné (`Preview.tsx:137, 157`).
- Erreurs : celles d'un champ sont passées au plugin (`errors` indexé par chemin) ; celles de la question (chemin `''`) s'affichent sous le champ (`role="alert"`).

**Règles de gestion et validations**
- « Suivant » (`advance`) : avec les contrôles activés, la réponse de la page courante est validée d'abord (`answerErrors`). S'il y a des erreurs, la page ne change pas et `attempted = true` les fait afficher (`Preview.tsx:146`). Le moteur exécute ensuite `next`, puis la garde de fin `guardEnd`.
- Les erreurs ne s'affichent qu'après une tentative (`attempted`) et seulement si les contrôles sont activés (`Preview.tsx:132`).
- « Précédent » (`back`) ne valide rien et remet `attempted = false`.
- Saisie : `setAnswer(input, session, v, other, group, undefined, country)`. La précision « Autre » n'est conservée que si la valeur est ou contient `other` (`Preview.tsx:174`). Toute saisie efface le marqueur « Ne sais pas ».
- Case « Ne sais pas » : cochée, elle enregistre `dontKnowAnswer(q)` (`null`, ou `[]` pour un choix multiple, avec le groupe `NSP` pour un choix) et le marqueur `_nsp: true` ; décochée, la réponse est effacée (`undefined`) (`Preview.tsx:126-130`).
- Progression : pages vues divisées par (pages vues + pages restantes en suivant `successor` avec les réponses actuelles). Elle vaut 1 sur une fin (`session.ts:170-182`).

**Cas limites gérés**
- Type de question sans plugin : l'intitulé s'affiche avec le nom du type (`Preview.tsx:178`).
- Boucle dans le calcul de progression : arrêt au premier nœud déjà vu.
- L'historique contient des doublons après un `goTo` (retour depuis la synthèse) ; la progression les compte.

**Références** : `src/ui/preview/Preview.tsx:98-203`, `src/core/runtime/session.ts`.

---

### Contrôles de saisie activables (EVO-014)

**Comportement observable**
- Contrôles désactivés : « Suivant », « Revenir à la synthèse » et la fin ne sont jamais bloqués, aucune erreur n'est affichée, les valeurs saisies sont conservées. Les plugins reçoivent `env.checks = false` pour taire leurs messages à la sortie du champ (mail, téléphone, adresse).

**Règles de gestion et validations**
- Un seul point de bascule, `checks` dans `Wizard`. Désactivés, il n'y a ni `check()` avant d'avancer, ni prédicat de `resume`, ni `guardEnd`, ni affichage d'erreurs (`Preview.tsx:110, 132, 146, 149, 192`).
- Pages quittées contrôles désactivés : elles sont ajoutées à `PreviewState.unchecked` (y compris les pages traversées par `resume`) puis ignorées par `firstInvalidStep` / `guardEnd` (`Preview.tsx:153`, `path-check.ts:35`).
- Les conditions (arêtes, `when`, options) sont évaluées normalement. Une erreur d'évaluation donne « faux » (`evaluateCondition`).

**Cas limites gérés**
- Réactivation : la page courante est contrôlée à la tentative suivante, sans contrôle rétroactif.
- Une page de `unchecked` reste exclue de la garde de fin jusqu'à « Recommencer », même si on la revisite contrôles activés (seul « Recommencer » vide `unchecked`).

**Références** : `src/ui/preview/Preview.tsx:106-156`, `src/ui/preview/path-check.ts:32-50`, `src/ui/preview/usePreview.ts:43-71`, `src/app/commands/system-commands.ts:101-108`.

---

### Garde de fin et réponses devenues invalides (EVO-001)

**Comportement observable**
- Avant d'afficher une fin, que ce soit après « Suivant », après « Revenir à la synthèse » ou au rendu (par exemple après un changement de l'état du système alors qu'une fin est affichée), le wizard revient à la première question du chemin dont la réponse est devenue invalide. Il y empile la page (`goTo`), affiche les erreurs et conserve la réponse.

**Règles de gestion et validations**
- `firstInvalidStep` parcourt `projectedSteps(input, answers)` dans l'ordre, ignore les pages `skip`, et retient la première étape qui a une réponse définie (y compris `null`) et des erreurs `answerErrors` (`path-check.ts:33-40`).
- `guardEnd` n'agit que si la page courante est un nœud `end` (`path-check.ts:46-50`).
- Au rendu, la garde est relancée par un `useEffect` qui dépend de l'étape cible ; elle n'agit qu'avec les contrôles activés (`Preview.tsx:110-114`).
- La réponse invalide n'est jamais effacée automatiquement.

**Cas limites gérés**
- Option dynamique disparue, réponse hors bornes après un changement de `sys`, « obligatoire si » devenu vrai sur une réponse `null` : tous ces cas donnent des erreurs `answerErrors` et ramènent à la question.
- Sur une page de synthèse (qui n'est pas une fin), aucune garde ne s'applique.

**Références** : `src/ui/preview/path-check.ts`, `src/ui/preview/Preview.tsx:109-114, 148-150`.

---

### Synthèse et retour à la synthèse

**Comportement observable**
- La page de synthèse affiche son titre (interpolé) et la liste des réponses du parcours avant la page courante : intitulé de la question et réponse mise en forme par `formatAnswer` du plugin (option d'un groupe « Groupe — Option »), ou le libellé « Ne sais pas ». Un crayon s'affiche au survol. Sans réponse, le message `preview.summaryEmpty` s'affiche.
- Un clic sur une réponse ramène à la question (`goTo`, page empilée), mémorise la synthèse (`returnTo`) et remet `attempted = false`.
- Sur cette question, le bouton « Revenir à la synthèse » apparaît si `returnTo` est dans l'historique et n'est pas la page courante, et si la page n'est pas une fin.

**Règles de gestion et validations**
- `summaryEntries` : on parcourt l'historique sans la page courante ; chaque étape n'apparaît qu'une fois (ordre de première visite) ; les étapes dont la réponse est `undefined` sont ignorées (une réponse `null` est listée) (`session.ts:150-167`).
- « Revenir à la synthèse » = `advance(resume(…), revalidate = true)`. La page courante est d'abord validée, puis `resume` avance sur les pages déjà vues et répondues. Il s'arrête sur la synthèse cible, une fin, une page nouvelle, une question sans réponse, un blocage ou une page refusée par `accept` (revalidation par `answerErrors` si les contrôles sont activés). Il y a au plus 500 pas (`session.ts:72-85`).
- Arrêt sur une page devenue invalide : `attempted = true`, donc les erreurs s'affichent (`Preview.tsx:155`). Quand on arrive sur la cible, `returnTo` est effacé.

**Cas limites gérés**
- Une page déjà vue avant la modification mais plus sur le chemin arrête le retour (« page nouvelle »).
- Le libellé de la question d'une étape de fragment est résolu dans le contexte de cette étape (`makeRenderEnv` par entrée).

- Le bouton s'intitule « Revenir au renvoi » quand `returnTo` désigne un nœud Renvoi du questionnaire (EVO-024), « Revenir à la synthèse » sinon ; même action (`Preview.tsx:140, 193`).

**Références** : `src/ui/preview/Summary.tsx`, `src/core/runtime/session.ts:62-85, 138-167`, `src/ui/preview/Preview.tsx:138, 191-195`.

---

### Nœud Renvoi en prévisualisation (EVO-024)

**Comportement observable**
- Page (`redirect-page`) : titre `h2` s'il existe, texte (sauts de ligne conservés), tous deux interpolés, puis les boutons visibles dans l'ordre (`redirect-page-button`), avec à droite les icônes `toggle-prefill` / `toggle-replace` des toggles activés (mêmes icônes que le logigramme).
- Bouton visible : sans `when`, ou `when` vraie (`env.condition`, erreur d'évaluation = faux). Un bouton en erreur (libellé vide, cible vide ou introuvable) reste affiché.
- Clic sur un bouton (sans sélectionner le nœud dans le logigramme, `stopPropagation`) :
  - bouton en erreur (`redirectButtonError`) : rien ;
  - cible questionnaire : boîte de message (`inform`) « Prévisualisation : renvoi » : « Renvoi vers le questionnaire « nom ». », « Options activées : pré-remplissage de la cible, annule et remplace. » ou « Aucune option activée. », puis « La prévisualisation reste sur cette page : ni sauvegarde, ni suppression, ni pré-remplissage ne sont simulés. » ; la page et les réponses restent ;
  - cible nœud présente dans l'historique de la session (page courante exclue) : `goTo` vers cette étape, `returnTo` = étape du Renvoi, `attempted = false` (comme un clic sur une réponse de la synthèse ; bouton « Revenir au renvoi ») ;
  - cible nœud non parcourue : message « La cible « nom » n'a pas été parcourue dans cette session : retour impossible. », la page reste.
- Renvoi juste avant une fin (`isJustBeforeEnd(step.graph, …)` : au moins une arête sortante, toutes vers un nœud `end`) : bouton principal `preview-finish` libellé par `finishLabel` (défaut « Terminer » / « Finish ») à la place de « Suivant » ; sinon « Suivant ». « Terminer » a la même action que « Suivant » (validation, `next`, garde de fin). « Précédent » est inchangé.

**Règles de gestion et validations**
- La navigation du moteur depuis un Renvoi suit ses arêtes sortantes comme pour une information ; les boutons de renvoi ne sont pas des arêtes et n'interviennent pas dans `next`.
- Les messages passent par la boîte « notice » (lignes en rouge monospace, voir limites de la coque).

**Références** : `src/ui/preview/Redirect.tsx:17-64`, `src/ui/preview/Preview.tsx:139-142, 182-183, 196-197`, `src/core/model/redirect.ts:41-45` (`isJustBeforeEnd`), `src/app/i18n/messages.ts` (`redirect.*`, `preview.backToRedirect`).

---

### Outline et mise en évidence dans le logigramme (EVO-019)

**Comportement observable**
- Panneau latéral `outline-panel` : le composant `Diagram` du questionnaire en mode `outline`, donc en lecture seule (`readOnly = ro || !!outline`, `Diagram.tsx:51`), avec les problèmes de vérification du questionnaire.
- Nœud courant entouré d'un anneau vert (`data-outline-current`). Les questions actives sont cliquables. Les questions inactives sont grisées (`opacity-40 grayscale`, `data-outline="inactive"`). Les nœuds autres que des questions n'ont pas d'état (`NodeView.tsx:79-92`).
- Le clic sur une question active affiche cette question dans le wizard. Ailleurs, le clic est sans effet (`Diagram.tsx:183`).
- Recentrage animé (200 ms) à chaque changement de `focusKey` (longueur de l'historique, étape, compteur de clics). Le zoom est le plus fort qui laisse voir les voisins immédiats, borné à [0,5 ; 1] (`outlineView.ts`).
- Sur une page de fragment, c'est le nœud fragment de l'appelant (le plus externe) qui est mis en évidence. Il n'est pas cliquable.
- Hors outline, un clic dans la page du wizard sélectionne le nœud correspondant dans l'onglet Logigramme (`select`).

**Règles de gestion et validations**
- `passedQuestions(input, s, visited)` : parcours recalculé depuis le départ avec les réponses actuelles (`successor`), arrêté à la première page jamais affichée (`visited` ∪ historique). On n'en garde que les questions, sans les étapes internes à un fragment (filtre `!id.includes('/')`, `Outline.tsx:20`).
- `jumpTo` : l'historique devient le préfixe de ce parcours jusqu'à la question, les réponses sont conservées, `blocked` est remis à faux, sans validation. Une question hors parcours est sans effet (`outline.ts:27-31`).
- `visited` : chaque mise à jour de session y ajoute l'historique ; « Recommencer » le vide (`usePreview.ts:32-38`).

**Cas limites gérés**
- Si une réponse antérieure change, les questions qui sortent du parcours sont grisées immédiatement, avant même « Suivant ».
- Boucle dans le parcours recalculé : arrêt sur la première étape répétée.
- Un voisin lointain peut sortir du cadre quand le zoom atteint son plancher.

**Références** : `src/ui/preview/Outline.tsx`, `src/core/runtime/outline.ts`, `src/ui/diagram/Diagram.tsx:51, 139, 183`, `src/ui/diagram/NodeView.tsx:79-92`, `src/ui/diagram/useOutlineCenter.ts`, `src/ui/diagram/outlineView.ts`.

---

### Panneau de débogage

**Comportement observable**
- Si la page est dans un fragment : bandeau « Dans le fragment : » avec le chemin des alias et le titre du fragment (dans la langue de l'interface, sinon la langue par défaut, sinon la clé).
- Chemin parcouru : historique numéroté, chaque étape désignée par `alias.cle` ou par le type de nœud.
- Conditions des arêtes sortantes de la page courante, dans l'ordre : cible, nom de sortie, résultat (`true` / `false` / « sinon » / « erreur ») et expression. L'arête retenue est surlignée. En sortie de fragment, les arêtes de l'appelant suivent, sous l'intitulé « Puis, à la sortie du fragment : ».
- Valeurs courantes : JSON des réponses et de `sys`.

**Règles de gestion et validations**
- `edgeTrace` utilise `evaluateStrict` : une exception donne `error`, une valeur autre que `true` donne `false`. L'arête retenue suit la même règle que `chooseEdge` (`trace.ts:39-50`).
- Le libellé d'arête (EVO-005) n'est pas affiché ; seule la condition l'est.

**Cas limites gérés** : aucune arête, message `preview.noCondition` ; fin, trace vide ; profondeur des sorties imbriquées bornée à 50.

**Références** : `src/ui/preview/DebugPanel.tsx`, `src/core/runtime/trace.ts`.

---

### Panneau état du système de la prévisualisation

**Comportement observable**
- Sélecteur de scénario (scénarios du projet, plus « aucun scénario », qui prend les valeurs d'exemple). Une `ValueInput` par variable, avec `sys.<nom>`, le libellé (EVO-005) et le type.
- Après une modification : badge « modifié » et bouton « Rétablir » (`sys` effacé). Formulaire « Enregistrer comme scénario » (commande `preview.saveScenario`).

**Règles de gestion et validations**
- `systemStateOf` : valeurs éditées (`p.sys`), sinon celles du scénario choisi (le premier par défaut si aucun n'a été choisi), sinon les exemples du dictionnaire (`system-edits.ts:90-97`).
- Changer de scénario remet `sys` à zéro. La session est conservée, avec une réévaluation immédiate (options, libellés, garde de fin si une fin est affichée).
- `preview.saveScenario` : nom saisi (après `trim`), ou « <scénario> * » à défaut. Le nom est rendu unique (« Nom (2) ») ; le nouveau scénario est sélectionné et `sys` effacé (`system-commands.ts:77-88`, `system-edits.ts:46-53`).

**Cas limites gérés** : une valeur vide supprime la clé de `sys` ; les réponses ne sont pas élaguées après un changement de `sys`.

**Références** : `src/ui/preview/SystemPanel.tsx`, `src/app/store/system-edits.ts`.

---

### Moteur : départ, choix d'arête, ordre d'évaluation, sorties de fragment

**Comportement observable** : sans objet (module pur, utilisé par le wizard, l'outline, le débogage et les tests de référence).

**Règles de gestion et validations**
- `chooseEdge` : première arête conditionnée dont la condition vaut exactement `true`, dans l'ordre du tableau `edges` ; sinon la première arête sans condition ; sinon `undefined`, et la session passe en `blocked` (`navigate.ts:7-9`, `session.ts:52-53`).
- `successor` : une fin n'a pas de successeur. Un nœud sans arête sortante dans un fragment en sort par les arêtes du nœud fragment appelant (`leave`). Un nœud `exit` nommé sort par les arêtes `exit` = son nom ou sans nom. Un nœud fragment sans arête remonte à l'appelant. L'entrée d'un fragment est `fragmentEntry`. Profondeur bornée à 50 (`navigate.ts:26-61`).
- Les conditions sont évaluées dans le contexte de l'étape d'origine (`buildContext`), ou de l'appelant en sortie de fragment.
- Identifiants d'étape : `nodeId`, `appel/nodeId`, `a1/a2/nodeId`. `resolveStep` renvoie la question effective (bibliothèque résolue, surcharges EVO-009 et EVO-012) et `answerPath` = alias puis clé (`steps.ts:48-74`).
- `isPage` : tous les nœuds sauf `fragment` et `exit`.

**Cas limites gérés** : fragment ou nœud introuvable, `undefined` (session `blocked`) ; cycle d'appels (garde de profondeur ; `stepIds` mémorise les fragments déjà vus).

**Références** : `src/core/runtime/navigate.ts`, `src/core/runtime/steps.ts`.

---

### Moteur : réponses, valeurs par défaut, élagage

**Règles de gestion et validations**
- `next` : une question sans réponse reçoit `null`. Après le passage à la page suivante, `prune` est appliqué, puis la valeur par défaut de la nouvelle page (`defaultExpr` évaluée, sinon `default`), seulement si la réponse est `undefined` (`session.ts:48-56, 87-93`).
- `setAnswer` range la valeur, `<clé>_other` (si non vide), `<clé>_group`, `<clé>_nsp: true` et `<clé>_pays` (si non vide). Une valeur `undefined` supprime la clé (`session.ts:34-45`).
- `projectedSteps` : chemin depuis le départ avec les réponses connues. À la première question sans réponse (`undefined`), on ajoute tout ce qui reste atteignable sans repasser par le chemin (toutes arêtes, toutes sorties) (`session.ts:99-112`, `navigate.ts:68-104`).
- `prune` : pour chaque étape du questionnaire (fragments compris) dont le chemin de réponse n'est pas tenu par une étape projetée, il efface la réponse et ses compagnons `_other`, `_group`, `_nsp`, `_pays` (`session.ts:115-127`).
- Réponses d'un fragment rangées sous `answers[alias]` (imbriquées pour plusieurs niveaux).

**Cas limites gérés**
- Deux nœuds de même clé : une réponse est gardée dès qu'une des étapes est projetée (comparaison par chemin).
- `back` et `goTo` remettent `blocked` à faux. `back` est sans effet sur une page unique.

**Références** : `src/core/runtime/session.ts`, `src/core/runtime/context.ts`.

---

### Moteur : contexte d'évaluation

**Règles de gestion et validations**
- `buildContext` : réponses débarrassées en profondeur des valeurs `null` (dans les objets et les éléments de listes), puis, pour chaque appel traversé, les clés de l'alias sans préfixe (la plus interne l'emporte), puis `sys` (`context.ts:13-32`).
- Conséquence : une question facultative laissée vide est absente du contexte (`$exists` vaut faux). Un choix multiple « Ne sais pas » (`[]`) reste présent.

**Références** : `src/core/runtime/context.ts`.

---

### Moteur : options d'un choix (options dynamiques, groupes, « autre »)

**Règles de gestion et validations**
- Entrées parcourues dans l'ordre. Une entrée (ou un groupe) dont `when` n'est pas vraie est ignorée.
- Option statique : telle quelle. Entrée dynamique : une option par élément de `from` (valeur unique traitée comme une liste d'un élément ; `null`, `undefined` ou absente : rien), dans l'ordre de la source. Les expressions `value` et `label` sont évaluées avec l'élément comme contexte ; sans expression, c'est l'élément lui-même. Les objets sont rendus en JSON et le libellé vide est remplacé par la valeur (`options.ts:53-62`).
- Groupe : ses entrées, chacune marquée `{ id, label }`. `id` = code du groupe, sinon libellé dans `env.defaultLang`, interpolé (`options.ts:31-35`).
- Sont écartées : les valeurs vides, la valeur `other` et les doublons du couple (groupe, valeur) (`options.ts:46-51`).
- L'option « Autre (préciser) » n'est pas produite ici ; elle est ajoutée par le plugin et par la validation.

**Cas limites gérés** : une erreur d'évaluation de `from` ne produit aucune option ; les éléments `null` sont ignorés.

**Références** : `src/core/runtime/options.ts`.

---

### Moteur : « Ne sais pas », « Autre », pays

**Règles de gestion et validations**
- `dontKnowAnswer(q)` : choix multiple `{ value: [], group: 'NSP' }`, choix unique `{ value: null, group: 'NSP' }`, autres types `{ value: null }` (`context.ts:62-65`).
- Chemins compagnons : `otherPath`, `groupPath`, `dontKnowPath`, `countryPath` (`<clé>_other`, `_group`, `_nsp`, `_pays`).
- `SummaryEntry.dontKnow` / `.group` / `.other`.

**Références** : `src/core/runtime/context.ts:50-65`, `src/core/runtime/session.ts:34-45, 138-167`.

---

### Moteur : suggestions d'un champ texte (EVO-016)

**Règles de gestion et validations**
- `suggestionList(raw, labelOf?)` : `undefined` ou `null` donne une liste vide ; une valeur unique donne un élément ; une liste est aplatie d'un niveau (`flat()`). Les chaînes non vides sont gardées (une chaîne faite d'espaces est écartée), les nombres et booléens passent par `String()`, les objets et la valeur `other` sont écartés. `labelOf` remplace une valeur d'option par son libellé. Les doublons sont retirés après ce remplacement, en gardant l'ordre de première occurrence (`suggestions.ts:19-29`).
- `referencedChoices` : questions à choix dont la clé est le dernier nom d'une référence (hors `sys.`), cherchées dans le graphe courant, puis dans les questions de la bibliothèque, puis dans les fragments. La première question trouvée par clé l'emporte, même si ce n'est pas un choix (elle est alors filtrée) (`suggestions.ts:39-55`).
- `filterSuggestions` : « contient », casse ignorée selon la locale, après `trim` de la saisie ; une saisie vide garde toute la liste.
- Le plugin `text` évalue l'expression à chaque rendu avec `env.evaluate` (contexte de la page) (`plugins/question-types/text/index.tsx:30-35, 93`).

**Références** : `src/core/runtime/suggestions.ts`.

---

### Validation d'une réponse (`validateAnswer`, `isRequired`, messages par défaut)

**Comportement observable** : erreurs `{ path, param, message }` affichées par le wizard. Le message est multilingue et interpolé dans la langue affichée.

**Règles de gestion et validations**
- « Ne sais pas » : marqueur `true` et option activée sur la question (`hasDontKnow`, jamais sur une structure), alors aucune erreur, quelle que soit la règle (`field.ts:46`).
- `isRequired` : un booléen, ou une expression « obligatoire si » évaluée dans `ctx` (si elle n'est pas évaluable, la question est facultative) (`field.ts:25-27`).
- Vide = `undefined`, `null`, `''` ou `[]`. Une réponse vide et obligatoire donne `required` ; une réponse vide et facultative ne donne aucune erreur. Exception : la liste vide d'une structure répétable obligatoire qui a un `repeat.min` passe aux contrôles d'occurrences (`field.ts:53-57`).
- Texte : `minLength`, `maxLength`, `pattern` (un motif invalide est ignoré).
- Date : format ISO réel (`format`, qui arrête les autres contrôles de la date), bornes `min` / `max` (littéral ISO ou expression).
- Nombre : `numberKind` (`natural` ≥ 0 et entier, `integer`), `min` / `max` (nombre ou expression), `decimals`.
- Choix : chaque couple (groupe, valeur) doit figurer parmi les options visibles, plus (`AUTRE`, `other`) si « Autre » est activée. Un groupe absent ou `null` : la valeur suffit (`option`). Choix multiple : `minSelected`, `maxSelected`.
- Mail, téléphone, adresse, civilité : `contactErrors` de `core/contact`, avec le pays lu dans `ctx['<clé>_pays']`.
- Structure : occurrences `minOccurrences` / `maxOccurrences`. Sans erreur à ce niveau, chaque champ est validé récursivement dans le contexte de l'occurrence (`{...ctx, ...occ}`). Un champ dont `when` est fausse n'est pas validé. Chemins `cle[i].champ` ou `cle.champ` (`field.ts:150-168`).
- « Autre » avec `detailRequired` et une précision vide donne `otherDetail`.
- Contraintes libres : chaque `constraints[i].rule` qui ne vaut pas `true` donne `constraints[i]`, avec le message de la contrainte, sinon « Valeur invalide. ».
- Message : `question.messages[param]`, sinon `defaultMessage(param, borne)`. Les accolades de la borne sont échappées. Pour `numberKind` et `lineType`, le terme est traduit (`messages.ts:4-48`).
- `formatErrors` : contrôles de contact seuls (réponse vide : aucune erreur), pour le contrôle à la sortie du champ.
- Dans le wizard, `answerErrors` valide dans le contexte de la page, réponse courante comprise sous sa clé ; groupe et marqueur sont lus à côté de la réponse, pas dans `ctx` (`path-check.ts:5-19`).
- Astérisque du wizard (EVO-021) : `requiredAt` appelle `isRequired` sur la question effective, dans ce même contexte (`path-check.ts:25-30`).

**Cas limites gérés** : un motif regex invalide ne bloque pas ; une borne dont l'expression échoue est ignorée ; une précision « Autre » vide n'est enregistrée que si elle est renseignée.

**Références** : `src/core/validation/field.ts`, `src/core/validation/messages.ts:1-48`, `src/ui/preview/path-check.ts`.

---

### Onglet État du système (dictionnaire, scénarios, valeurs)

**Comportement observable**
- Colonne de gauche : variables (nom, libellé, type, description, valeurs d'une énumération, schéma d'une liste, valeur d'exemple, badge du nombre d'usages, supprimer) et problèmes du dictionnaire sous chaque variable. Colonne de droite : scénarios (nom, dupliquer, supprimer, description, valeur de chaque variable).
- Types proposés : texte, nombre, date, booléen, énumération, liste (d'objets).

**Règles de gestion et validations**
- Ajout (`system.addVariable`) : variable texte au nom unique (`variable`, `variable_2`…), l'onglet s'ouvre et le nom reçoit le focus.
- Renommage par `KeyInput`, qui refuse un nom invalide ou déjà pris, puis `system.renameVariable`, propagé dans les expressions `sys.…` et les scénarios. Les champs de liste suivent la même règle avec `system.renameField`.
- Changer de type supprime `values`, `fields` et `example` ; une énumération reçoit `values: []`, une liste `fields: []` et `example: []` (`system-edits.ts:34-43`).
- Libellé (EVO-005) : une ligne (les retours sont remplacés par des espaces) ; vide, la propriété est retirée. Clé d'historique `sys:<nom>:caption`.
- Valeurs d'une énumération : une par ligne, sans espaces autour, lignes vides ignorées, sans doublons.
- Champs d'une liste : types simples seulement (pas de liste ni d'énumération). Nouveau champ `champ_<n>`.
- Suppression d'une variable : elle est retirée du dictionnaire et de tous les scénarios (aucune confirmation).
- Scénarios : `scenario.add` crée un scénario aux valeurs d'exemple, ou une copie si un id est fourni (nom rendu unique). `scenario.delete`.
- `ValueInput` : saisie selon le type (nombre ; date `input type=date` ; booléen et énumération avec « non renseigné » ; liste en JSON transmis seulement s'il est valide, message `system.jsonError` sinon). Un écart au type est signalé sans bloquer (`valueError`).
- Les saisies continues passent par `store.edit('project', …, clé)` : elles sont regroupées et annulables.

**Cas limites gérés**
- Énumération dont la valeur courante n'est plus dans la liste : la valeur reste proposée dans le sélecteur.
- `valueError` sur une liste : premier écart de champ, sous la forme « champ: type ».
- Énumération sans valeurs déclarées : toute chaîne est acceptée.
- Date vérifiée par motif (mois 01-12, jour 01-31, sans contrôle du calendrier).

**Références** : `src/ui/system-state/*.tsx`, `src/app/store/system-edits.ts`, `src/app/commands/system-commands.ts:29-73`.

---

### Expressions (JSONata, fonctions ajoutées, interpolation, variables système, erreurs)

**Règles de gestion et validations**
- JSONata 1.8, synchrone, compilé avec un cache par texte d'expression (`evaluate.ts:33-45`).
- Avant évaluation, trois réécritures dans cet ordre : `.pays` en `($exists(P_pays) ? P_pays : P.pays)`, `.groupe` final en `_group`, `.nsp` final en `(P_nsp = true)`. Une expression invalide reste inchangée (`evaluate.ts:66`, `country-ref.ts`, `group-ref.ts`, `dont-know-ref.ts`).
- Fonctions ajoutées : `$today()` (date de `env.today`, sinon date locale du jour), `$addDays(d, n)`, `$daysBetween(a, b)` (arrondi), `$age(naissance)` (âge à `today`) (`evaluate.ts:54-62`, `dates.ts`).
- Gestion des erreurs : `evaluateStrict` lève une exception ; `evaluate` renvoie `undefined` ; `evaluateCondition` n'est vraie que si le résultat vaut `true`. Les séquences JSONata sont converties en tableaux.
- Variables système : `sys.<nom>` dans le contexte (`buildContext`).
- Interpolation : gabarit `{expr}`, où `{{` et `}}` sont des accolades littérales. Les guillemets sont respectés pour trouver l'accolade fermante ; une accolade non fermée est laissée en texte. Valeur affichée : vide si absente, liste jointe par « , », objet en JSON. Une simple référence dont le dernier nom a une mise en forme `env.display` (civilité, téléphone) utilise cette mise en forme (`template.ts`).
- `resolveLabel` : première variante dont la condition est vraie, sinon `otherwise` ; puis la langue demandée, sinon la langue par défaut, sinon la première disponible ; puis l'interpolation (`label.ts`).
- Références : `extractReferences` (chemins racines, prolongement par un filtre de tête, `$$.cle` absolu, option `skipExists`), `renameReference`, `checkSyntax` (message et position de fin du jeton).

**Cas limites gérés** : une expression non évaluable dans un gabarit donne une chaîne vide ; un chemin `.nsp` vaut toujours vrai ou faux, jamais vide ; un champ de structure nommé `pays` reste lisible grâce au repli.

**Références** : `src/core/expressions/*.ts`.
