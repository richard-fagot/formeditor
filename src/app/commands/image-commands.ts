import { activeQuestionnaire, useStore, type ImageOptions } from '../store';
import type { Command } from './types';

const st = () => useStore.getState();

/** Logigramme d'un questionnaire non vide affiché ? (blocs de la bibliothèque et vue côte à côte : non exportés) */
function exportable(): boolean {
  const q = activeQuestionnaire(st());
  return !!q && (st().view[q.id] ?? 'diagram') === 'diagram' && q.nodes.length > 0;
}

/** Options valides à partir d'un paramètre quelconque (valeurs par défaut sinon). */
function optionsOf(arg: unknown): ImageOptions {
  const a = (arg ?? {}) as Partial<Record<keyof ImageOptions, unknown>>;
  return { scope: a.scope === 'selection' ? 'selection' : 'all', title: a.title !== false };
}

/** Export du logigramme en image PNG (EVO-004, spec §6.4). */
export function imageCommands(): Command[] {
  return [
    {
      // Ouvre le dialogue d'options (derniers choix) ; `Entrée` y lance l'export.
      id: 'view.exportImage', label: 'image.export', keys: ['x'], scope: 'graph', enabled: exportable,
      run: () => st().set((s) => void (s.imageDialog = true)),
    },
    {
      // `arg` : `{ scope, title }` ; mémorise les choix, ferme le dialogue, demande l'export à `ui/diagram`.
      id: 'view.exportImageRun', label: 'image.run', keys: [], scope: 'global', hidden: true, enabled: exportable,
      run: (arg) => {
        const options = optionsOf(arg);
        st().set((s) => {
          s.imageOptions = options;
          s.imageDialog = false;
          s.imageRequest += 1;
        });
      },
    },
  ];
}
