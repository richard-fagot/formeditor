# plugin-api

Contrat entre l'éditeur et les plugins : `QuestionTypePlugin` (un par type de question) et
`NodeKindPlugin` (un par type de nœud), plus les environnements transmis (`EditorEnv`, `RenderEnv`).
Types seulement, et deux utilitaires (`tr`, `commonQuestionFields`). Dépend de `core/model` et des types React.

- Un plugin exporte un objet qui respecte ce contrat ; `src/registry` les rassemble.
- Les plugins ne s'importent pas entre eux : ce dont un plugin de nœud a besoin d'un plugin de type
  (aperçu) lui est passé en propriété (`ShapeProps.typePlugin`).
- Textes de l'outil dans les plugins : objets `{ fr, en }` passés à `tr(t, env.uiLang)`.
- Textes destinés à l'utilisateur final (prévisualisation) : `env.label(...)` / `env.text(...)`.
