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

  it('renomme une variable ; chaque portée réécrite reçoit un point d’historique', () => {
    runCommand('system.renameVariable', { name: 'plafond_expertise', next: 'seuil_expert' });
    expect(JSON.stringify(st().ws.questionnaires)).toContain('sys.seuil_expert');
    expect(st().history[`q:${qid}`]?.past.length).toBe(1);
    st().undo(`q:${qid}`);
    expect(JSON.stringify(st().ws.questionnaires)).toContain('sys.plafond_expertise');
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
});
