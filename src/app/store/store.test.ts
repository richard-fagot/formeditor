import { beforeEach, describe, expect, it } from 'vitest';
import { blankWorkspace, canRenameQuestionnaire, insertNode, renameQuestionnaire, useStore } from './index';
import type { GraphNode } from '../../core/model';

const node = (id: string): GraphNode => ({ kind: 'question', id, key: id, label: { fr: id }, type: 'text' });

describe('historique par questionnaire', () => {
  beforeEach(() => {
    const ws = blankWorkspace();
    ws.questionnaires.push({ ...ws.questionnaires[0]!, id: 'q2' });
    useStore.getState().loadWorkspace(ws);
  });
  it('annule et rétablit dans un questionnaire sans toucher l’autre', () => {
    const s = useStore.getState();
    const q1 = s.ws.questionnaires[0]!.id;
    s.edit(`q:${q1}`, (ws) => insertNode(ws, { kind: 'questionnaire', id: q1 }, node('a')));
    s.edit('q:q2', (ws) => insertNode(ws, { kind: 'questionnaire', id: 'q2' }, node('b')));
    useStore.getState().undo(`q:${q1}`);
    let ws = useStore.getState().ws;
    expect(ws.questionnaires[0]!.nodes).toEqual([]);
    expect(ws.questionnaires[1]!.nodes.map((n) => n.id)).toEqual(['b']);
    useStore.getState().redo(`q:${q1}`);
    ws = useStore.getState().ws;
    expect(ws.questionnaires[0]!.nodes.map((n) => n.id)).toEqual(['a']);
    expect(ws.layouts.find((l) => l.graph === q1)?.nodes.a).toBeDefined();
  });
  it('regroupe les frappes successives d’un même champ', () => {
    const s = useStore.getState();
    const q1 = s.ws.questionnaires[0]!.id;
    for (const t of ['A', 'AB', 'ABC']) s.edit(`q:${q1}`, (ws) => void (ws.questionnaires[0]!.title = { fr: t }), 'title');
    expect(useStore.getState().history[`q:${q1}`]!.past).toHaveLength(1);
    useStore.getState().undo(`q:${q1}`);
    expect(useStore.getState().ws.questionnaires[0]!.title).toEqual({ fr: 'Questionnaire' });
  });
  it('renomme la clé d’un questionnaire et son fichier, annulable dans son historique', () => {
    const s = useStore.getState();
    const q1 = s.ws.questionnaires[0]!.id;
    expect(canRenameQuestionnaire(s.ws, q1, 'sinistre')).toBe(true);
    expect(canRenameQuestionnaire(s.ws, q1, 'Mauvaise clé')).toBe(false);
    expect(canRenameQuestionnaire(s.ws, q1, 'sys')).toBe(false);
    s.edit(`q:${q1}`, (ws) => renameQuestionnaire(ws, q1, 'sinistre'));
    let ws = useStore.getState().ws;
    expect(ws.questionnaires[0]!.key).toBe('sinistre');
    expect(ws.project.questionnaires.find((e) => e.id === q1)!.file).toBe('sinistre.json');
    useStore.getState().undo(`q:${q1}`);
    ws = useStore.getState().ws;
    expect(ws.questionnaires[0]!.key).toBe('questionnaire');
    expect(ws.project.questionnaires.find((e) => e.id === q1)!.file).toBe('questionnaire.json');
  });
});

describe('modification propagée hors de sa portée', () => {
  it('renommer une question de bibliothèque : un seul Ctrl+Z (bibliothèque ou questionnaire) rétablit tout', async () => {
    const { exampleWorkspace } = await import('../../../tests/reference/example');
    const { renameKey } = await import('../../core/references');
    const { setLibraryQuestionLabel } = await import('./index');
    const ws = exampleWorkspace();
    ws.questionnaires[0]!.edges[0]!.when = "date_sinistre > '2020-01-01'";
    useStore.getState().loadWorkspace(ws);
    const before = JSON.stringify(ws);
    const qid = ws.questionnaires[0]!.id;
    const owner = { kind: 'libraryQuestion' as const, id: 'lq_date_sinistre' };
    useStore.getState().edit('library', (w) => renameKey(w, { kind: 'question', owner, nodeId: 'lq_date_sinistre' }, 'date_evenement'), 'k');
    expect(JSON.stringify(useStore.getState().ws.questionnaires)).toContain('date_evenement');
    useStore.getState().undo('library');
    expect(JSON.stringify(useStore.getState().ws) === before).toBe(true);
    useStore.getState().redo(`q:${qid}`);
    expect(JSON.stringify(useStore.getState().ws.library)).toContain('date_evenement');
    useStore.getState().undo(`q:${qid}`);
    expect(JSON.stringify(useStore.getState().ws) === before).toBe(true);
    // Clé redérivée de l'intitulé.
    useStore.getState().edit('library', (w) => setLibraryQuestionLabel(w, 'lq_date_sinistre', { fr: 'Date du décès' }, 'fr'), 'label');
    expect(JSON.stringify(useStore.getState().ws.questionnaires)).toContain('date_deces');
    useStore.getState().undo('library');
    expect(JSON.stringify(useStore.getState().ws) === before).toBe(true);
    // Question d'un bloc, vue chez l'hôte sous `tiers.nom`.
    useStore.getState().edit('library', (w) => renameKey(w, { kind: 'question', owner: { kind: 'block', id: 'blk_identite_tiers' }, nodeId: 'bn_nom' }, 'nom_tiers'));
    expect(JSON.stringify(useStore.getState().ws.questionnaires)).toContain('tiers.nom_tiers');
    useStore.getState().undo('library');
    expect(JSON.stringify(useStore.getState().ws) === before).toBe(true);
  });
});

describe('annuler la création d’un bloc', () => {
  it('vide la sélection et l’élément affiché qui désignaient le bloc disparu', async () => {
    const { addBlock } = await import('./index');
    useStore.getState().loadWorkspace(blankWorkspace());
    let id = '';
    useStore.getState().edit('library', (ws) => void (id = addBlock(ws, { fr: 'Bloc' })));
    useStore.setState({ activeTab: 'library', libraryItem: { kind: 'block', id }, selection: { graph: { kind: 'block', id }, nodes: [] } });
    useStore.getState().undo('library');
    const s = useStore.getState();
    expect(s.ws.library.blocks).toEqual([]);
    expect(s.libraryItem).toBeUndefined();
    expect(s.selection.graph).toBeUndefined();
  });
});
