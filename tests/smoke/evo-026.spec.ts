import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { importExample } from './support/example';

// EVO-026 : plus d'ouverture de l'exemple dans la barre de projet, la palette ni les raccourcis.
const appUrl = pathToFileURL(resolve('dist/index.html')).href;
const FILE_BUTTONS = ['Nouveau projet', 'Ouvrir / importer…', 'Exporter (bundle)', 'Exporter les fichiers unitaires'];

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  return errors;
}

/** Noms accessibles des boutons de la barre de projet, dans l'ordre d'affichage. */
async function topBarButtons(page: Page): Promise<string[]> {
  return page.locator('header').first().getByRole('button').evaluateAll((els) =>
    els.map((e) => (e.textContent?.trim() || e.getAttribute('title') || e.getAttribute('aria-label') || '').replace(/Ctrl\+K$/, '').trim()));
}

test('EVO-026-001 — barre de projet sans icône « Ouvrir l’exemple »', async ({ page }) => {
  const errors = await open(page);
  const header = page.locator('header').first();
  await expect(header.getByRole('button', { name: 'Ouvrir / importer…' })).toBeVisible();
  await expect(header.getByRole('button', { name: /exemple/i })).toHaveCount(0);
  await expect(header.locator('[title*="exemple" i]')).toHaveCount(0);
  expect(await topBarButtons(page)).not.toContainEqual(expect.stringMatching(/exemple/i));
  expect(errors).toEqual([]);
});

test('EVO-026-002 — Nouveau projet, Ouvrir / importer…, Exporter (bundle), Exporter les fichiers unitaires : ordre et effet', async ({ page }) => {
  const errors = await open(page);
  const names = await topBarButtons(page);
  const start = names.indexOf(FILE_BUTTONS[0]!);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(names.slice(start, start + FILE_BUTTONS.length)).toEqual(FILE_BUTTONS);

  // Ouvrir / importer… : sélecteur de fichiers, projet chargé.
  await importExample(page);
  // Exporter (bundle) : un seul fichier, au nom du projet.
  const bundle = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter (bundle)' }).click();
  expect((await bundle).suggestedFilename()).toBe('declarations_de_sinistre.bundle.json');
  // Exporter les fichiers unitaires : projet.json en premier.
  const unit = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter les fichiers unitaires' }).click();
  expect((await unit).suggestedFilename()).toBe('projet.json');
  // Nouveau projet : projet exporté, remplacé sans confirmation.
  await page.getByRole('button', { name: 'Nouveau projet' }).click();
  await expect(page.getByLabel('Nom du projet')).toHaveValue('Nouveau projet');
  expect(errors).toEqual([]);
});

test('EVO-026-003 — palette : « exemple » ne propose aucune ouverture de l’exemple', async ({ page }) => {
  const errors = await open(page);
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox');
  await expect(input).toBeFocused();
  await input.fill('exemple');
  await expect(page.getByRole('option').filter({ hasText: /ouvrir l.exemple|déclaration de sinistre/i })).toHaveCount(0);
  // La palette reste fonctionnelle : une autre recherche propose bien « Ouvrir / importer… ».
  await input.fill('Ouvrir');
  await expect(page.getByRole('option').filter({ hasText: 'Ouvrir / importer…' })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('EVO-026-004 — Paramètres : aucun raccourci d’ouverture de l’exemple', async ({ page }) => {
  const errors = await open(page);
  await page.getByTestId('open-settings').click();
  const list = page.getByTestId('settings-shortcuts');
  await expect(list.getByTestId('shortcut-project.open')).toBeVisible();
  await expect(list).not.toContainText(/ouvrir l.exemple/i);
  await expect(list.getByTestId('shortcut-project.example')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('EVO-026-005 — session restaurée avec un raccourci de l’exemple : démarrage sans message, raccourci sans effet', async ({ page }) => {
  const errors = await open(page);
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.message()); void d.dismiss(); });
  await page.getByLabel('Nom du projet').fill('Mon projet');
  // Exporté : l'ancienne commande aurait remplacé le projet sans confirmation.
  const download = page.waitForEvent('download');
  await page.getByTestId('export').click();
  await download;
  await page.waitForTimeout(1000); // sauvegarde automatique (délai de 500 ms)
  await page.evaluate(() => new Promise<void>((done, fail) => {
    const req = indexedDB.open('editeur-questionnaires');
    req.onerror = () => fail(req.error);
    req.onsuccess = () => {
      const store = req.result.transaction('etat', 'readwrite').objectStore('etat');
      const get = store.get('session');
      get.onsuccess = () => {
        const tx = store.put({ ...get.result, keymap: { 'project.example': ['$mod+Shift+y'] } }, 'session');
        tx.onsuccess = () => { req.result.close(); done(); };
        tx.onerror = () => fail(tx.error);
      };
    };
  }));
  await page.reload();
  await expect(page.getByTestId('app-title')).toBeAttached();
  await expect(page.getByLabel('Nom du projet')).toHaveValue('Mon projet');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByTestId('diagram').click({ position: { x: 30, y: 30 } });
  await page.keyboard.press('Control+Shift+y');
  await page.waitForTimeout(300);
  await expect(page.getByLabel('Nom du projet')).toHaveValue('Mon projet');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(dialogs).toEqual([]);
  expect(errors).toEqual([]);
});

test('EVO-026-006 — fichiers de l’exemple ouverts avec « Ouvrir / importer… » : chargés comme tout projet', async ({ page }) => {
  const errors = await open(page);
  await importExample(page);
  await expect(page.locator('.react-flow__node')).toHaveCount(21);
  await expect(page.getByRole('tab', { name: /Demande de remboursement/ })).toBeVisible();
  await expect(page.getByTestId('dirty')).toHaveText('Tout est exporté');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(errors).toEqual([]);
});
