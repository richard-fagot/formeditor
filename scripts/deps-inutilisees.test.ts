import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Harnais : contrôle des dépendances inutilisées (`node scripts/deps-inutilisees.mjs`).
const lancer = (racine?: string) =>
  spawnSync('node', ['scripts/deps-inutilisees.mjs', ...(racine ? [racine] : [])], { encoding: 'utf8' });

function projet(pkg: object, fichiers: Record<string, string>): string {
  const racine = mkdtempSync(join(tmpdir(), 'deps-'));
  writeFileSync(join(racine, 'package.json'), JSON.stringify(pkg));
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    mkdirSync(join(racine, chemin, '..'), { recursive: true });
    writeFileSync(join(racine, chemin), contenu);
  }
  return racine;
}

describe('dépendances inutilisées', () => {
  it('l’état actuel du dépôt passe', () => {
    const r = lancer();
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('une dépendance inutilisée fait échouer le contrôle avec un message qui la nomme', () => {
    const racine = projet(
      {
        scripts: { verif: 'outil-x src' },
        dependencies: { 'pkg-utilise': '1', 'pkg-orphelin': '1', 'pkg-sous-chemin': '1' },
        devDependencies: { '@types/pkg-utilise': '1', 'pkg-outil': '1' },
      },
      {
        'src/a.ts': "import x from 'pkg-utilise';\nimport y from \"pkg-sous-chemin/client\";",
        'node_modules/pkg-outil/package.json': JSON.stringify({ bin: { 'outil-x': 'cli.js' } }),
      },
    );
    const r = lancer(racine);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('Dépendance inutilisée : « pkg-orphelin »');
    expect(r.stderr).not.toMatch(/« (pkg-utilise|pkg-sous-chemin|@types\/pkg-utilise|pkg-outil) »/);
  });
});
