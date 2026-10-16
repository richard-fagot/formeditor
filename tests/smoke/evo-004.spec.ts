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
  await expect(page.locator('.react-flow__node')).toHaveCount(21);
  return errors;
}

/** Zone du logigramme (coordonnées du logigramme, zoom 100 %) où l'image doit contenir de l'encre. */
interface Probe {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Géométrie du logigramme (coordonnées du logigramme, zoom 100 %) : boîte des nœuds `ids` (tous par défaut), origine de
 * l'image comme à l'export (nœuds ∪ tracés des arêtes `edges`, toutes par défaut) et zones témoins : centre des nœuds,
 * éléments désignés par `probes` (sélecteur CSS, premier élément de texte `text` s'il est donné), milieu du tracé des arêtes `paths`.
 */
function flowGeometry(page: Page, opts: { ids?: string[]; edges?: string[]; probes?: { sel: string; text?: string }[]; paths?: string[] } = {}) {
  return page.evaluate(({ ids, edges, probes, paths }) => {
    const root = document.querySelector<HTMLElement>('[data-testid=diagram]')!;
    const pane = root.querySelector('.react-flow')!.getBoundingClientRect();
    // Firefox abrège `translate(x, 0px)` en `translate(x)`.
    const m = /translate\(([-\d.e]+)px(?:,\s*([-\d.e]+)px)?\)\s*scale\(([-\d.e]+)\)/.exec(root.querySelector<HTMLElement>('.react-flow__viewport')!.style.transform)!;
    const [tx, ty, zoom] = [+m[1]!, +(m[2] ?? 0), +m[3]!];
    const toFlow = (r: DOMRect) => ({ x: (r.left - pane.left - tx) / zoom, y: (r.top - pane.top - ty) / zoom, w: r.width / zoom, h: r.height / zoom });
    const nodes = [...root.querySelectorAll<HTMLElement>('.react-flow__node')].filter((n) => !ids || ids.includes(n.dataset.id ?? ''));
    const boxes = nodes.map((n) => ({ name: n.dataset.id ?? '', ...toFlow(n.getBoundingClientRect()) }));
    const pathBoxes = [...root.querySelectorAll<SVGGElement>('.react-flow__edge')]
      .filter((e) => !edges || edges.includes(e.dataset.id ?? ''))
      .map((e) => e.querySelector<SVGPathElement>('.react-flow__edge-path')!.getBBox())
      .map((b) => ({ x: b.x, y: b.y, w: b.width, h: b.height }));
    const box = (bs: { x: number; y: number; w: number; h: number }[]) => {
      const x = Math.min(...bs.map((b) => b.x));
      const y = Math.min(...bs.map((b) => b.y));
      return { x, y, width: Math.max(...bs.map((b) => b.x + b.w)) - x, height: Math.max(...bs.map((b) => b.y + b.h)) - y };
    };
    const centers = boxes.map((b) => ({ name: b.name, x: b.x + b.w / 4, y: b.y + b.h / 4, w: b.w / 2, h: b.h / 2 }));
    const marked = (probes ?? []).map(({ sel, text }) => {
      const el = [...root.querySelectorAll(sel)].find((e) => text === undefined || e.textContent?.trim() === text)!;
      return { name: `${sel} ${text ?? ''}`, ...toFlow(el.getBoundingClientRect()) };
    });
    const mids = (paths ?? []).map((id) => {
      const path = root.querySelector<SVGPathElement>(`.react-flow__edge[data-id="${id}"] .react-flow__edge-path`)!;
      const p = path.getPointAtLength(path.getTotalLength() / 2);
      return { name: id, x: p.x - 2, y: p.y - 2, w: 4, h: 4 };
    });
    return { count: nodes.length, ...box(boxes), origin: box([...boxes, ...pathBoxes]), probes: [...centers, ...marked, ...mids] as Probe[] };
  }, opts);
}

/** Position dans l'image (2×) d'une zone témoin : `(x − origine + marge) × 2`, plus l'en-tête si le titre est dessiné. */
function toImage(probes: Probe[], origin: { x: number; y: number }, title: boolean) {
  const top = title ? HEADER : 0;
  return probes.map((p) => ({
    name: p.name,
    x: Math.round((p.x - origin.x + MARGIN) * 2), y: Math.round((p.y - origin.y + MARGIN + top) * 2),
    w: Math.max(1, Math.round(p.w * 2)), h: Math.max(1, Math.round(p.h * 2)),
  }));
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

/**
 * Analyse des pixels dans le navigateur : coins, bande du bas (marge), encre en haut (titre, sinon marge blanche), encre
 * dans le corps (sous la marge du haut), zones témoins sans encre (`blank` : leurs noms), empreinte.
 */
function analyse(page: Page, buf: Buffer, probes: { name: string; x: number; y: number; w: number; h: number }[] = []) {
  return page.evaluate(async ({ b64, header, probes }) => {
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
    let bodyInk = 0;
    for (let y = header + 40; y < height - 40; y++) for (let x = 0; x < width; x++) if (!white(px(x, y))) bodyInk++;
    const blank = probes.filter((p) => {
      for (let y = Math.max(0, p.y); y < Math.min(height, p.y + p.h); y++) for (let x = Math.max(0, p.x); x < Math.min(width, p.x + p.w); x++) if (!white(px(x, y))) return false;
      return true;
    }).map((p) => p.name);
    let hash = 0;
    for (let i = 0; i < data.length; i++) hash = (hash * 31 + data[i]!) | 0;
    return { corners: [px(0, 0), px(width - 1, 0), px(0, height - 1), px(width - 1, height - 1)].every(white), bottomWhite, headerInk, bodyInk, blank, hash };
  }, { b64: buf.toString('base64'), header: 2 * MARGIN - 4, probes });
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
  expect(visible).toBeLessThan(21);

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

  expect(png.name).toBe(`Déclarations de sinistre - Déclaration de sinistre - 1.0.5 - provisoire - ${today()}.png`);
  // Tous les nœuds, à 2× la taille à 100 %, marges et en-tête de titre compris.
  const all = await flowGeometry(page, { probes: [{ sel: '[data-edge-label]' }, { sel: '[data-id="n_type"] span', text: '*' }] });
  expect(all.count).toBe(21); // exemple : 19 nœuds + nœud Renvoi et sa fin (EVO-024)
  expect(all.probes).toHaveLength(23);
  expect(png.width).toBeGreaterThanOrEqual(2 * (all.width + 2 * MARGIN) - 2);
  expect(png.height).toBeGreaterThanOrEqual(2 * (all.height + 2 * MARGIN + HEADER) - 2);
  const a = await analyse(page, png.buf, toImage(all.probes, all.origin, true));
  expect(a.corners).toBe(true); // fond blanc malgré le thème sombre
  expect(a.bottomWhite).toBe(true); // ni fond quadrillé, ni contrôles, ni mini-carte dans la marge
  expect(a.headerInk).toBeGreaterThan(100); // titre dessiné dans l'en-tête
  expect(a.blank).toEqual([]); // encre au centre des 21 nœuds, sur un libellé d'arête et sur le badge « obligatoire »
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
  const plainPixels = await analyse(page, plain.buf);
  expect(plainPixels.bodyInk).toBeGreaterThan(0); // pas une capture blanche

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
  expect((await analyse(page, selected.buf)).hash).toBe(plainPixels.hash);
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
  const sel = await flowGeometry(page, { ids: ['n_intro', 'n_type'], edges: ['e_intro_type'], paths: ['e_intro_type'] });
  expect(two.width).toBeGreaterThanOrEqual(2 * (sel.width + 2 * MARGIN) - 2);
  expect(two.width).toBeLessThan(2 * (sel.width + 2 * MARGIN) + 120);
  expect(two.height).toBeGreaterThanOrEqual(2 * (sel.height + 2 * MARGIN) - 2);
  expect(two.height).toBeLessThan(2 * (sel.height + 2 * MARGIN) + 120);
  expect(two.width * two.height).toBeLessThan((plain.width * plain.height) / 4);
  const twoPixels = await analyse(page, two.buf, toImage(sel.probes, sel.origin, false));
  expect(twoPixels.headerInk).toBe(0);
  expect(sel.probes.map((p) => p.name)).toEqual(['n_intro', 'n_type', 'e_intro_type']);
  expect(twoPixels.blank).toEqual([]); // encre au centre des deux nœuds et sur le tracé de l'arête

  // Réouverture : derniers choix retenus.
  await diagram.focus();
  await page.keyboard.press('x');
  await expect(page.getByTestId('image-scope-selection')).toBeChecked();
  await expect(page.getByTestId('image-title')).not.toBeChecked();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('EVO-004 : derniers choix retenus après rechargement de la page', async ({ page }) => {
  const errors = await openExample(page);
  const diagram = page.getByTestId('diagram');
  await page.getByTestId('rf__node-n_intro').click();
  await diagram.focus();
  await page.keyboard.press('x');
  await page.getByTestId('image-scope-selection').check();
  await page.getByTestId('image-title').uncheck();
  await page.getByTestId('image-scope-selection').focus();
  await exportWithEnter(page);

  // Sauvegarde automatique (IndexedDB) faite avec les derniers choix, puis rechargement.
  await expect.poll(() => page.evaluate(() => new Promise<string>((done) => {
    const req = indexedDB.open('editeur-questionnaires');
    req.onerror = () => done('');
    req.onsuccess = () => {
      try {
        const get = req.result.transaction('etat').objectStore('etat').get('session');
        get.onsuccess = () => done(JSON.stringify(get.result?.imageOptions ?? null));
        get.onerror = () => done('');
      } catch {
        done('');
      }
    };
  }))).toBe(JSON.stringify({ scope: 'selection', title: false }));
  await page.reload();
  await expect(page.locator('.react-flow__node')).toHaveCount(21);
  await page.getByTestId('rf__node-n_intro').click();
  await diagram.focus();
  await page.keyboard.press('x');
  await expect(page.getByTestId('image-dialog')).toBeVisible();
  await expect(page.getByTestId('image-scope-selection')).toBeChecked();
  await expect(page.getByTestId('image-title')).not.toBeChecked();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
