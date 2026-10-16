import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// EVO-005 : libellés des arêtes et des variables de l'état du système (spec §3.1, §3.6, §4.2, §4.5).
const appUrl = pathToFileURL(resolve('dist/index.html')).href;
/** Délai de regroupement des frappes dans l'historique (COALESCE_MS = 1500) dépassé. */
const AFTER_COALESCE = 1700;
/** `C` redonne le focus à la condition 30 ms après (ExpressionInput) : attendre avant de saisir ailleurs. */
const AFTER_REFOCUS = 300;

async function openExample(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('exemple');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node')).toHaveCount(21);
  return errors;
}

const pill = (page: Page, edgeId: string) => page.locator(`[data-edge-label="${edgeId}"]`);

async function undo(page: Page) {
  await page.getByTestId('diagram').focus();
  await page.keyboard.press('Control+z');
}

test('EVO-005 : libellé d’arête affiché, condition au survol, effacement, annulation, sortie de bloc, troncature, wizard', async ({ page }) => {
  const errors = await openExample(page);
  const caption = page.getByTestId('edge-caption');

  // Libellés de l'exemple : « sinon » et arête de sortie de bloc.
  await expect(pill(page, 'e_qualite_montant').locator('[data-edge-caption]')).toHaveText('Sinon');
  await expect(pill(page, 'e_bloc_non_identifie').locator('[data-edge-caption]')).toHaveText('Tiers non identifié');
  await expect(pill(page, 'e_bloc_non_identifie')).toContainText('non_identifie');

  // Arête conditionnée : le libellé remplace la condition, qui reste au survol (infobulle).
  const cond = pill(page, 'e_date_victimes');
  await expect(cond).toHaveText(/type_sinistre = 'accident'/);
  await cond.click();
  await caption.fill('Ayant droit');
  await expect(cond.locator('[data-edge-caption]')).toHaveText('Ayant droit');
  await expect(cond).not.toContainText('type_sinistre');
  await expect(cond).toHaveAttribute('title', "Ayant droit\ntype_sinistre = 'accident'");

  // Annuler une saisie.
  await undo(page);
  await expect(cond.locator('[data-edge-caption]')).toHaveCount(0);
  await expect(cond).toHaveText(/type_sinistre = 'accident'/);
  await expect(cond).toHaveAttribute('title', "type_sinistre = 'accident'");

  // Effacer : la condition revient ; annuler l'effacement : le libellé revient.
  await cond.click();
  await caption.fill('Ayant droit');
  await expect(cond.locator('[data-edge-caption]')).toHaveText('Ayant droit');
  await page.waitForTimeout(AFTER_COALESCE);
  await caption.fill('');
  await expect(cond.locator('[data-edge-caption]')).toHaveCount(0);
  await expect(cond).toHaveText(/type_sinistre = 'accident'/);
  await undo(page);
  await expect(cond.locator('[data-edge-caption]')).toHaveText('Ayant droit');

  // Arête seule sans condition (aucune pastille avant) : le libellé s'affiche (n_type a désormais deux sorties, EVO-024).
  await expect(pill(page, 'e_victimes_qualite')).toHaveCount(0);
  await page.getByTestId('rf__node-n_qualite').click();
  await expect(caption).toHaveCount(0); // nœud sélectionné : plus de panneau d'arête
  await page.keyboard.press('c'); // sélectionne l'arête entrante
  // `C` donne (et redonne) le focus à la condition : l'attendre, sinon il peut arriver pendant la saisie du libellé.
  await expect(page.locator('.cm-editor.cm-focused')).toHaveCount(1);
  await page.waitForTimeout(AFTER_REFOCUS);
  await page.locator('[data-testid="edge-caption"][data-edge-id="e_victimes_qualite"]').fill('Vers la qualité');
  await expect(pill(page, 'e_victimes_qualite').locator('[data-edge-caption]')).toHaveText('Vers la qualité');
  await expect(pill(page, 'e_victimes_qualite')).toHaveAttribute('title', 'Vers la qualité'); // arête seule : pas de « sinon »

  // Arête issue d'une sortie de bloc.
  await pill(page, 'e_bloc_identifie').click();
  await page.locator('[data-testid="edge-caption"][data-edge-id="e_bloc_identifie"]').fill('Tiers identifié');
  await expect(pill(page, 'e_bloc_identifie').locator('[data-edge-caption]')).toHaveText('Tiers identifié');
  await expect(pill(page, 'e_bloc_identifie')).toContainText('identifie');

  // Libellé trop long : tronqué avec « … », complet au survol.
  const long = 'Un libellé de lecture beaucoup trop long pour tenir dans la pastille de l’arête du logigramme';
  await page.getByTestId('rf__node-n_qualite').click();
  await expect(caption).toHaveCount(0); // nœud sélectionné : plus de panneau d'arête
  await page.keyboard.press('c');
  await expect(page.locator('.cm-editor.cm-focused')).toHaveCount(1);
  await page.waitForTimeout(AFTER_REFOCUS);
  await page.locator('[data-testid="edge-caption"][data-edge-id="e_victimes_qualite"]').fill(long);
  const box = pill(page, 'e_victimes_qualite');
  await expect(box.locator('[data-edge-caption]')).toHaveText(long);
  const overflow = await box.evaluate((el) => ({ over: el.scrollWidth > el.clientWidth, ellipsis: getComputedStyle(el).textOverflow }));
  expect(overflow).toEqual({ over: true, ellipsis: 'ellipsis' });
  await expect(box).toHaveAttribute('title', long);

  // Prévisualisation : chemin inchangé, aucun libellé d'arête dans le wizard.
  await page.getByTestId('view-preview').click();
  const preview = page.getByTestId('preview-page');
  const next = page.getByTestId('preview-next');
  await next.click();
  await page.getByTestId('preview').getByText('Accident corporel').click();
  await next.click();
  await page.getByTestId('preview').locator('input[type=date]').fill('2025-01-01');
  await next.click();
  await expect(preview).toContainText('Prénom');
  for (const text of ['Ayant droit', 'Vers la date', 'Tiers identifié', 'Tiers non identifié', 'Sinon', 'libellé de lecture']) {
    await expect(preview).not.toContainText(text);
  }
  expect(errors).toEqual([]);
});

test('EVO-005 : libellé d’une variable et d’un champ de liste : dictionnaire, scénarios, autocomplétion, survol, annulation', async ({ page }) => {
  const errors = await openExample(page);
  await page.keyboard.press('Control+k');
  await page.keyboard.type('État du système');
  await page.keyboard.press('Enter');
  const system = page.getByTestId('system-state');
  await expect(system).toBeVisible();

  // Nouvelle variable sys.profil, libellé « Profil connecté » saisi à côté de la clé.
  await page.getByTestId('add-variable').click();
  await page.keyboard.type('profil');
  await page.keyboard.press('Enter');
  const card = page.getByTestId('variable-profil');
  const caption = card.getByTestId('variable-caption');
  await caption.fill('Profil connecté');
  await expect(caption).toHaveValue('Profil connecté');

  // Annuler la saisie, puis l'effacement (historique du projet).
  await page.getByTestId('add-variable').focus();
  await page.keyboard.press('Control+z');
  await expect(caption).toHaveValue('');
  await caption.fill('Profil connecté');
  await page.waitForTimeout(AFTER_COALESCE);
  await caption.fill('');
  await page.getByTestId('add-variable').focus();
  await page.keyboard.press('Control+z');
  await expect(caption).toHaveValue('Profil connecté');

  // Libellé d'un champ de liste d'objets.
  const field = page.getByTestId('variable-sinistres').getByPlaceholder('Libellé').nth(1);
  await field.fill('Date de survenance');

  // Éditeur de scénarios : libellé en face de chaque valeur.
  const scenario = system.locator('[data-testid^=scenario-]').first();
  await expect(scenario.locator('label', { hasText: 'sys.profil' })).toContainText('Profil connecté');
  await expect(scenario.locator('label', { hasText: 'sys.type_adherent' })).toContainText('Catégorie d\'adhérent');

  // Autocomplétion dans une condition : « connecté » propose sys.profil, libellé à côté de la clé.
  await page.getByRole('tab').filter({ hasText: 'Déclaration de sinistre' }).click();
  await pill(page, 'e_date_victimes').click();
  const editor = page.getByTestId('properties').locator('.cm-content').first();
  await editor.click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('connecté');
  const list = page.locator('.cm-tooltip-autocomplete');
  await expect(list).toContainText('sys.profil');
  await expect(list).toContainText('Profil connecté');
  await page.waitForTimeout(200); // délai d'interaction de CodeMirror avant validation
  await page.keyboard.press('Enter');
  await expect(editor).toHaveText('sys.profil');

  // Champ de liste : « survenance » propose sys.sinistres.date avec son libellé.
  await page.keyboard.type(" = 'x' and survenance");
  await expect(list).toContainText('sys.sinistres.date');
  await expect(list).toContainText('Date de survenance');
  await page.keyboard.press('Escape');

  // Survol de sys.profil : infobulle avec le libellé.
  const line = editor.locator('.cm-line').first();
  const lb = (await line.boundingBox())!;
  await page.mouse.move(lb.x + 30, lb.y + lb.height / 2);
  const hover = page.locator('[data-sys-hover="sys.profil"]');
  await expect(hover).toBeVisible();
  await expect(hover).toContainText('Profil connecté');
  expect(errors).toEqual([]);
});
