import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { fragmentCallers, type GraphNode, type Questionnaire, type Workspace } from '../../core/model';
import { projectedSteps } from '../../core/runtime';
import { checkWorkspace } from '../../core/validation';
import { exportBundle, importFiles, newWorkspace } from '../../format';
import { useStore } from '../store';
import { command, runCommand } from './index';
import { setPastePoint } from './clipboard-commands';

const st = () => useStore.getState();
const q = (id: string, key: string, extra: Partial<GraphNode> = {}): GraphNode =>
  ({ kind: 'question', id, key, label: { fr: key }, type: 'text', ...extra }) as GraphNode;
const graph = (id: string, key: string, nodes: GraphNode[], edges: Questionnaire['edges'] = []): Questionnaire =>
  ({ formatVersion: 8, kind: 'questionnaire', id, key, title: { fr: key }, start: nodes[0]?.id ?? '', nodes, edges });

/** `declaration` : avant → date_sinistre → lieu → [tiers ?] ─oui→ nom_tiers ; `remboursement` contient déjà date_sinistre. */
function workspace(): Workspace {
  const ws = newWorkspace('p', 'fr');
  ws.questionnaires.push(
    graph('qa', 'declaration', [
      q('n0', 'avant'), q('n1', 'date_sinistre'), q('n2', 'lieu_sinistre', { label: { fr: 'Lieu le {date_sinistre}' } }),
      q('n3', 'tiers', { required: 'date_sinistre != ""' } as Partial<GraphNode>),
      q('n4', 'nom_tiers', { required: 'avant = "x"' } as Partial<GraphNode>),
      { kind: 'fragment', id: 'n5', ref: 'frg_f', alias: 'ident' }, { kind: 'end', id: 'n6', message: { fr: 'Fin' } },
    ], [
      { id: 'e0', from: 'n0', to: 'n1' }, { id: 'e1', from: 'n1', to: 'n2' }, { id: 'e2', from: 'n2', to: 'n3' },
      { id: 'e3', from: 'n3', to: 'n4', when: 'tiers = true and date_sinistre != ""' }, { id: 'e4', from: 'n3', to: 'n5' },
      { id: 'e5', from: 'n5', to: 'n6' },
    ]),
    graph('qb', 'remboursement', [q('m1', 'date_sinistre'), { kind: 'fragment', id: 'm2', ref: 'frg_f', alias: 'ident' }]),
    graph('qc', 'autre', [{ kind: 'fragment', id: 'k1', ref: 'frg_f', alias: 'ident' }]),
  );
  ws.library.fragments.push(
    { id: 'frg_f', key: 'ident', title: { fr: 'Identification' }, nodes: [q('f1', 'nom')], edges: [] },
    { id: 'frg_g', key: 'appel', title: { fr: 'Appel' }, nodes: [{ kind: 'fragment', id: 'g1', ref: 'frg_f', alias: 'id' }], edges: [] },
  );
  ws.project.questionnaires.push(...['qa', 'qb', 'qc'].map((id) => ({ id, file: `${id}.json` })));
  ws.layouts.push({ formatVersion: 8, kind: 'layout', graph: 'qa', nodes: { n1: { x: 100, y: 200 }, n2: { x: 100, y: 350 }, n3: { x: 100, y: 500 }, n4: { x: 400, y: 650 } } });
  return ws;
}
const A = { kind: 'questionnaire', id: 'qa' } as const;
const qOf = (id: string) => st().ws.questionnaires.find((x) => x.id === id)!;
const keys = (g: { nodes: GraphNode[] }) => g.nodes.map((n) => ('key' in n ? n.key : n.kind === 'fragment' ? n.alias : n.kind));

function copy(graphRef: { kind: 'questionnaire' | 'fragment'; id: string }, nodes: string[]) {
  runCommand('tab.show', graphRef.kind === 'questionnaire' ? `q:${graphRef.id}` : `f:${graphRef.id}`);
  st().select({ graph: graphRef, nodes });
  expect(runCommand('node.copy')).toBe(true);
}
function paste(target: string, at?: { x: number; y: number }) {
  runCommand('tab.show', target);
  return runCommand('node.paste', at ? { position: at } : undefined);
}

describe('copier-coller de nœuds (EVO-010)', () => {
  beforeEach(() => st().loadWorkspace(workspace()));

  it('colle les quatre nœuds au pointeur, reliés entre eux, non raccordés et sélectionnés ; Ctrl+Z annule tout', () => {
    copy(A, ['n1', 'n2', 'n3', 'n4']);
    setPastePoint('qb', { x: 1000, y: 50 });
    expect(paste('q:qb')).toBe(true);
    const b = qOf('qb');
    const ids = st().selection.nodes;
    expect(ids).toHaveLength(4);
    expect(b.nodes.slice(2).map((n) => n.id)).toEqual(ids);
    expect(b.edges.map((e) => [ids.indexOf(e.from), ids.indexOf(e.to), e.when ?? ''])).toEqual([
      [0, 1, ''], [1, 2, ''], [2, 3, 'tiers = true and date_sinistre_2 != ""'],
    ]);
    const layout = st().ws.layouts.find((l) => l.graph === 'qb')!.nodes;
    expect(ids.map((id) => layout[id])).toEqual([{ x: 1000, y: 50 }, { x: 1000, y: 200 }, { x: 1000, y: 350 }, { x: 1300, y: 500 }]);
    expect(b.start).toBe('m1');
    setPastePoint('qb');
    st().undo('q:qb');
    expect(keys(qOf('qb'))).toEqual(['date_sinistre', 'ident']);
    expect(qOf('qb').edges).toEqual([]);
  });

  it('suffixe une clé prise et réécrit les références de la sélection ; garde celles hors sélection (signalées)', () => {
    copy(A, ['n1', 'n2', 'n3', 'n4']);
    paste('q:qb');
    const pasted = qOf('qb').nodes.slice(2) as unknown as { id: string; key: string; required?: string; label: { fr: string } }[];
    expect(pasted.map((n) => n.key)).toEqual(['date_sinistre_2', 'lieu_sinistre', 'tiers', 'nom_tiers']);
    expect(pasted[1]!.label.fr).toBe('Lieu le {date_sinistre_2}');
    expect(pasted[2]!.required).toBe('date_sinistre_2 != ""');
    expect(pasted[3]!.required).toBe('avant = "x"');
    const issues = checkWorkspace(st().ws).filter((i) => i.owner.id === 'qb' && i.code === 'unknownReference');
    expect(issues.map((i) => i.nodeId)).toEqual([pasted[3]!.id]);
  });

  it('collée deux fois : deux jeux distincts ; la copie est indépendante de l’original', () => {
    copy(A, ['n1', 'n3']);
    paste('q:qa');
    paste('q:qa');
    expect(keys(qOf('qa')).slice(7)).toEqual(['date_sinistre_2', 'tiers_2', 'date_sinistre_3', 'tiers_3']);
    const second = qOf('qa').nodes[10] as unknown as { id: string; required: string };
    expect(second.required).toBe('date_sinistre_3 != ""');
    const copyId = second.id;
    st().edit('q:qa', (ws) => void ((ws.questionnaires[0]!.nodes.find((n) => n.id === copyId) as unknown as { label: { fr: string } }).label.fr = 'modifié'));
    expect((qOf('qa').nodes[3] as unknown as { label: { fr: string } }).label.fr).toBe('tiers');
    st().edit('q:qa', (ws) => void ((ws.questionnaires[0]!.nodes[3] as unknown as { label: { fr: string } }).label.fr = 'origine'));
    expect((qOf('qa').nodes.find((n) => n.id === copyId) as unknown as { label: { fr: string } }).label.fr).toBe('modifié');
  });

  it('une instance de fragment collée référence le même fragment, avec un alias unique', () => {
    copy(A, ['n5']);
    paste('q:qb');
    expect(qOf('qb').nodes[2]).toMatchObject({ kind: 'fragment', ref: 'frg_f', alias: 'ident_2' });
  });

  it('dans un fragment : départ et fin écartés avec un message, instance du même fragment refusée, le reste collé', () => {
    copy(A, ['n0', 'n1', 'n5', 'n6']);
    paste('f:frg_f');
    const f = st().ws.library.fragments[0]!;
    expect(keys(f)).toEqual(['nom', 'avant', 'date_sinistre']);
    expect(f.edges.map((e) => [e.from, e.to])).toEqual([[f.nodes[1]!.id, f.nodes[2]!.id]]);
    expect(st().notice?.lines).toEqual([
      'Le fragment « ident » n’est pas collé : il créerait un cycle d’appels.',
      'La fin « Fin » n’est pas collée : un fragment n’a pas de fin.',
      '« avant » est collé comme nœud ordinaire : un fragment n’a pas de départ.',
    ]);
  });

  it('pointeur hors du logigramme : collé décalé de 40 px par rapport à l’original', () => {
    copy(A, ['n1', 'n2']);
    setPastePoint('qa', { x: 10, y: 10 });
    setPastePoint('qa');
    paste('q:qa');
    const layout = st().ws.layouts.find((l) => l.graph === 'qa')!.nodes;
    expect(st().selection.nodes.map((id) => layout[id])).toEqual([{ x: 140, y: 240 }, { x: 140, y: 390 }]);
  });

  it('refuse au collage un fragment qui créerait un cycle d’appels indirect', () => {
    // frg_h appelle frg_g, qui appelle frg_f : coller cette instance de frg_g dans frg_f bouclerait.
    st().edit('library', (ws) => void ws.library.fragments.push({ id: 'frg_h', key: 'h', title: { fr: 'H' }, nodes: [{ kind: 'fragment', id: 'h1', ref: 'frg_g', alias: 'g' }], edges: [] }));
    copy({ kind: 'fragment', id: 'frg_h' }, ['h1']);
    paste('f:frg_f');
    expect(keys(st().ws.library.fragments[0]!)).toEqual(['nom']);
    expect(st().notice?.lines).toEqual(['Le fragment « g » n’est pas collé : il créerait un cycle d’appels.']);
  });

  it('coller est indisponible sans copie ou dans un autre projet', () => {
    runCommand('tab.show', 'q:qb');
    expect(command('node.paste')!.enabled!()).toBe(false);
    copy(A, ['n1']);
    st().loadWorkspace({ ...workspace(), project: { ...workspace().project, id: 'autre' } });
    runCommand('tab.show', 'q:qb');
    expect(command('node.paste')!.enabled!()).toBe(false);
  });

  it('export puis réimport : objets collés et dupliqués identiques et indépendants', () => {
    copy(A, ['n1', 'n3']);
    paste('q:qb');
    runCommand('questionnaire.duplicate', 'qa');
    const before = JSON.parse(exportBundle(st().ws));
    const res = importFiles([{ name: 'p.bundle.json', text: exportBundle(st().ws) }]);
    expect(res.errors).toEqual([]);
    const back = res.workspace!;
    expect(JSON.parse(exportBundle(back))).toEqual(before);
    const ids = (g: Questionnaire) => g.nodes.map((n) => n.id);
    expect(ids(back.questionnaires[1]!).some((id) => ids(back.questionnaires[0]!).includes(id))).toBe(false);
  });
});

describe('duplication (EVO-010)', () => {
  beforeEach(() => st().loadWorkspace(workspace()));

  it('duplique un questionnaire : « Copie de », juste après, ouvert, même parcours, indépendant', () => {
    runCommand('questionnaire.duplicate', 'qa');
    const copyQ = st().ws.questionnaires[1]!;
    expect(copyQ.title.fr).toBe('Copie de declaration');
    expect(copyQ.key).toBe('declaration_2');
    expect(st().ws.project.questionnaires[1]).toEqual({ id: copyQ.id, file: 'declaration_2.json' });
    expect(st().activeTab).toBe(`q:${copyQ.id}`);
    const path = (id: string) => [...projectedSteps({ ws: st().ws, questionnaireId: id, sys: {} }, { avant: 'x', date_sinistre: '2024-01-01', tiers: true })]
      .map((s) => s.split('/').map((p) => keys({ nodes: [...st().ws.questionnaires.flatMap((g) => g.nodes), ...st().ws.library.fragments.flatMap((g) => g.nodes)].filter((n) => n.id === p) })[0]).join('/'));
    expect(path(copyQ.id)).toEqual(path('qa'));
    runCommand('questionnaire.duplicate', 'qa');
    expect(st().ws.questionnaires[1]!.title.fr).toBe('Copie 2 de declaration');
    st().edit(`q:${copyQ.id}`, (ws) => void (ws.questionnaires.find((x) => x.id === copyQ.id)!.nodes.pop()));
    expect(qOf('qa').nodes).toHaveLength(7);
  });

  it('duplique un fragment utilisé par trois graphes : la copie n’a aucun appelant ; ses appels restent des références', () => {
    expect(fragmentCallers(st().ws, 'frg_f')).toHaveLength(4);
    runCommand('library.duplicate', { kind: 'fragment', id: 'frg_g' });
    runCommand('library.duplicate', { kind: 'fragment', id: 'frg_f' });
    const [f, fCopy, g, gCopy] = st().ws.library.fragments;
    expect(fCopy!.title.fr).toBe('Copie de Identification');
    expect(fCopy!.key).toBe('ident_2');
    expect(st().activeTab).toBe(`f:${fCopy!.id}`);
    expect(fragmentCallers(st().ws, fCopy!.id)).toEqual([]);
    // Appelants de l'original : les trois questionnaires, `frg_g` et sa copie (qui appelle toujours l'original).
    expect(fragmentCallers(st().ws, f!.id).map((c) => c.id).sort()).toEqual(['frg_g', gCopy!.id, 'qa', 'qb', 'qc'].sort());
    expect(gCopy!.nodes[0]).toMatchObject({ kind: 'fragment', ref: 'frg_f', alias: 'id' });
    expect(g!.id).toBe('frg_g');
  });

  it('Ctrl+Z annule la duplication d’un questionnaire et celle d’un fragment', () => {
    runCommand('questionnaire.duplicate', 'qa');
    expect(st().ws.questionnaires).toHaveLength(4);
    st().undo('project');
    expect(st().ws.questionnaires.map((x) => x.id)).toEqual(['qa', 'qb', 'qc']);
    expect(st().ws.project.questionnaires.map((x) => x.id)).toEqual(['qa', 'qb', 'qc']);
    runCommand('library.duplicate', { kind: 'fragment', id: 'frg_f' });
    st().undo('library');
    expect(st().ws.library.fragments.map((f) => f.id)).toEqual(['frg_f', 'frg_g']);
  });

  it('indisponibles quand rien n’est à dupliquer', () => {
    runCommand('tab.show', 'library');
    st().set((s) => void (s.libraryItem = undefined));
    expect(command('questionnaire.duplicate')!.enabled!()).toBe(false);
    expect(command('library.duplicate')!.enabled!()).toBe(false);
    expect(command('questionnaire.duplicate')!.enabled!('inconnu')).toBe(false);
    runCommand('tab.show', 'q:qa');
    expect(command('questionnaire.duplicate')!.enabled!()).toBe(true);
    expect(command('library.duplicate')!.enabled!()).toBe(false);
    runCommand('tab.show', 'f:frg_f');
    expect(command('library.duplicate')!.enabled!()).toBe(true);
  });

  it('Ctrl+D réécrit les références internes à la sélection, comme le collage', () => {
    runCommand('tab.show', 'q:qa');
    st().select({ graph: A, nodes: ['n1', 'n3'] });
    expect(runCommand('node.duplicate')).toBe(true);
    const [d1, d3] = st().selection.nodes.map((id) => qOf('qa').nodes.find((n) => n.id === id)) as unknown as { key: string; required: string }[];
    expect(d1!.key).toBe('date_sinistre_2');
    expect(d3!.required).toBe('date_sinistre_2 != ""');
  });

  it('duplique une question de bibliothèque', () => {
    st().edit('library', (ws) => void ws.library.questions.push({ id: 'lq', key: 'iban', label: { fr: 'IBAN', en: 'IBAN' }, type: 'text' }));
    runCommand('library.duplicate', { kind: 'question', id: 'lq' });
    expect(st().ws.library.questions[1]).toMatchObject({ key: 'iban_2', label: { fr: 'Copie de IBAN', en: 'Copy of IBAN' } });
    expect(st().libraryItem).toEqual({ kind: 'question', id: st().ws.library.questions[1]!.id });
  });

  it('le guide décrit le copier-coller et la duplication (EVO-010)', () => {
    const guide = readFileSync('docs/GUIDE.md', 'utf8');
    for (const id of ['node.copy', 'node.paste', 'questionnaire.duplicate', 'library.duplicate']) expect(guide).toContain(`[cmd: ${id}]`);
    expect(guide).toMatch(/date_sinistre_2/);
    expect(guide).toMatch(/Copie de/);
    expect(Number(/jusqu'à EVO-(\d+)/.exec(guide)?.[1])).toBeGreaterThanOrEqual(10);
  });
});
