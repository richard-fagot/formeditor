import writeXlsxFile from 'write-excel-file/browser';
import { activeQuestionnaire, useStore } from '../store';
import { questionType } from '../../registry';
import { download } from './files';
import { inventoryFileName, inventorySheets } from './inventory-file';
import type { Command } from './types';

const st = () => useStore.getState();

/** Export de l'inventaire des données en xlsx (EVO-029, spec §6.5) : lecture seule, aucun état modifié. */
export function inventoryCommands(): Command[] {
  return [
    {
      id: 'questionnaire.exportInventory', label: 'inventory.export', keys: [], scope: 'global',
      enabled: () => !!activeQuestionnaire(st()),
      run: () => {
        const q = activeQuestionnaire(st());
        if (!q) return;
        const sheets = inventorySheets(st().ws, q, new Date(), (t) => questionType(t)?.name.fr ?? t);
        void writeXlsxFile(sheets).toBlob().then((blob) => download(inventoryFileName(q), blob));
      },
    },
  ];
}
