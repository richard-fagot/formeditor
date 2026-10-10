import { beforeEach, describe, expect, it } from 'vitest';
import { blankWorkspace, connect, insertNode, useStore } from '../store';
import type { GraphNode } from '../../core/model';
import { command, runCommand } from './index';

const node = (id: string): GraphNode => ({ kind: 'question', id, key: id, label: { fr: id }, type: 'text' });
const st = () => useStore.getState();

describe('commandes ajoutées au catalogue', () => {
  let qid = '';
  beforeEach(() => {
    const ws = blankWorkspace();
    ws.project.languages = ['fr', 'en'];
    st().loadWorkspace(ws);
    qid = ws.questionnaires[0]!.id;
  });
  it('ferme et rouvre un onglet de questionnaire', () => {
    expect(runCommand('tab.close')).toBe(true);
    expect(st().tabs).not.toContain(`q:${qid}`);
    expect(runCommand('tab.open')).toBe(true);
    expect(st().activeTab).toBe(`q:${qid}`);
    expect(command('tab.open')!.enabled!()).toBe(false);
  });
  it('change la langue du contenu et de l’interface (paramètre ou suivante)', () => {
    runCommand('lang.content', 'en');
    expect(st().contentLang).toBe('en');
    runCommand('lang.content');
    expect(st().contentLang).toBe('fr');
    runCommand('lang.ui', 'en');
    expect(st().uiLang).toBe('en');
    runCommand('lang.ui', 'xx');
    expect(st().uiLang).toBe('en');
    runCommand('lang.ui', 'fr');
  });
  it('déplace l’arête sélectionnée dans l’ordre d’évaluation', () => {
    const r = { kind: 'questionnaire', id: qid } as const;
    st().edit(`q:${qid}`, (ws) => {
      insertNode(ws, r, node('a'));
      insertNode(ws, r, node('b'));
      insertNode(ws, r, node('c'));
      connect(ws, r, 'a', 'b');
      connect(ws, r, 'a', 'c');
    });
    const ids = () => st().ws.questionnaires[0]!.edges.filter((e) => e.from === 'a').map((e) => e.to);
    const second = st().ws.questionnaires[0]!.edges.filter((e) => e.from === 'a')[1]!;
    st().select({ graph: r, nodes: [], edge: second.id });
    expect(command('edge.moveDown')!.enabled!()).toBe(false);
    expect(runCommand('edge.moveUp')).toBe(true);
    expect(ids()).toEqual([second.to, ids().find((x) => x !== second.to)]);
    expect(runCommand('node.delete')).toBe(true);
    expect(st().ws.questionnaires[0]!.edges.some((e) => e.id === second.id)).toBe(false);
  });
  it('modifie le titre, la clé et la description du questionnaire actif', () => {
    runCommand('questionnaire.setTitle', { fr: 'Sinistre', en: 'Claim' });
    runCommand('questionnaire.rename', 'sinistre');
    runCommand('questionnaire.rename', 'clé invalide');
    runCommand('questionnaire.setDescription', 'Pour l’équipe');
    const q = st().ws.questionnaires[0]!;
    expect(q).toMatchObject({ key: 'sinistre', title: { fr: 'Sinistre', en: 'Claim' }, description: 'Pour l’équipe' });
    expect(st().ws.project.questionnaires[0]!.file).toBe('sinistre.json');
    runCommand('questionnaire.setDescription', '');
    expect(st().ws.questionnaires[0]!.description).toBeUndefined();
  });
});
