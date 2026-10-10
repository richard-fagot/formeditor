import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  return errors;
}

test('dist/index.html s’ouvre en file://', async ({ page }) => {
  const errors = await open(page);
  await expect(page.getByTestId('diagram')).toBeVisible();
  expect(errors).toEqual([]);
});

test('créer deux questions au clavier, relier, prévisualiser, exporter', async ({ page }) => {
  const errors = await open(page);
  const diagram = page.getByTestId('diagram');
  await diagram.click({ position: { x: 30, y: 30 } });

  // Deux questions chaînées (N), la seconde passée en booléen (B), puis une fin (Alt+F).
  for (const label of ['Nom du déclarant', 'Êtes-vous assuré ?']) {
    await page.keyboard.press('n');
    await expect(page.getByLabel('intitulé')).toBeFocused();
    await page.keyboard.type(label);
    await page.keyboard.press('Enter');
  }
  await page.keyboard.press('b');
  await page.keyboard.press('Alt+f');
  await expect(page.locator('.react-flow__node')).toHaveCount(3);
  await expect(page.locator('.react-flow__node').first()).toContainText('nom_declarant');

  // Relier la première question à la fin (E, palette).
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('e');
  await page.getByPlaceholder(/Relier au nœud/).fill('Merci');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);

  // Annuler / rétablir (Ctrl+Z / Ctrl+Shift+Z).
  await diagram.focus();
  await page.keyboard.press('Control+z');
  await expect(page.locator('.react-flow__edge')).toHaveCount(2);
  await page.keyboard.press('Control+Shift+z');
  await expect(page.locator('.react-flow__edge')).toHaveCount(3);

  // Prévisualiser (P).
  await diagram.focus();
  await page.keyboard.press('p');
  const preview = page.getByTestId('preview');
  await expect(preview).toContainText('Nom du déclarant');
  await preview.getByRole('textbox').fill('Durand');
  await page.getByTestId('preview-next').click();
  await expect(preview).toContainText('Êtes-vous assuré ?');
  await preview.getByText('Oui').click();
  await page.getByTestId('preview-next').click();
  await expect(preview).toContainText('Merci');

  // Exporter (bundle).
  const download = page.waitForEvent('download');
  await page.getByTestId('export').click();
  const file = await (await download).path();
  const bundle = JSON.parse(readFileSync(file, 'utf8'));
  expect(bundle.kind).toBe('bundle');
  expect(bundle.questionnaires[0].nodes.map((n: { kind: string; type?: string }) => n.type ?? n.kind)).toEqual(['text', 'boolean', 'end']);
  expect(bundle.questionnaires[0].edges).toHaveLength(3);
  await expect(page.getByTestId('dirty')).toContainText('exporté');
  expect(errors).toEqual([]);
});

test('propriétés du questionnaire sans sélection : clé modifiable', async ({ page }) => {
  const errors = await open(page);
  const key = page.getByLabel('Clé du questionnaire');
  await expect(key).toBeVisible();
  await key.fill('sinistre');
  await key.press('Enter');
  const download = page.waitForEvent('download');
  await page.getByTestId('export').click();
  const bundle = JSON.parse(readFileSync(await (await download).path(), 'utf8'));
  expect(bundle.questionnaires[0].key).toBe('sinistre');
  expect(errors).toEqual([]);
});

test('nouveau questionnaire : première question au clavier puis à la souris, sans « départ introuvable »', async ({ page }) => {
  const errors = await open(page);
  // Le focus reste sur le bouton « + » après le clic : N doit malgré tout créer la question.
  await page.getByRole('button', { name: 'Nouveau questionnaire' }).click();
  await expect(page.getByTestId('diagram-empty')).toBeVisible();
  await expect(page.getByText('Nœud de départ introuvable')).toHaveCount(0);
  await page.keyboard.press('n');
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expect(page.getByLabel('intitulé')).toBeFocused();
  await page.keyboard.type('Première question');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Nœud de départ introuvable')).toHaveCount(0);
  await expect(page.getByTestId('diagram-empty')).toHaveCount(0);

  // Second questionnaire neuf : bouton de l'état vide.
  await page.getByRole('button', { name: 'Nouveau questionnaire' }).click();
  await page.getByTestId('diagram-empty').getByRole('button').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('clic sur un problème : les raccourcis du logigramme agissent, Entrée active toujours le bouton', async ({ page }) => {
  const errors = await open(page);
  await page.getByTestId('diagram').click({ position: { x: 30, y: 30 } });
  for (const label of ['Première', 'Seconde']) {
    await page.keyboard.press('n');
    await expect(page.getByLabel('intitulé')).toBeFocused();
    await page.keyboard.type(label);
    await page.keyboard.press('Enter');
  }
  const nodes = page.locator('.react-flow__node');
  await expect(nodes).toHaveCount(2);
  const rows = page.getByTestId('problems').locator('li button');

  // Clic sur un problème (le focus reste sur la ligne) puis Suppr : le nœud concerné disparaît.
  await rows.first().click();
  await expect(rows.first()).toBeFocused();
  await page.keyboard.press('Delete');
  await expect(nodes).toHaveCount(1);

  // Clic sur un problème puis N : une question est créée.
  await rows.first().click();
  await page.keyboard.press('n');
  await expect(nodes).toHaveCount(2);
  await expect(page.getByLabel('intitulé')).toBeFocused();
  await page.keyboard.press('Escape');

  // Entrée sur le bouton qui replie le panneau : le panneau se replie, aucune édition d'intitulé.
  const toggle = page.getByTestId('problems').locator('> button');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(rows).toHaveCount(0);
  await expect(page.getByLabel('intitulé')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('exemple : choix avec option conditionnée et source dynamique, date, structure répétable', async ({ page }) => {
  const errors = await open(page);
  await page.keyboard.press('Control+k');
  await page.keyboard.type('exemple');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node').first()).toBeVisible();
  // Aperçus des nouveaux types dans le logigramme.
  await expect(page.locator('.react-flow__node').filter({ hasText: 'victimes' })).toContainText('× n');
  await expect(page.locator('.react-flow__node').filter({ hasText: 'sinistre_lie' })).toContainText('<sys.sinistres : date');

  await page.getByTestId('diagram').focus();
  await page.keyboard.press('p');
  const preview = page.getByTestId('preview');
  const next = page.getByTestId('preview-next');
  await next.click();

  // Choix unique : option conditionnée visible (adhérent UD), « Autre » avec précision.
  await expect(preview).toContainText('Bris de matériel associatif');
  await preview.getByText('Autre (préciser)').click();
  await expect(preview.getByRole('textbox')).toBeVisible();
  await preview.getByText('Accident corporel').click();
  await next.click();

  // Date.
  await preview.locator('input[type=date]').fill('2026-09-01');
  await next.click();

  // Source dynamique : sinistres de l'état du système.
  await expect(preview).toContainText('2025-02-03 — Vol');
  await preview.getByText('2026-05-20 — Dégât des eaux').click();
  await next.click();

  // Structure répétable : une occurrence minimale, champs obligatoires, champ conditionné, Ajouter / Supprimer.
  await expect(page.getByTestId('occurrence')).toHaveCount(1);
  await next.click();
  await expect(preview.getByRole('alert').first()).toBeVisible();
  await preview.getByLabel('Prénom').fill('Léa');
  await preview.getByLabel(/^Nom/).fill('Martin');
  await expect(preview).toContainText('Date de naissance de Léa');
  await expect(preview).not.toContainText("Durée d'hospitalisation");
  await preview.getByText('Oui').click();
  await expect(preview).toContainText("Durée d'hospitalisation");
  await preview.getByTestId('structure-add').click();
  await expect(page.getByTestId('occurrence')).toHaveCount(2);
  await page.getByTestId('occurrence').nth(1).getByRole('button', { name: 'Supprimer' }).click();
  await expect(page.getByTestId('occurrence')).toHaveCount(1);
  await next.click();

  // Nombre avec unité.
  await expect(preview).toContainText('€');
  expect(errors).toEqual([]);
});

test('types au clavier, saisie rapide des options, champs de structure, jeu de libellés', async ({ page }) => {
  const errors = await open(page);
  await page.getByTestId('diagram').click({ position: { x: 30, y: 30 } });
  await page.keyboard.press('n');
  await expect(page.getByLabel('intitulé')).toBeFocused();
  await page.keyboard.type('Couleur préférée');
  await page.keyboard.press('Enter');
  const node = page.locator('.react-flow__node').first();
  for (const [key, text] of [['d', '<date>'], ['r', '<réel>'], ['3', 'Ne sait pas'], ['u', '']] as const) {
    await page.keyboard.press(key);
    if (text) await expect(node).toContainText(text);
  }
  await page.getByTestId('options-quick').fill('Bleu\nVert\nRouge');
  await expect(node).toContainText('○ Bleu');
  await expect(node).toContainText('○ Rouge');

  await page.getByTestId('diagram').focus();
  await page.keyboard.press('m');
  await expect(node).toContainText('☐ Vert');
  await page.keyboard.press('s');
  await page.getByTestId('structure-add-field').click();
  await expect(node).toContainText('Champ 1');

  // Bibliothèque : jeu de libellés tri-state, puis choisi dans les propriétés d'un tri-state.
  await page.keyboard.press('Control+k');
  await page.keyboard.type('jeu de libellés tri-state');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('label-sets').locator('input').first()).toHaveValue('oui_non_ne_sait_pas');
  await expect(page.getByTestId('label-sets').locator('input[value="Ne sait pas"]')).toBeVisible();
  expect(errors).toEqual([]);
});
