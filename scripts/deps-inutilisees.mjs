// Harnais : échoue si une dépendance de package.json (dependencies, devDependencies) n'est utilisée nulle part.
// Usage : node scripts/deps-inutilisees.mjs [racine du projet]   (racine par défaut : dossier courant)
// Une dépendance est utilisée si :
//   - son nom apparaît comme spécificateur entre guillemets ('nom' ou 'nom/…') dans src/, tests/, scripts/,
//     un fichier de configuration à la racine (import, require, @import CSS, "types" de tsconfig…) ;
//   - ou l'un de ses binaires (champ `bin` de son package.json) est appelé dans un script npm ;
//   - ou, pour `@types/x`, si `x` est utilisée (types chargés implicitement par TypeScript).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DOSSIERS = ['src', 'tests', 'scripts'];
const RACINE = /^(\..*rc(\.\w+)?|.*\.config\.\w+|\.dependency-cruiser\.cjs|tsconfig.*\.json|index\.html)$/;
const EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|css|html|json)$/;
// Exceptions : dépendances utilisées indirectement, non détectables par les règles ci-dessus. Garder court.
const EXCEPTIONS = [
  // Jamais importées dans src/ (kit graphique prévu, spec §8.1) : réellement inutilisées, à retirer de
  // package.json puis d'ici sur décision de l'utilisateur (signalé, non supprimé).
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-tooltip',
];

function fichiers(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    if (n === 'node_modules' || n === 'deps-inutilisees.mjs') return []; // ses exceptions ne valent pas usage
    const p = join(dir, n);
    return statSync(p).isDirectory() ? fichiers(p) : EXTENSIONS.test(n) ? [p] : [];
  });
}

const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

function binaires(racine, dep) {
  const p = join(racine, 'node_modules', dep, 'package.json');
  if (!existsSync(p)) return [];
  const bin = JSON.parse(readFileSync(p, 'utf8')).bin;
  if (!bin) return [];
  return typeof bin === 'string' ? [dep.split('/').pop()] : Object.keys(bin);
}

export function dependancesInutilisees(racine) {
  const pkg = JSON.parse(readFileSync(join(racine, 'package.json'), 'utf8'));
  const deps = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})];
  const sources = [
    ...DOSSIERS.flatMap((d) => fichiers(join(racine, d))),
    ...readdirSync(racine).filter((n) => RACINE.test(n)).map((n) => join(racine, n)),
  ].map((f) => readFileSync(f, 'utf8')).join('\n');
  const scripts = Object.values(pkg.scripts ?? {}).join('\n');

  const importee = (dep) => new RegExp(`['"\`]${echapper(dep)}(/[^'"\`]*)?['"\`]`).test(sources);
  const appelee = (dep) => binaires(racine, dep).some((b) => new RegExp(`(^|[\\s&|;(])${echapper(b)}(\\s|$)`, 'm').test(scripts));
  const utilisee = (dep) => {
    if (EXCEPTIONS.includes(dep) || importee(dep) || appelee(dep)) return true;
    const m = /^@types\/(.+)$/.exec(dep);
    if (!m) return false;
    const cible = m[1].includes('__') ? `@${m[1].replace('__', '/')}` : m[1];
    return importee(cible) || deps.includes(cible) && utilisee(cible);
  };
  return deps.filter((d) => !utilisee(d));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const inutiles = dependancesInutilisees(process.argv[2] ?? process.cwd());
  if (inutiles.length) {
    for (const d of inutiles) {
      console.error(`Dépendance inutilisée : « ${d} » est déclarée dans package.json mais n'est importée nulle part `
        + `(src/, tests/, scripts/, configuration) ni appelée par un script npm. La retirer, ou l'ajouter aux exceptions `
        + `commentées de scripts/deps-inutilisees.mjs si elle est utilisée indirectement.`);
    }
    process.exit(1);
  }
  console.log('Dépendances : toutes utilisées.');
}
