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
    expect(nodes((lib.fragments as Record<string, unknown>[])[0]!)[0]!.options).toEqual([{ from: 'sys.liste', value: 'id' }]);
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

  it('un document version 4 est migré sans transformation (bundle compris) : aucune « Ne sais pas »', () => {
    const v4 = { ...minimalQuestionnaire(), formatVersion: 4 };
    expect(migrate(v4, MIGRATIONS, 5)).toEqual({ ...v4, formatVersion: 5 });
    const bundle = { ...JSON.parse(exportBundle({ ...newWorkspace('P', 'fr'), questionnaires: [v4] })), formatVersion: 4 };
    for (const k of ['project', 'library']) bundle[k].formatVersion = 4;
    bundle.questionnaires[0].formatVersion = 4;
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(bundle) }]);
    expect(back.errors).toEqual([]);
    expect(back.workspace!.questionnaires[0]!.formatVersion).toBe(FORMAT_VERSION);
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

describe('migration 5 → 6 (EVO-007 : types mail, téléphone, adresse, civilité)', () => {
  const withContact = () => {
    const q = minimalQuestionnaire();
    q.nodes = [
      { kind: 'question', id: 'n1', key: 'mail', label: { fr: 'Mail' }, type: 'email', messages: { email: { fr: 'Mail incorrect', en: 'Wrong email' } } },
      { kind: 'question', id: 'n2', key: 'tel', label: { fr: 'Tél' }, type: 'phone', defaultCountry: 'BE', countries: ['FR', 'BE'], lineType: 'mobile' },
      { kind: 'question', id: 'n3', key: 'souscripteur', label: { fr: 'Souscripteur' }, type: 'structure', fields: [
        { id: 'f1', key: 'civilite', label: { fr: 'Civilité' }, type: 'civility', short: true, undisclosed: true, labels: { MME: { fr: 'Mme', en: 'Ms' } } },
        { id: 'f2', key: 'adresse', label: { fr: 'Adresse' }, type: 'address', defaultCountry: 'FR', countries: ['FR'], minLength: 10, maxLength: 120, verify: true },
      ] },
    ];
    return { ...newWorkspace('P', 'fr'), questionnaires: [q] };
  };

  it('un document version 5 est migré sans transformation vers la version 6', () => {
    const v5 = { ...minimalQuestionnaire(), formatVersion: 5 };
    expect(migrate(v5, MIGRATIONS, 6)).toEqual({ ...v5, formatVersion: 6 });
    const bundle = { ...JSON.parse(exportBundle({ ...newWorkspace('P', 'fr'), questionnaires: [v5] })), formatVersion: 5 };
    for (const k of ['project', 'library']) bundle[k].formatVersion = 5;
    bundle.questionnaires[0].formatVersion = 5;
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(bundle) }]);
    expect(back.errors).toEqual([]);
    expect(back.workspace!.questionnaires[0]!.formatVersion).toBe(FORMAT_VERSION);
  });

  it('accepte les quatre types et leurs paramètres, refuse un paramètre étranger ou un code pays invalide', () => {
    expect(validateDocument(withContact().questionnaires[0]!)).toEqual([]);
    const bad = (patch: Record<string, unknown>, i = 1) => {
      const ws = withContact();
      Object.assign(ws.questionnaires[0]!.nodes[i] as unknown as Record<string, unknown>, patch);
      return validateDocument(ws.questionnaires[0]!).length;
    };
    expect(bad({ defaultCountry: 'fr' })).toBeGreaterThan(0);
    expect(bad({ lineType: 'satellite' })).toBeGreaterThan(0);
    expect(bad({ verify: true })).toBeGreaterThan(0);
    expect(bad({ minLength: 2 }, 0)).toBeGreaterThan(0);
    const field = withContact();
    ((field.questionnaires[0]!.nodes[2] as unknown as { fields: Record<string, unknown>[] }).fields[0]!).labels = { MLLE: { fr: 'Mlle' } };
    expect(validateDocument(field.questionnaires[0]!).length).toBeGreaterThan(0);
  });

  it('export puis réimport : types, paramètres, messages surchargés et traductions identiques', () => {
    const ws = withContact();
    for (const back of [importFiles(exportFiles(ws)), importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }])]) {
      expect(back.errors).toEqual([]);
      expect(back.workspace!.questionnaires[0]!.nodes).toEqual(ws.questionnaires[0]!.nodes);
    }
  });
});

describe('migration 6 → 7 (EVO-008 : fragments de questionnaire)', () => {
  /** Projet version 6 : un bloc (départ, sorties nommées) instancié au milieu d'un questionnaire. */
  const v6Bundle = () => {
    const ws = newWorkspace('P', 'fr');
    const q = { ...minimalQuestionnaire(), formatVersion: 6 } as unknown as Record<string, unknown>;
    q.nodes = [
      { kind: 'question', id: 'n1', key: 'motif', label: { fr: 'Motif' }, type: 'text' },
      { kind: 'block', id: 'i1', ref: 'b1', alias: 'ident' },
      { kind: 'end', id: 'fin', message: { fr: 'Fin' } },
    ];
    q.edges = [{ id: 'e1', from: 'n1', to: 'i1' }, { id: 'e2', from: 'i1', to: 'fin', exit: 'ok' }];
    const bloc = (id: string, start: string, edges: unknown[]) => ({
      id, key: id, title: { fr: id }, start,
      nodes: [
        { kind: 'question', id: 'a', key: 'nom', label: { fr: 'Nom' }, type: 'text' },
        { kind: 'question', id: 'b', key: 'prenom', label: { fr: 'Prénom' }, type: 'text' },
        { kind: 'exit', id: 'x', name: 'ok' },
      ],
      edges,
    });
    const bundle = JSON.parse(exportBundle({ ...ws, questionnaires: [q as never] }));
    bundle.formatVersion = 6;
    bundle.project.formatVersion = 6;
    const { fragments: _f, ...library } = bundle.library;
    bundle.library = { ...library, formatVersion: 6, blocks: [
      bloc('b1', 'a', [{ id: 'be1', from: 'a', to: 'b' }, { id: 'be2', from: 'b', to: 'x' }]),
      // Bloc qui boucle sur son départ : aucun nœud sans arête entrante → `entry` conservée.
      bloc('b2', 'b', [{ id: 'be1', from: 'a', to: 'b' }, { id: 'be2', from: 'b', to: 'a' }, { id: 'be3', from: 'b', to: 'x' }]),
    ] };
    bundle.questionnaires[0].formatVersion = 6;
    return bundle;
  };

  it('un projet version 6 se charge : blocs → fragments, instances → nœuds fragment, départ → entrée si nécessaire', () => {
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(v6Bundle()) }]);
    expect(back.errors).toEqual([]);
    const ws = back.workspace!;
    expect(ws.library.formatVersion).toBe(FORMAT_VERSION);
    expect(JSON.stringify(ws)).not.toContain('"block"');
    expect(ws.library.fragments.map((f) => [f.id, f.entry])).toEqual([['b1', undefined], ['b2', 'b']]);
    expect(ws.library.fragments[0]).not.toHaveProperty('start');
    expect(ws.questionnaires[0]!.nodes[1]).toEqual({ kind: 'fragment', id: 'i1', ref: 'b1', alias: 'ident' });
    expect(ws.questionnaires[0]!.edges[1]).toEqual({ id: 'e2', from: 'i1', to: 'fin', exit: 'ok' });
  });

  it('fichiers unitaires version 6 (bibliothèque seule) : même migration', () => {
    const lib = migrate(v6Bundle().library);
    expect(validateDocument(lib)).toEqual([]);
    expect(lib).not.toHaveProperty('blocks');
    expect((lib.fragments as { key: string }[]).map((f) => f.key)).toEqual(['b1', 'b2']);
  });

  it('refuse un bloc ou un départ de fragment dans un document version 7', () => {
    const ws = importFiles([{ name: 'p.bundle.json', text: JSON.stringify(v6Bundle()) }]).workspace!;
    const lib = JSON.parse(JSON.stringify(ws.library));
    lib.fragments[0].start = 'a';
    expect(validateDocument(lib).length).toBeGreaterThan(0);
    const q = JSON.parse(JSON.stringify(ws.questionnaires[0]));
    q.nodes[1].kind = 'block';
    expect(validateDocument(q).length).toBeGreaterThan(0);
  });

  it('export puis réimport : fragments, instances, alias, entrée et départ sur un fragment identiques', () => {
    const ws = importFiles([{ name: 'p.bundle.json', text: JSON.stringify(v6Bundle()) }]).workspace!;
    ws.questionnaires[0]!.start = 'i1';
    ws.layouts.push({ formatVersion: FORMAT_VERSION, kind: 'layout', graph: 'b2', nodes: { a: { x: 1, y: 2 } } });
    const files = exportFiles(ws);
    expect(files.map((f) => f.name)).toContain('fragment_b2.layout.json');
    for (const back of [importFiles(files), importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }])]) {
      expect(back.errors).toEqual([]);
      expect(back.workspace!.library.fragments).toEqual(ws.library.fragments);
      expect(back.workspace!.questionnaires).toEqual(ws.questionnaires);
      expect(back.workspace!.layouts).toEqual(ws.layouts);
    }
  });
});

describe('champs masqués d’une instance (EVO-009, version 8)', () => {
  const v7 = () => {
    const ws = newWorkspace('p', 'fr');
    ws.library.questions.push({ id: 'lq_id', key: 'identite', label: { fr: 'Identité' }, type: 'structure', fields: [
      { id: 'f1', key: 'nom', label: { fr: 'Nom' }, type: 'text' }, { id: 'f2', key: 'mail', label: { fr: 'Mail' }, type: 'email' },
    ] });
    ws.questionnaires.push({ formatVersion: 7, kind: 'questionnaire', id: 'q', key: 'q', title: { fr: 'Q' }, start: 'n', nodes: [{ kind: 'question', id: 'n', ref: 'lq_id' }], edges: [] });
    const bundle = JSON.parse(exportBundle(ws));
    bundle.formatVersion = 7;
    bundle.library.formatVersion = 7;
    bundle.project.formatVersion = 7;
    return bundle;
  };

  it('un document version 7 migre au format courant', () => {
    expect(migrate({ formatVersion: 7, kind: 'layout', graph: 'g', nodes: {} }).formatVersion).toBe(FORMAT_VERSION);
  });

  it('un projet version 7 se charge sans erreur, instances sans champ masqué', () => {
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(v7()) }]);
    expect(back.errors).toEqual([]);
    expect(back.workspace!.library.formatVersion).toBe(FORMAT_VERSION);
    expect(back.workspace!.questionnaires[0]!.nodes[0]).toEqual({ kind: 'question', id: 'n', ref: 'lq_id' });
  });

  it('schéma : `hiddenFields` (liste de clés) accepté sur une référence, refusé ailleurs ou mal formé', () => {
    const ws = importFiles([{ name: 'p.bundle.json', text: JSON.stringify(v7()) }]).workspace!;
    const q = JSON.parse(JSON.stringify(ws.questionnaires[0]));
    q.nodes[0].hiddenFields = ['mail'];
    expect(validateDocument(q)).toEqual([]);
    expect(validateDocument({ ...q, nodes: [{ ...q.nodes[0], hiddenFields: ['Mail'] }] }).length).toBeGreaterThan(0);
    expect(validateDocument({ ...q, nodes: [{ ...q.nodes[0], hiddenFields: ['mail', 'mail'] }] }).length).toBeGreaterThan(0);
    expect(validateDocument({ ...q, nodes: [{ kind: 'question', id: 'n', key: 'x', label: { fr: 'X' }, type: 'text', hiddenFields: ['a'] }] }).length).toBeGreaterThan(0);
  });

  it('export puis réimport : bibliothèque, références et champs masqués identiques', () => {
    const ws = importFiles([{ name: 'p.bundle.json', text: JSON.stringify(v7()) }]).workspace!;
    (ws.questionnaires[0]!.nodes[0] as { hiddenFields?: string[] }).hiddenFields = ['mail'];
    for (const back of [importFiles(exportFiles(ws)), importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }])]) {
      expect(back.errors).toEqual([]);
      expect(back.workspace!.library).toEqual(ws.library);
      expect(back.workspace!.questionnaires).toEqual(ws.questionnaires);
    }
  });
});

describe('commentaires de révision (EVO-011, version 9)', () => {
  const v8 = () => {
    const ws = newWorkspace('p', 'fr');
    ws.questionnaires.push({ ...minimalQuestionnaire(), formatVersion: 8 });
    ws.project.questionnaires.push({ id: 'q1', file: 'test.json' });
    ws.layouts.push({ formatVersion: 8, kind: 'layout', graph: 'q1', nodes: { n1: { x: 1, y: 2 } } });
    const bundle = JSON.parse(exportBundle(ws));
    bundle.formatVersion = 8;
    bundle.library.formatVersion = 8;
    bundle.project.formatVersion = 8;
    return bundle;
  };
  const comment = { node: 'n1', x: 300, y: 2, text: 'Faut-il borner ?\nÀ voir.', replies: ['Oui.', 'Et pas avant la date d’effet.'] };

  it('un projet version 8 se charge sans erreur et sans commentaire', () => {
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(v8()) }]);
    expect(back.errors).toEqual([]);
    expect(back.workspace!.layouts[0]!.formatVersion).toBe(FORMAT_VERSION);
    expect(back.workspace!.layouts[0]!.comments).toBeUndefined();
  });

  it('schéma : `comments` accepté dans une mise en page, refusé mal formé', () => {
    const layout = { formatVersion: 9, kind: 'layout', graph: 'q1', nodes: {}, comments: [comment] };
    expect(validateDocument(layout)).toEqual([]);
    expect(validateDocument({ ...layout, comments: [{ node: 'n1', text: 'x', replies: [] }] })).toEqual([]);
    expect(validateDocument({ ...layout, comments: [{ ...comment, replies: [1] }] }).length).toBeGreaterThan(0);
    expect(validateDocument({ ...layout, comments: [{ ...comment, author: 'moi' }] }).length).toBeGreaterThan(0);
    expect(validateDocument({ ...layout, comments: [{ text: 'x', replies: [] }] }).length).toBeGreaterThan(0);
  });

  it('export puis réimport : commentaires, réponses et position identiques ; absents des fichiers du moteur', () => {
    const ws = importFiles([{ name: 'p.bundle.json', text: JSON.stringify(v8()) }]).workspace!;
    ws.layouts[0]!.comments = [comment];
    ws.library.questions.push({ id: 'lq', key: 'date_sinistre', label: { fr: 'Date' }, type: 'date' });
    ws.layouts.push({ formatVersion: FORMAT_VERSION, kind: 'layout', graph: 'lq', nodes: {}, comments: [{ node: 'lq', text: 'Libellé ?', replies: [] }] });
    const files = exportFiles(ws);
    expect(files.map((f) => f.name)).toContain('question_date_sinistre.layout.json');
    for (const f of files.filter((x) => !x.name.endsWith('.layout.json'))) expect(f.text).not.toContain('Faut-il');
    for (const back of [importFiles(files), importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }])]) {
      expect(back.errors).toEqual([]);
      expect(back.workspace!.layouts).toEqual(ws.layouts);
    }
  });
});

describe('surcharge du caractère obligatoire (EVO-012, version 10)', () => {
  const v9 = () => {
    const ws = newWorkspace('p', 'fr');
    ws.library.questions.push({ id: 'lq_tel', key: 'tel', label: { fr: 'Téléphone' }, type: 'text' });
    ws.library.fragments.push({ id: 'f', key: 'coord', title: { fr: 'Coordonnées' }, nodes: [{ kind: 'question', id: 'n_tel', ref: 'lq_tel' }], edges: [] });
    ws.questionnaires.push({ ...minimalQuestionnaire(), formatVersion: 9, nodes: [{ kind: 'question', id: 'n1', ref: 'lq_tel' }, { kind: 'fragment', id: 'c', ref: 'f', alias: 'coord' }] });
    ws.project.questionnaires.push({ id: 'q1', file: 'test.json' });
    const bundle = JSON.parse(exportBundle(ws));
    for (const d of [bundle, bundle.library, bundle.project, ...bundle.questionnaires]) d.formatVersion = 9;
    return bundle;
  };

  it('un projet version 9 se charge sans erreur, toutes les utilisations en « Hérité »', () => {
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(v9()) }]);
    expect(back.errors).toEqual([]);
    const q = back.workspace!.questionnaires[0]!;
    expect(q.formatVersion).toBe(FORMAT_VERSION);
    expect(q.nodes.some((n) => 'required' in n || 'requiredOverrides' in n)).toBe(false);
    expect(back.workspace!.library.fragments[0]!.nodes[0]).not.toHaveProperty('required');
  });

  it('schéma : `required` booléen sur une référence, `requiredOverrides` sur un appel ; refusés mal formés', () => {
    const q = { ...minimalQuestionnaire(), nodes: [{ kind: 'question', id: 'n1', ref: 'lq_tel', required: true }, { kind: 'fragment', id: 'c', ref: 'f', alias: 'coord', requiredOverrides: { n_tel: false, 'n_in/n_tel': true } }] };
    expect(validateDocument(q)).toEqual([]);
    expect(validateDocument({ ...q, nodes: [{ kind: 'question', id: 'n1', ref: 'lq_tel', required: 'x = 1' }] }).length).toBeGreaterThan(0);
    expect(validateDocument({ ...q, nodes: [{ kind: 'fragment', id: 'c', ref: 'f', alias: 'coord', requiredOverrides: { n_tel: 'oui' } }] }).length).toBeGreaterThan(0);
  });

  it('export puis réimport : surcharges identiques', () => {
    const ws = importFiles([{ name: 'p.bundle.json', text: JSON.stringify(v9()) }]).workspace!;
    const [ref, call] = ws.questionnaires[0]!.nodes as unknown as [Record<string, unknown>, Record<string, unknown>];
    ref.required = false;
    call.requiredOverrides = { n_tel: true };
    (ws.library.fragments[0]!.nodes[0] as unknown as Record<string, unknown>).required = true;
    for (const back of [importFiles(exportFiles(ws)), importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }])]) {
      expect(back.errors).toEqual([]);
      expect(back.workspace!.questionnaires).toEqual(ws.questionnaires);
      expect(back.workspace!.library).toEqual(ws.library);
    }
  });
});

describe('état de validation d’un formulaire (EVO-015, version 11)', () => {
  const v10 = () => {
    const ws = newWorkspace('p', 'fr');
    ws.questionnaires.push(minimalQuestionnaire(), { ...minimalQuestionnaire(), id: 'q2', key: 'autre' });
    ws.project.questionnaires.push({ id: 'q1', file: 'test.json' }, { id: 'q2', file: 'autre.json' });
    const bundle = JSON.parse(exportBundle(ws));
    for (const d of [bundle, bundle.library, bundle.project, ...bundle.questionnaires]) d.formatVersion = 10;
    return bundle;
  };

  it('le format courant est la version 11', () => {
    expect(FORMAT_VERSION).toBe(11);
  });

  it('un projet version 10 se charge sans erreur, tous ses formulaires non validés', () => {
    const back = importFiles([{ name: 'ancien.bundle.json', text: JSON.stringify(v10()) }]);
    expect(back.errors).toEqual([]);
    for (const q of back.workspace!.questionnaires) {
      expect(q.formatVersion).toBe(11);
      expect(q).not.toHaveProperty('status');
      expect(q).not.toHaveProperty('validatedAt');
    }
  });

  it('schéma : `status` énuméré, `validatedAt` date ; refusés mal formés', () => {
    expect(validateDocument({ ...minimalQuestionnaire(), status: 'validated', validatedAt: '2026-10-13' })).toEqual([]);
    expect(validateDocument({ ...minimalQuestionnaire(), status: 'draft' })).toEqual([]);
    expect(validateDocument({ ...minimalQuestionnaire(), status: 'livré' }).length).toBeGreaterThan(0);
    expect(validateDocument({ ...minimalQuestionnaire(), status: true }).length).toBeGreaterThan(0);
    expect(validateDocument({ ...minimalQuestionnaire(), status: 'validated', validatedAt: '13/10/2026' }).length).toBeGreaterThan(0);
  });

  it('export puis réimport : état de validation de chaque formulaire identique', () => {
    const ws = importFiles([{ name: 'p.bundle.json', text: JSON.stringify(v10()) }]).workspace!;
    Object.assign(ws.questionnaires[0]!, { status: 'validated', validatedAt: '2026-10-13' });
    for (const back of [importFiles(exportFiles(ws)), importFiles([{ name: 'p.bundle.json', text: exportBundle(ws) }])]) {
      expect(back.errors).toEqual([]);
      expect(back.workspace!.questionnaires.map((q) => [q.status, q.validatedAt])).toEqual([['validated', '2026-10-13'], [undefined, undefined]]);
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
