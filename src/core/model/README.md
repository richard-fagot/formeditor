# core/model

Types du domaine (projet, questionnaire, nœud, arête, question, fragment, variable, scénario) et quelques
utilitaires purs. Aucun import externe : c'est la base de tous les autres modules.

## API
- `text.ts` : `LocalizedText`, `Label` (texte ou variantes `{variants, otherwise}`), `Expression`, `isVariantLabel`, `labelTexts`.
- `question.ts` : `Question` (union discriminée par `type`), `QUESTION_TYPES`, `ChoiceEntry` (entrée d'un choix :
  `ChoiceOption` statique ou `DynamicEntry` `{ from, label?, value?, when? }`, discriminées par `isDynamicEntry` = présence de `from`),
  `OtherOption`, `StructureField`, `OTHER_VALUE` (`"other"`). Plus de type tri-state (EVO-018) : booléen avec `dontKnow`.
  Groupes (EVO-003) : `ChoiceGroup` `{ group, code?, when?, options: ChoiceItem[] }` (reconnu à `group`, `isChoiceGroup`),
  `ChoiceItem` (option ou entrée dynamique), `GROUP_SUFFIX` (`group` : réponse `<clé>_group`), `GROUP_REF` (`groupe` :
  `cle.groupe`), `OTHER_GROUP` (`AUTRE`).
  « Ne sais pas » (EVO-006) : `dontKnow?: DontKnowOption` (`{ label? }`) sur toute question sauf structure (`dontKnow?: never`),
  `hasDontKnow`, `DONT_KNOW_SUFFIX` / `DONT_KNOW_REF` (`nsp` : marqueur `<clé>_nsp`, référence `cle.nsp`), `DONT_KNOW_GROUP` (`NSP`), `DONT_KNOW_LABEL`.
  Suggestions (EVO-016) : `TextQuestion.suggestions?` (expression renvoyant une liste ; présente, même vide = activée).
- Mail, téléphone, adresse, civilité (EVO-007) : `EmailQuestion`, `PhoneQuestion` (`defaultCountry?`, `countries?`, `lineType?`),
  `AddressQuestion` (`defaultCountry?`, `countries?`, `minLength?`, `maxLength?`, `verify?`), `CivilityQuestion` (`labels?`, `short?`,
  `undisclosed?`) ; `COUNTRY_SUFFIX` / `COUNTRY_REF` (`pays` : `<clé>_pays`, `cle.pays`), `DEFAULT_COUNTRY` (`FR`), `hasCountry`,
  `CIVILITY_CODES`, `CIVILITY_LABELS` (longs / courts, fr / en), `civilityCodes(q)`, `civilityLabel(q, code)`.
- `node.ts` : `GraphNode` (union par `kind` : question locale ou de bibliothèque, fragment (`FragmentNode` : `ref`, `alias`), info, summary, end, exit),
  `isLocalQuestion`, `isLibraryQuestion`. `LibraryQuestionNode.hiddenFields?` : clés des champs masqués d'une instance de structure (EVO-009).
- `instance.ts` (EVO-009) : `instanceQuestion(q, node)` (question effective d'une instance : intitulé et `required` (EVO-012) surchargés, champs masqués retirés dans l'ordre
  de la bibliothèque ; clé inconnue ignorée ; tous masqués → masquage ignoré), `visibleFieldKeys`.
- `required.ts` (EVO-012) : surcharge du caractère obligatoire — `LibraryQuestionNode.required?` (booléen), `FragmentNode.requiredOverrides?`
  (chemin d'ids de nœuds à partir du fragment appelé → booléen). `resolveRequired(ws, node, instances)` → `{ value, override, holder }` (le plus
  proche du graphe racine l'emporte ; `holder` : 0 = graphe racine, k = fragment de `instances[k-1]`, `'library'`), `inheritedRequired` (valeur sans
  la surcharge du niveau 0), `requiredPath`, `fragmentQuestions(ws, fragmentId)` (questions, fragments appelés compris, avec chemin), `activeOverrides`
  (surcharges non orphelines d'un appel).
- `graph.ts` : `Edge` (dont `caption?`, libellé de lecture, EVO-005), `Graph`.
- `documents.ts` : `Questionnaire` (porte `start`), `Library` (`fragments`), `Fragment` (`entry?`, pas de `start`), `LabelSet` (`kind: 'boolean'`, `yes`, `no`), `Project`, `SystemVariable` (dont `caption?`), `Scenario`,
  `Layout` (dont `comments?` : `ReviewComment` `{ node, x?, y?, text, replies }`, commentaires de révision, EVO-011), `Workspace` (projet complet en mémoire), `Bundle`, `FORMAT_VERSION` (14). `Questionnaire.status?` (`draft` | `validated`) et `validatedAt?` (EVO-015).
- `graph.ts` : `Graph` = `nodes` + `edges` (sans départ).
- `validation.ts` (EVO-015) : `QuestionnaireStatus`, `isValidated(q)`, `lockedChanges(avant, après)` → ids des questionnaires validés avant
  dont le contenu verrouillé a changé ou qui ont disparu (questionnaire hors `status` / `validatedAt`, mise en page hors `comments` — sans position, elle équivaut à son absence —, entrée du projet).
- `versioning.ts` (EVO-022 ; types `ItemStatus`, `Versioned` (`version?`, `status?` d’une question ou d’un fragment), `VersionRef` dans `documents.ts`) :
  `LibraryItemRef`, `VersionAlert`, `isItemValidated`, `libraryItemOf`, `usedLibraryItems(lib, graphe)` (directs puis par les fragments appelés,
  récursivement, sans doublon), `versionSnapshot` (versions de référence), `versionAlerts(lib, q)` (questionnaire validé seulement ; absent des
  références = vide), `provisionalItems`, `itemUsers(ws, item)`. `Questionnaire.version?`, `Questionnaire.libraryVersions?` (hors verrou de `lockedChanges`).
- `fragment.ts` (EVO-008) : `fragmentRoots` (nœuds sans arête entrante), `fragmentEntry` (`entry`, sinon premier candidat, sinon premier nœud),
  `fragmentExits` (nœuds sans arête sortante), `graphStart` (départ ou entrée), `calledFragments`, `createsCycle`, `fragmentCallers`.
- `keys.ts` : `deriveKey` (« Date du sinistre » → `date_sinistre`), `uniqueKey`, `isValidKey`, `newId`, `RESERVED_KEYS` (dont `groupe`, `nsp`).

## Invariants
- Les types reflètent exactement le format JSON (docs/FORMAT.md) : le modèle en mémoire **est** le format.
  Toute modification ici implique schéma + migration + FORMAT.md + exemple.
- Un nœud question local porte la question (id du nœud = id de la question).
- Rang des arêtes = ordre dans `edges`.

## Pièges
- `StructureField` exclut le type `structure` (pas de structure imbriquée).

## Tests
`keys.test.ts`, `fragment.test.ts`, `instance.test.ts`, `required.test.ts`, `validation.test.ts`, `versioning.test.ts`.
