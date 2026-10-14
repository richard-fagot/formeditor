import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// EVO-023 : version et statut dans le nom et le titre de l'image du logigramme (spec §6.4).
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

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

/** Ouvre le dialogue d'export, règle la case titre, exporte ; nom du fichier et nombre de pixels sombres de l'en-tête. */
async function exportImage(page: Page, title: boolean) {
  await page.getByTestId('export-image').click();
  await page.getByTestId('image-title').setChecked(title);
  const pending = page.waitForEvent('download');
  await page.getByTestId('image-dialog').getByRole('button', { name: 'Exporter' }).click();
  const d = await pending;
  const b64 = readFileSync((await d.path())!).toString('base64');
  const headerInk = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = `data:image/png;base64,${src}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, c.width, 76);
    let ink = 0;
    for (let i = 0; i < data.length; i += 4) if (data[i]! < 128) ink++;
    return ink;
  }, b64);
  return { name: d.suggestedFilename(), headerInk };
}

test('EVO-023 : nom du fichier image avec version et statut, titre selon l’option', async ({ page }) => {
  const errors = await open(page);
  const version = page.getByTestId('properties').getByLabel('Version');

  // Provisoire en 1.0.5, titre coché : version et statut dans le nom, titre dessiné.
  const draft = await exportImage(page, true);
  expect(draft.name).toBe(`Déclarations de sinistre - Déclaration de sinistre - 1.0.5 - provisoire - ${today()}.png`);
  expect(draft.headerInk).toBeGreaterThan(100);

  // Caractère interdit dans la version, titre décoché : `_` dans le nom, aucun titre.
  await version.fill('1/2');
  const slash = await exportImage(page, false);
  expect(slash.name).toBe(`Déclarations de sinistre - Déclaration de sinistre - 1_2 - provisoire - ${today()}.png`);
  expect(slash.headerInk).toBe(0);

  // Version vide : segment omis.
  await version.fill('');
  expect((await exportImage(page, false)).name).toBe(`Déclarations de sinistre - Déclaration de sinistre - provisoire - ${today()}.png`);

  // Questionnaire validé en 1.0.4 : `- 1.0.4 - final -`.
  await page.getByRole('tab', { name: /Demande de remboursement/ }).click();
  await expect(version).toHaveValue('1.0.4');
  expect((await exportImage(page, true)).name).toContain(' - 1.0.4 - final - ');
  expect(errors).toEqual([]);
});
