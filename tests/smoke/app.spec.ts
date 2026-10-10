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
  await page.getByRole('button', { name: 'Nouveau questionnaire', exact: true }).click();
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
  await page.getByRole('button', { name: 'Nouveau questionnaire', exact: true }).click();
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

  // Champ de structure : aide, contrainte libre et son message.
  const fieldBox = page.locator('details').filter({ hasText: 'champ_1' });
  await fieldBox.getByRole('button', { name: 'Ajouter une règle' }).click();
  await fieldBox.getByTestId('constraints').locator('.cm-content').click();
  await page.keyboard.type("champ_1 != 'x'");
  await fieldBox.getByTestId('constraints').getByPlaceholder('Message d’erreur').fill('Pas x');
  await page.getByTestId('diagram').focus();
  const download = page.waitForEvent('download');
  await page.getByTestId('export').click();
  const bundle = JSON.parse(readFileSync(await (await download).path(), 'utf8'));
  expect(bundle.questionnaires[0].nodes[0].fields[0].constraints).toEqual([{ rule: "champ_1 != 'x'", message: { fr: 'Pas x' } }]);

  // Bibliothèque : jeu de libellés tri-state, puis choisi dans les propriétés d'un tri-state.
  await page.keyboard.press('Control+k');
  await page.keyboard.type('jeu de libellés tri-state');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('label-sets').locator('input').first()).toHaveValue('oui_non_ne_sait_pas');
  await expect(page.getByTestId('label-sets').locator('input[value="Ne sait pas"]')).toBeVisible();
  // Annuler au clavier hors du logigramme (focus sur un bouton de la bibliothèque).
  await page.getByTestId('label-sets').getByRole('button', { name: 'Supprimer' }).focus();
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('label-sets').locator('input')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('bibliothèque : glisser une question, insérer un bloc (I), déplier, grouper (Ctrl+G), éditer le bloc', async ({ page }) => {
  const errors = await open(page);
  await page.keyboard.press('Control+k');
  await page.keyboard.type('exemple');
  await page.keyboard.press('Enter');
  const nodes = page.locator('.react-flow__node');
  await expect(nodes.first()).toBeVisible();
  const count = await nodes.count();

  // Glisser une question de la bibliothèque sur le logigramme.
  const panel = page.getByTestId('library-panel');
  await panel.getByLabel('Filtrer la bibliothèque…').fill('telephone');
  await panel.getByTestId('library-item').first().dragTo(page.getByTestId('diagram'), { targetPosition: { x: 80, y: 80 } });
  await expect(nodes).toHaveCount(count + 1);
  await expect(nodes.filter({ hasText: 'telephone' })).toHaveCount(2);

  // Surcharge locale de l'intitulé, puis retour à celui de la bibliothèque.
  const props = page.getByTestId('properties');
  const label = props.locator('input, textarea').first();
  const original = await label.inputValue();
  await label.fill('Téléphone portable');
  await expect(nodes.filter({ hasText: 'Téléphone portable' })).toHaveCount(1);
  await expect(props).toContainText('Intitulé surchargé localement.');
  await props.getByRole('button', { name: 'Reprendre l’intitulé de la bibliothèque' }).click();
  await expect(nodes.filter({ hasText: 'Téléphone portable' })).toHaveCount(0);
  await expect(label).toHaveValue(original);

  // Insérer un bloc par la palette (I) : nouvelle instance avec un alias libre.
  await page.getByTestId('diagram').focus();
  await page.keyboard.press('i');
  await expect(page.getByPlaceholder('Insérer une question ou un bloc…')).toBeFocused();
  await page.keyboard.type('identite_tiers');
  await page.keyboard.press('Enter');
  await expect(nodes).toHaveCount(count + 2);
  const instance = nodes.filter({ hasText: 'identite_tiers' });
  await expect(instance).toHaveCount(1);
  await expect(page.getByLabel('Alias')).toHaveValue('identite_tiers');

  // Déplier l'instance en lecture seule.
  await instance.getByTestId('block-expand').click();
  await expect(instance.getByTestId('block-content')).toContainText('identite_tiers.nom');

  // Grouper la question déposée (reliée à l'instance insérée à sa suite) : bloc avec une sortie.
  await nodes.filter({ hasText: 'telephone' }).last().click();
  await page.keyboard.press('Control+g');
  await expect(nodes.filter({ hasText: 'Nouveau bloc' })).toHaveCount(1);

  // Le bloc créé s'édite dans l'onglet Bibliothèque : ajouter une sortie au clavier (palette).
  await page.getByLabel('Alias').focus();
  await page.getByRole('button', { name: 'Ouvrir dans la bibliothèque' }).click();
  await expect(page.getByTestId('block-view')).toBeVisible();
  await expect(page.getByTestId('block-view').locator('.react-flow__node')).toHaveCount(2);
  await expect(page.getByTestId('block-view').locator('.react-flow__node').filter({ hasText: 'Sortie' })).toContainText('identite_tiers');
  await page.getByTestId('block-view').getByTestId('diagram').click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('Control+k');
  await page.keyboard.type('Nouvelle sortie de bloc');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('block-view').locator('.react-flow__node')).toHaveCount(3);

  // Question de bibliothèque : propriétés complètes dans l'onglet Bibliothèque, usages listés.
  await page.getByTestId('library-entry').filter({ hasText: 'telephone' }).click();
  await expect(page.getByTestId('library-question')).toContainText('Utilisé dans');
  await expect(page.getByTestId('library-question').getByLabel('Clé', { exact: true })).toHaveValue('telephone');
  expect(errors).toEqual([]);
});

test('dictionnaire de l’état du système, panneaux de la prévisualisation, retour depuis la synthèse', async ({ page }) => {
  const errors = await open(page);
  await page.keyboard.press('Control+k');
  await page.keyboard.type('exemple');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node').first()).toBeVisible();

  // Dictionnaire : variables de l'exemple, nouvelle variable avec focus sur son nom.
  await page.getByRole('button', { name: 'État du système' }).click();
  await expect(page.getByTestId('variable-sinistres')).toContainText('Schéma des objets de la liste');
  await page.getByTestId('add-variable').click();
  await expect(page.getByTestId('variable-variable').getByRole('textbox').first()).toBeFocused();
  await page.keyboard.type('canal_entree');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('variable-canal_entree')).toBeVisible();

  // Prévisualisation : édition libre de l'état du système, réévaluation immédiate.
  await page.getByRole('tab', { name: /Déclaration/ }).click();
  await page.getByTestId('view-preview').click();
  const preview = page.getByTestId('preview');
  const next = page.getByTestId('preview-next');
  await expect(preview).toContainText('Bonjour UD du Rhône');
  await page.getByTestId('system-panel').getByLabel('sys.nom_assure').fill('Mme Test');
  await expect(preview).toContainText('Bonjour Mme Test');
  await page.getByTestId('save-scenario').click();
  await expect(page.getByTestId('scenario-select')).toContainText('UD avec 2 sinistres *');

  // Débogage : conditions des arêtes sortantes de la page courante.
  await page.getByRole('button', { name: 'Débogage' }).click();
  await expect(page.getByTestId('debug-edge')).toHaveCount(2);
  await expect(page.getByTestId('debug-panel')).toContainText('sys.contrat_actif = false');

  // Parcours jusqu'à la synthèse, retour pour modifier, puis retour à la synthèse.
  await page.getByTestId('scenario-select').selectOption({ label: 'Amicale sans sinistre' });
  await next.click();
  await preview.getByText('Vol', { exact: true }).click();
  await next.click();
  await preview.locator('input[type=date]').fill('2026-09-01');
  await next.click();
  await preview.getByRole('textbox').fill('100');
  await next.click();
  await preview.getByText('Non', { exact: true }).click();
  await next.click();
  await preview.getByRole('textbox').fill('Vol constaté au local le matin.');
  await next.click();
  await preview.getByText('Courriel').click();
  await next.click();
  const summary = page.getByTestId('summary');
  await expect(summary).toContainText('Vol constaté au local le matin.');
  await summary.getByText('Décrivez les circonstances').click();
  await preview.getByRole('textbox').fill('Vol constaté au local le soir même.');
  await page.getByTestId('preview-back-to-summary').click();
  await expect(summary).toContainText('Vol constaté au local le soir même.');
  await expect(page.getByTestId('debug-panel')).toContainText('circonstances');
  expect(errors).toEqual([]);
});

test('langues, traductions manquantes, raccourci personnalisé, mise en page auto, vue côte à côte', async ({ page }) => {
  const errors = await open(page);
  await page.keyboard.press('Control+k');
  await page.keyboard.type('exemple');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node').first()).toBeVisible();

  // Changement de langue en prévisualisation.
  await page.getByTestId('view-preview').click();
  const preview = page.getByTestId('preview');
  await expect(preview).toContainText('Bonjour');
  await page.getByTestId('preview-lang').selectOption('en');
  await expect(preview).toContainText('Hello');

  // Paramètres : nouvelle langue, traductions manquantes, repli signalé dans la prévisualisation.
  await page.getByTestId('open-settings').click();
  await page.getByLabel('Code (ex. en, de, pt-BR)').fill('de');
  await page.getByRole('button', { name: 'Ajouter une langue' }).click();
  await expect(page.getByTestId('language-de')).toBeVisible();
  await expect(page.getByTestId('settings-translations').getByRole('listitem').first()).toContainText('de');
  await page.getByRole('tab', { name: /Déclaration/ }).click();
  await page.getByTestId('preview-lang').selectOption('de');
  await expect(page.getByTestId('preview-missing-translations')).toContainText('de');
  await expect(preview).toContainText('Bonjour');

  // Raccourci personnalisé : Q pour « Nouvelle question à la suite ».
  await page.getByTestId('open-settings').click();
  const row = page.getByTestId('shortcut-node.newQuestion');
  await row.getByRole('button', { name: /Ajouter un raccourci/ }).click();
  await page.keyboard.press('q');
  await expect(row).toContainText('Q');
  await page.getByRole('tab', { name: /Déclaration/ }).click();
  await page.getByTestId('view-diagram').click();
  const count = await page.locator('.react-flow__node').count();
  await page.locator('.react-flow__node').first().click();
  await page.keyboard.press('q');
  await expect(page.getByLabel('intitulé')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('.react-flow__node')).toHaveCount(count + 1);

  // Mise en page automatique (L), annulable.
  const before = await page.locator('.react-flow__node').first().getAttribute('style');
  await page.getByTestId('diagram').focus();
  await page.keyboard.press('l');
  await expect.poll(() => page.locator('.react-flow__node').first().getAttribute('style')).not.toBe(before);
  await page.getByTestId('diagram').focus();
  await page.keyboard.press('Control+z');
  await expect.poll(() => page.locator('.react-flow__node').first().getAttribute('style')).toBe(before);

  // Vue côte à côte avec un second questionnaire.
  await page.getByRole('button', { name: 'Nouveau questionnaire', exact: true }).click();
  await page.getByRole('tab', { name: /Déclaration/ }).click();
  await page.getByTestId('toggle-compare').click();
  await expect(page.getByTestId('compare-pane')).toBeVisible();
  await expect(page.getByTestId('diagram-compare')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer la vue côte à côte' }).click();
  await expect(page.getByTestId('compare-pane')).toHaveCount(0);
  expect(errors).toEqual([]);
});
