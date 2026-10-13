import { describe, expect, it } from 'vitest';
import { exportBundle, exportFiles, importFiles, validateDocument } from '../../src/format';
import { exampleFiles, exampleWorkspace } from './example';

describe('exemple « déclaration de sinistre »', () => {
  it.each(exampleFiles().map((f) => [f.name, f.text]))('%s est valide selon son schéma', (_name, text) => {
    expect(validateDocument(JSON.parse(text))).toEqual([]);
  });

  it('aller-retour import / export unitaire à l’identique', () => {
    const files = exampleFiles();
    const exported = exportFiles(exampleWorkspace());
    const byName = (list: { name: string; text: string }[]) =>
      Object.fromEntries(list.map((f) => [f.name, f.text]));
    expect(byName(exported)).toEqual(byName(files));
  });

  it('contient des libellés (EVO-005) : arête, arête de sortie de bloc, variable et champ de liste', () => {
    const ws = exampleWorkspace();
    const edges = ws.questionnaires.flatMap((q) => q.edges);
    expect(edges.some((e) => e.caption && e.when)).toBe(true);
    expect(edges.some((e) => e.caption && e.exit)).toBe(true);
    expect(ws.project.systemState.some((v) => v.caption)).toBe(true);
    expect(ws.project.systemState.some((v) => v.fields?.some((f) => f.caption))).toBe(true);
  });

  it('contient une question commentée (EVO-011), commentaires absents des fichiers du moteur', () => {
    const ws = exampleWorkspace();
    const c = ws.layouts.flatMap((l) => l.comments ?? []);
    expect(c.some((x) => x.node === 'n_date' && x.replies.length === 2)).toBe(true);
    for (const f of exportFiles(ws).filter((x) => !x.name.endsWith('.layout.json'))) expect(f.text).not.toContain('Faut-il borner');
  });

  it('contient un formulaire validé (EVO-015) et un non validé', () => {
    const ws = exampleWorkspace();
    expect(ws.questionnaires.map((q) => [q.key, q.status])).toEqual([['declaration_sinistre', undefined], ['demande_remboursement', 'validated']]);
  });

  it('question groupée avec « Autre (préciser) » (EVO-017) : export puis réimport, JSON inchangé', () => {
    const ws = exampleWorkspace();
    const q = ws.questionnaires.flatMap((x) => x.nodes).find((n) => n.id === 'n_qualite') as { other?: object };
    q.other = {};
    const exported = exportFiles(ws);
    const back = importFiles(exported);
    expect(back.errors).toEqual([]);
    expect(exportFiles(back.workspace!)).toEqual(exported);
  });

  it('aller-retour par bundle à l’identique', () => {
    const ws = exampleWorkspace();
    const bundle = exportBundle(ws);
    const back = importFiles([{ name: 'projet.bundle.json', text: bundle }]);
    expect(back.errors).toEqual([]);
    expect(exportBundle(back.workspace!)).toBe(bundle);
  });
});
