// Règles d'architecture (spec §8.2). Vérifiées par `npm run deps` dans `npm run check`.
const MODULE = '(core/[^/]+|app/[^/]+|ui/[^/]+|plugins/[^/]+/[^/]+|format|registry|ui-kit)';

module.exports = {
  forbidden: [
    {
      name: 'api-publique',
      comment: "Un module n'importe d'un autre module que son index.ts.",
      severity: 'error',
      from: { path: `^src/${MODULE}/` },
      to: { path: `^src/${MODULE}/`, pathNot: ['^src/$1/', `^src/${MODULE}/index\\.tsx?$`] },
    },
    {
      name: 'core-pur',
      comment: "core n'importe ni app, ui, plugins, registry, format, ui-kit.",
      severity: 'error',
      from: { path: '^src/core/' },
      to: { path: '^src/(app|ui|plugins|registry|format|ui-kit)/' },
    },
    {
      name: 'core-sans-librairie-interface',
      comment: 'core ne dépend que de librairies non graphiques (jsonata).',
      severity: 'error',
      from: { path: '^src/core/' },
      to: { dependencyTypes: ['npm', 'npm-dev'], pathNot: 'node_modules/jsonata/' },
    },
    {
      name: 'model-autonome',
      severity: 'error',
      from: { path: '^src/core/model/' },
      to: { path: '^src/', pathNot: '^src/core/model/' },
    },
    {
      name: 'core-couches',
      comment: 'expressions → model ; references/runtime → model, expressions ; validation → +references.',
      severity: 'error',
      from: { path: '^src/core/(expressions)/' },
      to: { path: '^src/core/(references|runtime|validation)/' },
    },
    {
      name: 'core-couches-2',
      severity: 'error',
      from: { path: '^src/core/(references|runtime)/' },
      to: { path: '^src/core/(validation|references|runtime)/', pathNot: '^src/core/$1/' },
    },
    {
      name: 'format-sur-model',
      severity: 'error',
      from: { path: '^src/format/' },
      to: { path: '^src/', pathNot: '^src/(format|core/model)/' },
    },
    {
      name: 'plugins-isoles',
      comment: "Un plugin n'importe jamais un autre plugin.",
      severity: 'error',
      from: { path: '^src/plugins/([^/]+/[^/]+)/' },
      to: { path: '^src/plugins/', pathNot: '^src/plugins/$1/' },
    },
    {
      name: 'plugins-dependances',
      comment: 'Plugins : core, ui-kit, ui/expression-editor seulement.',
      severity: 'error',
      from: { path: '^src/plugins/' },
      to: { path: '^src/(app|registry|format|ui/(?!expression-editor/))' },
    },
    {
      name: 'registry-seul-connait-les-plugins',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/(registry|plugins)/' },
      to: { path: '^src/plugins/' },
    },
    {
      name: 'ui-kit-generique',
      severity: 'error',
      from: { path: '^src/ui-kit/' },
      to: { path: '^src/', pathNot: '^src/ui-kit/' },
    },
    {
      name: 'app-sans-ui',
      severity: 'error',
      from: { path: '^src/(app|core|format|registry)/' },
      to: { path: '^src/ui/' },
    },
    { name: 'pas-de-cycle', severity: 'error', from: {}, to: { circular: true } },
    { name: 'pas-orphelin-introuvable', severity: 'error', from: {}, to: { couldNotResolve: true } },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '\\.test\\.ts$' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: { extensions: ['.ts', '.tsx', '.js', '.json'] },
  },
};
