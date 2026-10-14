// `npm run kit-dev` (EVO-020) : (re)crée kit-dev/, la documentation du format à joindre aux JSON
// livrés à l'équipe de dev : FORMAT.md, schemas/, exemple/ (sans *.layout.json, avec chemins/), LISEZMOI.md.
// Usage : node scripts/kit-dev.mjs [dossier]   (défaut : kit-dev/ à la racine du dépôt)
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const SCHEMAS = join(ROOT, 'src/format/schemas');
const EXAMPLE = join(ROOT, 'examples/declaration-sinistre');

/** FORMAT.md du kit : lignes « outil » retirées, chemins du dépôt ramenés à ceux du kit. */
function kitFormat(md) {
  return md.split('\n').filter((l) => !l.includes('<!-- outil -->')).join('\n')
    .replaceAll('src/format/schemas/', 'schemas/')
    .replaceAll('examples/declaration-sinistre/', 'exemple/');
}

const json = (dir) => readdirSync(dir).filter((n) => n.endsWith('.json'));

function lisezmoi(version) {
  return `# Kit développeurs — format des questionnaires, version ${version}

Documentation à joindre aux fichiers JSON des questionnaires livrés par l'équipe métier.

## Contenu

- \`FORMAT.md\` : le format (structure et sens de chaque propriété, navigation, expressions, validation).
- \`schemas/\` : un JSON Schema (2020-12) par type de fichier, plus \`schemas/common.schema.json\` (définitions partagées).
- \`exemple/\` : projet d'exemple complet (\`exemple/projet.json\`, \`exemple/bibliotheque.json\`, un fichier par questionnaire).
- \`exemple/chemins/\` : parcours attendus par scénario, à rejouer par le moteur (FORMAT.md §15).

Version du format : **${version}** (propriété \`formatVersion\` de chaque fichier).

## Fichiers à joindre par l'équipe métier

Dans l'éditeur, « Exporter les fichiers unitaires », puis joindre \`projet.json\`, \`bibliotheque.json\` et les
fichiers des questionnaires (\`<clé> - <version> - <final|provisoire>.json\`, FORMAT.md §4.1), **sans** les fichiers de mise en page (\`.layout.json\`, propres à l'outil).

Seuls les questionnaires validés (\`"status": "validated"\`) sont livrables ; un questionnaire sans \`status\`
ou en \`"draft"\` est un brouillon.
`;
}

export function buildKit(out = join(ROOT, 'kit-dev')) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'schemas'), { recursive: true });
  mkdirSync(join(out, 'exemple/chemins'), { recursive: true });
  json(SCHEMAS).filter((n) => n.endsWith('.schema.json')).forEach((n) => copyFileSync(join(SCHEMAS, n), join(out, 'schemas', n)));
  json(EXAMPLE).filter((n) => !n.endsWith('.layout.json')).forEach((n) => copyFileSync(join(EXAMPLE, n), join(out, 'exemple', n)));
  json(join(EXAMPLE, 'chemins')).forEach((n) => copyFileSync(join(EXAMPLE, 'chemins', n), join(out, 'exemple/chemins', n)));
  writeFileSync(join(out, 'FORMAT.md'), kitFormat(readFileSync(join(ROOT, 'docs/FORMAT.md'), 'utf8')));
  const version = JSON.parse(readFileSync(join(EXAMPLE, 'projet.json'), 'utf8')).formatVersion;
  writeFileSync(join(out, 'LISEZMOI.md'), lisezmoi(version));
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = buildKit(process.argv[2] ? resolve(process.argv[2]) : undefined);
  console.log(`Kit développeurs créé : ${out}`);
}
