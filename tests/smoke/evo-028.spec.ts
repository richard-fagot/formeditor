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

async function palette(page: Page, text: string) {
  await page.keyboard.press('Control+k');
  const input = page.getByRole('combobox');
  await expect(input).toBeFocused();
  await input.fill(text);
  await expect(page.getByRole('option').first()).toContainText(text);
  await page.keyboard.press('Enter');
}

const total = (page: Page) => page.getByRole('tablist').getByTestId('unused-total');
const libraryLink = (page: Page) => page.getByRole('tablist').getByRole('button', { name: /^Bibliothèque/ });
const heading = (page: Page, name: string) => page.getByTestId('library-heading').filter({ hasText: name });
const entry = (page: Page, text: string) => page.getByTestId('library-entry').filter({ hasText: text });

/**
 * EVO-028-012 : ouvre l'onglet Bibliothèque, vérifie compteur de rubrique, indicateurs et total (la question
 * « souscripteur » inutilisée ou non ; EVO-028-011 : rien à zéro), puis revient au questionnaire.
 */
async function counters(page: Page, unused: boolean) {
  const tab = page.getByRole('tab', { name: /Bibliothèque/ });
  await ((await tab.count()) ? tab : libraryLink(page)).click();
  const marks = page.getByTestId('library').getByTestId('unused-mark');
  const count = heading(page, 'Questions').getByTestId('unused-count');
  if (unused) {
    await expect(count).toHaveText('(1 inutilisée)');
    await expect(marks).toHaveCount(1);
    await expect(entry(page, 'souscripteur').getByTestId('unused-mark')).toHaveCount(1);
    await expect(total(page)).toHaveText('1');
  } else {
    await expect(page.getByTestId('library').getByTestId('unused-count')).toHaveCount(0);
    await expect(marks).toHaveCount(0);
    await expect(total(page)).toHaveCount(0);
  }
  await page.getByRole('tab', { name: /Déclaration/ }).click();
  await expect(page.getByTestId('diagram')).toBeVisible();
}

// Exemple : seule la structure « souscripteur » n'est référencée par rien.
test('EVO-028-001, EVO-028-006, EVO-028-008, EVO-028-009, EVO-028-010, EVO-028-013 — question inutilisée : indicateur, message, compteurs ; « utilisée dans » inchangé', async ({ page }) => {
  const errors = await open(page);
  // Onglet fermé : nombre total sur le lien « Bibliothèque ».
  await expect(libraryLink(page).getByTestId('unused-total')).toHaveText('1');
  await expect(total(page)).toHaveAttribute('title', '1 élément de bibliothèque inutilisé');
  await libraryLink(page).click();
  // Onglet ouvert : nombre total sur l'onglet.
  await expect(page.getByRole('tab', { name: /Bibliothèque/ }).getByTestId('unused-total')).toHaveText('1');
  await expect(heading(page, 'Questions').getByTestId('unused-count')).toHaveText('(1 inutilisée)');
  await expect(heading(page, 'Fragments').getByTestId('unused-count')).toHaveCount(0);
  await expect(heading(page, 'Jeux de libellés').getByTestId('unused-count')).toHaveCount(0);
  const mark = entry(page, 'souscripteur').getByTestId('unused-mark');
  await expect(mark).toHaveClass(/text-amber-600/);
  await mark.hover();
  await expect(mark).toHaveAttribute('title', 'Inutilisée : aucun questionnaire ni fragment ne l’utilise.');
  await expect(page.getByTestId('library').getByTestId('unused-mark')).toHaveCount(1);
  await expect(entry(page, 'telephone').getByTestId('unused-mark')).toHaveCount(0);
  // Vue de la question : « utilisée dans » / « inutilisée » comme avant.
  await entry(page, 'souscripteur').click();
  await expect(page.getByTestId('library-question')).toContainText('Utilisé nulle part.');
  await entry(page, 'telephone').click();
  await expect(page.getByTestId('library-question')).toContainText('Utilisé dans : declaration_sinistre, identite_tiers');
  expect(errors).toEqual([]);
});

test('EVO-028-002, EVO-028-003, EVO-028-006, EVO-028-007, EVO-028-008, EVO-028-009, EVO-028-010, EVO-028-014 — fragment et jeu de libellés inutilisés', async ({ page }) => {
  const errors = await open(page);
  await palette(page, 'Nouveau fragment');
  // Existant inchangé : bandeau « aucun appelant », avertissement dans le panneau des problèmes du fragment.
  await expect(page.getByTestId('fragment-banner')).toContainText('aucun appelant');
  await expect(page.getByTestId('fragment-view').getByTestId('problems')).toContainText('Fragment inutilisé');
  await libraryLink(page).click();
  await expect(heading(page, 'Fragments').getByTestId('unused-count')).toHaveText('(1 inutilisé)');
  const mark = entry(page, 'Nouveau fragment').getByTestId('unused-mark');
  await mark.hover();
  await expect(mark).toHaveAttribute('title', 'Inutilisé : aucun questionnaire ni fragment ne l’appelle.');
  // Jeu de libellés ajouté : utilisé par aucune question booléenne.
  await entry(page, 'Jeux de libellés').click();
  await page.getByTestId('label-sets').getByRole('button', { name: 'Booléen' }).click();
  const sets = page.getByTestId('label-set');
  await expect(sets).toHaveCount(3);
  await expect(sets.getByTestId('unused-mark')).toHaveCount(1);
  const setMark = sets.last().getByTestId('unused-mark');
  await setMark.hover();
  await expect(setMark).toHaveAttribute('title', 'Inutilisé : aucune question booléenne ne l’utilise.');
  await expect(heading(page, 'Jeux de libellés').getByTestId('unused-count')).toHaveText('(1 inutilisé)');
  await expect(page.getByRole('tab', { name: /Bibliothèque/ }).getByTestId('unused-total')).toHaveText('3');
  await expect(total(page)).toHaveAttribute('title', '3 éléments de bibliothèque inutilisés');
  expect(errors).toEqual([]);
});

test('EVO-028-012, EVO-028-011 — insertion, annuler, rétablir, suppression, collage : compteurs à jour, absents à zéro', async ({ page }) => {
  const errors = await open(page);
  await counters(page, true);
  // Insertion de la question inutilisée : plus aucun élément inutilisé, ni compteur.
  const panel = page.getByTestId('library-panel');
  await panel.getByLabel('Filtrer la bibliothèque…').fill('souscripteur');
  await panel.getByTestId('library-item').first().dragTo(page.getByTestId('diagram'), { targetPosition: { x: 80, y: 80 } });
  const node = page.locator('.react-flow__node').filter({ hasText: 'souscripteur' });
  await expect(node).toHaveCount(1);
  await counters(page, false);
  await page.keyboard.press('Control+z');
  await expect(node).toHaveCount(0);
  await counters(page, true);
  await page.keyboard.press('Control+y');
  await expect(node).toHaveCount(1);
  await counters(page, false);
  // Suppression puis collage du nœud copié.
  await node.click();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Delete');
  await expect(node).toHaveCount(0);
  await counters(page, true);
  const box = (await page.getByTestId('diagram').boundingBox())!;
  await page.mouse.move(box.x + 60, box.y + 60);
  await page.keyboard.press('Control+v');
  await expect(node).toHaveCount(1);
  await counters(page, false);
  expect(errors).toEqual([]);
});
