import { beforeEach, describe, expect, it } from 'vitest';
import { exampleWorkspace } from '../../../tests/reference/example';
import { useStore } from '../store';
import { command, runCommand } from './index';

const st = () => useStore.getState();

describe('commandes de l’état du système', () => {
  let qid = '';
  beforeEach(() => {
    const ws = exampleWorkspace();
    st().loadWorkspace(ws);
    qid = ws.questionnaires[0]!.id;
  });

  it('ajoute une variable, ouvre l’onglet et demande le focus ; la supprime ; annulable', () => {
    runCommand('system.addVariable');
    expect(st().activeTab).toBe('system');
    expect(st().ws.project.systemState.at(-1)).toEqual({ name: 'variable', type: 'text' });
    expect(st().focusRequest).toMatchObject({ kind: 'variable', id: 'variable' });
    runCommand('system.deleteVariable', 'variable');
    expect(st().ws.project.systemState.some((v) => v.name === 'variable')).toBe(false);
    runCommand('edit.undo');
    expect(st().ws.project.systemState.some((v) => v.name === 'variable')).toBe(true);
  });

  it('renomme une variable ; un seul Ctrl+Z (onglet État du système) annule tout le renommage, Ctrl+Y le refait', () => {
    const before = JSON.stringify(st().ws);
    runCommand('system.renameVariable', { name: 'plafond_expertise', next: 'seuil_expert' });
    expect(JSON.stringify(st().ws.questionnaires)).toContain('sys.seuil_expert');
    expect(st().history[`q:${qid}`]?.past.length).toBe(1);
    st().openTab('system');
    runCommand('edit.undo');
    expect(JSON.stringify(st().ws)).toBe(before);
    runCommand('edit.redo');
    expect(JSON.stringify(st().ws.questionnaires)).toContain('sys.seuil_expert');
    expect(st().ws.project.systemState.some((v) => v.name === 'seuil_expert')).toBe(true);
    // Depuis l'onglet du questionnaire, l'annulation emporte aussi le projet.
    st().undo(`q:${qid}`);
    expect(JSON.stringify(st().ws)).toBe(before);
  });

  it('annulation d’un renommage : une portée modifiée depuis garde ses modifications, les autres sont annulées', () => {
    runCommand('system.renameVariable', { name: 'plafond_expertise', next: 'seuil_expert' });
    st().edit(`q:${qid}`, (ws) => void (ws.questionnaires[0]!.description = 'modifié'));
    st().undo('project');
    expect(st().ws.project.systemState.some((v) => v.name === 'plafond_expertise')).toBe(true);
    expect(st().ws.questionnaires[0]!.description).toBe('modifié');
  });

  it('renomme un champ de liste (source, scénarios) ; un nom invalide est refusé', () => {
    runCommand('system.renameField', { variable: 'sinistres', field: 'nature', next: 'Nature Bad' });
    expect(st().ws.project.systemState.find((v) => v.name === 'sinistres')!.fields!.map((f) => f.name)).toContain('nature');
    runCommand('system.renameField', { variable: 'sinistres', field: 'nature', next: 'categorie' });
    expect(JSON.stringify(st().ws.questionnaires)).toContain("date & ' — ' & categorie");
    expect(JSON.stringify(st().ws.project.scenarios)).not.toContain('"nature"');
    st().openTab('system');
    runCommand('edit.undo');
    expect(JSON.stringify(st().ws.questionnaires)).toContain("date & ' — ' & nature");
    expect(st().ws.project.systemState.find((v) => v.name === 'sinistres')!.fields!.map((f) => f.name)).toContain('nature');
    expect(JSON.stringify(st().ws.project.scenarios)).toContain('"nature"');
  });

  it('crée, duplique et supprime des scénarios', () => {
    const n = st().ws.project.scenarios.length;
    runCommand('scenario.add');
    const created = st().ws.project.scenarios.at(-1)!;
    expect(created.name).toBe('Nouveau scénario');
    expect(created.values.type_adherent).toBe('ud');
    const first = st().ws.project.scenarios[0]!;
    runCommand('scenario.add', first.id);
    expect(st().ws.project.scenarios.at(-1)).toMatchObject({ name: `${first.name} (2)`, values: first.values });
    runCommand('scenario.delete', created.id);
    expect(st().ws.project.scenarios.length).toBe(n + 1);
  });

  it('enregistre l’état modifié de la prévisualisation comme scénario et le sélectionne', () => {
    expect(command('preview.saveScenario')!.enabled!()).toBe(false);
    st().set((s) => {
      s.view[qid] = 'preview';
      s.preview[qid] = { sys: { type_adherent: 'amicale', sinistres: [] } };
    });
    expect(runCommand('preview.saveScenario', 'Amicale modifiée')).toBe(true);
    const sc = st().ws.project.scenarios.at(-1)!;
    expect(sc).toMatchObject({ name: 'Amicale modifiée', values: { type_adherent: 'amicale', sinistres: [] } });
    expect(st().preview[qid]).toMatchObject({ scenarioId: sc.id, sys: undefined });
  });

  it('affiche ou masque les panneaux de la prévisualisation', () => {
    const before = st().previewPanels;
    runCommand('preview.toggleSystem');
    runCommand('preview.toggleDebug');
    expect(st().previewPanels).toEqual({ system: !before.system, debug: !before.debug });
  });

  it('EVO-014 : bascule les contrôles de saisie (activés par défaut), efface les erreurs affichées, hors projet', () => {
    expect(st().previewChecks).toBe(true);
    st().set((s) => void (s.preview.qx = { attempted: true }));
    const ws = st().ws;
    runCommand('preview.toggleChecks');
    expect(st().previewChecks).toBe(false);
    expect(st().ws).toBe(ws);
    runCommand('preview.toggleChecks');
    expect(st().previewChecks).toBe(true);
    expect(st().preview.qx?.attempted).toBe(false);
  });
});
