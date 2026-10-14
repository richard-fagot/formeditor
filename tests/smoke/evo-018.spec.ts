import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => void d.accept());
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  return errors;
}

async function exportText(page: Page): Promise<string> {
  const download = page.waitForEvent('download');
  await page.getByTestId('export').click();
  return readFileSync(await (await download).path(), 'utf8');
}

const fr = (s: string) => ({ fr: s });

/** Projet version 12 (antérieur à EVO-018) : Q12 tri-state, branche `constat = true`, jeu de libellés tri-state. */
function v12Bundle(bundleText: string): string {
  const b = JSON.parse(bundleText);
  const q = b.questionnaires[0];
  q.start = 'n_q12';
  q.nodes = [
    { kind: 'question', id: 'n_q12', key: 'constat', label: fr('Le sinistre a-t-il fait l’objet d’un constat ?'), type: 'tristate', required: true, labelSet: 'ls_tri' },
    { kind: 'end', id: 'n_oui', message: fr('Avec constat') },
    { kind: 'end', id: 'n_autre', message: fr('Sans constat') },
  ];
  q.edges = [
    { id: 'e1', from: 'n_q12', to: 'n_oui', when: 'constat = true' },
    { id: 'e2', from: 'n_q12', to: 'n_autre' },
  ];
  b.library.labelSets = [{ id: 'ls_tri', key: 'oui_non_nsp', kind: 'tristate', yes: fr('Oui'), no: fr('Non'), unknown: fr('Ne sait pas') }];
  for (const d of [b, b.project, b.library, ...b.questionnaires, ...b.layouts]) d.formatVersion = 12;
  return JSON.stringify(b);
}

/** Q12 convertie : booléen, « Ne sais pas » cochée, wizard Oui / Non / Ne sais pas ; aucun message. */
async function expectConverted(page: Page) {
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByTestId('rf__node-n_q12').click();
  const props = page.getByTestId('properties');
  await expect(props.locator('select').first()).toHaveValue('boolean');
  await expect(props.getByTestId('dont-know-editor').getByLabel('Option « Ne sais pas »')).toBeChecked();
  await page.getByTestId('view-preview').click();
  const preview = page.getByTestId('preview');
  await expect(preview.locator('[role=radiogroup] > label')).toHaveText(['Oui', 'Non', 'Ne sais pas']);
  // Branches conservées : « Ne sais pas » suit l'arête sans condition.
  await preview.getByText('Ne sais pas').click();
  await page.getByTestId('preview-next').click();
  await expect(preview).toContainText('Sans constat');
  await page.getByTestId('view-preview').click();
}

test('EVO-018 : le type tri-state n’est plus proposé (liste des types, palette)', async ({ page }) => {
  const errors = await open(page);
  await page.getByTestId('diagram').focus();
  await page.keyboard.press('n');
  const types = page.getByTestId('properties').locator('select').first().locator('option');
  await expect(types).toContainText(['Booléen']);
  await expect(types.filter({ hasText: /tri-state/i })).toHaveCount(0);
  await page.getByTestId('palette-button').click();
  await page.getByRole('combobox').fill('Type : ');
  await expect(page.getByRole('option').first()).toContainText('Type : ');
  await page.getByRole('combobox').fill('tri-state');
  await expect(page.getByRole('option').first()).toBeVisible();
  await expect(page.getByRole('option').filter({ hasText: /tri-state/i })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('EVO-018 : ouverture puis rechargement d’un projet contenant un tri-state, conversion silencieuse et stable', async ({ page }) => {
  const errors = await open(page);
  const old = v12Bundle(await exportText(page));
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Ouvrir / importer…' }).click();
  await (await chooser).setFiles({ name: 'projet.bundle.json', mimeType: 'application/json', buffer: Buffer.from(old) });
  await page.getByRole('button', { name: 'Mise en page automatique' }).click();
  await expectConverted(page);
  const converted = await exportText(page);
  expect(converted).not.toContain('tristate');

  // Rechargement avec une session enregistrée par une version antérieure (tri-state dans le stockage du navigateur).
  await page.waitForTimeout(1000);
  const tab = `q:${JSON.parse(old).questionnaires[0].id}`;
  await page.evaluate(([bundle, tab]) => new Promise<void>((done, fail) => {
    const req = indexedDB.open('editeur-questionnaires');
    req.onerror = () => fail(req.error);
    req.onsuccess = () => {
      const tx = req.result.transaction('etat', 'readwrite');
      tx.objectStore('etat').put({ bundle, dirty: false, tabs: [tab], activeTab: tab }, 'session');
      tx.oncomplete = () => { req.result.close(); done(); };
    };
  }), [old, tab]);
  await page.reload();
  await expect(page.getByTestId('app-title')).toBeAttached();
  await page.getByRole('button', { name: 'Mise en page automatique' }).click();
  await expectConverted(page);
  // Rechargé à nouveau ou réexporté : plus de conversion, contenu identique.
  expect(await exportText(page)).toBe(converted);
  await page.waitForTimeout(1000); // sauvegarde automatique (délai de 500 ms)
  await page.reload();
  await expect(page.getByTestId('app-title')).toBeAttached();
  expect(await exportText(page)).toBe(converted);
  expect(errors).toEqual([]);
});
