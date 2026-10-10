import { beforeEach, describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import { useStore } from '../store';
import { command, runCommand } from './index';

const st = () => useStore.getState();

describe('commandes des paramètres et de l’affichage', () => {
  let qid = '';
  beforeEach(() => {
    const ws = exampleWorkspace();
    st().loadWorkspace(ws);
    st().set((s) => void (s.keymap = {}));
    qid = ws.questionnaires[0]!.id;
  });

  it('ouvre l’onglet des paramètres', () => {
    runCommand('tab.settings');
    expect(st().activeTab).toBe('settings');
  });

  it('déclare, retire une langue et change la langue par défaut ; annulable', () => {
    const langs = [...st().ws.project.languages];
    runCommand('lang.add', 'de');
    runCommand('lang.add', 'pas une langue');
    expect(st().ws.project.languages).toEqual([...langs, 'de']);
    st().set((s) => void (s.contentLang = 'de'));
    runCommand('lang.remove', 'de');
    expect(st().ws.project.languages).toEqual(langs);
    expect(st().contentLang).toBe(st().ws.project.defaultLanguage);
    runCommand('lang.remove', st().ws.project.defaultLanguage);
    expect(st().ws.project.languages).toEqual(langs);
    runCommand('lang.default', 'en');
    expect(st().ws.project.defaultLanguage).toBe('en');
    st().undo('project');
    expect(st().ws.project.defaultLanguage).toBe('fr');
  });

  it('change la langue de la prévisualisation affichée', () => {
    expect(command('preview.lang')!.enabled!()).toBe(false);
    st().set((s) => void (s.view[qid] = 'preview'));
    runCommand('preview.lang', 'en');
    expect(st().preview[qid]?.lang).toBe('en');
    runCommand('preview.lang');
    expect(st().preview[qid]?.lang).toBe('fr');
  });

  it('personnalise, retire et rétablit des raccourcis', () => {
    runCommand('shortcut.set', { id: 'node.newQuestion', keys: ['q', 'q'] });
    expect(st().keymap['node.newQuestion']).toEqual(['q']);
    runCommand('shortcut.set', { id: 'view.fit', keys: [] });
    expect(st().keymap['view.fit']).toEqual([]);
    runCommand('shortcut.reset', 'view.fit');
    expect('view.fit' in st().keymap).toBe(false);
    runCommand('shortcut.reset');
    expect(st().keymap).toEqual({});
  });

  it('vue côte à côte : bascule et choix du questionnaire comparé', () => {
    expect(command('view.compare')!.enabled!()).toBe(false); // un seul questionnaire dans l'exemple
    runCommand('questionnaire.new');
    const other = st().ws.questionnaires.find((q) => q.id !== qid)!.id;
    runCommand('tab.show', `q:${qid}`);
    runCommand('view.compare');
    expect(st().compare).toBe(other);
    runCommand('view.compare', 'inconnu');
    expect(st().compare).toBe(other);
    runCommand('view.compare');
    expect(st().compare).toBeUndefined();
  });

  it('mise en page automatique : demande au logigramme affiché', () => {
    runCommand('tab.show', `q:${qid}`);
    const n = st().layoutRequest;
    runCommand('view.layout');
    expect(st().layoutRequest).toBe(n + 1);
    st().set((s) => void (s.view[qid] = 'preview'));
    expect(command('view.layout')!.enabled!()).toBe(false);
  });
});

describe('annuler / rétablir la création d’un questionnaire', () => {
  it('ferme l’onglet à l’annulation, le rouvre au rétablissement ; projet cohérent', () => {
    st().loadWorkspace(exampleWorkspace());
    runCommand('questionnaire.new');
    const id = st().activeTab.slice(2);
    runCommand('node.newQuestion');
    expect(st().ws.questionnaires.find((q) => q.id === id)!.nodes).toHaveLength(1);
    runCommand('edit.undo');
    runCommand('edit.undo');
    expect(st().ws.questionnaires.some((q) => q.id === id)).toBe(false);
    expect(st().ws.project.questionnaires.some((e) => e.id === id)).toBe(false);
    expect(st().tabs).not.toContain(`q:${id}`);
    expect(st().activeTab.startsWith('q:') ? st().ws.questionnaires.some((q) => `q:${q.id}` === st().activeTab) : true).toBe(true);
    // Une modification sans effet n'enregistre rien : l'historique à rétablir est conservé.
    st().edit(`q:${id}`, () => undefined);
    expect(st().history[`q:${id}`]!.future.length).toBeGreaterThan(0);
    st().redo('project');
    expect(st().ws.questionnaires.some((q) => q.id === id)).toBe(true);
    expect(st().ws.project.questionnaires.some((e) => e.id === id)).toBe(true);
    expect(st().tabs).toContain(`q:${id}`);
    st().redo(`q:${id}`);
    expect(st().ws.questionnaires.find((q) => q.id === id)!.nodes).toHaveLength(1);
    const files = st().ws.project.questionnaires.map((e) => e.id).sort();
    expect(files).toEqual(st().ws.questionnaires.map((q) => q.id).sort());
  });
});
