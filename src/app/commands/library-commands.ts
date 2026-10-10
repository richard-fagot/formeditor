import { newId, uniqueKey, type LabelSet, type Workspace } from '../../core/model';
import { useStore } from '../store';
import type { Command } from './types';

const st = () => useStore.getState();

/** Libellés proposés à la création d'un jeu (destinés à l'utilisateur final, à adapter). */
const YES = { fr: 'Oui', en: 'Yes' };
const NO = { fr: 'Non', en: 'No' };
const UNKNOWN = { fr: 'Ne sait pas', en: 'Don’t know' };

function inProjectLanguages(ws: Workspace, t: Record<string, string>) {
  const langs = ws.project.languages;
  const out = Object.fromEntries(Object.entries(t).filter(([l]) => langs.includes(l)));
  return Object.keys(out).length ? out : { [ws.project.defaultLanguage]: t.fr! };
}

function addLabelSet(kind: LabelSet['kind']) {
  st().edit('library', (ws) => {
    const base = kind === 'tristate' ? 'oui_non_ne_sait_pas' : 'oui_non';
    ws.library.labelSets.push({
      id: newId('ls'),
      key: uniqueKey(base, ws.library.labelSets.map((l) => l.key)),
      kind,
      yes: inProjectLanguages(ws, YES),
      no: inProjectLanguages(ws, NO),
      ...(kind === 'tristate' ? { unknown: inProjectLanguages(ws, UNKNOWN) } : {}),
    });
  });
  st().openTab('library');
  st().set((s) => void (s.libraryItem = undefined));
}

/** Bibliothèque : jeux de libellés (création, suppression). La saisie des libellés passe par `store.edit`. */
export function libraryCommands(): Command[] {
  return [
    { id: 'labelSet.addBoolean', label: 'labelSet.addBoolean', keys: [], scope: 'global', run: () => addLabelSet('boolean') },
    { id: 'labelSet.addTristate', label: 'labelSet.addTristate', keys: [], scope: 'global', run: () => addLabelSet('tristate') },
    {
      id: 'labelSet.delete', label: 'labelSet.delete', keys: [], scope: 'global', hidden: true,
      run: (id) => st().edit('library', (ws) => void (ws.library.labelSets = ws.library.labelSets.filter((l) => l.id !== id))),
    },
  ];
}
