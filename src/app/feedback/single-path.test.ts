import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * EVO-025 — contrôle automatique (docs/ERREURS.md) : hors tests,
 * - `window.confirm` n'est appelé que dans `app/feedback` ;
 * - `notice` n'est écrit que dans `app/feedback`, sauf sa remise à zéro (`= undefined`) à la fermeture de la boîte
 *   (`ui/shell/App.tsx`) et au chargement d'un projet (`app/store/store.ts`) ;
 * - `checkWorkspace` n'est appelé que dans `app/issues` (et dans `core`).
 */
const SRC = join(__dirname, '../..');
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [join(dir, e.name)] : []);
const sources = files(SRC).map((f) => ({ path: relative(SRC, f).split('\\').join('/'), text: readFileSync(f, 'utf8') }));
const offenders = (re: RegExp, allowed: (path: string, line: string) => boolean) =>
  sources.flatMap(({ path, text }) => text.split('\n').filter((l) => re.test(l) && !allowed(path, l)).map((l) => `${path}: ${l.trim()}`));

describe('EVO-025 — une seule voie pour signaler', () => {
  it('window.confirm seulement dans app/feedback', () => {
    expect(offenders(/window\.confirm\b/, (p) => p.startsWith('app/feedback/'))).toEqual([]);
  });

  it('notice écrit seulement par app/feedback (remise à zéro exceptée)', () => {
    const reset = new Set(['ui/shell/App.tsx', 'app/store/store.ts']);
    expect(offenders(/\.notice\s*=[^=]/, (p, l) => p.startsWith('app/feedback/') || (reset.has(p) && /\.notice\s*=\s*undefined\b/.test(l)))).toEqual([]);
  });

  it('checkWorkspace appelé seulement dans app/issues (et core)', () => {
    expect(offenders(/\bcheckWorkspace\(/, (p) => p.startsWith('app/issues/') || p.startsWith('core/'))).toEqual([]);
  });
});
