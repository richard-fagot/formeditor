import { describe, expect, it } from 'vitest';
import { FORMAT_VERSION, type Questionnaire } from '../core/model';
import { validateDocument } from './validate';
import { migrate, type Migrations } from './migrate';
import { serialize } from './serialize';
import { exportBundle, exportFiles, importFiles } from './files';
import { newWorkspace } from './workspace';

const minimalQuestionnaire = (): Questionnaire => ({
  formatVersion: FORMAT_VERSION,
  kind: 'questionnaire',
  id: 'q1',
  key: 'test',
  title: { fr: 'Test' },
  start: 'n1',
  nodes: [{ kind: 'question', id: 'n1', key: 'nom', label: { fr: 'Nom' }, type: 'text' }],
  edges: [],
});

describe('validateDocument', () => {
  it('accepte un questionnaire minimal', () => {
    expect(validateDocument(minimalQuestionnaire())).toEqual([]);
  });
  it('signale une propriété inconnue et un type inconnu', () => {
    const q = minimalQuestionnaire() as unknown as { nodes: Record<string, unknown>[] };
    q.nodes[0]!.couleur = 'bleu';
    expect(validateDocument(q).length).toBeGreaterThan(0);
    q.nodes[0]!.couleur = undefined;
    delete q.nodes[0]!.couleur;
    q.nodes[0]!.type = 'inconnu';
    expect(validateDocument(q).length).toBeGreaterThan(0);
  });
  it('refuse un paramètre qui n’appartient pas au type', () => {
    const q = minimalQuestionnaire() as unknown as { nodes: Record<string, unknown>[] };
    q.nodes[0]!.decimals = 2;
    expect(validateDocument(q).join()).toMatch(/decimals|unevaluated/);
  });
  it('refuse un document sans kind', () => {
    expect(validateDocument({ formatVersion: 1 })).toEqual(['Type de document inconnu (propriété "kind").']);
  });
});

describe('migrate', () => {
  const migrations: Migrations = {
    1: (d) => ({ ...d, formatVersion: 2, renamed: d.old }),
    2: (d) => ({ ...d, formatVersion: 3 }),
  };
  it('applique les migrations successives jusqu’à la version cible', () => {
    expect(migrate({ formatVersion: 1, old: 'x' }, migrations, 3)).toEqual({ formatVersion: 3, old: 'x', renamed: 'x' });
  });
  it('refuse une version plus récente que l’outil', () => {
    expect(() => migrate({ formatVersion: 9 }, migrations, 3)).toThrow(/plus récent/);
  });
});

describe('serialize', () => {
  it('produit un JSON indenté terminé par un saut de ligne', () => {
    expect(serialize({ a: 1, b: undefined })).toBe('{\n  "a": 1\n}\n');
  });
});

describe('import / export', () => {
  const ws = () => {
    const w = newWorkspace('Démo', 'fr');
    w.questionnaires.push(minimalQuestionnaire());
    w.project.questionnaires.push({ id: 'q1', file: 'test.json' });
    w.layouts.push({ formatVersion: FORMAT_VERSION, kind: 'layout', graph: 'q1', nodes: { n1: { x: 1, y: 2 } } });
    return w;
  };
  it('exporte des fichiers unitaires nommés et les réimporte à l’identique', () => {
    const original = ws();
    const files = exportFiles(original);
    expect(files.map((f) => f.name)).toEqual(['projet.json', 'bibliotheque.json', 'test.json', 'test.layout.json']);
    const back = importFiles(files);
    expect(back.errors).toEqual([]);
    expect(back.workspace).toEqual(original);
  });
  it('réimporte un bundle à l’identique', () => {
    const original = ws();
    const back = importFiles([{ name: 'demo.bundle.json', text: exportBundle(original) }]);
    expect(back.errors).toEqual([]);
    expect(back.workspace).toEqual(original);
  });
  it('fusionne un questionnaire importé seul dans le projet courant', () => {
    const q = { ...minimalQuestionnaire(), id: 'q2', key: 'autre' };
    const res = importFiles([{ name: 'autre.json', text: serialize(q) }], ws());
    expect(res.workspace?.questionnaires.map((x) => x.id)).toEqual(['q1', 'q2']);
    expect(res.workspace?.project.questionnaires.at(-1)).toEqual({ id: 'q2', file: 'autre.json' });
  });
  it('rapporte les erreurs de fichier sans rien charger', () => {
    const res = importFiles([{ name: 'x.json', text: '{ pas du json' }]);
    expect(res.workspace).toBeUndefined();
    expect(res.errors[0]).toMatch(/x\.json/);
  });
});
