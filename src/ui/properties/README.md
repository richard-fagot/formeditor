# ui/properties

Cadre du panneau de propriétés de l'objet sélectionné (nœud ou arête ; sans sélection, le questionnaire). Le contenu propre à chaque type
vient des plugins (`registry`). Dépend de `app/store`, `registry`, `core`, `ui-kit`, `ui/expression-editor`.

## API
- `PropertiesPanel({ graph })`, `QuestionEditor({ question, target })` (propriétés d'une question, locale ou de
  bibliothèque, selon `QuestionTarget` : historique, propriétaire du renommage, clés prises, écriture, intitulé),
  `KeyInput`, `usePluginEnv()` (`useEditorEnv()` + `questionType` du registre, transmis aux plugins ; seul exemplaire,
  utilisé aussi par `ui/diagram` et `ui/library`).

## Composants
- Contraintes et messages : `ConstraintsEditor` (`ui/expression-editor`), paramètres par `messageParams`.
- `PropertiesPanel({ graph })` : fournit la portée des références à l'éditeur d'expression (`ExpressionEnvProvider`).
- `QuestionnaireProperties` : titre multilingue, clé (= nom du fichier, unique, `KeyInput`), description.
- `QuestionProperties` : intitulé (clé dérivée), clé (renommage propagé, `KeyInput`), type, obligatoire
  (booléen ou expression), valeur par défaut littérale (`DefaultValueInput`) et calculée (`defaultExpr`), aide, texte indicatif, paramètres du type (plugin, avec `renameField` pour les champs de structure), contraintes libres,
  messages d'erreur par contrainte, description.
- `EdgeProperties` : libellé (`caption`, une ligne, vide = retiré ; clé d'historique `<id>:caption`), condition (vide = « sinon »), rang (`edge.moveUp`/`moveDown`), sortie nommée d'un fragment (une sortie inconnue
  reste proposée, marquée « (?) »), suppression (`node.delete`).
- `LibraryQuestionProperties` : question de bibliothèque référencée ; intitulé et caractère obligatoire (`LibraryRequired`, EVO-012) surchargeables
  (« Reprendre l'intitulé de la bibliothèque » retire la surcharge), « Ouvrir dans la bibliothèque ». Structure : `HiddenFields` (EVO-009),
  case « affiché » par champ (`setFieldHidden`, la dernière affichée est grisée), avertissement `notice` si le champ masqué est référencé (`hiddenFieldUsages`).
- Question locale : section « Bibliothèque », bouton « Copier dans la bibliothèque » (`node.toLibrary`, EVO-009).
- `RequiredOverride.tsx` (EVO-012) : `LibraryRequired` (référence : sélecteur « Caractère obligatoire » « Hérité (valeur, provenance : bibliothèque, surcharge locale, fragment par son titre sinon sa clé) » / « Obligatoire »
  / « Facultatif », valeur effective et provenance dessous, bouton « Revenir à la valeur héritée » = `node.resetRequired`) ; `FragmentRequired` (appel :
  `fragmentQuestions` avec chacune son sélecteur, « Surchargé » si surchargée dans cet appel, bouton de retour pour tout l'appel). Écriture par `setRequiredOverride`.
- `FragmentCallProperties` (EVO-008) : fragment référencé, alias (`KeyInput` : clé prise refusée ; renommage propagé, `renameKey` cible `alias`
  avec le graphe propriétaire), sorties du fragment (`fragmentExits`), clés attendues de l'appelant (`expectedKeys`, « absente » si la portée
  de cet appelant ne la résout pas), « Ouvrir le fragment » (`node.openFragment`).
- Départ (questionnaire : « Définir comme départ ») ; entrée d'un fragment (`EntrySection` : « Définir comme entrée du fragment »,
  « Revenir à l’entrée implicite », commande `node.setEntry`). Portée d'un fragment : `fragmentScope`.
- Autres nœuds : `plugin.Properties` du type de nœud ; renommer une sortie passe par `renameExit` (arêtes des appels suivies).

Questionnaire validé (EVO-015) : contenu dans un `fieldset disabled` (`properties-locked`), remonté au changement d'état, et `readOnly` transmis
aux saisies CodeMirror (`ExpressionEnv`).

Les saisies de champs de nœud et d'arête passent par `store.edit` avec une clé de regroupement `nœud:champ`
(frappes regroupées dans l'historique). Les boutons (départ, rang, suppression) et les propriétés du
questionnaire passent par `runCommand`.
