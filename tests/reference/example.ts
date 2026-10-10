import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { importFiles, type FileContent } from '../../src/format';

export const EXAMPLE_DIR = 'examples/declaration-sinistre';

/** Fichiers du projet d'exemple (hors chemins attendus), dans l'ordre de l'export. */
export function exampleFiles(): FileContent[] {
  return readdirSync(EXAMPLE_DIR)
    .filter((n) => n.endsWith('.json'))
    .map((name) => ({ name, text: readFileSync(join(EXAMPLE_DIR, name), 'utf8') }));
}

export function exampleWorkspace() {
  const { workspace, errors } = importFiles(exampleFiles());
  if (!workspace) throw new Error(errors.join('\n'));
  return workspace;
}
