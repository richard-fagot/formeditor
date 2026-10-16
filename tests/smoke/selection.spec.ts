import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// Un changement de sélection ne doit jamais masquer les nœuds du logigramme (pas de `visibility: hidden`).
const appUrl = pathToFileURL(resolve('dist/index.html')).href;

async function openExample(page: Page) {
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('exemple');
  await page.keyboard.press('Enter');
  await expect(page.locator('.react-flow__node')).toHaveCount(21);
  await expect(page.locator('.react-flow__node[style*="visibility: hidden"]')).toHaveCount(0);
}

/** Observe le logigramme et compte les nœuds vus masqués, à chaque mutation et à chaque image. */
async function watchHidden(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __hidden: number; __stopHidden?: () => void };
    w.__hidden = 0;
    const root = document.querySelector('[data-testid=diagram]')!;
    const check = () => {
      if (root.querySelector('.react-flow__node[style*="visibility: hidden"]')) w.__hidden++;
    };
    const obs = new MutationObserver(check);
    obs.observe(root, { subtree: true, attributes: true, attributeFilter: ['style'], childList: true });
    let on = true;
    const tick = () => { check(); if (on) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    w.__stopHidden = () => { on = false; obs.disconnect(); };
  });
}

async function hiddenSeen(page: Page) {
  // Quelques images après le changement, le temps que React Flow traite les nœuds.
  await page.evaluate(() => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 100)))));
  return page.evaluate(() => {
    const w = window as unknown as { __hidden: number; __stopHidden: () => void };
    w.__stopHidden();
    return w.__hidden;
  });
}

test('changer la sélection à la souris ne masque aucun nœud', async ({ page }) => {
  await openExample(page);
  const nodes = page.locator('.react-flow__node');
  for (const i of [0, 3, 5]) {
    await watchHidden(page);
    await nodes.nth(i).click();
    await expect(nodes.nth(i)).toHaveClass(/selected/);
    expect(await hiddenSeen(page)).toBe(0);
  }
  await watchHidden(page);
  await page.getByTestId('diagram').click({ position: { x: 10, y: 10 } });
  expect(await hiddenSeen(page)).toBe(0);
});

test('changer la sélection au clavier ne masque aucun nœud', async ({ page }) => {
  await openExample(page);
  await page.getByTestId('diagram').click({ position: { x: 10, y: 10 } });
  for (const key of ['ArrowDown', 'ArrowDown', 'ArrowUp']) {
    await watchHidden(page);
    await page.keyboard.press(key);
    await expect(page.locator('.react-flow__node.selected')).toHaveCount(1);
    expect(await hiddenSeen(page)).toBe(0);
  }
});
