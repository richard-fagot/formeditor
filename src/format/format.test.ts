import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FORMAT_VERSION, type ChoiceEntry, type Questionnaire } from '../core/model';
import { validateDocument } from './validate';
import { migrate, MIGRATIONS, type Migrations } from './migrate';
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
  it('refuse un id de nœud contenant « / » (réservé aux étapes instance/nœud)', () => {
    const q = minimalQuestionnaire();
    q.nodes[0]!.id = 'bloc/n1';
    expect(validateDocument(q).length).toBeGreaterThan(0);
  });
  it('refuse un code de langue invalide dans le projet et dans un texte', () => {
    const ws = newWorkspace('Projet', 'fr');
    expect(validateDocument({ ...ws.project, languages: ['fr', 'Français'] }).length).toBeGreaterThan(0);
    expect(validateDocument({ ...ws.project, defaultLanguage: 'FR' }).length).toBeGreaterThan(0);
    expect(validateDocument({ ...minimalQuestionnaire(), title: { fr_FR: 'Test' } }).length).toBeGreaterThan(0);
    expect(validateDocument({ ...ws.project, languages: ['fr', 'fr'] }).length).toBeGreaterThan(0);
    expect(validateDocument({ ...ws.project, languages: ['fr', 'pt-BR'] })).toEqual([]);
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

describe('migration 1 → 2 (EVO-001 : entrées d’options ordonnées)', () => {
  const fixture = (name: string) => ({ name, text: readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8') });
  const nodes = (doc: Record<string, unknown>) => doc.nodes as Record<string, unknown>[];

  it('`source` devient une entrée dynamique placée après les options statiques, partout', () => {
    const q = migrate(JSON.parse(fixture('questionnaire-v1.json').text));
    expect(q.formatVersion).toBe(FORMAT_VERSION);
    expect(validateDocument(q)).toEqual([]);
    const [lien, couleurs, struct] = nodes(q);
    expect(lien!.source).toBeUndefined();
    expect(lien!.options).toEqual([
      { value: 'aucun', label: { fr: 'Non, aucun' } },
      { value: 'autre', label: { fr: 'Un autre' }, when: 'sys.actif = true' },
      { from: 'sys.sinistres', label: "date & ' — ' & nature", value: 'id' },
    ]);
    expect(couleurs!.options).toEqual([{ value: 'bleu', label: { fr: 'Bleu' } }]);
    expect((struct!.fields as Record<string, unknown>[])[0]).toMatchObject({ options: [{ from: 'couleurs' }] });
    expect(JSON.stringify(q)).not.toContain('"source"');

    const lib = migrate(JSON.parse(fixture('bibliotheque-v1.json').text));
    expect(validateDocument(lib)).toEqual([]);
    expect((lib.questions as Record<string, unknown>[])[0]!.options).toEqual([{ value: 'x', label: { fr: 'X' } }, { from: 'sys.liste' }]);
    expect(nodes((lib.blocks as Record<string, unknown>[])[0]!)[0]!.options).toEqual([{ from: 'sys.liste', value: 'id' }]);
  });

  it('un projet enregistré avant l’évolution se charge (fichiers ou bundle v1), dynamiques en fin de liste', () => {
    const { workspace, errors } = importFiles([fixture('questionnaire-v1.json'), fixture('bibliotheque-v1.json')]);
    expect(errors).toEqual([]);
    const bundleV1 = { ...JSON.parse(exportBundle(workspace!)), formatVersion: 1 };
    // Bundle v1 reconstitué : on remet l'ancienne forme (`source` à part).
    const lien = bundleV1.questionnaires[0].nodes[0];
    lien.source = lien.options.pop();
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(bundleV1) }]);
    expect(back.errors).toEqual([]);
    expect(back.workspace!.questionnaires[0]!.nodes[0]).toMatchObject({ options: [{ value: 'aucun' }, { value: 'autre' }, { from: 'sys.sinistres' }] });
  });

  it('export puis réimport : l’ordre des entrées est identique', () => {
    const q = minimalQuestionnaire();
    const options = [
      { value: 'b', label: { fr: 'B' } },
      { from: 'sys.liste', label: 'nom', value: 'id', when: 'sys.actif = true' },
      { value: 'a', label: { fr: 'A' } },
      { from: 'nom' },
    ];
    q.nodes[0] = { kind: 'question', id: 'n1', key: 'choix', label: { fr: 'Choix' }, type: 'single', options };
    const ws = { ...newWorkspace('P', 'fr'), questionnaires: [q] };
    const back = importFiles(exportFiles(ws));
    expect(back.errors).toEqual([]);
    expect(back.workspace!.questionnaires[0]!.nodes[0]).toMatchObject({ options });
    expect(importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }]).workspace!.questionnaires[0]!.nodes[0]).toMatchObject({ options });
  });

  it('refuse l’ancien champ `source` dans un fichier version 2', () => {
    const q = migrate(JSON.parse(fixture('questionnaire-v1.json').text));
    nodes(q)[0]!.source = { from: 'sys.sinistres' };
    expect(validateDocument(q).length).toBeGreaterThan(0);
  });

  it('refuse une entrée qui mélange option statique et entrée dynamique', () => {
    const q = migrate(JSON.parse(fixture('questionnaire-v1.json').text));
    nodes(q)[0]!.options = [{ value: 'a', label: { fr: 'A' }, from: 'sys.x' }];
    expect(validateDocument(q).length).toBeGreaterThan(0);
  });
});

describe('migration 2 → 3 (EVO-003 : groupes d’options)', () => {
  const grouped = () => {
    const q = minimalQuestionnaire();
    const options = [
      { value: 'seul', label: { fr: 'Hors groupe' } },
      { group: { fr: 'Victime directe', en: 'Direct victim' }, code: 'SC', options: [{ value: 'conjoint', label: { fr: 'Conjoint' } }, { value: 'enfant', label: { fr: 'Enfant' } }] },
      { group: { fr: 'Ayant droit' }, when: 'nom = "x"', options: [{ value: 'conjoint', label: { fr: 'Conjoint' } }, { from: 'sys.liste' }] },
    ] as ChoiceEntry[];
    q.nodes[0] = { kind: 'question', id: 'n1', key: 'choix', label: { fr: 'Choix' }, type: 'single', options };
    return { q, options };
  };

  it('un document version 2 est migré sans transformation (bundle compris)', () => {
    const v2 = { ...minimalQuestionnaire(), formatVersion: 2 };
    expect(migrate(v2)).toEqual({ ...v2, formatVersion: FORMAT_VERSION });
    const ws = newWorkspace('P', 'fr');
    const bundle = { ...JSON.parse(exportBundle({ ...ws, questionnaires: [v2] })), formatVersion: 2 };
    bundle.project.formatVersion = 2;
    bundle.library.formatVersion = 2;
    bundle.questionnaires[0].formatVersion = 2;
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(bundle) }]);
    expect(back.errors).toEqual([]);
    expect(back.workspace!.questionnaires[0]!.formatVersion).toBe(FORMAT_VERSION);
    expect(back.workspace!.questionnaires[0]!.nodes).toEqual(v2.nodes);
  });

  it('accepte une entrée de groupe (code, condition, options et entrées dynamiques)', () => {
    expect(validateDocument(grouped().q)).toEqual([]);
  });

  it('refuse un groupe dans un groupe, un groupe sans `options` et une propriété inconnue', () => {
    const bad = (entry: unknown) => {
      const { q } = grouped();
      (q.nodes[0] as unknown as { options: unknown[] }).options = [entry];
      return validateDocument(q);
    };
    expect(bad({ group: { fr: 'A' }, options: [{ group: { fr: 'B' }, options: [] }] }).length).toBeGreaterThan(0);
    expect(bad({ group: { fr: 'A' } }).length).toBeGreaterThan(0);
    expect(bad({ group: { fr: 'A' }, options: [], couleur: 'bleu' }).length).toBeGreaterThan(0);
    expect(bad({ group: { fr: 'A' }, code: '', options: [] }).length).toBeGreaterThan(0);
  });

  it('export puis réimport : groupes, codes et ordre identiques', () => {
    const { q, options } = grouped();
    const ws = { ...newWorkspace('P', 'fr'), questionnaires: [q] };
    const back = importFiles(exportFiles(ws));
    expect(back.errors).toEqual([]);
    expect(back.workspace!.questionnaires[0]!.nodes[0]).toMatchObject({ options });
    expect(importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }]).workspace!.questionnaires[0]!.nodes[0]).toMatchObject({ options });
  });
});

describe('migration 3 → 4 (EVO-005 : libellés `caption`)', () => {
  const captioned = () => {
    const q = minimalQuestionnaire();
    q.nodes.push({ kind: 'end', id: 'n2', message: { fr: 'Fin' } });
    q.edges = [
      { id: 'e1', from: 'n1', to: 'n2', when: 'nom = "x"', caption: 'Ayant droit' },
      { id: 'e2', from: 'n1', to: 'n2', caption: 'Sinon' },
    ];
    const ws = newWorkspace('P', 'fr');
    ws.project.systemState = [
      { name: 'profil', type: 'enum', values: ['UD', 'AD'], caption: 'Profil connecté' },
      { name: 'contrats', type: 'list', fields: [{ name: 'numero', type: 'text', caption: 'Numéro de contrat' }] },
    ];
    return { ...ws, questionnaires: [q] };
  };

  it('un document version 3 est migré sans transformation (bundle compris) et reste valide', () => {
    const v3 = { ...minimalQuestionnaire(), formatVersion: 3 };
    expect(migrate(v3, MIGRATIONS, 4)).toEqual({ ...v3, formatVersion: 4 });
    const ws = newWorkspace('P', 'fr');
    const bundle = { ...JSON.parse(exportBundle({ ...ws, questionnaires: [v3] })), formatVersion: 3 };
    bundle.project.formatVersion = 3;
    bundle.library.formatVersion = 3;
    bundle.questionnaires[0].formatVersion = 3;
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(bundle) }]);
    expect(back.errors).toEqual([]);
    expect(back.workspace!.questionnaires[0]!.formatVersion).toBe(FORMAT_VERSION);
    expect(back.workspace!.project.formatVersion).toBe(FORMAT_VERSION);
    expect(back.workspace!.questionnaires[0]!.edges).toEqual([]);
  });

  it('accepte un libellé sur une arête, une variable et un champ de liste', () => {
    const ws = captioned();
    expect(validateDocument(ws.questionnaires[0]!)).toEqual([]);
    expect(validateDocument(ws.project)).toEqual([]);
  });

  it('refuse un libellé vide ou sur plusieurs lignes', () => {
    const ws = captioned();
    ws.questionnaires[0]!.edges[0]!.caption = 'Ayant\ndroit';
    expect(validateDocument(ws.questionnaires[0]!).length).toBeGreaterThan(0);
    ws.questionnaires[0]!.edges[0]!.caption = '';
    expect(validateDocument(ws.questionnaires[0]!).length).toBeGreaterThan(0);
    ws.project.systemState[0]!.caption = 'a\r\nb';
    expect(validateDocument(ws.project).length).toBeGreaterThan(0);
  });

  it('export puis réimport : libellés d’arêtes, de variables et de champs identiques', () => {
    const ws = captioned();
    for (const back of [importFiles(exportFiles(ws)), importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }])]) {
      expect(back.errors).toEqual([]);
      expect(back.workspace!.questionnaires[0]!.edges).toEqual(ws.questionnaires[0]!.edges);
      expect(back.workspace!.project.systemState).toEqual(ws.project.systemState);
    }
  });
});

describe('migration 4 → 5 (EVO-006 : option « Ne sais pas »)', () => {
  const withDontKnow = () => {
    const q = minimalQuestionnaire();
    q.nodes = [
      { kind: 'question', id: 'n1', key: 'nom', label: { fr: 'Nom' }, type: 'text', dontKnow: {} },
      { kind: 'question', id: 'n2', key: 'lien', label: { fr: 'Lien' }, type: 'single', options: [{ value: 'a', label: { fr: 'A' } }], other: {},
        dontKnow: { label: { fr: 'Inconnu ({nom})', en: 'Unknown' } } },
      { kind: 'question', id: 'n3', key: 'v', label: { fr: 'V' }, type: 'structure', fields: [{ id: 'f1', key: 'age', label: { fr: 'Âge' }, type: 'number', dontKnow: {} }] },
    ];
    return { ...newWorkspace('P', 'fr'), questionnaires: [q] };
  };

  it('le format courant est la version 5', () => {
    expect(FORMAT_VERSION).toBe(5);
  });

  it('un document version 4 est migré sans transformation (bundle compris) : aucune « Ne sais pas »', () => {
    const v4 = { ...minimalQuestionnaire(), formatVersion: 4 };
    expect(migrate(v4)).toEqual({ ...v4, formatVersion: 5 });
    const bundle = { ...JSON.parse(exportBundle({ ...newWorkspace('P', 'fr'), questionnaires: [v4] })), formatVersion: 4 };
    for (const k of ['project', 'library']) bundle[k].formatVersion = 4;
    bundle.questionnaires[0].formatVersion = 4;
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(bundle) }]);
    expect(back.errors).toEqual([]);
    expect(back.workspace!.questionnaires[0]!.formatVersion).toBe(5);
    expect(JSON.stringify(back.workspace)).not.toContain('dontKnow');
  });

  it('accepte « Ne sais pas » sur une question et un champ de structure, la refuse sur une structure', () => {
    const ws = withDontKnow();
    expect(validateDocument(ws.questionnaires[0]!)).toEqual([]);
    (ws.questionnaires[0]!.nodes[2] as unknown as Record<string, unknown>).dontKnow = {};
    expect(validateDocument(ws.questionnaires[0]!).length).toBeGreaterThan(0);
    const bad = withDontKnow();
    (bad.questionnaires[0]!.nodes[0] as unknown as Record<string, unknown>).dontKnow = { x: 1 };
    expect(validateDocument(bad.questionnaires[0]!).length).toBeGreaterThan(0);
  });

  it('export puis réimport : activation, libellé et traductions identiques', () => {
    const ws = withDontKnow();
    for (const back of [importFiles(exportFiles(ws)), importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }])]) {
      expect(back.errors).toEqual([]);
      expect(back.workspace!.questionnaires[0]!.nodes).toEqual(ws.questionnaires[0]!.nodes);
    }
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
