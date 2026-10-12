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

test('EVO-007 : structure « souscripteur » — ordre des contrôles, normalisation, pays, messages des contrôles intégrés', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  await palette(page, 'Nouveau questionnaire');
  const panel = page.getByTestId('library-panel');
  await panel.getByLabel('Filtrer la bibliothèque…').fill('souscripteur');
  await panel.getByTestId('library-item').first().dragTo(page.getByTestId('diagram'), { targetPosition: { x: 80, y: 80 } });
  await expect(page.locator('.react-flow__node').filter({ hasText: 'souscripteur' })).toHaveCount(1);

  await page.getByTestId('view-preview').click();
  await page.getByRole('button', { name: 'Débogage' }).click();
  const debug = page.getByTestId('debug-panel');
  const preview = page.getByTestId('preview');
  // Ordre : Madame / Monsieur, nom, mail, indicatif puis numéro, pays puis ligne d'adresse.
  const kinds = await preview.locator('fieldset').locator('input, select')
    .evaluateAll((els) => els.map((e) => (e.tagName === 'SELECT' ? (e as HTMLElement).dataset.testid : (e as HTMLInputElement).type)));
  expect(kinds).toEqual(['radio', 'radio', 'text', 'email', 'phone-country', 'tel', 'address-country', 'text']);
  await expect(preview.getByTestId('civility').locator('label')).toHaveText(['Madame', 'Monsieur']);
  const indicatif = preview.getByTestId('phone-country');
  await expect(indicatif).toHaveValue('FR');
  await expect(indicatif.locator('option:checked')).toHaveText('🇫🇷 France +33');
  await expect(preview.getByTestId('address-country')).toHaveValue('FR');

  // Civilité : code enregistré.
  await preview.getByText('Madame').click();
  await expect(debug).toContainText('"civilite": "MME"');

  // Mail : normalisé ; saisie invalide → message à la sortie du champ.
  const mail = preview.getByLabel('Adresse mail');
  await mail.fill('Jean.Dupont@Exemple.FR');
  await mail.press('Tab');
  await expect(debug).toContainText('"mail": "Jean.Dupont@exemple.fr"');
  await mail.fill('jean@@exemple.fr');
  await mail.press('Tab');
  await expect(preview.getByRole('alert')).toHaveText('Adresse mail invalide.');
  await mail.fill('jean+test@exemple.fr');
  await mail.press('Tab');
  await expect(preview.getByRole('alert')).toHaveCount(0);

  // Téléphone : E.164 enregistré, format national affiché ; un numéro en + fixe le pays.
  const tel = preview.getByLabel('Téléphone');
  await tel.fill('0612345678');
  await tel.press('Tab');
  await expect(tel).toHaveValue('06 12 34 56 78');
  await expect(debug).toContainText('"telephone": "+33612345678"');
  await expect(debug).toContainText('"telephone_pays": "FR"');
  await tel.fill('+32 470 12 34 56');
  await tel.press('Tab');
  await expect(indicatif).toHaveValue('BE');
  await expect(debug).toContainText('"telephone_pays": "BE"');
  // Mobile exigé : un fixe français est refusé.
  await indicatif.selectOption('FR');
  await tel.fill('05 61 12 34 56');
  await tel.press('Tab');
  await expect(preview.getByRole('alert')).toHaveText('Numéro mobile attendu.');
  await tel.fill('06 12 34 56 78');
  await tel.press('Tab');

  // Adresse : code postal exigé en France, pas en Allemagne.
  const adresse = preview.getByLabel('Adresse', { exact: true });
  await adresse.fill('12 rue des Lilas Toulouse');
  await adresse.press('Tab');
  await expect(preview.getByRole('alert')).toHaveText('Code postal manquant.');
  await preview.getByTestId('address-country').selectOption('DE');
  await adresse.press('Tab');
  await expect(preview.getByRole('alert')).toHaveCount(0);
  await expect(debug).toContainText('"adresse_pays": "DE"');

  // Validation de la page : le nom obligatoire manque ; les contrôles de format passent.
  await page.getByTestId('preview-next').click();
  await expect(preview.getByRole('alert')).toHaveText('Réponse obligatoire.');
  expect(errors).toEqual([]);
});
