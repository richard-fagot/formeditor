import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindFeedback, confirm, fail, inform, refuse, type Notice } from './index';

let state: { notice?: Notice };
let uiLang: string;

beforeEach(() => {
  state = {};
  uiLang = 'fr';
  bindFeedback({ lang: () => uiLang, set: (recipe) => recipe(state) });
});
afterEach(() => vi.unstubAllGlobals());

describe('app/feedback', () => {
  it('refuse : titre et lignes traduits (clé, clé avec paramètres)', () => {
    refuse('group.refused', 'group.forbidden', { key: 'library.brokenRefLine', params: { id: 'x' } });
    expect(state.notice).toEqual({
      title: 'Extraction en fragment impossible',
      lines: ['La sélection contient une fin ou une sortie : un fragment n’en contient pas.', 'L’objet lié (« x ») n’existe plus dans la bibliothèque : le lien est rompu.'],
    });
  });

  it('inform : traduit dans la langue de l’interface (en)', () => {
    uiLang = 'en';
    inform('paste.title');
    expect(state.notice).toEqual({ title: 'Paste: items left out', lines: [] });
  });

  it('texte brut non traduit', () => {
    uiLang = 'en';
    refuse('project.importErrors', { raw: 'x.json Type de document inconnu' });
    expect(state.notice).toEqual({ title: 'Import failed', lines: ['x.json Type de document inconnu'] });
  });

  it('fail : message d’une Error, ou valeur quelconque convertie en texte', () => {
    fail('image.failed', new Error('canvas.toBlob'));
    expect(state.notice?.lines).toEqual(['canvas.toBlob']);
    fail('image.failed', 42);
    expect(state.notice?.lines).toEqual(['42']);
  });

  it('le dernier message remplace le précédent', () => {
    refuse('group.refused');
    inform({ raw: 'B' }, { raw: 'ligne' });
    expect(state.notice).toEqual({ title: 'B', lines: ['ligne'] });
  });

  it('confirm : question traduite posée à window.confirm, réponse acceptée ou refusée renvoyée', () => {
    const asked: string[] = [];
    vi.stubGlobal('window', { confirm: (m: string) => (asked.push(m), true) });
    expect(confirm('project.confirmNew')).toBe(true);
    uiLang = 'en';
    vi.stubGlobal('window', { confirm: (m: string) => (asked.push(m), false) });
    expect(confirm('project.confirmNew')).toBe(false);
    expect(asked).toEqual(['Des modifications ne sont pas exportées. Continuer ?', 'Some changes are not exported. Continue?']);
  });
});
