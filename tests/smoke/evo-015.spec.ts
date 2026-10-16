import { test, expect, type Page } from '@playwright/test';
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

test('EVO-015 : valider — marqueur sur l’onglet et dans le logigramme, lecture seule, consultation possible', async ({ page }) => {
  const errors = await open(page);
  const declaration = tab(page, /Déclaration de sinistre/);
  await expect(declaration.getByTestId('validated-badge')).toHaveCount(0);
  await expect(page.getByTestId('diagram-validated')).toHaveCount(0);
  await page.getByTestId('validate').click();
  await expect(declaration.getByTestId('validated-badge')).toHaveText('Validé');
  await expect(page.getByTestId('diagram-validated')).toBeVisible();
  await expect(page.getByTestId('validate')).toHaveCount(0);
  await expect(page.getByTestId('unvalidate')).toBeVisible();

  // Sélection et lecture des propriétés : possibles ; champs en lecture seule.
  const node = page.getByTestId('rf__node-n_type');
  await node.click();
  await expect(page.getByTestId('properties-locked')).toBeVisible();
  await expect(page.getByTestId('properties').getByRole('textbox').first()).toBeDisabled();

  // Raccourcis, glisser, édition en place, collage : sans effet.
  const count = await page.locator('.react-flow__node').count();
  // Glisser un nœud : il reste à sa place par rapport aux autres (au plus, la vue se déplace).
  const other = page.getByTestId('rf__node-n_date');
  const gap = async () => (await node.boundingBox())!.x - (await other.boundingBox())!.x;
  const before = await gap();
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 220, box.y + 210, { steps: 5 });
  await page.mouse.up();
  expect(await gap()).toBeCloseTo(before, 0);
  await page.keyboard.press('n');
  await expect(page.getByRole('dialog')).toContainText('Formulaire validé : modification impossible');
  await page.getByRole('dialog').getByRole('button', { name: 'Fermer' }).first().click();
  await node.click();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await page.getByRole('dialog').getByRole('button', { name: 'Fermer' }).first().click();
  await node.dblclick();
  await expect(page.getByLabel('intitulé')).toHaveCount(0);
  await expect(page.locator('.react-flow__node')).toHaveCount(count);

  // Prévisualisation inchangée ; copie vers un autre formulaire (non validé, modifiable).
  await page.getByTestId('view-preview').click();
  await expect(page.getByTestId('preview-next')).toBeVisible();
  await page.getByTestId('view-diagram').click();
  await node.click();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('Nouveau questionnaire');
  await page.keyboard.press('Enter');
  await page.getByTestId('diagram').focus();
  await page.keyboard.press('Control+v');
  await expect(page.locator('.react-flow__node').filter({ hasText: 'type_sinistre' })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('EVO-015 : dévalider — confirmation refusée : reste validé ; acceptée : modifiable, marqueur retiré', async ({ page }) => {
  const errors = await open(page);
  await tab(page, /Demande de remboursement/).click();
  const refund = tab(page, /Demande de remboursement/);
  await expect(refund.getByTestId('validated-badge')).toBeVisible();
  // Les autres formulaires restent modifiables.
  await expect(tab(page, /Déclaration de sinistre/).getByTestId('validated-badge')).toHaveCount(0);

  page.once('dialog', (d) => void d.dismiss());
  await page.getByTestId('unvalidate').click();
  await expect(refund.getByTestId('validated-badge')).toBeVisible();
  await expect(page.getByTestId('diagram-validated')).toBeVisible();

  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('unvalidate').click();
  await expect(refund.getByTestId('validated-badge')).toHaveCount(0);
  await expect(page.getByTestId('diagram-validated')).toHaveCount(0);
  await page.getByTestId('rf__node-n_rappel').click();
  await expect(page.getByTestId('properties-locked')).toHaveCount(0);
  await page.keyboard.press('n');
  await expect(page.getByLabel('intitulé')).toBeFocused();

  // Annuler la dévalidation (après avoir annulé la création) : de nouveau validé.
  await page.keyboard.press('Escape');
  await page.getByTestId('diagram').focus();
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Control+z');
  await expect(refund.getByTestId('validated-badge')).toBeVisible();
  expect(errors).toEqual([]);
});
