import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;

/** Ouvre l'outil et charge le projet d'exemple ; renvoie les erreurs de la page. */
async function openExample(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('exemple');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  return errors;
}

/** Du début jusqu'à la question « sinistre lié » (scénario UD avec 2 sinistres). */
async function toLien(page: Page) {
  const preview = page.getByTestId('preview');
  const next = page.getByTestId('preview-next');
  await next.click();
  await preview.getByText('Vol', { exact: true }).click();
  await next.click();
  await preview.locator('input[type=date]').fill('2026-09-01');
  await next.click();
  await expect(preview).toContainText('Ce sinistre est-il lié');
}

test('EVO-001 : entrée dynamique saisie avec $, positionnée, déplacée ; ordre dans le logigramme et le wizard', async ({ page }) => {
  const errors = await openExample(page);
  const lien = page.locator('.react-flow__node').filter({ hasText: 'sinistre_lie' });
  const items = lien.locator('li');
  await lien.click();
  const quick = page.getByTestId('options-quick');
  // L'exemple place l'entrée dynamique en tête.
  await expect(quick).toHaveValue('$sys.sinistres\nNon, aucun');
  // Saisie rapide : `$` crée une entrée dynamique ; une ligne qui commence par `<` reste statique.
  await quick.fill('$sys.sinistres\nUne de ses amicales\n<Un tiers>');
  await expect(page.getByTestId('option-entry')).toHaveCount(3);
  await page.getByTestId('diagram').focus();
  await page.keyboard.press('a'); // « Autre (préciser) »
  const dyn = "○ <sys.sinistres : date & ' — ' & nature>";
  await expect(items).toHaveText([dyn, '○ Une de ses amicales', '○ <Un tiers>', '○ Autre (préciser)']);

  // Wizard : valeurs de la liste à la position de l'entrée, « Autre » en dernier.
  await page.keyboard.press('p');
  await toLien(page);
  const choices = page.getByTestId('preview').locator('[role=radiogroup] label');
  await expect(choices).toHaveText(['2025-02-03 — Vol', '2026-05-20 — Dégât des eaux', 'Une de ses amicales', '<Un tiers>', 'Autre (préciser)']);

  // Déplacement de l'entrée dynamique en dernière position (toujours avant « Autre »).
  await page.getByTestId('view-diagram').click();
  await lien.click();
  const first = page.getByTestId('option-entry').first();
  await first.getByRole('button', { name: 'Descendre' }).click();
  await page.getByTestId('option-entry').nth(1).getByRole('button', { name: 'Descendre' }).click();
  await expect(quick).toHaveValue('Une de ses amicales\n<Un tiers>\n$sys.sinistres');
  await expect(items).toHaveText(['○ Une de ses amicales', '○ <Un tiers>', dyn, '○ Autre (préciser)']);
  await page.getByTestId('view-preview').click();
  await expect(choices).toHaveText(['Une de ses amicales', '<Un tiers>', '2025-02-03 — Vol', '2026-05-20 — Dégât des eaux', 'Autre (préciser)']);

  // Dupliquer puis supprimer une entrée (détail).
  await page.getByTestId('view-diagram').click();
  await lien.click();
  await page.getByTestId('option-entry').nth(2).getByRole('button', { name: "Dupliquer l'entrée" }).click();
  await expect(page.getByTestId('option-entry')).toHaveCount(4);
  await page.getByTestId('option-entry').nth(3).getByRole('button', { name: "Supprimer l'entrée" }).click();
  await expect(page.getByTestId('option-entry')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('EVO-001 : une réponse dont la valeur dynamique a disparu empêche de terminer le parcours', async ({ page }) => {
  const errors = await openExample(page);
  await page.getByTestId('diagram').focus();
  await page.keyboard.press('p');
  const preview = page.getByTestId('preview');
  const next = page.getByTestId('preview-next');
  await toLien(page);
  await preview.getByText('2025-02-03 — Vol').click();
  await next.click();
  await preview.getByRole('textbox').fill('100');
  await next.click();
  await preview.getByText('Non', { exact: true }).click();
  await next.click();
  await preview.getByRole('textbox').fill('Vol constaté au local.');
  await next.click();
  await preview.getByText('Courriel').click();
  await next.click();
  await expect(page.getByTestId('summary')).toContainText('2025-02-03 — Vol');

  // L'état du système change : le sinistre choisi n'existe plus.
  await page.getByTestId('system-panel').getByLabel('sys.sinistres').fill('[{ "id": "S-102", "date": "2026-05-20", "nature": "Dégât des eaux" }]');
  await next.click();
  await preview.getByText('Oui, je confirme').click();
  await next.click();

  // Pas de fin : retour à la question concernée, avec son message ; la réponse n'est pas effacée.
  await expect(preview).toContainText('Ce sinistre est-il lié');
  await expect(preview.getByRole('alert')).toHaveText("Cette réponse n'est plus proposée.");
  await expect(preview).not.toContainText('Déclaration enregistrée');
  await next.click();
  await expect(preview).toContainText('Ce sinistre est-il lié');

  // Corrigée : le parcours reprend (réponses suivantes conservées) jusqu'à la fin.
  await preview.getByText('2026-05-20 — Dégât des eaux').click();
  for (let i = 0; i < 7; i++) await next.click();
  await expect(preview).toContainText('Déclaration enregistrée');
  expect(errors).toEqual([]);
});
