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

/** Glisse la question de bibliothèque `filter` sur le logigramme du questionnaire actif. */
async function dropLibraryQuestion(page: Page, filter: string) {
  const panel = page.getByTestId('library-panel');
  await panel.getByLabel('Filtrer la bibliothèque…').fill(filter);
  await panel.getByTestId('library-item').first().dragTo(page.getByTestId('diagram'), { targetPosition: { x: 80, y: 80 } });
}

test('EVO-009 : copier une question locale dans la bibliothèque (même place, conditions inchangées, bouton absent ensuite)', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  const warnings = await page.locator('.react-flow__node').filter({ hasText: '⚠' }).count();
  const node = page.getByTestId('rf__node-n_type');
  await node.click();
  await page.getByTestId('copy-to-library').click();
  await expect(node).toContainText('bib.');
  await expect(node).toContainText('type_sinistre');
  await expect(page.getByTestId('properties')).toContainText('Question de bibliothèque');
  await expect(page.getByTestId('copy-to-library')).toHaveCount(0);
  await expect(page.locator('.react-flow__node').filter({ hasText: '⚠' })).toHaveCount(warnings);
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('Copier dans la bibliothèque');
  await expect(page.getByRole('option', { name: /Copier dans la bibliothèque/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});

test('EVO-009 : clé déjà prise dans la bibliothèque — copie bloquée tant qu’une autre clé n’est pas choisie', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  await palette(page, 'Nouveau questionnaire');
  await page.getByTestId('diagram').click({ position: { x: 30, y: 30 } });
  await page.keyboard.press('n');
  await expect(page.getByLabel('intitulé')).toBeFocused();
  await page.keyboard.type('Date du sinistre');
  await page.keyboard.press('Enter');
  const node = page.locator('.react-flow__node').first();
  await expect(node).toContainText('date_sinistre');
  await node.click();
  await page.getByTestId('copy-to-library').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('La clé « date_sinistre » existe déjà dans la bibliothèque');
  const key = dialog.getByLabel('Nouvelle clé');
  const copy = dialog.getByRole('button', { name: 'Copier' });
  await key.fill('telephone');
  await expect(copy).toBeDisabled();
  await key.fill('date_sinistre');
  await expect(copy).toBeDisabled();
  await key.fill('date_evenement');
  await expect(copy).toBeEnabled();
  await copy.click();
  await expect(dialog).toHaveCount(0);
  await expect(node).toContainText('bib.');
  await expect(node).toContainText('date_evenement');
  expect(errors).toEqual([]);
});

test('EVO-009 : masquer des champs d’une instance « identite » — B réduite à nom, prénom, mail ; A garde ses 7 champs', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  await palette(page, 'Nouveau questionnaire');
  await dropLibraryQuestion(page, 'identite');
  await palette(page, 'Nouveau questionnaire');
  await dropLibraryQuestion(page, 'identite');
  const node = page.locator('.react-flow__node').filter({ hasText: 'identite' });
  await expect(node).toHaveCount(1);
  await node.click();
  const fields = page.getByTestId('hidden-fields');
  for (const k of ['civilite', 'date_naissance', 'adresse', 'telephone']) await fields.getByLabel(`${k} : affiché`, { exact: true }).uncheck();
  await expect(node).toContainText('3 / 7 champs');
  // Le dernier champ affiché ne peut pas être décoché.
  await fields.getByLabel('nom : affiché', { exact: true }).uncheck();
  await fields.getByLabel('prenom : affiché', { exact: true }).uncheck();
  await expect(fields.getByLabel('mail : affiché', { exact: true })).toBeDisabled();
  await expect(fields.getByLabel('mail : affiché', { exact: true })).toBeChecked();
  await fields.getByLabel('nom : affiché', { exact: true }).check();
  await fields.getByLabel('prenom : affiché', { exact: true }).check();

  await page.getByTestId('view-preview').click();
  const preview = page.getByTestId('preview');
  for (const label of ['Nom', 'Prénom', 'Adresse mail']) await expect(preview).toContainText(label);
  for (const label of ['Civilité', 'Date de naissance', 'Téléphone']) await expect(preview).not.toContainText(label);

  await page.getByRole('tab', { name: /Questionnaire sans titre/ }).first().click();
  await page.getByTestId('view-preview').click();
  for (const label of ['Civilité', 'Nom', 'Prénom', 'Date de naissance', 'Adresse', 'Adresse mail', 'Téléphone']) await expect(preview).toContainText(label);
  expect(errors).toEqual([]);
});

test('EVO-009 : masquer un champ référencé — avertissement listant les expressions, erreur de validation', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  await page.getByRole('tab', { name: /Demande de remboursement/ }).click();
  const node = page.getByTestId('rf__node-n_rappel');
  await expect(node).toContainText('3 / 7 champs');
  await node.click();
  await page.getByTestId('hidden-fields').getByLabel('mail : affiché', { exact: true }).uncheck();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Champ masqué encore référencé : identite.mail');
  await expect(dialog).toContainText('n_fin_remboursement');
  await dialog.getByRole('button', { name: 'Fermer' }).click();
  await expect(node).toContainText('2 / 7 champs');
  await expect(page.getByTestId('rf__node-n_fin_remboursement')).toContainText('⚠');
  expect(errors).toEqual([]);
});
