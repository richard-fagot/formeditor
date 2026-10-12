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

test('EVO-006 : « Ne sais pas » sur l’exemple (choix, groupes, nombre obligatoire, choix multiple, synthèse)', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  // Choix unique avec « Autre » : activation par la palette.
  await page.getByTestId('rf__node-n_type').click();
  await palette(page, 'Activer « Ne sais pas »');
  // Question à groupes : activation par le panneau, libellé modifié.
  await page.getByTestId('rf__node-n_qualite').click();
  const editor = page.getByTestId('dont-know-editor');
  await editor.getByLabel('Option « Ne sais pas »').check();
  await editor.getByRole('textbox').first().fill('Je ne sais pas');

  const preview = page.getByTestId('preview');
  const next = page.getByTestId('preview-next');
  const labels = preview.locator('[role=radiogroup] > label, [role=group] > label');
  await page.getByTestId('view-preview').click();
  await page.getByRole('button', { name: 'Débogage' }).click();
  const debug = page.getByTestId('debug-panel');
  await next.click();
  // « Ne sais pas » en dernier, après « Autre (préciser) ».
  await expect(labels.last()).toHaveText('Ne sais pas');
  await expect(labels.nth(-2)).toHaveText(/Autre/);
  await preview.getByText('Accident corporel').click();
  await next.click();
  await preview.locator('input[type=date]').fill('2025-01-01');
  await next.click();
  await preview.getByLabel('Prénom').fill('Léa');
  await preview.getByLabel(/^Nom/).fill('Martin');
  await preview.getByText('Non', { exact: true }).click();
  await next.click();

  // Groupes : « Ne sais pas » après tous les groupes, hors groupe ; `.groupe` = NSP, marqueur `_nsp`.
  await expect(preview.locator('[role=radiogroup] label').last()).toHaveText('Je ne sais pas');
  await expect(preview.getByTestId('choice-group').getByText('Je ne sais pas')).toHaveCount(0);
  await preview.getByText('Je ne sais pas').click();
  await expect(debug).toContainText('"qualite_declarant": null');
  await expect(debug).toContainText('"qualite_declarant_group": "NSP"');
  await expect(debug).toContainText('"qualite_declarant_nsp": true');
  await next.click();

  // Nombre obligatoire avec minimum : case sous le champ ; cochée, champ vidé et désactivé, aucune erreur, on avance.
  const amount = preview.getByRole('textbox');
  await amount.fill('-5');
  await preview.getByLabel('Je ne sais pas encore').check();
  await expect(amount).toBeDisabled();
  await expect(amount).toHaveValue('');
  await next.click();
  await expect(preview.getByRole('alert')).toHaveCount(0);
  // `montant_estime.nsp` vrai : arête vers l'expertise.
  await expect(preview).toContainText('Expertise');
  await next.click();
  await preview.getByText('Non', { exact: true }).click();
  await next.click();
  await preview.getByRole('textbox').fill('Chute lors de la kermesse annuelle.');
  await next.click();

  // Choix multiple : exclusive dans les deux sens.
  const email = preview.getByRole('checkbox', { name: 'Courriel' });
  const nsp = preview.getByRole('checkbox', { name: 'Ne sais pas' });
  await email.check();
  await nsp.check();
  await expect(email).not.toBeChecked();
  await expect(debug).toContainText('"canaux_contact": []');
  await email.check();
  await expect(nsp).not.toBeChecked();
  await expect(debug).not.toContainText('canaux_contact_nsp');
  await nsp.check();
  await next.click();
  const summary = page.getByTestId('summary');
  await expect(summary).toContainText('Je ne sais pas encore');
  await expect(summary).toContainText('Je ne sais pas');
  expect(errors).toEqual([]);
});

test('EVO-006 : date avec « Ne sais pas » (aperçu, case sous le champ, champ vidé et désactivé)', async ({ page }) => {
  const errors = await open(page);
  const diagram = page.getByTestId('diagram');
  await diagram.click({ position: { x: 30, y: 30 } });
  await page.keyboard.press('n');
  await expect(page.getByLabel('intitulé')).toBeFocused();
  await page.keyboard.type('Date du sinistre');
  await page.keyboard.press('Enter');
  await page.keyboard.press('d');
  const node = page.locator('.react-flow__node').first();
  await expect(node).toContainText('<date>');
  await page.getByTestId('dont-know-editor').getByLabel('Option « Ne sais pas »').check();
  await expect(node).toContainText('<date> + Ne sais pas');

  await diagram.focus();
  await page.keyboard.press('p');
  const preview = page.getByTestId('preview');
  const date = preview.locator('input[type=date]');
  const nsp = preview.getByLabel('Ne sais pas');
  await date.fill('2026-01-31');
  await nsp.check();
  await expect(date).toBeDisabled();
  await expect(date).toHaveValue('');
  await nsp.uncheck();
  await expect(date).toBeEnabled();
  await expect(date).toHaveValue('');

  // Changement de type vers un choix : « Ne sais pas » conservée, en dernier et en italique dans l'aperçu.
  await page.getByTestId('view-diagram').click();
  await node.click();
  await page.keyboard.press('u');
  await expect(node.locator('li').last()).toHaveText('○ Ne sais pas');
  await expect(node.locator('li').last()).toHaveClass(/italic/);
  expect(errors).toEqual([]);
});
