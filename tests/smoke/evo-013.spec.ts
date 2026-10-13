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

test('EVO-013 : double-clic sur le badge « bib. » d’une question — bibliothèque ouverte, question sélectionnée, intitulé non édité', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  const tab = page.getByRole('tab', { selected: true });
  const tabName = (await tab.textContent())!;
  const badge = page.getByTestId('rf__node-n_tel').getByTestId('library-badge');
  await expect(badge).toHaveAttribute('title', 'Double-clic pour ouvrir dans la bibliothèque');
  await badge.dblclick();
  await expect(page.getByTestId('library')).toBeVisible();
  const current = page.getByTestId('library-entry').and(page.locator('[aria-current="true"]'));
  await expect(current).toHaveCount(1);
  await expect(current).toBeInViewport();
  await expect(page.getByTestId('library-question')).toBeVisible();
  // L'action de double-clic du nœud (édition de l'intitulé) n'a pas été déclenchée.
  await page.getByRole('tab', { name: tabName }).click();
  await expect(page.getByTestId('rf__node-n_tel')).toBeVisible();
  await expect(page.getByLabel('intitulé')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('EVO-013 : double-clic sur le badge « bib. » d’un nœud fragment — fragment ouvert', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  await page.getByRole('tab', { name: /Demande de remboursement/ }).click();
  await page.getByTestId('rf__node-n_ident').getByTestId('library-badge').dblclick();
  await expect(page.getByTestId('fragment-view')).toBeVisible();
  await expect(page.getByRole('tab', { selected: true })).toContainText(/ident/i);
  expect(errors).toEqual([]);
});

test('EVO-013 : double-clic ailleurs que sur le badge — édition de l’intitulé comme avant', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  const node = page.getByTestId('rf__node-n_tel');
  await node.locator('.font-semibold').first().dblclick();
  await expect(page.getByLabel('intitulé')).toBeFocused();
  await expect(page.getByTestId('library')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('EVO-013 : modifications non enregistrées conservées après ouverture de l’objet lié', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  const tabName = (await page.getByRole('tab', { selected: true }).textContent())!;
  const node = page.getByTestId('rf__node-n_tel');
  await node.locator('.font-semibold').first().dblclick();
  await page.getByLabel('intitulé').fill('Numéro modifié');
  await page.keyboard.press('Enter');
  await expect(node).toContainText('Numéro modifié');
  await node.getByTestId('library-badge').dblclick();
  await expect(page.getByTestId('library')).toBeVisible();
  await page.getByRole('tab', { name: tabName }).click();
  await expect(page.getByTestId('rf__node-n_tel')).toContainText('Numéro modifié');
  expect(errors).toEqual([]);
});

test('EVO-013 : lien rompu — message, on reste sur le questionnaire', async ({ page }) => {
  const errors = await open(page);
  page.on('dialog', (d) => d.accept());
  await palette(page, 'exemple');
  const tab = page.getByRole('tab', { name: /Demande de remboursement/ });
  await tab.click();
  await page.getByTestId('rf__node-n_ident').getByTestId('fragment-open').click();
  await page.getByTestId('fragment-view').getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByTestId('fragment-view')).toHaveCount(0);
  await tab.click();
  await page.getByTestId('rf__node-n_ident').getByTestId('library-badge').dblclick();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Objet de bibliothèque introuvable');
  await dialog.getByRole('button', { name: 'Fermer' }).first().click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('rf__node-n_ident')).toBeVisible();
  expect(errors).toEqual([]);
});
