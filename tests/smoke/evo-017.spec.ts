import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;
/** Exemple d'EVO-017 (« Autre (préciser) » est activée par `A`, pas saisie comme option). */
const GROUPED = '# Transports en commun\nBus\nMétro\nTrain\n# Véhicule personnel\nVoiture\nVélo';

/**
 * Ouvre le projet d'exemple (enregistré avant EVO-017), remplace les options de la question groupée, règle
 * « Autre » et le type (touches), puis va jusqu'à cette question dans le wizard ; renvoie les erreurs de la page.
 */
async function previewWith(page: Page, options: string, keys: string[]) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('exemple');
  await page.keyboard.press('Enter');
  await page.getByTestId('rf__node-n_qualite').click();
  const quick = page.getByTestId('options-quick');
  await quick.fill('');
  await quick.fill(options);
  await page.getByTestId('diagram').focus();
  for (const k of keys) await page.keyboard.press(k);
  const preview = page.getByTestId('preview');
  const next = page.getByTestId('preview-next');
  await page.getByTestId('view-preview').click();
  await next.click();
  await preview.getByText('Accident corporel').click();
  await next.click();
  await preview.locator('input[type=date]').fill('2025-01-01');
  await next.click();
  await preview.getByLabel('Prénom').fill('Léa');
  await preview.getByLabel(/^Nom/).fill('Martin');
  await preview.getByText('Non', { exact: true }).click();
  await next.click();
  await expect(preview).toContainText('À quel titre déclarez-vous ce sinistre ?');
  return { errors, preview };
}

/** « Autre » en dernier, hors des groupes, après un trait, alignée sur les titres de groupe. */
async function expectApart(preview: ReturnType<Page['getByTestId']>, role: 'radiogroup' | 'group') {
  const field = preview.locator(`[role=${role}][id]`).first();
  await expect(field.locator('label')).toHaveText(['Bus', 'Métro', 'Train', 'Voiture', 'Vélo', 'Autre (préciser)']);
  const apart = field.getByTestId('choice-other-apart');
  await expect(apart.locator('label')).toHaveText(['Autre (préciser)']);
  await expect(apart).toHaveCSS('border-top-style', 'solid');
  await expect(preview.getByRole('group', { name: 'Véhicule personnel' }).locator('label')).toHaveText(['Voiture', 'Vélo']);
  await expect(preview.getByTestId('choice-group').filter({ hasText: 'Autre' })).toHaveCount(0);
  const title = await preview.getByTestId('choice-group').last().locator('p').boundingBox();
  const other = await apart.locator('label').boundingBox();
  const last = await preview.getByRole('group', { name: 'Véhicule personnel' }).locator('label').last().boundingBox();
  expect(other!.x).toBe(title!.x);
  expect(other!.y).toBeGreaterThan(last!.y + last!.height + 8);
}

test('EVO-017 : choix unique groupé, « Autre » à part ; sa précision apparaît comme avant ; projet antérieur', async ({ page }) => {
  const { errors, preview } = await previewWith(page, GROUPED, ['a']);
  await expectApart(preview, 'radiogroup');
  await expect(preview.getByRole('textbox')).toHaveCount(0);
  await preview.getByText('Autre (préciser)').click();
  await expect(preview.getByRole('textbox', { name: 'Autre (préciser)' })).toBeFocused();
  expect(errors).toEqual([]);
});

test('EVO-017 : choix multiple groupé, même séparation', async ({ page }) => {
  const { errors, preview } = await previewWith(page, GROUPED, ['a', 'm']);
  await expectApart(preview, 'group');
  await preview.getByText('Autre (préciser)').click();
  await expect(preview.getByRole('textbox', { name: 'Autre (préciser)' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('EVO-017 : groupes sans « Autre », ou sans groupe avec ou sans « Autre » : rendu inchangé', async ({ page, browser }) => {
  const grouped = await previewWith(page, GROUPED, []);
  await expect(grouped.preview.getByTestId('choice-group')).toHaveCount(2);
  await expect(grouped.preview.getByTestId('choice-other-apart')).toHaveCount(0);
  expect(grouped.errors).toEqual([]);

  // Une page neuve par tour : sinon la session sauvegardée (IndexedDB) est restaurée, la confirmation
  // « modifications non exportées » est refusée par Playwright et l'exemple n'est pas rouvert.
  for (const keys of [['a'], []]) {
    const fresh = await browser.newPage();
    const flat = await previewWith(fresh, 'Bus\nVoiture', keys);
    const labels = flat.preview.locator('[role=radiogroup] > label');
    await expect(labels).toHaveText(keys.length ? ['Bus', 'Voiture', 'Autre (préciser)'] : ['Bus', 'Voiture']);
    await expect(flat.preview.getByTestId('choice-other-apart')).toHaveCount(0);
    await expect(flat.preview.getByTestId('choice-group')).toHaveCount(0);
    expect(flat.errors).toEqual([]);
    await fresh.close();
  }
});
