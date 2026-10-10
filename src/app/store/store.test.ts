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
