import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exampleFiles, exampleWorkspace } from '../../../tests/reference/example';
import { FORMAT_VERSION, type Question, type QuestionType, type Workspace } from '../../core/model';
import { exportBundle, exportFiles } from '../../format';
import { questionType } from '../../registry';
import { useStore } from '../store';
import { command, commands, runCommand } from './index';
import { ABOUT_SHEET, DATA_SHEET, FILLED_COLOR, FILLED_COLUMNS, inventoryFileName, inventorySheets, NOTICE, TODO_COLOR, TODO_COLUMNS } from './inventory-file';

// EVO-029 : export de l'inventaire des données (amorce RGPD) — nom, contenu des onglets, commande.

const written = vi.hoisted(() => ({ sheets: [] as unknown[], downloads: [] as string[] }));
vi.mock('write-excel-file/browser', () => ({
  default: (sheets: unknown) => {
    written.sheets.push(sheets);
    return { toBlob: () => Promise.resolve(new Blob(['xlsx'])) };
  },
}));
vi.mock('./files', async (orig) => ({ ...(await orig<typeof import('./files')>()), download: (name: string) => void written.downloads.push(name) }));

const st = () => useStore.getState();
const typeName = (t: QuestionType) => questionType(t)!.name.fr!;
const date = new Date(2026, 9, 19);
type Cell = null | string | { value: string; fontWeight?: string; backgroundColor?: string };
const value = (c: Cell) => (c && typeof c === 'object' ? c.value : c);
const decl = (ws: Workspace) => ws.questionnaires.find((q) => q.key === 'declaration_sinistre')!;
const dataOf = (ws: Workspace, q = decl(ws)) => inventorySheets(ws, q, date, typeName)[0]!.data as Cell[][];
const rowOf = (data: Cell[][], path: string) => data.find((r) => r[1] === path)!;
const flush = () => new Promise((r) => setTimeout(r, 0));

/** Espace de travail de l'exemple avec une question locale ajoutée au questionnaire « declaration_sinistre ». */
function withQuestion(question: Partial<Question>): Workspace {
  const ws = exampleWorkspace();
  decl(ws).nodes.push({ kind: 'question', id: 'n_ajout', key: 'ajout', label: { fr: 'Ajout' }, type: 'text', ...question } as never);
  return ws;
}

describe('nom du fichier (EVO-029)', () => {
  it('EVO-029-007 — nom du JSON exporté, « .json » remplacé par « - inventaire.xlsx »', () => {
    expect(inventoryFileName({ key: 'declaration_sinistre', version: '1.0.5' })).toBe('declaration_sinistre - 1.0.5 - provisoire - inventaire.xlsx');
  });
  it('EVO-029-008 — validé en 1.0.4 → `<clé> - 1.0.4 - final - inventaire.xlsx`', () => {
    expect(inventoryFileName({ key: 'dc', version: '1.0.4', status: 'validated' })).toBe('dc - 1.0.4 - final - inventaire.xlsx');
  });
  it('EVO-029-009 — version vide : segment omis', () => {
    expect(inventoryFileName({ key: 'dc', version: '' })).toBe('dc - provisoire - inventaire.xlsx');
  });
  it('EVO-029-010 — caractère interdit remplacé par `_`, comme pour le JSON', () => {
    expect(inventoryFileName({ key: 'dc', version: '1/2' })).toBe('dc - 1_2 - provisoire - inventaire.xlsx');
  });
});

describe('onglet « Données » (EVO-029)', () => {
  it('EVO-029-022 / EVO-029-023 — colonnes pré-remplies puis à compléter, dans l’ordre', () => {
    expect(dataOf(exampleWorkspace())[0]!.map(value)).toEqual([
      'Identifiant', 'Chemin', 'Intitulé', 'Type', 'Obligatoire', 'Répétable', 'Donnée personnelle présumée', 'Description',
      'Catégorie de donnée', 'Donnée sensible (art. 9 / 10)', 'Finalité', 'Justification (minimisation)', 'Base légale',
      'Durée de conservation', 'Destinataires', 'Observations',
    ]);
  });

  it('EVO-029-046 — colonnes à compléter vides, texte libre sans liste déroulante', () => {
    const data = dataOf(exampleWorkspace());
    expect(data.length).toBeGreaterThan(1);
    for (const row of data.slice(1)) expect(row.slice(FILLED_COLUMNS.length)).toEqual(TODO_COLUMNS.map(() => null));
    expect(JSON.stringify(inventorySheets(exampleWorkspace(), decl(exampleWorkspace()), date, typeName))).not.toMatch(/validation|list/i);
  });

  it('EVO-029-047 — en-têtes à compléter distingués visuellement des pré-remplis', () => {
    const head = dataOf(exampleWorkspace())[0]! as { backgroundColor: string; fontWeight: string }[];
    expect(head.slice(0, 8).every((c) => c.backgroundColor === FILLED_COLOR && c.fontWeight === 'bold')).toBe(true);
    expect(head.slice(8).every((c) => c.backgroundColor === TODO_COLOR && c.fontWeight === 'bold')).toBe(true);
    expect(FILLED_COLOR).not.toBe(TODO_COLOR);
  });

  it('EVO-029-024 — Identifiant = `<clé du questionnaire>/<chemin>`', () => {
    for (const row of dataOf(exampleWorkspace()).slice(1)) expect(row[0]).toBe(`declaration_sinistre/${row[1]}`);
  });

  it('EVO-029-025 / EVO-029-048 — intitulé français non interpolé ; sans traduction française : vide', () => {
    const ws = withQuestion({ label: { fr: 'Bonjour {nom}', en: 'Hello' } });
    decl(ws).nodes.push({ kind: 'question', id: 'n_en', key: 'en_seul', label: { en: 'Only' }, type: 'text' } as never);
    const data = dataOf(ws);
    expect(rowOf(data, 'ajout')[2]).toBe('Bonjour {nom}');
    expect(rowOf(data, 'en_seul')[2]).toBeNull();
  });

  it('EVO-029-026 — Type : nom français affiché dans l’éditeur', () => {
    const data = dataOf(withQuestion({ type: 'email' }));
    expect(rowOf(data, 'ajout')[3]).toBe(questionType('email')!.name.fr);
    expect(rowOf(data, 'ajout')[3]).toBe('Mail');
  });

  it('EVO-029-028 — Obligatoire : « Oui », « Non » ou « Si : <expression> »', () => {
    const data = (r: Question['required']) => rowOf(dataOf(withQuestion({ required: r })), 'ajout')[4];
    expect(data(true)).toBe('Oui');
    expect(data(false)).toBe('Non');
    expect(data(undefined)).toBe('Non');
    expect(data('age > 18')).toBe('Si : age > 18');
  });

  it('EVO-029-043 / EVO-029-044 / EVO-029-049 — ligne `_other` : intitulé suffixé, type Texte, obligatoire selon la précision', () => {
    const data = dataOf(withQuestion({ type: 'single', options: [], other: { detailRequired: true } } as Partial<Question>));
    expect(rowOf(data, 'ajout_other').slice(2, 5)).toEqual(['Ajout — Autre (préciser)', 'Texte', 'Oui']);
    const optional = dataOf(withQuestion({ type: 'single', options: [], other: {} } as Partial<Question>));
    expect(rowOf(optional, 'ajout_other')[4]).toBe('Non');
  });

  it('EVO-029-029 / EVO-029-030 / EVO-029-031 — Répétable, donnée personnelle présumée (jamais « Non »), description', () => {
    const ws = withQuestion({ type: 'structure', repeat: {}, fields: [{ id: 'f1', key: 'mail', label: { fr: 'Mail' }, type: 'email', description: 'contact' }] } as Partial<Question>);
    decl(ws).nodes.push({ kind: 'question', id: 'n_t', key: 'libre', label: { fr: 'Libre' }, type: 'text' } as never);
    const data = dataOf(ws);
    expect(rowOf(data, 'ajout.mail').slice(5, 8)).toEqual(['Oui', 'Oui', 'contact']);
    expect(rowOf(data, 'libre').slice(5, 8)).toEqual([null, null, null]);
  });
});

describe('onglet « À propos » et langue (EVO-029)', () => {
  it('EVO-029-032 — projet, clé, titre, version, statut, date, version du format, mention', () => {
    const ws = exampleWorkspace();
    const [data, about] = inventorySheets(ws, decl(ws), date, typeName);
    expect([data!.sheet, about!.sheet]).toEqual([DATA_SHEET, ABOUT_SHEET]);
    expect((about!.data as Cell[][]).map((r) => r.map(value))).toEqual([
      ['Projet', ws.project.name], ['Clé du questionnaire', 'declaration_sinistre'], ['Titre du questionnaire', decl(ws).title.fr],
      ['Version', '1.0.5'], ['Statut', 'provisoire'], ['Date d’export', '2026-10-19'], ['Version du format JSON', String(FORMAT_VERSION)],
      ['Document d’amorce généré par l’éditeur : les colonnes RGPD sont à compléter et à valider par le DPO.'],
    ]);
    expect(NOTICE).toContain('DPO');
  });
});

describe('commande « Exporter l’inventaire RGPD » (EVO-029)', () => {
  beforeEach(() => {
    st().loadWorkspace(exampleWorkspace());
    written.sheets.length = 0;
    written.downloads.length = 0;
  });
  const showDecl = () => st().set((s) => void (s.activeTab = `q:${decl(s.ws as Workspace).id}`));

  it('EVO-029-001 — proposée dans la palette quand un onglet de questionnaire est actif', () => {
    showDecl();
    const c = command('questionnaire.exportInventory')!;
    expect(c.hidden).toBeFalsy();
    expect(c.enabled!()).toBe(true);
    expect(commands().filter((x) => !x.hidden && (!x.enabled || x.enabled())).map((x) => x.id)).toContain('questionnaire.exportInventory');
  });

  it('EVO-029-003 — indisponible sur un fragment, la Bibliothèque, l’État du système, les Paramètres, les Commentaires', () => {
    const c = command('questionnaire.exportInventory')!;
    for (const tab of [`f:${st().ws.library.fragments[0]!.id}` as const, 'library', 'system', 'settings', 'comments'] as const) {
      st().set((s) => void (s.activeTab = tab));
      expect(c.enabled!(), tab).toBe(false);
      expect(runCommand('questionnaire.exportInventory'), tab).toBe(false);
    }
  });

  it('EVO-029-004 — disponible sur un questionnaire validé', () => {
    const validated = st().ws.questionnaires.find((q) => q.status === 'validated')!;
    st().set((s) => void (s.activeTab = `q:${validated.id}`));
    expect(command('questionnaire.exportInventory')!.enabled!()).toBe(true);
  });

  it('EVO-029-005 — aucun raccourci par défaut', () => {
    expect(command('questionnaire.exportInventory')!.keys).toEqual([]);
  });

  it('EVO-029-033 — interface en anglais : onglets, en-têtes et textes fixes en français', async () => {
    showDecl();
    st().set((s) => void (s.uiLang = 'en'));
    runCommand('questionnaire.exportInventory');
    await flush();
    const [data, about] = written.sheets[0] as { sheet: string; data: Cell[][] }[];
    expect([data!.sheet, about!.sheet]).toEqual(['Données', 'À propos']);
    expect(data!.data[0]!.map(value)).toEqual([...FILLED_COLUMNS, ...TODO_COLUMNS]);
    expect(about!.data.at(-1)).toEqual([NOTICE]);
    expect(data!.data.slice(1).some((r) => r[4] === 'Oui' || r[4] === 'Non')).toBe(true);
    st().set((s) => void (s.uiLang = 'fr'));
  });

  it('EVO-029-036 — ni projet, ni historique, ni indicateur « Modifications non exportées » modifiés', async () => {
    showDecl();
    const before = { ws: st().ws, history: st().history, dirty: st().dirty };
    runCommand('questionnaire.exportInventory');
    await flush();
    expect(written.downloads).toEqual(['declaration_sinistre - 1.0.5 - provisoire - inventaire.xlsx']);
    expect({ ws: st().ws, history: st().history, dirty: st().dirty }).toEqual(before);
    expect(st().ws).toBe(before.ws);
  });

  it('EVO-029-041 — état sauvegardé automatiquement inchangé : l’export ne touche pas au store (aucune sauvegarde déclenchée)', async () => {
    showDecl();
    const state = useStore.getState();
    const calls: unknown[] = [];
    const unsub = useStore.subscribe((s) => void calls.push(s));
    runCommand('questionnaire.exportInventory');
    await flush();
    unsub();
    expect(useStore.getState()).toBe(state);
    expect(calls).toEqual([]);
  });

  it('EVO-029-039 — modifier le questionnaire ne produit aucun inventaire', async () => {
    showDecl();
    st().edit(`q:${decl(st().ws as Workspace).id}`, (ws) => void (decl(ws).title.fr = 'Changé'));
    await flush();
    expect(written.sheets).toEqual([]);
    expect(written.downloads).toEqual([]);
  });

  it('EVO-029-037 — export du bundle et des fichiers unitaires inchangés par l’export d’inventaire', async () => {
    showDecl();
    const bundle = exportBundle(st().ws);
    const files = exportFiles(st().ws);
    runCommand('questionnaire.exportInventory');
    await flush();
    expect(exportBundle(st().ws)).toBe(bundle);
    expect(exportFiles(st().ws)).toEqual(files);
  });
});

describe('projets antérieurs (EVO-029)', () => {
  it('EVO-029-038 — exemple chargé sans migration (format 15)', () => {
    expect(FORMAT_VERSION).toBe(15);
    for (const f of exampleFiles()) expect(JSON.parse(f.text).formatVersion, f.name).toBe(15);
  });

  it('EVO-029-051 — inventaire exportable pour chaque questionnaire d’un projet antérieur', () => {
    const ws = exampleWorkspace();
    for (const q of ws.questionnaires) {
      const [data] = inventorySheets(ws, q, date, typeName);
      expect(data!.data.length, q.key).toBeGreaterThan(1);
    }
  });
});

describe('guide (EVO-029)', () => {
  it('décrit la commande, le contenu du fichier et l’usage de l’identifiant', () => {
    const guide = readFileSync('docs/GUIDE.md', 'utf8');
    expect(guide).toContain('[cmd: questionnaire.exportInventory]');
    expect(guide).toContain('- inventaire.xlsx');
    expect(Number(/jusqu'à EVO-(\d+)/.exec(guide)?.[1])).toBeGreaterThanOrEqual(29);
  });
});
