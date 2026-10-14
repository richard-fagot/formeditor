import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphNode, Questionnaire, Workspace } from '../../core/model';
import { exportBundle, exportFiles, importFiles, newWorkspace } from '../../format';
import { useStore } from '../store';
import { runCommand } from './index';

const st = () => useStore.getState();
const q = (id: string, key: string): GraphNode => ({ kind: 'question', id, key, label: { fr: key }, type: 'text' }) as GraphNode;
const graph = (id: string, key: string, nodes: GraphNode[], edges: Questionnaire['edges'] = []): Questionnaire =>
  ({ formatVersion: 11, kind: 'questionnaire', id, key, title: { fr: key }, version: '1.0', start: nodes[0]?.id ?? '', nodes, edges });

/** `qa` : n1 → n2 (condition sur `sys.age`), `qb` : m1 ; variable système `age`. */
function workspace(): Workspace {
  const ws = newWorkspace('p', 'fr');
  ws.project.systemState.push({ name: 'age', type: 'number' });
  ws.questionnaires.push(
    graph('qa', 'declaration', [q('n1', 'date_sinistre'), q('n2', 'lieu')], [{ id: 'e1', from: 'n1', to: 'n2', when: 'sys.age > 18' }]),
    graph('qb', 'remboursement', [q('m1', 'montant')]),
  );
  ws.project.questionnaires.push({ id: 'qa', file: 'declaration.json' }, { id: 'qb', file: 'remboursement.json' });
  ws.layouts.push({ formatVersion: 11, kind: 'layout', graph: 'qa', nodes: { n1: { x: 0, y: 0 }, n2: { x: 0, y: 150 } } });
  return ws;
}
const A = { kind: 'questionnaire', id: 'qa' } as const;
const qa = () => st().ws.questionnaires.find((x) => x.id === 'qa')!;
const content = () => { const { status: _s, validatedAt: _d, ...rest } = qa(); return JSON.stringify([rest, st().ws.layouts.find((l) => l.graph === 'qa')]); };

function validate() {
  runCommand('tab.show', 'q:qa');
  expect(runCommand('questionnaire.validate')).toBe(true);
  st().set((s) => void (s.notice = undefined));
}

describe('validation d’un formulaire (EVO-015)', () => {
  beforeEach(() => st().loadWorkspace(workspace()));
  afterEach(() => vi.unstubAllGlobals());

  it('« Valider le formulaire » le marque validé (date du jour) ; seule l’action possible est proposée', () => {
    runCommand('tab.show', 'q:qa');
    expect(runCommand('questionnaire.unvalidate')).toBe(false);
    validate();
    expect(qa().status).toBe('validated');
    expect(qa().validatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(runCommand('questionnaire.validate')).toBe(false);
  });

  it('formulaire validé : aucune modification, quel que soit le moyen (raccourcis, panneau, collage, dépôt, liaison, mise en page)', () => {
    validate();
    const before = content();
    st().select({ graph: A, nodes: ['n1'] });
    runCommand('node.newQuestion');
    runCommand('node.toggleRequired');
    expect(st().notice?.lines[0]).toContain('« declaration » est validé');
    runCommand('node.copy');
    runCommand('node.paste');
    runCommand('node.delete');
    runCommand('edge.create', { graph: A, from: 'n2', to: 'n1' });
    runCommand('questionnaire.setTitle', { fr: 'Autre' });
    runCommand('questionnaire.rename', 'autre');
    st().edit('q:qa', (ws) => void (ws.layouts[0]!.nodes.n1 = { x: 99, y: 99 }));
    st().silent((ws) => void (ws.layouts[0]!.nodes.n1 = { x: 50, y: 50 }));
    expect(content()).toBe(before);
    expect(qa().status).toBe('validated');
  });

  it('formulaire validé : consultation, export et copie vers un autre formulaire restent possibles', () => {
    validate();
    st().select({ graph: A, nodes: ['n1', 'n2'] });
    expect(runCommand('node.copy')).toBe(true);
    runCommand('tab.show', 'q:qb');
    expect(runCommand('node.paste', { position: { x: 0, y: 0 } })).toBe(true);
    expect(st().ws.questionnaires.find((x) => x.id === 'qb')!.nodes).toHaveLength(3);
    expect(exportBundle(st().ws)).toContain('"status": "validated"');
    // La copie d'un formulaire validé n'est pas validée.
    runCommand('questionnaire.duplicate', 'qa');
    expect(st().ws.questionnaires[1]!.status).toBeUndefined();
    expect(st().ws.questionnaires[1]!.nodes).toHaveLength(2);
  });

  it('« Dévalider » confirmé : redevient modifiable ; confirmation refusée : reste validé', () => {
    validate();
    const confirm = vi.fn(() => false);
    vi.stubGlobal('window', { confirm });
    runCommand('questionnaire.unvalidate');
    expect(confirm).toHaveBeenCalledOnce();
    expect(qa().status).toBe('validated');
    confirm.mockReturnValue(true);
    runCommand('questionnaire.unvalidate');
    expect(qa()).not.toHaveProperty('status');
    expect(qa()).not.toHaveProperty('validatedAt');
    st().select({ graph: A, nodes: ['n1'] });
    runCommand('node.toggleRequired');
    expect(qa().nodes[0]).toHaveProperty('required', true);
  });

  it('les autres formulaires restent modifiables', () => {
    validate();
    runCommand('tab.show', 'q:qb');
    st().select({ graph: { kind: 'questionnaire', id: 'qb' }, nodes: ['m1'] });
    runCommand('node.toggleRequired');
    expect(st().ws.questionnaires.find((x) => x.id === 'qb')!.nodes[0]).toHaveProperty('required', true);
    expect(st().notice).toBeUndefined();
  });

  it('élément partagé : un renommage qui réécrirait le formulaire validé est refusé en bloc', () => {
    validate();
    runCommand('system.renameVariable', { name: 'age', next: 'age_assure' });
    expect(st().ws.project.systemState[0]!.name).toBe('age');
    expect(qa().edges[0]!.when).toBe('sys.age > 18');
    expect(st().notice?.title).toBe('Formulaire validé : modification impossible');
  });

  it('annuler / rétablir : l’état de validation suit l’historique, le contenu validé n’est jamais modifié', () => {
    runCommand('tab.show', 'q:qa');
    st().select({ graph: A, nodes: ['n1'] });
    runCommand('node.toggleRequired');
    validate();
    const validated = content();
    runCommand('edit.undo');
    expect(qa().status).toBeUndefined();
    expect(content()).toBe(validated);
    runCommand('edit.redo');
    expect(qa().status).toBe('validated');
    // Tant qu'il est validé, rien d'autre n'entre dans son historique : annuler retire d'abord la validation.
    runCommand('node.toggleRequired');
    runCommand('edit.undo');
    expect(qa().status).toBeUndefined();
    runCommand('edit.undo');
    expect(qa().nodes[0]).not.toHaveProperty('required');
    // Transaction multi-portées antérieure à la validation : son annulation ne touche pas le formulaire validé.
    runCommand('edit.redo');
    runCommand('system.renameVariable', { name: 'age', next: 'age_assure' });
    validate();
    const locked = content();
    st().undo('project');
    expect(content()).toBe(locked);
    expect(qa().status).toBe('validated');
  });

  it('formulaire validé sans mise en page : le premier commentaire est accepté (écart EVO-015)', () => {
    runCommand('tab.show', 'q:qb');
    expect(runCommand('questionnaire.validate')).toBe(true);
    st().set((s) => void (s.notice = undefined));
    expect(st().ws.layouts.some((l) => l.graph === 'qb')).toBe(false);
    runCommand('comment.add', { host: { kind: 'questionnaire', id: 'qb' }, node: 'm1' });
    expect(st().ws.layouts.find((l) => l.graph === 'qb')?.comments?.map((c) => c.node)).toEqual(['m1']);
    expect(st().notice).toBeUndefined();
  });

  it('sans validation, comportement inchangé : aucun état écrit', () => {
    runCommand('tab.show', 'q:qa');
    st().select({ graph: A, nodes: ['n1'] });
    runCommand('node.toggleRequired');
    expect(qa()).not.toHaveProperty('status');
    expect(exportBundle(st().ws)).not.toContain('"status"');
  });

  it('export puis réimport : état de validation identique', () => {
    validate();
    for (const back of [importFiles(exportFiles(st().ws)), importFiles([{ name: 'p.bundle.json', text: exportBundle(st().ws) }])]) {
      expect(back.errors).toEqual([]);
      expect(back.workspace!.questionnaires.map((x) => x.status)).toEqual(['validated', undefined]);
    }
  });

  it('le guide décrit la validation, la lecture seule et la dévalidation', () => {
    const guide = readFileSync('docs/GUIDE.md', 'utf8');
    expect(guide).toContain('[cmd: questionnaire.validate]');
    expect(guide).toContain('[cmd: questionnaire.unvalidate]');
    expect(guide).toMatch(/lecture seule/);
  });
});
