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

/** Exemple de l'EVO : Q1 « Avez-vous des enfants ? » Oui → Q2 « Combien ? » → Q3 ; Non → Q3 ; puis fin. */
function withExample(bundleText: string): string {
  const bundle = JSON.parse(bundleText);
  const q = bundle.questionnaires[0];
  q.start = 'n_q1';
  q.nodes = [
    { kind: 'question', id: 'n_q1', key: 'enfants', label: fr('Avez-vous des enfants ?'), type: 'boolean' },
    { kind: 'question', id: 'n_q2', key: 'combien', label: fr('Combien ?'), type: 'text' },
    { kind: 'question', id: 'n_q3', key: 'situation', label: fr('Situation familiale'), type: 'text' },
    { kind: 'end', id: 'n_fin', message: fr('Merci') },
  ];
  q.edges = [
    { id: 'e1', from: 'n_q1', to: 'n_q2', when: 'enfants = true' },
    { id: 'e2', from: 'n_q1', to: 'n_q3' },
    { id: 'e3', from: 'n_q2', to: 'n_q3' },
    { id: 'e4', from: 'n_q3', to: 'n_fin' },
  ];
  const nodes = { n_q1: { x: 0, y: 0 }, n_q2: { x: 320, y: 160 }, n_q3: { x: 0, y: 320 }, n_fin: { x: 0, y: 480 } };
  bundle.layouts = [...bundle.layouts.filter((l: { graph: string }) => l.graph !== q.id), { formatVersion: bundle.formatVersion, kind: 'layout', graph: q.id, nodes }];
  return JSON.stringify(bundle);
}

/** Projet de l'exemple importé, prévisualisation ouverte, outline affiché. */
async function setup(page: Page, transform = (s: string) => s) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => void d.accept());
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  await importText(page, transform(withExample(await exportText(page))));
  await page.getByTestId('view-preview').click();
  await page.getByTestId('preview.toggleOutline').click();
  const outline = page.getByTestId('outline');
  await expect(outline).toBeVisible();
  const preview = page.getByTestId('preview');
  const heading = preview.locator('label').first();
  const next = page.getByTestId('preview-next');
  const prev = page.getByRole('button', { name: 'Précédent' });
  const node = (id: string) => outline.getByTestId(`rf__node-${id}`);
  return { errors, outline, preview, heading, next, prev, node };
}

/** Écart (px) entre le centre du nœud et celui de l'outline. */
async function offCenter(page: Page, id: string) {
  const o = (await page.getByTestId('outline').boundingBox())!;
  const n = (await page.getByTestId('outline').getByTestId(`rf__node-${id}`).boundingBox())!;
  return Math.max(Math.abs(o.x + o.width / 2 - (n.x + n.width / 2)), Math.abs(o.y + o.height / 2 - (n.y + n.height / 2)));
}
async function expectCentered(page: Page, id: string) {
  await expect.poll(() => offCenter(page, id)).toBeLessThan(3);
  await expect(page.getByTestId('outline').getByTestId(`rf__node-${id}`).locator('[data-outline-current]')).toBeVisible();
}

/** Q1 = Oui, Q2 = 2 : arrivée sur Q3. */
async function toQ3(s: Awaited<ReturnType<typeof setup>>) {
  await s.preview.getByText('Oui', { exact: true }).click();
  await s.next.click();
  await s.preview.getByRole('textbox').fill('2');
  await s.next.click();
  await expect(s.heading).toHaveText('Situation familiale');
}

const viewport = (page: Page) => page.getByTestId('outline').locator('.react-flow__viewport').getAttribute('style');

test('EVO-019 : à l’ouverture, l’outline est centré sur la première question, mise en évidence', async ({ page }) => {
  const s = await setup(page);
  await expect(s.heading).toHaveText('Avez-vous des enfants ?');
  await expectCentered(page, 'n_q1');
  await expect(s.outline.locator('[data-outline-current]')).toHaveCount(1);
  expect(s.errors).toEqual([]);
});

test('EVO-019 : question suivante, y compris par une branche, l’outline se recentre', async ({ page }) => {
  const s = await setup(page);
  await s.preview.getByText('Oui', { exact: true }).click();
  await s.next.click();
  await expect(s.heading).toHaveText('Combien ?');
  await expectCentered(page, 'n_q2');
  await s.next.click();
  await expectCentered(page, 'n_q3');
});

test('EVO-019 : question précédente, l’outline se recentre', async ({ page }) => {
  const s = await setup(page);
  await toQ3(s);
  await s.prev.click();
  await expect(s.heading).toHaveText('Combien ?');
  await expectCentered(page, 'n_q2');
});

test('EVO-019 : après un zoom ou un déplacement manuel, le changement de question recentre', async ({ page }) => {
  const s = await setup(page);
  await expectCentered(page, 'n_q1');
  const box = (await s.outline.boundingBox())!;
  // Coin haut droit : fond du logigramme (les contrôles de zoom sont en bas à gauche).
  await page.mouse.move(box.x + box.width - 30, box.y + 30);
  await page.mouse.wheel(0, 400);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 280, box.y + 200, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => offCenter(page, 'n_q1')).toBeGreaterThan(50);
  await s.preview.getByText('Oui', { exact: true }).click();
  await s.next.click();
  await expectCentered(page, 'n_q2');
});

test('EVO-019 : clic sur une question passée, elle s’affiche avec les réponses conservées', async ({ page }) => {
  const s = await setup(page);
  await toQ3(s);
  await s.node('n_q1').click();
  await expect(s.heading).toHaveText('Avez-vous des enfants ?');
  await expect(s.preview.getByRole('radio', { name: 'Oui' })).toBeChecked();
  await expectCentered(page, 'n_q1');
  await s.node('n_q2').click();
  await expect(s.preview.getByRole('textbox')).toHaveValue('2');
});

test('EVO-019 : clic sur un nœud qui n’est pas une question, ni la page ni la vue ne changent', async ({ page }) => {
  const s = await setup(page);
  await toQ3(s);
  await expectCentered(page, 'n_q3');
  await page.waitForTimeout(400); // fin de l'animation du recentrage
  const before = await viewport(page);
  await s.node('n_fin').click();
  await expect(s.heading).toHaveText('Situation familiale');
  expect(await viewport(page)).toBe(before);
});

test('EVO-019 : question non passée ou hors parcours grisée et inactive', async ({ page }) => {
  const s = await setup(page);
  await expect(s.node('n_q2').locator('[data-outline]')).toHaveAttribute('data-outline', 'inactive');
  await expect(s.node('n_q3').locator('[data-outline]')).toHaveAttribute('data-outline', 'inactive');
  await s.node('n_q3').click();
  await expect(s.heading).toHaveText('Avez-vous des enfants ?');
  // Hors parcours : « Non » mène à Q3 sans passer par Q2.
  await s.preview.getByText('Non', { exact: true }).click();
  await s.next.click();
  await expect(s.heading).toHaveText('Situation familiale');
  await expect(s.node('n_q2').locator('[data-outline]')).toHaveAttribute('data-outline', 'inactive');
  await expect(s.node('n_q3').locator('[data-outline]')).toHaveAttribute('data-outline', 'active');
  await s.node('n_q2').click();
  await expect(s.heading).toHaveText('Situation familiale');
});

test('EVO-019 : retour sur Q1 sans modification, Q2 et Q3 restent actives et Q3 s’affiche au clic', async ({ page }) => {
  const s = await setup(page);
  await toQ3(s);
  await s.prev.click();
  await s.prev.click();
  await expect(s.heading).toHaveText('Avez-vous des enfants ?');
  for (const id of ['n_q1', 'n_q2', 'n_q3']) await expect(s.node(id).locator('[data-outline]')).toHaveAttribute('data-outline', 'active');
  await s.node('n_q3').click();
  await expect(s.heading).toHaveText('Situation familiale');
  await expectCentered(page, 'n_q3');
});

test('EVO-019 : réponse de Q1 changée de « Oui » à « Non », Q2 grisée et inactive', async ({ page }) => {
  const s = await setup(page);
  await toQ3(s);
  await s.node('n_q1').click();
  await s.preview.getByText('Non', { exact: true }).click();
  await expect(s.node('n_q2').locator('[data-outline]')).toHaveAttribute('data-outline', 'inactive');
  await s.node('n_q2').click();
  await expect(s.heading).toHaveText('Avez-vous des enfants ?');
  await expect(s.node('n_q3').locator('[data-outline]')).toHaveAttribute('data-outline', 'active');
});

test('EVO-019 : outline masqué, prévisualisation identique à aujourd’hui', async ({ page }) => {
  const s = await setup(page);
  const width = async () => (await s.preview.boundingBox())!.width;
  const withOutline = await width();
  await page.getByTestId('preview.toggleOutline').click();
  await expect(page.getByTestId('outline-panel')).toHaveCount(0);
  await expect(page.getByTestId('preview.toggleOutline')).toHaveAttribute('aria-pressed', 'false');
  expect(await width()).toBeGreaterThan(withOutline);
  // L'état est gardé pendant la session : retour au logigramme puis à la prévisualisation.
  await page.getByTestId('view-diagram').click();
  await page.getByTestId('view-preview').click();
  await expect(page.getByTestId('outline-panel')).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await page.keyboard.type('outline du logigramme');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('outline')).toBeVisible();
});

test('EVO-019 : déplacer, éditer ou supprimer un nœud depuis l’outline ne modifie rien', async ({ page }) => {
  const s = await setup(page);
  const before = await exportText(page);
  const box = (await s.node('n_q2').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 200, box.y + 150, { steps: 8 });
  await page.mouse.up();
  await s.node('n_q1').dblclick();
  await expect(s.outline.locator('textarea')).toHaveCount(0);
  await s.node('n_q1').click({ button: 'right' });
  await expect(page.getByRole('menu')).toHaveCount(0);
  await s.node('n_q1').click();
  await page.keyboard.press('Delete');
  await page.keyboard.press('Backspace');
  await expect(s.node('n_q1')).toBeVisible();
  expect(await exportText(page)).toBe(before);
});

test('EVO-019 : double-clic sur le badge « bib. » dans l’outline sans effet (écart)', async ({ page }) => {
  const s = await setup(page, (t) => {
    const bundle = JSON.parse(t);
    const q = bundle.questionnaires[0];
    bundle.library.questions.push({ id: 'lq_outline', key: 'lib_outline', label: fr('Question de bibliothèque'), type: 'text' });
    q.nodes.push({ kind: 'question', id: 'n_lib', ref: 'lq_outline' });
    bundle.layouts.find((l: { graph: string }) => l.graph === q.id).nodes.n_lib = { x: 320, y: 0 };
    return JSON.stringify(bundle);
  });
  const badge = s.node('n_lib').getByTestId('library-badge');
  await expect(badge).not.toHaveAttribute('title');
  await badge.dblclick();
  await expect(s.outline).toBeVisible();
  await expect(s.heading).toHaveText('Avez-vous des enfants ?');
  await expect(s.preview).toBeVisible();
  expect(s.errors).toEqual([]);
});

test('EVO-019 : un projet antérieur se charge sans erreur et l’outline s’affiche', async ({ page }) => {
  const s = await setup(page, (t) => t.replace(/"formatVersion":\s*\d+/g, '"formatVersion": 11'));
  await expectCentered(page, 'n_q1');
  await expect(s.node('n_q3')).toBeVisible();
  expect(s.errors).toEqual([]);
});

test('EVO-019 : export puis réimport, JSON identique (aucun impact format)', async ({ page }) => {
  const s = await setup(page);
  await toQ3(s);
  await s.node('n_q1').click();
  const exported = await exportText(page);
  await importText(page, exported);
  await page.getByTestId('view-preview').click();
  await expect(page.getByTestId('outline')).toBeVisible();
  expect(await exportText(page)).toBe(exported);
  expect(exported).not.toMatch(/outline|visited/);
});
