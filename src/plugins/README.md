# plugins

Un dossier autonome par type : `question-types/<type>/` et `node-kinds/<kind>/`.
Chaque plugin expose son API par `index.ts` et ne connaît que `core`, `ui-kit` (et `ui/expression-editor`).

- Un plugin n'importe **jamais** un autre plugin (vérifié par dependency-cruiser).
- Seul `src/registry` connaît la liste des plugins.
- Ajouter un type = créer un dossier ici + une ligne dans `src/registry`.
