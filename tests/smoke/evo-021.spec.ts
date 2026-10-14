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


test('EVO-021 : l’astérisque et le blocage suivent la surcharge modifiée puis supprimée', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  await palette(page, 'Nouveau questionnaire');
  const panel = page.getByTestId('library-panel');
  await panel.getByLabel('Filtrer la bibliothèque…').fill('telephone');
  await panel.getByTestId('library-item').first().dragTo(page.getByTestId('diagram'), { targetPosition: { x: 80, y: 80 } });
  const node = page.locator('.react-flow__node').filter({ hasText: 'telephone' });
  await expect(node).toHaveCount(1);
  const preview = page.getByTestId('preview');
  const star = preview.locator('.text-rose-500', { hasText: '*' });
  const select = page.getByTestId('properties').getByTestId('required-select').first();

  /** Règle la surcharge (`''` : supprimée) puis vérifie astérisque et blocage dans la prévisualisation. */
  async function expectRequired(set: () => Promise<unknown>, required: boolean) {
    await page.getByTestId('view-diagram').click();
    await node.click();
    await set();
    await page.getByTestId('view-preview').click();
    await expect(star).toHaveCount(required ? 1 : 0);
    await page.getByTestId('preview-next').click();
    if (required) await expect(preview).toContainText('Réponse obligatoire.');
    else await expect(preview).not.toContainText('Réponse obligatoire.');
    await page.getByRole('button', { name: 'Recommencer' }).click();
  }

  await expectRequired(() => select.selectOption('false'), false);
  await expectRequired(() => select.selectOption('true'), true);
  await expectRequired(() => select.selectOption('false'), false);
  await expectRequired(() => page.getByTestId('properties').getByRole('button', { name: 'Revenir à la valeur héritée' }).click(), true);
  expect(errors).toEqual([]);
});
