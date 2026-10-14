# plugin-api

Contrat entre l'éditeur et les plugins : `QuestionTypePlugin` (un par type de question) et
`NodeKindPlugin` (un par type de nœud), plus les environnements transmis (`EditorEnv`, `RenderEnv`).
Types seulement, et deux utilitaires (`tr`, `commonQuestionFields`). Dépend de `core/model` et des types React.

- Un plugin exporte un objet qui respecte ce contrat ; `src/registry` les rassemble.
- Les plugins ne s'importent pas entre eux : ce dont un plugin de nœud a besoin d'un plugin de type
  (aperçu) lui est passé en propriété (`ShapeProps.typePlugin`).
- Textes de l'outil dans les plugins : objets `{ fr, en }` passés à `tr(t, env.uiLang)`.
- Textes destinés à l'utilisateur final (prévisualisation) : `env.label(...)` / `env.text(...)`.
- `EditorEnv.questionType(type)` : plugin d'un autre type, fourni par le registre (champs d'une structure).
- `RenderEnv.options(q)` : options visibles d'un choix (avec leur `group: { id, label }` éventuel) ; `RenderEnv.scoped(extra)` : contexte enrichi
  (occurrence d'une structure, clés sœurs sans préfixe).
- `RenderEnv.graph` : graphe de la page affichée (questionnaire, ou fragment pour une page d'un fragment) ; sert à chercher une clé d'abord là (suggestions du texte).
- `RenderEnv.checks` (EVO-014) : `false` quand les contrôles de saisie de la prévisualisation sont désactivés ; un champ n'affiche alors aucun message de contrôle.
- `QuestionPropertiesProps.renameField(fieldId, key)` : renommage propagé d'un champ de structure.
- Groupe de la sélection d'un choix (EVO-003) : `FieldProps.group` (valeur de `<clé>_group`) et
  `onChange(value, other?, group?)` ; `formatAnswer(question, value, env, other?, group?)`.
- Pays (EVO-007) : `FieldProps.country` (`<clé>_pays`) et `onChange(value, other?, group?, country?)` ; l'appelant range le pays à
  côté de la réponse (absent : effacé).
- « Ne sais pas » (EVO-006) : `FieldProps.dontKnow` (marqueur `<clé>_nsp`) et `onDontKnow(on)` (l'appelant range la réponse vide,
  le groupe `NSP` et le marqueur, ou efface la réponse) ; `dontKnowLabel(q)` (libellé, défaut « Ne sais pas ») ; `dontKnow` fait
  partie de `QuestionBase` (conservé au changement de type, retiré vers une structure).
