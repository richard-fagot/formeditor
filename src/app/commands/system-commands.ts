import type { Workspace } from '../../core/model';
import { makeTranslate } from '../i18n';
import {
  activeQuestionnaire, addScenario, addVariable, deleteScenario, deleteVariable, exampleSystemState, renameVariable,
  renameListField, scenarioOf, systemStateOf, useStore,
} from '../store';
import type { Command } from './types';

const st = () => useStore.getState();
const t = () => makeTranslate(st().uiLang);
const previewed = () => {
  const q = activeQuestionnaire(st());
  return q && st().view[q.id] === 'preview' ? q : undefined;
};

/**
 * Renommage propagé : une transaction sur le projet, la bibliothèque et chaque questionnaire réécrit
 * (un seul Ctrl+Z, depuis n'importe laquelle de ces portées, annule l'ensemble).
 */
function propagate(rename: (ws: Workspace) => Workspace) {
  const ws = st().ws;
  const out = rename(ws);
  if (out === ws) return;
  st().transact(['project', 'library', ...ws.questionnaires.map((q) => `q:${q.id}` as const)], () => out);
}

/** Dictionnaire de l'état du système, scénarios, panneaux de la prévisualisation. */
export function systemCommands(): Command[] {
  return [
    {
      id: 'system.addVariable', label: 'system.addVariable', keys: [], scope: 'global',
      run: () => {
        let name = '';
        st().edit('project', (ws) => void (name = addVariable(ws)));
        st().openTab('system');
        st().requestFocus('variable', name);
      },
    },
    {
      id: 'system.deleteVariable', label: 'system.deleteVariable', keys: [], scope: 'global', hidden: true,
      run: (name) => typeof name === 'string' && st().edit('project', (ws) => deleteVariable(ws, name)),
    },
    {
      // `arg` : `{ name, next }`.
      id: 'system.renameVariable', label: 'system.renameVariable', keys: [], scope: 'global', hidden: true,
      run: (arg) => {
        const a = arg as { name?: unknown; next?: unknown } | undefined;
        if (typeof a?.name === 'string' && typeof a.next === 'string') propagate((ws) => renameVariable(ws, a.name as string, a.next as string));
      },
    },
    {
      // `arg` : `{ variable, field, next }` (champ d'une liste d'objets).
      id: 'system.renameField', label: 'system.renameField', keys: [], scope: 'global', hidden: true,
      run: (arg) => {
        const a = arg as { variable?: unknown; field?: unknown; next?: unknown } | undefined;
        if (typeof a?.variable === 'string' && typeof a.field === 'string' && typeof a.next === 'string') {
          propagate((ws) => renameListField(ws, a.variable as string, a.field as string, a.next as string));
        }
      },
    },
    {
      // Sans paramètre : nouveau scénario aux valeurs d'exemple ; `arg` = id : copie de ce scénario.
      id: 'scenario.add', label: 'scenario.add', keys: [], scope: 'global',
      run: (arg) => {
        const from = st().ws.project.scenarios.find((s) => s.id === arg);
        st().edit('project', (ws) => void addScenario(ws, from?.name ?? t()('scenario.newName'), from?.values ?? exampleSystemState(ws)));
        st().openTab('system');
      },
    },
    {
      id: 'scenario.delete', label: 'scenario.delete', keys: [], scope: 'global', hidden: true,
      run: (id) => typeof id === 'string' && st().edit('project', (ws) => deleteScenario(ws, id)),
    },
    {
      // Enregistre l'état du système de la prévisualisation affichée comme nouveau scénario, puis le sélectionne.
      // `arg` : nom (facultatif).
      id: 'preview.saveScenario', label: 'preview.saveScenario', keys: [], scope: 'global', enabled: () => !!previewed(),
      run: (arg) => {
        const q = previewed()!;
        const p = st().preview[q.id];
        const ws = st().ws;
        const name = typeof arg === 'string' && arg.trim() ? arg.trim() : `${scenarioOf(ws, p)?.name ?? t()('preview.noScenario')} *`;
        const values = systemStateOf(ws, p);
        let id = '';
        st().edit('project', (draft) => void (id = addScenario(draft, name, values)));
        st().set((s) => void (s.preview[q.id] = { ...s.preview[q.id], scenarioId: id, sys: undefined }));
      },
    },
    {
      id: 'preview.toggleSystem', label: 'preview.toggleSystem', keys: [], scope: 'global',
      run: () => st().set((s) => void (s.previewPanels.system = !s.previewPanels.system)),
    },
    {
      id: 'preview.toggleDebug', label: 'preview.toggleDebug', keys: [], scope: 'global',
      run: () => st().set((s) => void (s.previewPanels.debug = !s.previewPanels.debug)),
    },
    {
      id: 'preview.toggleOutline', label: 'preview.toggleOutline', keys: [], scope: 'global',
      run: () => st().set((s) => void (s.previewPanels.outline = !s.previewPanels.outline)),
    },
    {
      // Réactivés : erreurs effacées, contrôlées à la prochaine tentative de navigation (EVO-014).
      id: 'preview.toggleChecks', label: 'preview.toggleChecks', keys: [], scope: 'global',
      run: () => st().set((s) => {
        s.previewChecks = !s.previewChecks;
        for (const p of Object.values(s.preview)) p.attempted = false;
      }),
    },
  ];
}
