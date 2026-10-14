# registry

Seul module qui connaît la liste des plugins (`src/plugins/**`). Ajouter un type = une ligne d'import et
une entrée dans `QUESTION_TYPE_PLUGINS` ou `NODE_KIND_PLUGINS`.

## API
- `QUESTION_TYPE_PLUGINS`, `questionType(type)` ; `NODE_KIND_PLUGINS`, `nodeKind(kind)` ; `DEFAULT_QUESTION_TYPE`.

Types : texte, date, nombre, choix unique, choix multiple, booléen, structure, mail, téléphone, adresse,
civilité (raccourcis T, D, R, U, M, B, S, Shift+E, Shift+T, Shift+A, Shift+C ; `registry.test.ts`). Le tri-state est supprimé (EVO-018).

Les commandes « Type : … » et les raccourcis associés sont générés à partir de cette liste (`app/commands`).
