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

test('EVO-008 : créer un fragment — onglet, édition comme un questionnaire, ni départ ni fin, entrée signalée puis réglée', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'Nouveau fragment');
  const view = page.getByTestId('fragment-view');
  await expect(view).toBeVisible();
  await expect(page.getByTestId('fragment-banner')).toContainText('Fragment de la bibliothèque');
  await expect(page.getByTestId('fragment-banner')).toContainText('aucun appelant');
  await expect(page.getByRole('tab', { name: /Nouveau fragment/ })).toHaveAttribute('aria-selected', 'true');

  // Mêmes raccourcis qu'un questionnaire : N crée une question reliée à la suite.
  const nodes = view.locator('.react-flow__node');
  await view.getByTestId('diagram').click({ position: { x: 30, y: 30 } });
  for (const label of ['Nom', 'Prénom']) {
    await page.keyboard.press('n');
    await expect(page.getByLabel('intitulé')).toBeFocused();
    await page.keyboard.type(label);
    await page.keyboard.press('Enter');
  }
  await expect(nodes).toHaveCount(2);
  await expect(view.locator('.react-flow__edge')).toHaveCount(1);
  await expect(nodes.first()).toContainText('Entrée');

  // Pas de fin ni de départ dans un fragment.
  await page.keyboard.press('Alt+f');
  await expect(nodes).toHaveCount(2);
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('Définir comme départ');
  await expect(page.getByRole('option', { name: /Définir comme départ/ })).toHaveCount(0);
  await page.getByRole('combobox').fill('Nouvelle fin');
  await expect(page.getByRole('option', { name: /Nouvelle fin/ })).toHaveCount(0);
  await page.keyboard.press('Escape');

  // Une question isolée : deux nœuds sans arête entrante → signalé, l'édition continue.
  await page.getByTestId('rf__node-' + (await nodes.first().getAttribute('data-id'))).click();
  await palette(page, 'Supprimer la sélection');
  await expect(nodes).toHaveCount(1);
  await view.getByTestId('diagram').focus();
  await page.keyboard.press('n');
  await expect(page.getByLabel('intitulé')).toBeFocused();
  await page.keyboard.type('Isolée');
  await page.keyboard.press('Enter');
  await expect(nodes).toHaveCount(2);
  await expect(view.locator('.react-flow__edge')).toHaveCount(0);
  await expect(page.getByTestId('problems')).toContainText('Fragment sans entrée unique');
  await nodes.filter({ hasText: 'Isolée' }).click();
  await page.getByTestId('set-entry').click();
  await expect(page.getByTestId('problems')).not.toContainText('Fragment sans entrée unique');
  await expect(nodes.filter({ hasText: 'Isolée' })).toContainText('Entrée');
  expect(errors).toEqual([]);
});

test('EVO-008 : insérer un fragment au milieu (I), alias en double refusé, prévisualisation enchaînée, débogage, retour arrière', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  await page.getByRole('button', { name: 'Nouveau questionnaire', exact: true }).click();
  await page.keyboard.press('n');
  await expect(page.getByLabel('intitulé')).toBeFocused();
  await page.keyboard.type('Motif');
  await page.keyboard.press('Enter');

  // Insertion depuis la bibliothèque (I) à la suite de « Motif ».
  await page.keyboard.press('i');
  await expect(page.getByPlaceholder('Insérer une question ou un fragment…')).toBeFocused();
  await page.keyboard.type('identification_assure');
  await page.keyboard.press('Enter');
  const nodes = page.locator('.react-flow__node');
  const fragment = nodes.filter({ hasText: 'Identification de l\'assuré' });
  await expect(fragment).toHaveCount(1);
  await expect(fragment).toContainText('6 question(s)');
  await expect(fragment).toContainText('bib.');

  // Alias : une clé déjà utilisée est refusée.
  const alias = page.getByLabel('Alias');
  await expect(alias).toHaveValue('identification_assure');
  await alias.fill('motif');
  await expect(page.getByTestId('properties')).toContainText('Clé invalide');
  await alias.press('Enter');
  await expect(alias).toHaveValue('identification_assure');
  await alias.fill('ident');
  await alias.press('Enter');
  await expect(fragment.getByTestId('fragment-alias')).toHaveText('ident');
  await expect(page.getByTestId('fragment-exits')).toContainText('num_secu');
  await expect(page.getByTestId('fragment-exits')).toContainText('representant_legal');

  // Suite : « Montant » après le nœud fragment, puis une fin.
  await page.getByTestId('diagram').focus();
  await page.keyboard.press('n');
  await expect(page.getByLabel('intitulé')).toBeFocused();
  await page.keyboard.type('Montant');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Alt+f');
  await expect(nodes).toHaveCount(4);

  // Prévisualisation : motif, les questions du fragment, puis montant.
  await page.keyboard.press('p');
  const preview = page.getByTestId('preview');
  const next = page.getByTestId('preview-next');
  await expect(preview).toContainText('Motif');
  await preview.getByRole('textbox').fill('Perte');
  await next.click();
  await expect(preview).toContainText("Nom de l'assuré");
  await preview.getByRole('textbox').fill('Durand');
  await next.click();
  await preview.getByRole('textbox').fill('Claire');
  await next.click();
  await expect(preview).toContainText('Date de naissance de Claire');
  await preview.locator('input[type=date]').fill('1980-05-12');
  await next.click();
  await preview.getByText('Oui').click();
  await next.click();
  await expect(preview).toContainText('Numéro de sécurité sociale');
  await palette(page, 'Afficher / masquer le panneau de débogage');
  await expect(page.getByTestId('debug-fragment')).toContainText('ident');
  // Dernière page du fragment : les arêtes de l'appelant qui seront suivies (écart EVO-008).
  await expect(page.getByTestId('debug-caller-edges')).toHaveText('Puis, à la sortie du fragment :');
  await expect(page.getByTestId('debug-edge').last()).toContainText('→ montant');
  await preview.getByRole('textbox').fill('2800575123456');
  await next.click();
  await expect(preview).toContainText('Montant');
  await expect(page.getByTestId('debug-fragment')).toHaveCount(0);
  await expect(page.getByTestId('debug-panel')).toContainText('ident.num_secu');

  // Le retour arrière traverse le fragment.
  await page.getByRole('button', { name: 'Précédent' }).click();
  await expect(preview).toContainText('Numéro de sécurité sociale');
  expect(errors).toEqual([]);
});

test('EVO-008 : départ sur un nœud fragment (exemple « Demande de remboursement »), propriétés, ouverture du fragment', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'exemple');
  await page.getByRole('tab', { name: /Demande de remboursement/ }).click();
  const node = page.getByTestId('rf__node-n_ident');
  await expect(node).toContainText('Départ');
  await expect(node).toContainText('Identification de l\'assuré');
  await node.click();
  await expect(page.getByTestId('fragment-expected')).toContainText('Aucune.');

  await page.getByTestId('diagram').focus();
  await page.keyboard.press('p');
  await expect(page.getByTestId('preview')).toContainText("Nom de l'assuré");

  await page.getByTestId('view-diagram').click();
  await node.getByTestId('fragment-open').click();
  await expect(page.getByTestId('fragment-banner')).toContainText('1 appelant(s) : demande_remboursement');
  await expect(page.getByTestId('fragment-view').locator('.react-flow__node')).toHaveCount(6);
  expect(errors).toEqual([]);
});
