import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;
const EXAMPLE = '# Victime directe\n* Conjoint\n* Enfant\n\n# Ayant droit\n* Conjoint\n* Ascendant';

/** Ouvre l'outil, charge le projet d'exemple et sélectionne la question groupée ; renvoie les erreurs de la page. */
async function openQualite(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('exemple');
  await page.keyboard.press('Enter');
  const node = page.getByTestId('rf__node-n_qualite');
  await node.click();
  return { errors, node };
}

/** Du début jusqu'à la question groupée : accident sans sinistre antérieur, une victime. */
async function toQualite(page: Page) {
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
}

test('EVO-003 : saisie de l’exemple, code SC, sections, référence au groupe, synthèse', async ({ page }) => {
  const { errors, node } = await openQualite(page);
  // Aperçu du logigramme : intitulé de groupe, options dessous, troncature.
  await expect(node.locator('li')).toHaveText(['Victime directe', '○ Conjoint', '○ Enfant', 'Ayant droit', '…']);

  // Saisie de l'exemple dans une liste vide : deux groupes de deux options, lignes de groupe avant leurs options.
  const quick = page.getByTestId('options-quick');
  await quick.fill('');
  await quick.fill(EXAMPLE);
  const rows = page.getByTestId('option-entries').locator('[data-testid=option-group] > summary, [data-testid=option-entry] > summary');
  await expect(rows).toHaveText([/# Victime directe/, /Conjoint/, /Enfant/, /# Ayant droit/, /Conjoint/, /Ascendant/]);
  await expect(page.getByTestId('option-group-code')).toHaveCount(0);

  // Code SC sur la ligne du groupe « Victime directe ».
  const victime = page.getByTestId('option-group').first();
  await victime.locator('summary').click();
  await victime.getByLabel('Code du groupe').fill('SC');
  await expect(victime.getByTestId('option-group-code')).toHaveText('= SC');
  await page.getByTestId('diagram').focus();
  await page.keyboard.press('a'); // « Autre (préciser) »

  // Prévisualisation : deux sections titrées, « Autre » en dernier hors groupe.
  await toQualite(page);
  const preview = page.getByTestId('preview');
  const next = page.getByTestId('preview-next');
  await expect(preview.getByTestId('choice-group').locator('p')).toHaveText(['Victime directe', 'Ayant droit']);
  await expect(preview.locator('[role=radiogroup] label')).toHaveText(['Conjoint', 'Enfant', 'Conjoint', 'Ascendant', 'Autre (préciser)']);

  // « Conjoint » d'« Ayant droit » (sans code) : groupe = libellé ; même valeur, groupe distinct.
  await page.getByRole('button', { name: 'Débogage' }).click();
  const debug = page.getByTestId('debug-panel');
  await preview.getByRole('group', { name: 'Ayant droit' }).getByText('Conjoint').click();
  await expect(debug).toContainText('"qualite_declarant": "conjoint"');
  await expect(debug).toContainText('"qualite_declarant_group": "Ayant droit"');
  await expect(preview.getByRole('group', { name: 'Victime directe' }).getByRole('radio').first()).not.toBeChecked();
  await next.click();
  await expect(preview).toContainText('groupe « Ayant droit »');
  await page.getByRole('button', { name: /Précédent/ }).click();

  // « Autre (préciser) » : AUTRE.
  await preview.getByText('Autre (préciser)').click();
  await expect(debug).toContainText('"qualite_declarant_group": "AUTRE"');

  // « Conjoint » de « Victime directe » : SC, puis synthèse « Groupe — Option ».
  await preview.getByRole('group', { name: 'Victime directe' }).getByText('Conjoint').click();
  await expect(debug).toContainText('"qualite_declarant_group": "SC"');
  await next.click();
  await expect(preview).toContainText('€');
  await preview.getByRole('textbox').fill('100');
  await next.click();
  await preview.getByText('Non', { exact: true }).click();
  await next.click();
  await preview.getByRole('textbox').fill('Chute lors de la kermesse annuelle.');
  await next.click();
  await preview.getByText('Courriel').click();
  await next.click();
  await expect(page.getByTestId('summary')).toContainText('Victime directe — Conjoint');
  expect(errors).toEqual([]);
});

test('EVO-003 : un groupe dont toutes les options sont masquées n’est pas affiché', async ({ page }) => {
  const { errors } = await openQualite(page);
  const ayantDroit = page.getByTestId('option-group-block').nth(1);
  for (const i of [0, 1]) {
    const entry = ayantDroit.getByTestId('option-entry').nth(i);
    await entry.locator('summary').click();
    await entry.locator('.cm-content').last().click();
    await page.keyboard.type('sys.contrat_actif = false');
  }
  await page.getByTestId('diagram').focus();
  await toQualite(page);
  const preview = page.getByTestId('preview');
  await expect(preview.getByTestId('choice-group').locator('p')).toHaveText(['Victime directe']);
  await expect(preview).not.toContainText('Ayant droit');
  await expect(preview.locator('[role=radiogroup] label')).toHaveText(['Conjoint', 'Enfant']);
  expect(errors).toEqual([]);
});
