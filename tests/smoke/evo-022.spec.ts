import { test, expect, type Download, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { importExample } from './support/example';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  await importExample(page);
  await expect(page.getByTestId('rf__node-n_type')).toBeVisible();
  return errors;
}

const tab = (page: Page, name: RegExp) => page.getByRole('tab', { name });
const version = (page: Page) => page.getByTestId('properties').getByLabel('Version');
async function openLibrary(page: Page) {
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('Bibliothèque');
  await page.keyboard.press('Enter');
}
const closeNotice = (page: Page) => page.getByRole('dialog').getByRole('button', { name: 'Fermer' }).first().click();

test('EVO-022 : version du questionnaire — saisie, verrou par la validation, refus sans version', async ({ page }) => {
  const errors = await open(page);
  // Provisoire : version enregistrée telle quelle.
  await expect(version(page)).toHaveValue('1.0.5');
  await expect(page.getByTestId('version-status')).toHaveText('Provisoire');
  await version(page).fill('1.0.6');
  await expect(version(page)).toHaveValue('1.0.6');
  // Version vide : validation refusée avec un message.
  await version(page).fill('');
  await page.getByTestId('validate').click();
  await expect(page.getByRole('dialog')).toContainText('Saisissez une version pour « Déclaration de sinistre » avant de le valider.');
  await closeNotice(page);
  await expect(page.getByTestId('diagram-validated')).toHaveCount(0);

  // Validé : champ grisé, infobulle ; dévalidé : modifiable ; dévalider puis revalider : version conservée.
  await tab(page, /Demande de remboursement/).click();
  await expect(version(page)).toHaveValue('1.0.4');
  await expect(version(page)).toBeDisabled();
  await expect(page.getByTestId('version-field')).toHaveAttribute('title', 'Désactiver la validation pour modifier la version');
  await expect(page.getByTestId('version-status')).toHaveText('Validé');
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('unvalidate').click();
  await expect(version(page)).toBeEnabled();
  await page.getByTestId('validate').click();
  await expect(page.getByTestId('diagram-validated')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(version(page)).toHaveValue('1.0.4');
  expect(errors).toEqual([]);
});

test('EVO-022 : élément de bibliothèque — version, utilisateurs, alerte sur le formulaire validé, levée à la revalidation', async ({ page }) => {
  const errors = await open(page);
  await openLibrary(page);
  await page.getByTestId('library-entry').filter({ hasText: 'Vos coordonnées' }).click();
  const input = page.getByTestId('item-version-input');
  await expect(input).toHaveValue('2.1.0');
  await expect(input).toBeDisabled();
  await expect(page.getByTestId('item-version-status')).toHaveText('Validé');
  await expect(page.getByTestId('item-users')).toHaveText('Questionnaires qui l’utilisent : demande_remboursement (validé)');

  // Dévalider (version de nouveau modifiable), passer en 2.2.0, revalider.
  await page.getByTestId('item-unvalidate').click();
  await expect(input).toBeEnabled();
  await input.fill('2.2.0');
  await page.getByTestId('item-validate').click();
  await expect(input).toBeDisabled();

  await tab(page, /Demande de remboursement/).click();
  await expect(page.getByTestId('version-alert')).toContainText('Vos coordonnées : 2.1.0 → 2.2.0');
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('unvalidate').click();
  await expect(page.getByTestId('version-alert')).toHaveCount(0);
  await page.getByTestId('validate').click();
  await expect(page.getByTestId('diagram-validated')).toBeVisible();
  await expect(page.getByTestId('version-alert')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('EVO-022 : valider un formulaire qui utilise un élément provisoire — alerte non bloquante ; export nommé', async ({ page }) => {
  const errors = await open(page);
  await openLibrary(page);
  await page.getByTestId('library-entry').filter({ hasText: 'Vos coordonnées' }).click();
  await page.getByTestId('item-unvalidate').click();
  await tab(page, /Demande de remboursement/).click();
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('unvalidate').click();
  await page.getByTestId('validate').click();
  await expect(page.getByRole('dialog')).toContainText('« Vos coordonnées » (2.1.0) n’est pas validé dans la bibliothèque.');
  await closeNotice(page);
  await expect(page.getByTestId('diagram-validated')).toBeVisible();

  // Export des fichiers unitaires : `<clé> - <version> - <final|provisoire>.json`, version et statut dans le fichier.
  const downloads: Download[] = [];
  page.on('download', (d) => downloads.push(d));
  await page.getByTitle('Exporter les fichiers unitaires').click();
  await expect.poll(() => downloads.length, { timeout: 10_000 }).toBeGreaterThanOrEqual(5);
  const names = downloads.map((d) => d.suggestedFilename());
  expect(names).toContain('declaration_sinistre - 1.0.5 - provisoire.json');
  expect(names).toContain('demande_remboursement - 1.0.4 - final.json');
  const refund = downloads.find((d) => d.suggestedFilename() === 'demande_remboursement - 1.0.4 - final.json')!;
  const json = JSON.parse(readFileSync(await refund.path(), 'utf8'));
  expect([json.version, json.status]).toEqual(['1.0.4', 'validated']);
  expect(json.libraryVersions.lq_identite).toEqual({ version: '2.1.0', status: 'draft' });
  expect(errors).toEqual([]);
});
