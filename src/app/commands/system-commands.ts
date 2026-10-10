import { makeTranslate } from '../i18n';
import {
  activeQuestionnaire, addScenario, addVariable, deleteScenario, deleteVariable, exampleSystemState, renameVariable,
  scenarioOf, systemStateOf, useStore,
} from '../store';
import type { Command } from './types';

const st = () => useStore.getState();
const t = () => makeTranslate(st().uiLang);
const previewed = () => {
  const q = activeQuestionnaire(st());
  return q && st().view[q.id] === 'preview' ? q : undefined;
};

/** Renomme une variable : point d'historique dans chaque portée réécrite (questionnaires, bibliothèque), puis le projet. */
function renameVar(name: string, next: string) {
  const ws = st().ws;
  const out = renameVariable(ws, name, next);
  if (out === ws) return;
  ws.questionnaires.forEach((q, i) => {
    if (JSON.stringify(q) !== JSON.stringify(out.questionnaires[i])) st().checkpoint(`q:${q.id}`);
  });
  if (JSON.stringify(ws.library) !== JSON.stringify(out.library)) st().checkpoint('library');
  st().edit('project', () => out);
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
        if (typeof a?.name === 'string' && typeof a.next === 'string') renameVar(a.name, a.next);
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
  ];
}
