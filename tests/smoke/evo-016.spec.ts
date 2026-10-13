import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const appUrl = pathToFileURL(resolve('dist/index.html')).href;

async function open(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => void d.accept());
  await page.goto(appUrl);
  await expect(page.getByTestId('app-title')).toBeAttached();
  return errors;
}

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

const fr = (s: string) => ({ fr: s });
const marqueNode = (bundleText: string) =>
  JSON.parse(bundleText).questionnaires[0].nodes.find((n: { id: string }) => n.id === 'n_marque');

/** Exemple du besoin : Q1 marques possédées (choix multiple), Q2 marque principale (texte), Q3 rappel de Q2. */
function withExample(bundleText: string): string {
  const bundle = JSON.parse(bundleText);
  const q = bundle.questionnaires[0];
  q.start = 'n_marques';
  q.nodes = [
    { kind: 'question', id: 'n_marques', key: 'marques', label: fr('Marques de véhicules possédées'), type: 'multiple', other: {},
      // Valeurs distinctes des libellés, comme la saisie rapide (« Alfa Romeo » → `alfa_romeo`).
      options: ['Peugeot', 'Renault', 'Toyota', 'Alfa Romeo'].map((m) => ({ value: m.toLowerCase().replace(' ', '_'), label: fr(m) })) },
    { kind: 'question', id: 'n_marque', key: 'marque', label: fr('Marque du véhicule principal'), type: 'text', required: true },
    { kind: 'question', id: 'n_rappel', key: 'rappel', label: fr('Marque retenue : {marque}'), type: 'text' },
    { kind: 'end', id: 'n_fin', message: fr('Fin') },
  ];
  q.edges = [
    { id: 'e1', from: 'n_marques', to: 'n_marque' },
    { id: 'e2', from: 'n_marque', to: 'n_rappel' },
    { id: 'e3', from: 'n_rappel', to: 'n_fin' },
  ];
  return JSON.stringify(bundle);
}

test('EVO-016 : suggestions sur un champ texte (paramétrage, prévisualisation, saisie libre, export)', async ({ page }) => {
  const errors = await open(page);
  await importText(page, withExample(await exportText(page)));
  // Nœuds importés sans mise en page : on les écarte avant de les cliquer.
  await page.getByRole('button', { name: 'Mise en page automatique' }).click();
  const node = page.getByTestId('rf__node-n_marque');
  const indicator = node.getByTestId('suggestions-indicator');
  const editor = page.getByTestId('suggestions-editor');
  const option = page.getByRole('checkbox', { name: 'Suggestions' });

  // Sans l'option : texte simple, pas d'indicateur, rien d'exporté.
  await expect(indicator).toHaveCount(0);
  await node.click();
  await expect(option).not.toBeChecked();
  await expect(editor).toHaveCount(0);
  expect(marqueNode(await exportText(page))).not.toHaveProperty('suggestions');

  // Cocher : le champ « Expression des suggestions » apparaît ; indicateur sur le nœud.
  await option.check();
  await expect(editor).toContainText('Expression des suggestions');
  await expect(indicator).toBeVisible();
  await editor.locator('.cm-content').click();
  await page.keyboard.type('marques');
  await expect.poll(async () => marqueNode(await exportText(page)).suggestions).toBe('marques');

  const preview = page.getByTestId('preview');
  const next = page.getByTestId('preview-next');
  const prev = page.getByRole('button', { name: 'Précédent' });
  const list = preview.getByRole('listbox');
  const field = preview.getByRole('combobox');
  await page.getByTestId('view-preview').click();
  await page.getByRole('button', { name: 'Débogage' }).click();
  const debug = page.getByTestId('debug-panel');

  // Q1 = {Peugeot, Toyota} : au focus de Q2, « Peugeot » et « Toyota » sont proposés (pas « Renault »).
  await preview.getByText('Peugeot').click();
  await preview.getByText('Toyota').click();
  await next.click();
  await expect(list).toHaveCount(0);
  await field.focus();
  await expect(list.getByRole('option')).toHaveText(['Peugeot', 'Toyota']);

  // La frappe filtre (contient, casse ignorée) ; choix au clavier.
  await page.keyboard.type('toy');
  await expect(list.getByRole('option')).toHaveText(['Toyota']);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(field).toHaveValue('Toyota');
  await expect(list).toHaveCount(0);
  await expect(debug).toContainText('"marque": "Toyota"');

  // Saisie hors liste : acceptée telle quelle ; une expression qui référence Q2 renvoie le texte saisi.
  await field.fill('Dacia');
  await expect(list).toHaveCount(0);
  await next.click();
  await expect(preview.getByRole('alert')).toHaveCount(0);
  await expect(preview).toContainText('Marque retenue : Dacia');
  await expect(debug).toContainText('"marque": "Dacia"');

  // Q1 modifiée puis retour sur Q2 : les suggestions suivent la nouvelle réponse ; choix à la souris.
  await prev.click();
  await prev.click();
  await preview.getByText('Peugeot').click();
  await preview.getByText('Alfa Romeo').click();
  await next.click();
  await field.fill('');
  // Ordre de l'expression : celui de la réponse (Toyota restée cochée, Alfa Romeo ajoutée ensuite) ; libellés, pas valeurs.
  await expect(list.getByRole('option')).toHaveText(['Toyota', 'Alfa Romeo']);
  await list.getByRole('option', { name: 'Alfa Romeo' }).click();
  await expect(field).toHaveValue('Alfa Romeo');
  await expect(field).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(list).toHaveCount(0);

  // Expression vide ou non renseignée : aucune suggestion, champ saisissable.
  await page.getByTestId('view-diagram').click();
  await node.click();
  await editor.locator('.cm-content').click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type('absente_inconnue');
  await page.getByTestId('view-preview').click();
  await expect(preview).toContainText('Marque du véhicule principal');
  await preview.getByRole('textbox').fill('Dacia');
  await expect(preview.getByRole('textbox')).toHaveValue('Dacia');
  await expect(list).toHaveCount(0);

  // Décocher : texte simple, expression ni utilisée ni exportée.
  await page.getByTestId('view-diagram').click();
  await node.click();
  await option.uncheck();
  await expect(editor).toHaveCount(0);
  await expect(indicator).toHaveCount(0);
  expect(marqueNode(await exportText(page))).not.toHaveProperty('suggestions');
  await page.getByTestId('view-preview').click();
  await expect(preview.getByRole('combobox')).toHaveCount(0);
  expect(errors).toEqual([]);
});
