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

test('EVO-027-001, EVO-027-005, EVO-027-006, EVO-027-010, EVO-027-014, EVO-027-015, EVO-027-020 — supprimer un formulaire validé depuis son onglet, puis annuler', async ({ page }) => {
  const errors = await open(page);
  await tab(page, /Demande de remboursement/).click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Dupliquer' })).toBeVisible();
  const asked: string[] = [];
  page.once('dialog', (d) => { asked.push(d.message()); void d.accept(); });
  await page.getByRole('menuitem', { name: 'Supprimer' }).click();
  await expect(tab(page, /Demande de remboursement/)).toHaveCount(0);
  expect(asked[0]).toContain('Supprimer le questionnaire « Demande de remboursement » ?');
  expect(asked[0]).toContain('Il est validé.');
  await expect(page.getByRole('button', { name: /Demande de remboursement/ })).toHaveCount(0);
  await expect(page.getByTestId('dirty')).toHaveText(/Modifications non exportées/);
  // Annuler depuis l'onglet affiché (Déclaration de sinistre) : questionnaire et onglet restaurés.
  await expect(tab(page, /Déclaration de sinistre/)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Control+z');
  await expect(tab(page, /Demande de remboursement/)).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('EVO-027-002, EVO-027-009, EVO-027-021 — bouton de réouverture : « Supprimer », refus puis confirmation', async ({ page }) => {
  const errors = await open(page);
  const declaration = tab(page, /Déclaration de sinistre/);
  await declaration.hover();
  await declaration.getByRole('button', { name: 'Fermer l’onglet' }).click();
  const reopen = page.getByRole('button', { name: 'Déclaration de sinistre' });
  await expect(reopen).toBeVisible();
  await reopen.click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Dupliquer' })).toBeVisible();
  page.once('dialog', (d) => void d.dismiss());
  await page.getByRole('menuitem', { name: 'Supprimer' }).click();
  await expect(reopen).toBeVisible();
  await reopen.click({ button: 'right' });
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('menuitem', { name: 'Supprimer' }).click();
  await expect(reopen).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('EVO-027-004, EVO-027-003, EVO-027-012, EVO-027-016 — Propriétés du questionnaire et palette ; Bibliothèque quand il n’en reste aucun', async ({ page }) => {
  const errors = await open(page);
  await page.getByTestId('diagram').locator('.react-flow__pane').click({ position: { x: 20, y: 20 } });
  page.once('dialog', (d) => void d.accept());
  await page.getByTestId('questionnaire-delete').click();
  await expect(tab(page, /Déclaration de sinistre/)).toHaveCount(0);
  await expect(tab(page, /Demande de remboursement/)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('Supprimer le questionnaire');
  page.once('dialog', (d) => void d.accept());
  await page.keyboard.press('Enter');
  await expect(tab(page, /Demande de remboursement/)).toHaveCount(0);
  await expect(tab(page, /Bibliothèque/)).toHaveAttribute('aria-selected', 'true');
  expect(errors).toEqual([]);
});
