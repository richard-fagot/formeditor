import { FORMAT_VERSION, newId, type Bundle, type Library, type Workspace } from '../core/model';

export function emptyLibrary(): Library {
  return { formatVersion: FORMAT_VERSION, kind: 'library', questions: [], blocks: [], labelSets: [] };
}

export function newWorkspace(name: string, lang = 'fr'): Workspace {
  return {
    project: {
      formatVersion: FORMAT_VERSION,
      kind: 'project',
      id: newId('p'),
      name,
      languages: [lang],
      defaultLanguage: lang,
      systemState: [],
      scenarios: [],
      questionnaires: [],
    },
    library: emptyLibrary(),
    questionnaires: [],
    layouts: [],
  };
}

export function toBundle(ws: Workspace): Bundle {
  return { formatVersion: FORMAT_VERSION, kind: 'bundle', ...ws };
}
