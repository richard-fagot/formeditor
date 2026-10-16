import { expect, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const EXAMPLE_DIR = resolve('examples/declaration-sinistre');

/** Fichiers du projet d'exemple « déclaration de sinistre » (hors chemins attendus). */
export const EXAMPLE_FILES = readdirSync(EXAMPLE_DIR)
  .filter((n) => n.endsWith('.json'))
  .map((n) => join(EXAMPLE_DIR, n));

/**
 * Ouvre l'exemple comme tout autre projet, avec « Ouvrir / importer… » (EVO-026 : plus de commande dédiée),
 * et attend qu'il soit chargé.
 */
export async function importExample(page: Page) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Ouvrir / importer…' }).click();
  await (await chooser).setFiles(EXAMPLE_FILES);
  await expect(page.getByLabel('Nom du projet')).toHaveValue('Déclarations de sinistre');
}
