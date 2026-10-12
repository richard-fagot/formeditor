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
- `QuestionPropertiesProps.renameField(fieldId, key)` : renommage propagé d'un champ de structure.
- Groupe de la sélection d'un choix (EVO-003) : `FieldProps.group` (valeur de `<clé>_group`) et
  `onChange(value, other?, group?)` ; `formatAnswer(question, value, env, other?, group?)`.
