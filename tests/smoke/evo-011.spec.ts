import { test, expect, type Locator, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('exemple');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('rf__node-n_type')).toBeVisible();
  return errors;
}

/** Côté de la question d'où part la branche : départ du tracé à droite de son arrivée = côté gauche. */
async function side(page: Page, node: string) {
  const d = (await page.locator(`[data-id="comment:${node}:edge"] path`).first().getAttribute('d'))!;
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
  return nums[0]! > nums[nums.length - 2]! ? 'left' : 'right';
}

/** Textes des réponses d'un fil, dans l'ordre. */
const replies = (thread: Locator) => thread.getByTestId('comment-reply').locator('textarea').evaluateAll((els) => els.map((e) => (e as HTMLTextAreaElement).value));

const commentNode = (page: Page, node: string): Locator => page.getByTestId(`rf__node-comment:${node}`);

test('EVO-011 : commenter, répondre, modifier, supprimer, afficher / masquer, branche gauche / droite', async ({ page }) => {
  const errors = await open(page);
  // Commentaire de l'exemple, masqué à l'ouverture ; l'icône l'affiche puis le masque.
  const icon = page.getByTestId('rf__node-n_date').getByTestId('comment-icon');
  await expect(commentNode(page, 'n_date')).toHaveCount(0);
  await icon.click();
  await expect(commentNode(page, 'n_date')).toContainText('Faut-il borner');
  await expect(commentNode(page, 'n_date').getByTestId('comment-reply')).toHaveCount(2);
  expect(await side(page, 'n_date')).toBe('left');
  await icon.click();
  await expect(commentNode(page, 'n_date')).toHaveCount(0);
  // Icône de masquage du nœud : l'icône de la question reste.
  await icon.click();
  await commentNode(page, 'n_date').getByTestId('comment-hide').click();
  await expect(commentNode(page, 'n_date')).toHaveCount(0);
  await expect(icon).toBeVisible();

  // Clic droit > Commenter : nœud créé à droite, texte initial en saisie.
  await page.getByTestId('rf__node-n_type').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Commenter' }).click();
  const c = commentNode(page, 'n_type');
  await expect(c).toBeVisible();
  await expect(c.getByLabel('Commentaire', { exact: true })).toBeFocused();
  await page.keyboard.type('Liste complète ?');
  expect(await side(page, 'n_type')).toBe('right');
  for (const text of ['un', 'deux', 'trois']) {
    await c.getByTestId('comment-reply-add').click();
    await page.keyboard.type(text);
  }
  await expect.poll(() => replies(c)).toEqual(['un', 'deux', 'trois']);
  // Commenter à nouveau : pas de second commentaire.
  await page.getByTestId('rf__node-n_type').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Commenter' }).click();
  await expect(page.locator('[data-testid^="rf__node-comment:"]')).toHaveCount(1);
  // Supprimer une réponse.
  await c.getByTestId('comment-delete-reply').nth(1).click();
  await expect.poll(() => replies(c)).toEqual(['un', 'trois']);

  // Déplacer le commentaire de l'autre côté : la branche part de la gauche.
  const q = (await page.getByTestId('rf__node-n_type').boundingBox())!;
  const header = c.getByText('Commentaire', { exact: true });
  const h = (await header.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(q.x - 200, h.y + h.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => side(page, 'n_type')).toBe('left');

  // Afficher / masquer tout.
  await page.getByTestId('toggle-comments').click();
  await expect(page.locator('[data-testid^="rf__node-comment:"]')).toHaveCount(2);
  await page.getByTestId('toggle-comments').click();
  await expect(page.locator('[data-testid^="rf__node-comment:"]')).toHaveCount(0);
  await page.getByTestId('toggle-comments').click();

  // Prévisualisation : aucun commentaire.
  await page.getByTestId('view-preview').click();
  await expect(page.getByText('Faut-il borner')).toHaveCount(0);
  await expect(page.getByTestId('comment-thread')).toHaveCount(0);
  await page.getByTestId('view-diagram').click();

  // Supprimer le commentaire : nœud et icône disparaissent.
  await commentNode(page, 'n_type').getByTestId('comment-delete').click();
  await expect(commentNode(page, 'n_type')).toHaveCount(0);
  await expect(page.getByTestId('rf__node-n_type').getByTestId('comment-icon')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('EVO-011 : fragment, question réutilisable, page des commentaires, suppression d’une question commentée', async ({ page }) => {
  const errors = await open(page);
  // Question réutilisable : clic droit dans la liste de la bibliothèque.
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('Bibliothèque');
  await page.keyboard.press('Enter');
  await page.getByTestId('library-entry').filter({ hasText: 'telephone' }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Commenter' }).click();
  await expect(page.getByTestId('library-question').getByLabel('Commentaire', { exact: true })).toBeFocused();
  await page.keyboard.type('Format international ?');

  // Question d'un fragment.
  await page.getByTestId('library-entry').filter({ hasText: 'identification_assure' }).click();
  await expect(page.getByTestId('fragment-view')).toBeVisible();
  await page.getByTestId('rf__node-fn_nom').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Commenter' }).click();
  await expect(commentNode(page, 'fn_nom').getByLabel('Commentaire', { exact: true })).toBeFocused();
  await page.keyboard.type('Nom de naissance ?');

  // Page des commentaires : tous, avec objet et question ; édition visible dans le logigramme.
  await page.getByTestId('open-comments').click();
  const entries = page.getByTestId('comments-entry');
  await expect(entries).toHaveCount(3);
  await expect(entries.nth(0).getByTestId('comments-object')).toHaveText('Déclaration de sinistre');
  await expect(entries.nth(0).getByTestId('comments-question')).toContainText('date_sinistre');
  await expect(entries.nth(1)).toContainText('Nom de naissance ?');
  await expect(entries.nth(2)).toContainText('telephone');
  await entries.nth(0).getByTestId('comment-reply-add').click();
  await page.keyboard.type('Vu en revue.');
  await entries.nth(0).getByTestId('comment-delete-reply').first().click();
  await entries.nth(0).getByTestId('comments-open').click();
  await expect(page.getByRole('tab', { name: /Déclaration de sinistre/ })).toHaveAttribute('aria-selected', 'true');
  const c = commentNode(page, 'n_date');
  await expect(c).toBeInViewport();
  await expect.poll(() => replies(c)).toEqual(['Et pas avant la date d\'effet du contrat.', 'Vu en revue.']);

  // Supprimer la question commentée : confirmation, commentaire supprimé avec elle.
  let asked = '';
  page.once('dialog', (d) => { asked = d.message(); void d.accept(); });
  await page.getByTestId('rf__node-n_date').click();
  await page.keyboard.press('Delete');
  expect(asked).toContain('commentaire');
  await expect(page.getByTestId('rf__node-n_date')).toHaveCount(0);
  await expect(commentNode(page, 'n_date')).toHaveCount(0);
  await page.getByRole('tab', { name: /Commentaires/ }).click();
  await expect(page.getByTestId('comments-entry')).toHaveCount(2);
  expect(errors).toEqual([]);
});
