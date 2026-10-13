import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  return errors;
}

/** Palette : exécute la commande dont le libellé contient `text`. */
async function palette(page: Page, text: string) {
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox');
  await expect(input).toBeFocused();
  await input.fill(text);
  await expect(page.getByRole('option').first()).toContainText(text);
  await page.keyboard.press('Enter');
}

test('EVO-012 : surcharger une référence de bibliothèque — indicateur, valeur effective, retour à la valeur héritée', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  const node = page.getByTestId('rf__node-n_tel');
  await expect(node).toContainText('*');
  await expect(node).not.toContainText('surch.');
  await node.click();
  const select = page.getByTestId('properties').getByTestId('required-select').first();
  await expect(select).toHaveValue('');
  await expect(select.locator('option').first()).toHaveText('Hérité (Obligatoire, bibliothèque)');
  await select.selectOption('false');
  await expect(node).toContainText('surch.');
  await expect(node.getByText('*', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('required-effective').first()).toHaveText('Valeur effective : Facultatif (surcharge locale).');
  await palette(page, 'Revenir à la valeur héritée');
  await expect(node).not.toContainText('surch.');
  await expect(select).toHaveValue('');
  await expect(page.getByTestId('required-effective').first()).toHaveText('Valeur effective : Obligatoire (bibliothèque).');
  expect(errors).toEqual([]);
});

test('EVO-012 : nœud fragment — questions listées, surcharge repérée, provenance « fragment »', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  await page.getByRole('tab', { name: /Demande de remboursement/ }).click();
  const node = page.getByTestId('rf__node-n_ident');
  await expect(node).toContainText('surch.');
  await node.click();
  const item = page.getByTestId('fragment-required-item').filter({ hasText: 'ident.num_secu' });
  await expect(item).toContainText('Surchargé');
  await expect(item.getByTestId('required-select')).toHaveValue('false');
  await expect(item.getByTestId('required-select').locator('option').first()).toHaveText('Hérité (Obligatoire, fragment identification_assure)');
  await expect(item.getByTestId('required-effective')).toHaveText('Valeur effective : Facultatif (surcharge locale).');
  await item.getByTestId('required-select').selectOption('');
  await expect(item).not.toContainText('Surchargé');
  await expect(node).not.toContainText('surch.');
  await expect(item.getByTestId('required-effective')).toHaveText('Valeur effective : Obligatoire (fragment identification_assure).');
  expect(errors).toEqual([]);
});

test('EVO-012 : prévisualisation — le wizard exige la question selon sa valeur effective', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  await palette(page, 'Nouveau questionnaire');
  const panel = page.getByTestId('library-panel');
  await panel.getByLabel('Filtrer la bibliothèque…').fill('telephone');
  await panel.getByTestId('library-item').first().dragTo(page.getByTestId('diagram'), { targetPosition: { x: 80, y: 80 } });
  const node = page.locator('.react-flow__node').filter({ hasText: 'telephone' });
  await expect(node).toHaveCount(1);
  const preview = page.getByTestId('preview');
  await page.getByTestId('view-preview').click();
  await expect(preview.locator('.text-rose-500', { hasText: '*' })).toHaveCount(1);
  await page.getByTestId('preview-next').click();
  await expect(preview).toContainText('Réponse obligatoire.');

  await page.getByTestId('view-diagram').click();
  await node.click();
  await page.getByTestId('properties').getByTestId('required-select').first().selectOption('false');
  await page.getByTestId('view-preview').click();
  await expect(preview.locator('.text-rose-500', { hasText: '*' })).toHaveCount(0);
  await page.getByTestId('preview-next').click();
  await expect(preview).not.toContainText('Réponse obligatoire.');
  expect(errors).toEqual([]);
});
