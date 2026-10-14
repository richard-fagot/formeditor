import { describe, expect, it } from 'vitest';
import { FORMAT_VERSION } from '../core/model';
import { exportBundle, exportFiles, importFiles } from './files';
import { migrate, MIGRATIONS } from './migrate';
import { serialize } from './serialize';
import { validateDocument } from './validate';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;

/** Projet version 12 (bundle) contenant des tri-state : questionnaire, structure, bibliothèque, fragment, jeu de libellés. */
const v12 = (): Doc => ({
  formatVersion: 12,
  kind: 'bundle',
  project: { formatVersion: 12, kind: 'project', id: 'p', name: 'p', languages: ['fr'], defaultLanguage: 'fr', systemState: [], scenarios: [], questionnaires: [{ id: 'q1', file: 'test.json' }] },
  library: {
    formatVersion: 12, kind: 'library',
    questions: [{ id: 'lq', key: 'connu', label: { fr: 'Connu ?' }, type: 'tristate', default: true }],
    fragments: [{
      id: 'f', key: 'frag', title: { fr: 'F' },
      nodes: [{ kind: 'question', id: 'fn', key: 'assure', label: { fr: 'Assuré ?' }, type: 'tristate', labelSet: 'ls', default: 'unknown' }],
      edges: [],
    }],
    labelSets: [{ id: 'ls', key: 'oui_non_nsp', kind: 'tristate', yes: { fr: 'Oui' }, no: { fr: 'Non' }, unknown: { fr: 'Ne sait pas' } }],
  },
  questionnaires: [{
    formatVersion: 12, kind: 'questionnaire', id: 'q1', key: 'test', title: { fr: 'T' }, start: 'n1',
    nodes: [
      { kind: 'question', id: 'n1', key: 'constat', label: { fr: 'Constat ?' }, help: { fr: 'Aide' }, type: 'tristate', required: true, other: {} },
      { kind: 'question', id: 'n2', key: 'v', label: { fr: 'V' }, type: 'structure', fields: [{ id: 'c1', key: 'ok', label: { fr: 'OK' }, type: 'tristate', when: 'true' }] },
      { kind: 'question', id: 'n3', key: 'fin', label: { fr: 'Fin' }, type: 'boolean', dontKnow: { label: { fr: 'NSP' } } },
    ],
    edges: [{ id: 'e1', from: 'n1', to: 'n2', when: 'constat = true' }, { id: 'e2', from: 'n1', to: 'n3' }],
  }],
  layouts: [],
});

const load = (doc: Doc) => importFiles([{ name: 'session.bundle.json', text: JSON.stringify(doc) }]);

describe('migration 12 → 13 (EVO-018 : suppression du tri-state)', () => {
  it('le format courant est la version 13', () => {
    expect(FORMAT_VERSION).toBeGreaterThanOrEqual(13);
  });

  it('ouverture d’un projet : chaque tri-state devient un booléen avec « Ne sais pas », le reste conservé, sans erreur', () => {
    const back = load(v12());
    expect(back.errors).toEqual([]);
    const ws = back.workspace!;
    const [n1, n2] = ws.questionnaires[0]!.nodes as Doc[];
    expect(n1).toEqual({ kind: 'question', id: 'n1', key: 'constat', label: { fr: 'Constat ?' }, help: { fr: 'Aide' }, type: 'boolean', required: true, other: {}, dontKnow: {} });
    expect(n2!.fields[0]).toEqual({ id: 'c1', key: 'ok', label: { fr: 'OK' }, type: 'boolean', when: 'true', dontKnow: {} });
    expect(ws.library.questions[0]).toMatchObject({ type: 'boolean', default: true, dontKnow: {} });
    expect(ws.questionnaires[0]!.edges).toEqual(v12().questionnaires[0].edges);
    expect(JSON.stringify(ws)).not.toContain('tristate');
  });

  it('valeur par défaut « unknown » retirée, oui / non conservées', () => {
    const ws = load(v12()).workspace!;
    const fn = ws.library.fragments[0]!.nodes[0] as Doc;
    expect(fn).not.toHaveProperty('default');
    expect(fn).toMatchObject({ type: 'boolean', labelSet: 'ls', dontKnow: {} });
  });

  it('jeu de libellés tri-state → jeu booléen, troisième libellé abandonné', () => {
    expect(load(v12()).workspace!.library.labelSets).toEqual([{ id: 'ls', key: 'oui_non_nsp', kind: 'boolean', yes: { fr: 'Oui' }, no: { fr: 'Non' } }]);
  });

  it('import de fichiers unitaires d’une version antérieure : même conversion', () => {
    const b = v12();
    const files = [
      { name: 'projet.json', text: serialize(b.project) },
      { name: 'bibliotheque.json', text: serialize(b.library) },
      { name: 'test.json', text: serialize(b.questionnaires[0]) },
    ];
    const back = importFiles(files);
    expect(back.errors).toEqual([]);
    expect(back.workspace).toEqual(load(v12()).workspace);
  });

  it('projet déjà converti : rouvert ou réexporté sans nouvelle modification', () => {
    const ws = load(v12()).workspace!;
    const bundle = exportBundle(ws);
    expect(migrate(JSON.parse(bundle))).toEqual(JSON.parse(bundle));
    expect(load(JSON.parse(bundle)).workspace).toEqual(ws);
    // Fichiers unitaires : noms versionnés (EVO-022), réexport identique.
    const files = exportFiles(ws);
    expect(exportFiles(importFiles(files).workspace!)).toEqual(files);
  });

  it('projet sans tri-state : seul le numéro de version change', () => {
    const b = v12();
    b.questionnaires[0].nodes = [b.questionnaires[0].nodes[2]];
    b.questionnaires[0].edges = [];
    b.library = { formatVersion: 12, kind: 'library', questions: [], fragments: [], labelSets: [] };
    const m = migrate(b, MIGRATIONS, 13);
    expect(m).toEqual({ ...b, formatVersion: 13, project: { ...b.project, formatVersion: 13 }, library: { ...b.library, formatVersion: 13 },
      questionnaires: [{ ...b.questionnaires[0], formatVersion: 13 }] });
  });

  it('schéma : le type tristate et les jeux tri-state sont refusés', () => {
    const q = load(v12()).workspace!.questionnaires[0]! as Doc;
    expect(validateDocument(q)).toEqual([]);
    q.nodes[0].type = 'tristate';
    expect(validateDocument(q).length).toBeGreaterThan(0);
    const lib = load(v12()).workspace!.library as Doc;
    lib.labelSets[0].kind = 'tristate';
    expect(validateDocument(lib).length).toBeGreaterThan(0);
  });
});
