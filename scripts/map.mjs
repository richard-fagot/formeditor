// Régénère la partie factuelle de docs/MAP.md (modules, API publique, dépendances).
// La partie rédigée (matrice, invariants) est hors des marqueurs AUTO et n'est pas touchée.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const SRC = 'src';
const MAP = 'docs/MAP.md';
const START = '<!-- AUTO:DEBUT -->';
const END = '<!-- AUTO:FIN -->';

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const files = walk(SRC);
const modules = files
  .filter((f) => /\/index\.tsx?$/.test(f) && f !== 'src/index.ts')
  .map((f) => dirname(f))
  .filter((d) => d !== SRC)
  .sort();

const moduleOf = (file) =>
  modules.filter((m) => file.startsWith(m + '/')).sort((a, b) => b.length - a.length)[0];

const exportsOf = (mod) => {
  const idx = existsSync(join(mod, 'index.ts')) ? join(mod, 'index.ts') : join(mod, 'index.tsx');
  const src = readFileSync(idx, 'utf8');
  const names = new Set();
  for (const m of src.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g))
    m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean).forEach((n) => names.add(n));
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:function|const|class|type|interface|let)\s+(\w+)/g)) names.add(m[1]);
  for (const m of src.matchAll(/export\s+\*\s+from\s+'([^']+)'/g)) names.add(`* (${m[1]})`);
  return [...names];
};

const depsOf = (mod) => {
  const out = new Set();
  for (const f of files.filter((f) => moduleOf(f) === mod && /\.tsx?$/.test(f) && !f.endsWith('.test.ts'))) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(/(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/g)) {
      const spec = m[1];
      if (spec.startsWith('.')) {
        const target = relative('.', resolve(dirname(f), spec));
        const tm = moduleOf(target + '/') ?? moduleOf(target);
        if (tm && tm !== mod) out.add(tm.replace(/^src\//, ''));
      } else {
        out.add(spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
      }
    }
  }
  return [...out].sort();
};

const roleOf = (mod) => {
  const p = join(mod, 'README.md');
  if (!existsSync(p)) return '';
  const lines = readFileSync(p, 'utf8').split('\n').slice(1);
  return (lines.find((l) => l.trim() && !l.startsWith('#')) ?? '').trim();
};

const rows = modules.map((m) => {
  const name = m.replace(/^src\//, '');
  const lines = files.filter((f) => moduleOf(f) === m && /\.tsx?$/.test(f));
  const api = exportsOf(m).join(', ') || '—';
  return `| \`${name}\` | ${roleOf(m)} | ${api} | ${depsOf(m).join(', ') || '—'} | ${lines.length} |`;
});

const auto = [
  START,
  '<!-- Généré par `npm run map` : ne pas éditer à la main. -->',
  '',
  '| Module | Responsabilité | API publique (`index.ts`) | Dépendances | Fichiers |',
  '| --- | --- | --- | --- | --- |',
  ...rows,
  '',
  END,
].join('\n');

const current = existsSync(MAP) ? readFileSync(MAP, 'utf8') : `# Carte du code\n\n${START}\n${END}\n`;
const next = current.replace(new RegExp(`${START}[\\s\\S]*${END}`), auto);
writeFileSync(MAP, next);
console.log(`docs/MAP.md : ${modules.length} modules.`);
