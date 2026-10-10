import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  return errors;
}

test('dist/index.html s’ouvre en file://', async ({ page }) => {
  const errors = await open(page);
  await expect(page.getByTestId('diagram')).toBeVisible();
  expect(errors).toEqual([]);
});

test('créer deux questions au clavier, relier, prévisualiser, exporter', async ({ page }) => {
  const errors = await open(page);
  const diagram = page.getByTestId('diagram');
  await diagram.click({ position: { x: 30, y: 30 } });

  // Deux questions chaînées (N), la seconde passée en booléen (B), puis une fin (Alt+F).
  for (const label of ['Nom du déclarant', 'Êtes-vous assuré ?']) {
    await page.keyboard.press('n');
    await expect(page.getByLabel('intitulé')).toBeFocused();
    await page.keyboard.type(label);
    await page.keyboard.press('Enter');
  }
  await page.keyboard.press('b');
  await page.keyboard.press('Alt+f');
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await expect(page.locator('.react-flow__node').first()).toContainText('nom_declarant');

  // Relier la première question à la fin (E, palette).
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('e');
  await page.getByPlaceholder(/Relier au nœud/).fill('Merci');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);

  // Annuler / rétablir (Ctrl+Z / Ctrl+Shift+Z).
  await diagram.focus();
  await page.keyboard.press('Control+z');
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);

  // Prévisualiser (P).
  await diagram.focus();
  await page.keyboard.press('p');
  const preview = page.getByTestId('preview');
  await expect(preview).toContainText('Nom du déclarant');
  await preview.getByRole('textbox').fill('Durand');
  await page.getByTestId('preview-next').click();
  await expect(preview).toContainText('Êtes-vous assuré ?');
  await preview.getByText('Oui').click();
  await page.getByTestId('preview-next').click();
  await expect(preview).toContainText('Merci');

  // Exporter (bundle).
  const download = page.waitForEvent('download');
  await page.getByTestId('export').click();
  const file = await (await download).path();
  const bundle = JSON.parse(readFileSync(file, 'utf8'));
  expect(bundle.kind).toBe('bundle');
  expect(bundle.questionnaires[0].nodes.map((n: { kind: string; type?: string }) => n.type ?? n.kind)).toEqual(['text', 'boolean', 'end']);
  expect(bundle.questionnaires[0].edges).toHaveLength(3);
  await expect(page.getByTestId('dirty')).toContainText('exporté');
  expect(errors).toEqual([]);
});

test('propriétés du questionnaire sans sélection : clé modifiable', async ({ page }) => {
  const errors = await open(page);
  const key = page.getByLabel('Clé du questionnaire');
  await expect(key).toBeVisible();
  await key.fill('sinistre');
  await key.press('Enter');
  const download = page.waitForEvent('download');
  await page.getByTestId('export').click();
  const bundle = JSON.parse(readFileSync(await (await download).path(), 'utf8'));
  expect(bundle.questionnaires[0].key).toBe('sinistre');
  expect(errors).toEqual([]);
});

test('nouveau questionnaire : première question au clavier puis à la souris, sans « départ introuvable »', async ({ page }) => {
  const errors = await open(page);
  // Le focus reste sur le bouton « + » après le clic : N doit malgré tout créer la question.
  await page.getByRole('button', { name: 'Nouveau questionnaire' }).click();
  await expect(page.getByTestId('diagram-empty')).toBeVisible();
  await expect(page.getByText('Nœud de départ introuvable')).toHaveCount(0);
  await page.keyboard.press('n');
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expect(page.getByLabel('intitulé')).toBeFocused();
  await page.keyboard.type('Première question');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Nœud de départ introuvable')).toHaveCount(0);
  await expect(page.getByTestId('diagram-empty')).toHaveCount(0);

  // Second questionnaire neuf : bouton de l'état vide.
  await page.getByRole('button', { name: 'Nouveau questionnaire' }).click();
  await page.getByTestId('diagram-empty').getByRole('button').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  expect(errors).toEqual([]);
});
