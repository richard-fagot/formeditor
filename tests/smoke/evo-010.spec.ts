import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('exemple');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('rf__node-n_type')).toBeVisible();
  return errors;
}

test('EVO-010 : copier deux nœuds, les coller au pointeur dans un autre questionnaire, deux fois, puis annuler', async ({ page }) => {
  const errors = await open(page);
  await page.getByTestId('rf__node-n_type').click();
  await page.getByTestId('rf__node-n_lien').click({ modifiers: ['Shift'] });
  await page.keyboard.press('Control+c');
  await page.getByRole('tab', { name: /Demande de remboursement/ }).click();
  const diagram = page.getByTestId('diagram');
  await expect(page.locator('.react-flow__node')).toHaveCount(5);
  const box = (await diagram.boundingBox())!;
  await page.mouse.move(box.x + 60, box.y + 60);
  await page.keyboard.press('Control+v');
  await expect(page.locator('.react-flow__node')).toHaveCount(7);
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(2);
  await expect(page.locator('.react-flow__node.selected').filter({ hasText: 'type_sinistre' })).toHaveCount(1);
  await page.keyboard.press('Control+v');
  await expect(page.locator('.react-flow__node')).toHaveCount(9);
  await expect(page.locator('.react-flow__node.selected').filter({ hasText: 'type_sinistre_2' })).toHaveCount(1);
  await page.keyboard.press('Control+z');
  await expect(page.locator('.react-flow__node')).toHaveCount(7);
  expect(errors).toEqual([]);
});

test('EVO-010 : menu contextuel — coller sur le fond, dupliquer un questionnaire et un fragment', async ({ page }) => {
  const errors = await open(page);
  await page.getByTestId('rf__node-n_montant').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Copier' }).click();
  await page.getByTestId('diagram').locator('.react-flow__pane').click({ button: 'right', position: { x: 40, y: 40 } });
  await page.getByRole('menuitem', { name: 'Coller' }).click();
  await expect(page.locator('.react-flow__node.selected').filter({ hasText: 'montant_estime_2' })).toHaveCount(1);

  await page.getByRole('tab', { name: /Déclaration de sinistre/ }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Dupliquer' }).click();
  await expect(page.getByRole('tab', { name: /Copie de Déclaration de sinistre/ })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('rf__node-n_type')).toHaveCount(0);
  await expect(page.locator('.react-flow__node').filter({ hasText: 'type_sinistre' }).first()).toBeVisible();

  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('Bibliothèque');
  await page.keyboard.press('Enter');
  const entry = page.getByTestId('library-entry').filter({ hasText: 'tiers' }).first();
  const name = (await entry.locator('span').first().textContent())!;
  await entry.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Dupliquer' }).click();
  await expect(page.getByRole('tab', { name: `Copie de ${name}` })).toHaveAttribute('aria-selected', 'true');
  expect(errors).toEqual([]);
});
