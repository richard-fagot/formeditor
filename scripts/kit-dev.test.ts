import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { FORMAT_VERSION } from '../src/core/model';
import { validateDocument } from '../src/format';

// EVO-020 : kit de livraison aux développeurs (`npm run kit-dev`), produit ici dans un dossier temporaire.
const OUT = join(mkdtempSync(join(tmpdir(), 'kit-dev-')), 'kit-dev');
const build = () => execFileSync('node', ['scripts/kit-dev.mjs', OUT]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [relative(OUT, p)];
  }).sort();
}
const names = (dir: string, keep: (n: string) => boolean) => readdirSync(dir).filter(keep).sort();

describe('kit développeurs (EVO-020)', () => {
  beforeAll(build);

  it('produit exactement l’arborescence attendue ; relancé, remplace l’ancien contenu', () => {
    writeFileSync(join(OUT, 'ancien.txt'), 'x');
    build();
    const schemas = names('src/format/schemas', (n) => n.endsWith('.schema.json')).map((n) => `schemas/${n}`);
    const example = names('examples/declaration-sinistre', (n) => n.endsWith('.json') && !n.endsWith('.layout.json')).map((n) => `exemple/${n}`);
    const paths = names('examples/declaration-sinistre/chemins', (n) => n.endsWith('.json')).map((n) => `exemple/chemins/${n}`);
    expect(files(OUT)).toEqual(['FORMAT.md', 'LISEZMOI.md', ...schemas, ...example, ...paths].sort());
    expect(schemas).toHaveLength(6);
    expect(paths.length).toBeGreaterThan(0);
  });

  it('aucun *.layout.json ; tout JSON de exemple/ est valide pour son schéma (chemins : forme du §15)', () => {
    const all = files(OUT);
    expect(all.filter((f) => f.endsWith('.layout.json'))).toEqual([]);
    for (const f of all.filter((f) => f.startsWith('exemple/'))) {
      const doc = JSON.parse(readFileSync(join(OUT, f), 'utf8')) as Record<string, unknown>;
      if (f.startsWith('exemple/chemins/')) {
        expect(Object.keys(doc), f).toEqual(expect.arrayContaining(['questionnaire', 'scenario', 'today', 'answers', 'path', 'outcome']));
      } else {
        expect(doc.formatVersion, f).toBe(FORMAT_VERSION);
        expect(validateDocument(doc), f).toEqual([]);
      }
    }
  });

  it('tout chemin de fichier cité dans FORMAT.md et LISEZMOI.md existe dans le kit', () => {
    const all = files(OUT);
    const exists = (p: string) => {
      const re = new RegExp(`^${p.replace(/[.]/g, '\\.').replace(/\*/g, '[^/]*').replace(/\/$/, '/.*')}$`);
      return p.includes('/') ? all.some((f) => re.test(f)) || existsSync(join(OUT, p)) : all.some((f) => re.test(f.split('/').pop()!));
    };
    for (const doc of ['FORMAT.md', 'LISEZMOI.md']) {
      const md = readFileSync(join(OUT, doc), 'utf8');
      expect(md).not.toContain('<!-- outil -->');
      const cited = [...md.matchAll(/`([^`\s<.][^`\s<]*)`/g)].map((m) => m[1]!)
        .filter((t) => /\.(json|md)$/.test(t) || /^(src|docs|examples|schemas|exemple)\//.test(t));
      expect(cited.length, doc).toBeGreaterThan(0);
      expect(cited.filter((p) => !exists(p)), doc).toEqual([]);
    }
  });

  it('LISEZMOI.md : version du format, fichiers à joindre, seuls les questionnaires validés sont livrables', () => {
    const md = readFileSync(join(OUT, 'LISEZMOI.md'), 'utf8');
    expect(md).toContain(`version ${FORMAT_VERSION}`);
    expect(md).toContain('Exporter les fichiers unitaires');
    expect(md).toContain('.layout.json');
    expect(md).toContain('"status": "validated"');
  });
});
