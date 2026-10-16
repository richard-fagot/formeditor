import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;
const fr = (s: string) => ({ fr: s });

async function exportText(page: Page): Promise<string> {
  const download = page.waitForEvent('download');
  await page.getByTestId('export').click();
  return readFileSync(await (await download).path(), 'utf8');
}

async function importText(page: Page, text: string) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Ouvrir / importer…' }).click();
  await (await chooser).setFiles({ name: 'projet.bundle.json', mimeType: 'application/json', buffer: Buffer.from(text) });
}

/**
 * `rc` : proprio (booléen) ─non→ info ; proprio → Renvoi ; info → Renvoi ; Renvoi → fin.
 * Boutons : déclaration (deux toggles), rectifier (proprio), voir l'info (non parcourue si proprio = oui),
 * masqué si proprio = oui, libellé vide (en erreur), déclaration sans option. `dommage` : autre questionnaire.
 */
function withRedirect(bundleText: string, toEnd = true, finishLabel?: object): string {
  const bundle = JSON.parse(bundleText);
  const q = bundle.questionnaires[0];
  q.key = 'rc';
  q.title = fr('Responsabilité civile');
  q.start = 'n_q1';
  q.nodes = [
    { kind: 'question', id: 'n_q1', key: 'proprio', label: fr('Le bien vous appartient-il ?'), type: 'boolean' },
    { kind: 'info', id: 'n_info', title: fr('Information'), text: fr('Texte informatif') },
    {
      kind: 'redirect', id: 'n_r', title: fr('Mauvais questionnaire'), text: fr('Cette déclaration ne convient pas.'),
      buttons: [
        { label: fr('Déclarer un dommage'), target: { questionnaire: 'q_dommage', prefill: true, replace: true } },
        { label: fr('Rectifier ma déclaration'), target: { node: 'n_q1' } },
        { label: fr('Voir l’information'), target: { node: 'n_info' } },
        { label: fr('Caché'), target: { node: 'n_q1' }, when: 'proprio = false' },
        { label: fr(''), target: { node: 'n_q1' } },
        { label: fr('Sans option'), target: { questionnaire: 'q_dommage', prefill: false, replace: false } },
      ],
      ...(finishLabel ? { finishLabel } : {}),
    },
    { kind: 'question', id: 'n_q2', key: 'suite', label: fr('Question suivante'), type: 'text' },
    { kind: 'end', id: 'n_fin', message: fr('Merci, c’est fini') },
  ];
  q.edges = [
    { id: 'e1', from: 'n_q1', to: 'n_info', when: 'proprio = false' },
    { id: 'e2', from: 'n_q1', to: 'n_r' },
    { id: 'e3', from: 'n_info', to: 'n_r' },
    toEnd ? { id: 'e4', from: 'n_r', to: 'n_fin' } : { id: 'e4', from: 'n_r', to: 'n_q2' },
    { id: 'e5', from: 'n_q2', to: 'n_fin' },
  ];
  const second = { ...q, id: 'q_dommage', key: 'dommage', title: fr('Dommage au bien'), start: 'm1', nodes: [{ kind: 'end', id: 'm1', message: fr('Fin') }], edges: [] };
  bundle.questionnaires.push(second);
  bundle.project.questionnaires = [{ id: q.id, file: 'rc.json' }, { id: 'q_dommage', file: 'dommage.json' }];
  const nodes = { n_q1: { x: 0, y: 0 }, n_info: { x: 320, y: 160 }, n_r: { x: 0, y: 320 }, n_q2: { x: 320, y: 480 }, n_fin: { x: 0, y: 640 } };
  bundle.layouts = [...bundle.layouts.filter((l: { graph: string }) => l.graph !== q.id), { formatVersion: bundle.formatVersion, kind: 'layout', graph: q.id, nodes }];
  return JSON.stringify(bundle);
}

async function setup(page: Page, toEnd = true, finishLabel?: object) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => void d.accept());
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  await importText(page, withRedirect(await exportText(page), toEnd, finishLabel));
  await expect(page.getByTestId('rf__node-n_r')).toBeVisible();
  return errors;
}

/** Prévisualisation : proprio = oui, arrivée sur le Renvoi. */
async function toRedirect(page: Page) {
  await page.getByTestId('view-preview').click();
  const preview = page.getByTestId('preview');
  await preview.getByText('Oui', { exact: true }).click();
  await page.getByTestId('preview-next').click();
  await expect(page.getByTestId('redirect-page')).toBeVisible();
  return preview;
}
const notice = (page: Page) => page.getByRole('dialog');

test('EVO-024-037, EVO-024-038, EVO-024-039, EVO-024-040, EVO-024-073 — logigramme : forme propre, boutons et cibles dans l’ordre, icônes des toggles, condition, aucun lien vers les cibles', async ({ page }) => {
  const errors = await setup(page);
  const node = page.getByTestId('rf__node-n_r');
  await expect(node.getByTestId('redirect-shape')).toContainText('Renvoi');
  const buttons = node.getByTestId('redirect-button');
  await expect(buttons).toHaveCount(6);
  await expect(buttons.nth(0)).toContainText('Déclarer un dommage');
  await expect(buttons.nth(0).getByTestId('redirect-target')).toHaveText('→ Dommage au bien');
  await expect(buttons.nth(1).getByTestId('redirect-target')).toHaveText('→ proprio');
  await expect(buttons.nth(2).getByTestId('redirect-target')).toHaveText('→ Information');
  await expect(buttons.nth(0).getByTestId('toggle-prefill')).toHaveCount(1);
  await expect(buttons.nth(0).getByTestId('toggle-replace')).toHaveCount(1);
  await expect(buttons.nth(5).getByTestId('toggle-prefill')).toHaveCount(0);
  await expect(buttons.nth(1).getByTestId('toggle-replace')).toHaveCount(0);
  await expect(buttons.nth(3).getByTestId('redirect-button-when')).toHaveCount(1);
  await expect(buttons.nth(0).getByTestId('redirect-button-when')).toHaveCount(0);
  const infoClass = await page.getByTestId('rf__node-n_info').locator('> div').getAttribute('class');
  const redirectClass = await node.locator('> div').getAttribute('class');
  expect(redirectClass).not.toBe(infoClass);
  await expect(page.locator('.react-flow__edge')).toHaveCount(5);
  expect(errors).toEqual([]);
});

test('EVO-024-022, EVO-024-024, EVO-024-025, EVO-024-026, EVO-024-027, EVO-024-028, EVO-024-029, EVO-024-030, EVO-024-065, EVO-024-071, EVO-024-074, EVO-024-003 — panneau de propriétés du Renvoi', async ({ page }) => {
  const errors = await setup(page);
  await page.getByTestId('rf__node-n_r').click();
  const props = page.getByTestId('properties');
  const labels = props.locator('label, div.text-xs.font-medium');
  await expect(props).toContainText('Titre');
  await expect(props).toContainText('Texte');
  await expect(props).toContainText('Libellé du bouton Terminer');
  const order = await labels.allInnerTexts();
  const at = (s: string) => order.findIndex((x) => x.startsWith(s));
  expect(at('Titre')).toBeLessThan(at('Texte'));
  expect(at('Texte')).toBeLessThan(at('Boutons'));
  const editors = props.getByTestId('redirect-button-editor');
  await expect(editors).toHaveCount(6);
  await expect(editors.nth(0)).toContainText('Libellé');
  await expect(editors.nth(0)).toContainText('Cible');
  await expect(editors.nth(0).getByText('Pré-remplissage de la cible')).toBeVisible();
  await expect(editors.nth(0).getByText('Annule et remplace')).toBeVisible();
  await expect(editors.nth(1).getByText('Annule et remplace')).toHaveCount(0);
  await expect(editors.nth(0)).toContainText('Condition d’affichage');
  await expect(editors.nth(0)).not.toContainText(/Type/);
  // Cible : liste fermée, cibles autorisées seulement (autre questionnaire, nœuds en amont).
  const select = props.getByTestId('redirect-target-1');
  expect(await select.evaluate((e) => e.tagName)).toBe('SELECT');
  const options = await select.locator('option').allInnerTexts();
  expect(options).toEqual(['— choisir une cible —', 'Dommage au bien', 'proprio', 'Information']);
  // Ajouter, réordonner, supprimer.
  await props.getByTestId('redirect-add').click();
  await expect(editors).toHaveCount(7);
  await expect(page.getByTestId('rf__node-n_r').getByTestId('redirect-button')).toHaveCount(7);
  await editors.nth(1).getByRole('button', { name: 'Monter' }).click();
  await expect(page.getByTestId('rf__node-n_r').getByTestId('redirect-button').first()).toContainText('Rectifier ma déclaration');
  await props.getByTestId('redirect-remove-0').click();
  await expect(editors).toHaveCount(6);
  await expect(page.getByTestId('rf__node-n_r').getByTestId('redirect-button').first()).toContainText('Déclarer un dommage');
  // Choisir une cible questionnaire : toggles apparus, désactivés ; puis une cible nœud : plus de toggle.
  await props.getByTestId('redirect-target-5').selectOption({ label: 'Dommage au bien' });
  await expect(props.getByTestId('redirect-prefill-5')).not.toBeChecked();
  await props.getByTestId('redirect-prefill-5').check();
  await props.getByTestId('redirect-target-5').selectOption({ label: 'proprio' });
  await expect(props.getByTestId('redirect-prefill-5')).toHaveCount(0);
  await props.getByTestId('redirect-target-5').selectOption({ label: 'Dommage au bien' });
  await expect(props.getByTestId('redirect-prefill-5')).not.toBeChecked();
  await expect(props.getByTestId('redirect-replace-5')).not.toBeChecked();
  expect(errors).toEqual([]);
});

test('EVO-024-023 — un autre type de nœud ne propose aucun bouton de renvoi', async ({ page }) => {
  await setup(page);
  for (const id of ['n_q1', 'n_info', 'n_fin']) {
    await page.getByTestId(`rf__node-${id}`).click();
    await expect(page.getByTestId('properties')).toBeVisible();
    await expect(page.getByTestId('redirect-buttons')).toHaveCount(0);
  }
});

test('EVO-024-001 — Alt+R crée un nœud Renvoi chaîné après la sélection', async ({ page }) => {
  await setup(page);
  await page.getByTestId('rf__node-n_fin').click();
  await page.keyboard.press('Alt+r');
  await expect(page.locator('.react-flow__node')).toHaveCount(6);
  await expect(page.getByTestId('properties').getByTestId('redirect-buttons')).toBeVisible();
});

test('EVO-024-041, EVO-024-042, EVO-024-018, EVO-024-064, EVO-024-048 — page du Renvoi : titre, texte, boutons visibles dans l’ordre, icônes, bouton en erreur affiché, Terminer', async ({ page }) => {
  const errors = await setup(page);
  const preview = await toRedirect(page);
  await expect(preview.getByRole('heading')).toHaveText('Mauvais questionnaire');
  await expect(preview.getByTestId('redirect-page')).toContainText('Cette déclaration ne convient pas.');
  const buttons = preview.getByTestId('redirect-page-button');
  expect(await buttons.allInnerTexts()).toEqual(['Déclarer un dommage', 'Rectifier ma déclaration', 'Voir l’information', '', 'Sans option']);
  await expect(buttons.nth(0).getByTestId('toggle-prefill')).toHaveCount(1);
  await expect(buttons.nth(0).getByTestId('toggle-replace')).toHaveCount(1);
  await expect(buttons.nth(4).getByTestId('toggle-prefill')).toHaveCount(0);
  await expect(page.getByTestId('preview-finish')).toHaveText('Terminer');
  await expect(page.getByTestId('preview-next')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('EVO-024-043, EVO-024-044, EVO-024-067, EVO-024-047, EVO-024-016 — boutons à cible questionnaire : message, la page et les réponses restent (toggles documentaires, rien n’est exécuté) ; bouton en erreur sans effet', async ({ page }) => {
  await setup(page);
  const preview = await toRedirect(page);
  const buttons = preview.getByTestId('redirect-page-button');
  await buttons.nth(0).click();
  await expect(notice(page)).toContainText('Renvoi vers le questionnaire « Dommage au bien ».');
  await expect(notice(page)).toContainText('Options activées : pré-remplissage de la cible, annule et remplace.');
  await notice(page).getByRole('button', { name: 'Fermer' }).first().click();
  await expect(page.getByTestId('redirect-page')).toBeVisible();
  await buttons.nth(4).click();
  await expect(notice(page)).toContainText('Aucune option activée.');
  await notice(page).getByRole('button', { name: 'Fermer' }).first().click();
  await buttons.nth(3).click();
  await expect(notice(page)).toHaveCount(0);
  await expect(page.getByTestId('redirect-page')).toBeVisible();
  await page.getByRole('button', { name: 'Précédent' }).click();
  await expect(preview.getByRole('radio', { name: 'Oui' })).toBeChecked();
});

test('EVO-024-045, EVO-024-046, EVO-024-051 — cible nœud : retour si parcourue (réponses conservées), message sinon ; Précédent comme aujourd’hui', async ({ page }) => {
  await setup(page);
  const preview = await toRedirect(page);
  const buttons = preview.getByTestId('redirect-page-button');
  await buttons.nth(2).click();
  await expect(notice(page)).toContainText('La cible « Information » n’a pas été parcourue dans cette session');
  await notice(page).getByRole('button', { name: 'Fermer' }).first().click();
  await expect(page.getByTestId('redirect-page')).toBeVisible();
  await buttons.nth(1).click();
  await expect(preview.locator('label').first()).toHaveText('Le bien vous appartient-il ?');
  await expect(preview.getByRole('radio', { name: 'Oui' })).toBeChecked();
  await expect(page.getByTestId('preview-back-to-summary')).toHaveText('Revenir au renvoi');
  await page.getByTestId('preview-back-to-summary').click();
  await expect(page.getByTestId('redirect-page')).toBeVisible();
  await page.getByRole('button', { name: 'Précédent' }).click();
  await expect(preview.locator('label').first()).toHaveText('Le bien vous appartient-il ?');
});

test('EVO-024-050 — « Terminer » affiche la fin', async ({ page }) => {
  await setup(page);
  await toRedirect(page);
  await page.getByTestId('preview-finish').click();
  await expect(page.getByTestId('preview')).toContainText('Merci, c’est fini');
});

test('EVO-024-049 — Renvoi pas juste avant une fin : « Suivant », pas de « Terminer »', async ({ page }) => {
  await setup(page, false);
  await toRedirect(page);
  await expect(page.getByTestId('preview-next')).toBeVisible();
  await expect(page.getByTestId('preview-finish')).toHaveCount(0);
  await page.getByTestId('preview-next').click();
  await expect(page.getByTestId('preview').locator('label').first()).toHaveText('Question suivante');
});

test('EVO-024-058 — la page d’information est inchangée : titre, texte, « Suivant »', async ({ page }) => {
  await setup(page);
  await page.getByTestId('view-preview').click();
  await page.getByTestId('preview').getByText('Non', { exact: true }).click();
  await page.getByTestId('preview-next').click();
  await expect(page.getByTestId('preview').getByRole('heading')).toHaveText('Information');
  await expect(page.getByTestId('preview')).toContainText('Texte informatif');
  await expect(page.getByTestId('preview-next')).toBeVisible();
  await expect(page.getByTestId('preview-finish')).toHaveCount(0);
});

test('EVO-024-020, EVO-024-021 — bouton Terminer : libellé personnalisé multilingue, sans cible ni condition (il suit les arêtes du nœud)', async ({ page }) => {
  await setup(page, true, { fr: 'Abandonner', en: 'Give up' });
  await page.getByTestId('rf__node-n_r').click();
  const props = page.getByTestId('properties');
  await expect(props.getByText('Libellé du bouton Terminer')).toBeVisible();
  // Une cible par bouton de renvoi, aucune pour Terminer.
  await expect(props.locator('[data-testid^="redirect-target-"]')).toHaveCount(6);
  await toRedirect(page);
  await expect(page.getByTestId('preview-finish')).toHaveText('Abandonner');
  await page.getByTestId('preview-finish').click();
  await expect(page.getByTestId('preview')).toContainText('Merci, c’est fini');
});
