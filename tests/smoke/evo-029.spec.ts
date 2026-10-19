import { test, expect, type Download, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { importExample } from './support/example';

// EVO-029 : export de l'inventaire des données (amorce RGPD) en xlsx.
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

async function palette(page: Page, text: string) {
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox');
  await expect(input).toBeFocused();
  await input.fill(text);
  await expect(page.getByRole('option').first()).toContainText(text);
  await page.keyboard.press('Enter');
}

/** Entrées d'une archive zip (xlsx) : nom → texte, d'après le répertoire central. */
function unzip(buf: Buffer): Record<string, string> {
  const out: Record<string, string> = {};
  const end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = buf.readUInt32LE(end + 16);
  for (let i = 0; i < buf.readUInt16LE(end + 10); i++) {
    const [method, size, nameLen, extraLen, commentLen, offset] = [buf.readUInt16LE(p + 10), buf.readUInt32LE(p + 20), buf.readUInt16LE(p + 28), buf.readUInt16LE(p + 30), buf.readUInt16LE(p + 32), buf.readUInt32LE(p + 42)];
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = offset + 30 + buf.readUInt16LE(offset + 26) + buf.readUInt16LE(offset + 28);
    const raw = buf.subarray(start, start + size);
    out[name] = (method === 8 ? inflateRawSync(raw) : raw).toString('utf8');
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function xlsx(download: Download) {
  return unzip(readFileSync((await download.path())!));
}

test('EVO-029-002 / EVO-029-040 / EVO-029-036 — bouton « Inventaire RGPD » à côté de « Image » : fichier xlsx, projet inchangé', async ({ page }) => {
  const errors = await open(page);
  const image = page.getByTestId('export-image');
  const button = page.getByTestId('export-inventory');
  await expect(button).toHaveText('Inventaire RGPD');
  expect(await image.evaluate((el) => el.nextElementSibling?.getAttribute('data-testid'))).toBe('export-inventory');
  const dirty = await page.getByTestId('dirty').textContent();
  const nodes = await page.locator('.react-flow__node').count();
  const download = page.waitForEvent('download');
  await button.click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('declaration_sinistre - 1.0.5 - provisoire - inventaire.xlsx');
  const parts = await xlsx(file);
  expect(parts['xl/workbook.xml']).toMatch(/name="Données"[\s\S]*name="À propos"/);
  const all = Object.values(parts).join('\n');
  for (const text of ['Identifiant', 'Donnée personnelle présumée', 'Catégorie de donnée', 'Observations', 'declaration_sinistre/', 'Document d’amorce généré par l’éditeur']) {
    expect(all).toContain(text);
  }
  expect(parts['xl/styles.xml']).toMatch(/D9E1F2/i);
  expect(parts['xl/styles.xml']).toMatch(/FFF2CC/i);
  await expect(page.getByTestId('dirty')).toHaveText(dirty!);
  await expect(page.locator('.react-flow__node')).toHaveCount(nodes);
  expect(errors).toEqual([]);
});

test('EVO-029-001 / EVO-029-004 / EVO-029-008 — palette « Exporter l’inventaire RGPD », questionnaire validé compris', async ({ page }) => {
  await open(page);
  await page.getByRole('tab', { name: /Demande de remboursement/ }).click();
  const download = page.waitForEvent('download');
  await palette(page, 'Exporter l’inventaire RGPD');
  expect((await download).suggestedFilename()).toBe('demande_remboursement - 1.0.4 - final - inventaire.xlsx');
});

test('EVO-029-006 — raccourci associé dans les Paramètres : lance l’export', async ({ page }) => {
  await open(page);
  await page.getByTestId('open-settings').click();
  const row = page.getByTestId('shortcut-questionnaire.exportInventory');
  await expect(row).not.toContainText('Shift');
  await row.getByRole('button', { name: /Ajouter un raccourci/ }).click();
  await page.keyboard.press('Shift+Y');
  await expect(row).toContainText('Y');
  await page.getByRole('tab', { name: /Déclaration/ }).click();
  const download = page.waitForEvent('download');
  await page.keyboard.press('Shift+Y');
  expect((await download).suggestedFilename()).toBe('declaration_sinistre - 1.0.5 - provisoire - inventaire.xlsx');
});
