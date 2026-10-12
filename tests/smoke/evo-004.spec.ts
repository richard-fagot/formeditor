import { test, expect, type Page, type Download } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

// EVO-004 : export du logigramme en image PNG (spec §6.4).
const appUrl = pathToFileURL(resolve('dist/index.html')).href;
const MARGIN = 40;
const HEADER = 48;

test.use({ viewport: { width: 1100, height: 700 } });

async function openExample(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('exemple');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node')).toHaveCount(19);
  return errors;
}

/** Boîte englobante (coordonnées du logigramme, zoom 100 %) des nœuds donnés, ou de tous. */
function flowBounds(page: Page, ids?: string[]) {
  return page.evaluate((ids) => {
    const els = [...document.querySelectorAll<HTMLElement>('[data-testid=diagram] .react-flow__node')]
      .filter((n) => !ids || ids.includes(n.dataset.id ?? ''));
    const boxes = els.map((n) => {
      // Firefox abrège `translate(x, 0px)` en `translate(x)`.
      const m = /translate\(([-\d.e]+)px(?:,\s*([-\d.e]+)px)?\)/.exec(n.style.transform)!;
      return { x: +m[1]!, y: +(m[2] ?? 0), w: n.offsetWidth, h: n.offsetHeight };
    });
    const x = Math.min(...boxes.map((b) => b.x));
    const y = Math.min(...boxes.map((b) => b.y));
    return { count: els.length, width: Math.max(...boxes.map((b) => b.x + b.w)) - x, height: Math.max(...boxes.map((b) => b.y + b.h)) - y };
  }, ids);
}

/** Lance l'export depuis le dialogue ouvert (`Entrée`) et lit le PNG téléchargé. */
async function exportWithEnter(page: Page) {
  const pending = page.waitForEvent('download');
  await page.keyboard.press('Enter');
  return readPng(await pending);
}

async function readPng(d: Download) {
  const buf = readFileSync((await d.path())!);
  expect(buf.length).toBeGreaterThan(1000);
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  return { name: d.suggestedFilename(), buf, width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Analyse des pixels dans le navigateur : coins, bande du bas (marge), encre en haut (titre, sinon marge blanche), empreinte. */
function analyse(page: Page, buf: Buffer) {
  return page.evaluate(async ({ b64, header }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
    const px = (x: number, y: number) => [...data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4)];
    const white = (p: number[]) => p[0]! > 250 && p[1]! > 250 && p[2]! > 250 && p[3] === 255;
    let bottomWhite = true;
    for (let y = height - 40; y < height; y++) for (let x = 0; x < width; x++) if (!white(px(x, y))) bottomWhite = false;
    let headerInk = 0;
    for (let y = 0; y < header; y++) for (let x = 0; x < width; x++) if (px(x, y)[0]! < 128) headerInk++;
    let hash = 0;
    for (let i = 0; i < data.length; i++) hash = (hash * 31 + data[i]!) | 0;
    return { corners: [px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1)].every(white), bottomWhite, headerInk, hash };
  }, { b64: buf.toString('base64'), header: 2 * MARGIN - 4 });
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
};

test('EVO-004 : logigramme entier zoomé, thème sombre, titre, 2×, nom du fichier', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  const errors = await openExample(page);
  const diagram = page.getByTestId('diagram');
  // Zoom avant : une partie seulement du logigramme est visible.
  for (let i = 0; i < 6; i++) await page.locator('.react-flow__controls-zoomin').click();
  const box = (await diagram.boundingBox())!;
  const visible = await page.locator('.react-flow__node').evaluateAll((els, b) => els.filter((e) => {
    const r = e.getBoundingClientRect();
    return r.right > b.x && r.left < b.x + b.width && r.bottom > b.y && r.top < b.y + b.height;
  }).length, box);
  expect(visible).toBeLessThan(19);

  // Raccourci X sur le logigramme : dialogue avec les choix par défaut (logigramme entier, titre).
  await diagram.click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('x');
  const dialog = page.getByTestId('image-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('image-scope-all')).toBeChecked();
  await expect(page.getByTestId('image-scope-selection')).toHaveCount(0);
  await expect(page.getByTestId('image-title')).toBeChecked();
  const png = await exportWithEnter(page);
  await expect(dialog).toHaveCount(0);

  expect(png.name).toBe(`Déclarations de sinistre - Déclaration de sinistre - ${today()}.png`);
  // Tous les nœuds, à 2× la taille à 100 %, marges et en-tête de titre compris.
  const all = await flowBounds(page);
  expect(all.count).toBe(19);
  expect(png.width).toBeGreaterThanOrEqual(2 * (all.width + 2 * MARGIN) - 2);
  expect(png.height).toBeGreaterThanOrEqual(2 * (all.height + 2 * MARGIN + HEADER) - 2);
  const a = await analyse(page, png.buf);
  expect(a.corners).toBe(true); // fond blanc malgré le thème sombre
  expect(a.bottomWhite).toBe(true); // ni fond quadrillé, ni contrôles, ni mini-carte dans la marge
  expect(a.headerInk).toBeGreaterThan(100); // titre dessiné dans l'en-tête
  expect(errors).toEqual([]);
});

test('EVO-004 : sans surbrillance, sélection de deux nœuds reliés, derniers choix, palette', async ({ page }) => {
  const errors = await openExample(page);
  const diagram = page.getByTestId('diagram');
  const dialog = page.getByTestId('image-dialog');

  // Bouton de la barre du logigramme, sans sélection.
  await page.getByTestId('export-image').click();
  await expect(dialog).toBeVisible();
  const plain = await exportWithEnter(page);

  // Départ sélectionné au clavier ; palette ; même image (aucune surbrillance de sélection, aucune poignée en plus).
  await diagram.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('rf__node-n_intro')).toHaveClass(/selected/);
  await page.keyboard.press('Control+k');
  await page.keyboard.type('Exporter le logigramme en image');
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('image-scope-all')).toBeChecked();
  const selected = await exportWithEnter(page);
  expect([selected.width, selected.height]).toEqual([plain.width, plain.height]);
  expect((await analyse(page, selected.buf)).hash).toBe((await analyse(page, plain.buf)).hash);
  await expect(page.getByTestId('rf__node-n_intro')).toHaveClass(/selected/); // sélection restaurée

  // Deux nœuds reliés : la sélection seule, sans titre.
  await page.getByTestId('rf__node-n_type').click({ modifiers: ['Shift'] });
  await expect(page.locator('.react-flow__node.selected')).toHaveCount(2);
  await diagram.focus();
  await page.keyboard.press('x');
  await page.getByTestId('image-scope-selection').check();
  await page.getByTestId('image-title').uncheck();
  await page.getByTestId('image-scope-selection').focus();
  const two = await exportWithEnter(page);
  const sel = await flowBounds(page, ['n_intro', 'n_type']);
  expect(two.width).toBeGreaterThanOrEqual(2 * (sel.width + 2 * MARGIN) - 2);
  expect(two.width).toBeLessThan(2 * (sel.width + 2 * MARGIN) + 120);
  expect(two.height).toBeGreaterThanOrEqual(2 * (sel.height + 2 * MARGIN) - 2);
  expect(two.height).toBeLessThan(2 * (sel.height + 2 * MARGIN) + 120);
  expect(two.width * two.height).toBeLessThan((plain.width * plain.height) / 4);
  expect((await analyse(page, two.buf)).headerInk).toBe(0);

  // Réouverture : derniers choix retenus.
  await diagram.focus();
  await page.keyboard.press('x');
  await expect(page.getByTestId('image-scope-selection')).toBeChecked();
  await expect(page.getByTestId('image-title')).not.toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});
