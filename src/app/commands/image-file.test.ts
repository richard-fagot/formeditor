import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import { useStore } from '../store';
import { command, runCommand } from './index';
import { imageFileName, imageTitle, safeFileName, stamp } from './image-file';

const st = () => useStore.getState();

describe('nom du fichier image (EVO-004)', () => {
  it('suit le modèle « projet - questionnaire - AAAAMMJJ.png » avec la date locale', () => {
    expect(imageFileName('Déclarations de sinistre', 'Déclaration de sinistre', new Date(2026, 0, 5, 23, 59)))
      .toBe('Déclarations de sinistre - Déclaration de sinistre - 20260105.png');
    expect(stamp(new Date(2026, 11, 31))).toBe('20261231');
  });

  it('remplace les caractères interdits, réduit les espaces, retire espaces et points finaux', () => {
    expect(safeFileName('a/b\\c:d*e?f"g<h>i|j\u0001k')).toBe('a_b_c_d_e_f_g_h_i_j_k');
    expect(safeFileName('  Projet   v2.  ')).toBe('Projet v2');
    expect(imageFileName('Assur: 2026', 'Sinistre / auto ?', new Date(2026, 9, 12))).toBe('Assur_ 2026 - Sinistre _ auto _ - 20261012.png');
  });

  it('nom de projet vide → « projet »', () => {
    expect(imageFileName('  ', 'Q', new Date(2026, 9, 12))).toBe('projet - Q - 20261012.png');
  });

  it('titre dans la langue affichée, repli sur la langue par défaut puis la clé', () => {
    const q = { key: 'decl', title: { fr: 'Déclaration', en: 'Claim' } };
    expect(imageTitle(q, 'en', 'fr')).toBe('Claim');
    expect(imageTitle(q, 'de', 'fr')).toBe('Déclaration');
    expect(imageTitle({ key: 'decl', title: {} }, 'de', 'fr')).toBe('decl');
  });
});

describe('commandes d’export d’image (EVO-004)', () => {
  beforeEach(() => {
    const ws = exampleWorkspace();
    st().loadWorkspace(ws);
    st().set((s) => {
      s.imageDialog = false;
      s.imageOptions = { scope: 'all', title: true };
    });
  });

  it('`view.exportImage` (X, logigramme) ouvre le dialogue, seulement en vue logigramme d’un questionnaire non vide', () => {
    const c = command('view.exportImage')!;
    expect(c.keys).toEqual(['x']);
    expect(c.scope).toBe('graph');
    expect(runCommand('view.exportImage')).toBe(true);
    expect(st().imageDialog).toBe(true);
    const qid = st().ws.questionnaires[0]!.id;
    st().set((s) => void (s.view[qid] = 'preview'));
    expect(c.enabled!()).toBe(false);
    st().set((s) => void (s.view[qid] = 'diagram'));
    st().edit(`q:${qid}`, (ws) => void (ws.questionnaires[0]!.nodes = []));
    expect(c.enabled!()).toBe(false);
  });

  it('`view.exportImageRun` mémorise les choix, ferme le dialogue et demande l’export', () => {
    st().set((s) => void (s.imageDialog = true));
    const before = st().imageRequest;
    runCommand('view.exportImageRun', { scope: 'selection', title: false });
    expect(st().imageOptions).toEqual({ scope: 'selection', title: false });
    expect(st().imageDialog).toBe(false);
    expect(st().imageRequest).toBe(before + 1);
    runCommand('view.exportImageRun', { scope: 'n’importe quoi' });
    expect(st().imageOptions).toEqual({ scope: 'all', title: true });
  });
});

describe('guide (EVO-004)', () => {
  it('décrit l’export d’image, son raccourci X et l’absence de SVG', () => {
    const guide = readFileSync('docs/GUIDE.md', 'utf8');
    expect(guide).toMatch(/\*\*Exporter le logigramme en image\*\* — `X` \(logigramme\)/);
    expect(guide).toContain('[cmd: view.exportImage]');
    expect(guide).toMatch(/\*\*Exporter le logigramme en SVG\*\*/);
    expect(Number(/jusqu'à EVO-(\d+)/.exec(guide)?.[1])).toBeGreaterThanOrEqual(4);
  });
});
