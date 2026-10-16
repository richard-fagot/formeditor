import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { importExample } from './support/example';

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

/** Exemple du besoin : nom obligatoire, âge 18 à 99, situation obligatoire → conjoint si « Marié(e) », sinon fin. */
function withExample(bundleText: string): string {
  const bundle = JSON.parse(bundleText);
  const q = bundle.questionnaires[0];
  q.start = 'n_nom';
  q.nodes = [
    { kind: 'question', id: 'n_nom', key: 'nom', label: fr('Nom'), type: 'text', required: true },
    { kind: 'question', id: 'n_age', key: 'age', label: fr('Âge'), type: 'number', numberKind: 'integer', min: 18, max: 99 },
    { kind: 'question', id: 'n_sit', key: 'situation', label: fr('Situation familiale'), type: 'single', required: true,
      options: [{ value: 'marie', label: fr('Marié(e)') }, { value: 'celib', label: fr('Célibataire') }] },
    { kind: 'question', id: 'n_conj', key: 'conjoint', label: fr('Conjoint'), type: 'text' },
    { kind: 'end', id: 'n_fin', message: fr('Étape 4') },
    { kind: 'end', id: 'n_long', message: fr('Nom long') },
  ];
  q.edges = [
    // Non évaluable sur une réponse vide ou invalide : fausse.
    { id: 'e0', from: 'n_nom', to: 'n_long', when: '$length(nom) > 50 and $number(nom) > 0' },
    { id: 'e1', from: 'n_nom', to: 'n_age' },
    { id: 'e2', from: 'n_age', to: 'n_sit' },
    { id: 'e3', from: 'n_sit', to: 'n_conj', when: "situation = 'marie'" },
    { id: 'e4', from: 'n_sit', to: 'n_fin' },
    { id: 'e5', from: 'n_conj', to: 'n_fin' },
  ];
  return JSON.stringify(bundle);
}

test('EVO-014 : contrôles de saisie désactivables en prévisualisation, conditions toujours appliquées', async ({ page }) => {
  const errors = await open(page);
  await importText(page, withExample(await exportText(page)));
  const before = await exportText(page);

  const preview = page.getByTestId('preview');
  const next = page.getByTestId('preview-next');
  const prev = page.getByRole('button', { name: 'Précédent' });
  const toggle = page.getByTestId('preview.toggleChecks');
  const banner = page.getByTestId('preview-checks-off');
  await page.getByTestId('view-preview').click();

  // Première ouverture : activé, contrôles comme aujourd'hui.
  await expect(toggle).toHaveText('Contrôles de saisie');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(banner).toHaveCount(0);
  await expect(preview).toContainText('Nom');
  await next.click();
  await expect(preview.getByRole('alert')).toHaveCount(1);
  await expect(preview).toContainText('Nom');

  // Désactivé : bandeau, erreur effacée, champ obligatoire vide franchi sans message.
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(banner).toHaveText('Contrôles de saisie désactivés');
  await expect(preview.getByRole('alert')).toHaveCount(0);
  await next.click();
  await expect(preview).toContainText('Âge');
  await expect(preview.getByRole('alert')).toHaveCount(0);

  // Valeur hors bornes : on avance, elle reste affichée au retour.
  await preview.getByRole('textbox').fill('150');
  await next.click();
  await expect(preview).toContainText('Situation familiale');
  await prev.click();
  await expect(preview.getByRole('textbox')).toHaveValue('150');
  await next.click();

  // Question de branchement laissée vide : branche « sinon » (étape 4), sans erreur.
  await next.click();
  await expect(preview).toContainText('Étape 4');
  await expect(preview.getByRole('alert')).toHaveCount(0);

  // Fermer / rouvrir la prévisualisation : état conservé.
  await page.getByTestId('view-diagram').click();
  await page.getByTestId('view-preview').click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(banner).toBeVisible();

  // Réactivés sur une étape invalide : message et blocage ; bandeau disparu.
  await prev.click();
  await prev.click();
  await expect(preview.getByRole('textbox')).toHaveValue('150');
  await toggle.click();
  await expect(banner).toHaveCount(0);
  await expect(preview.getByRole('alert')).toHaveCount(0);
  await next.click();
  await expect(preview.getByRole('alert')).toHaveCount(1);
  await expect(preview.getByRole('textbox')).toHaveValue('150');

  // Fichier : aucune trace du toggle ; export / réimport identiques.
  await toggle.click();
  const after = await exportText(page);
  expect(after).toBe(before);
  expect(after).not.toMatch(/check/i);
  await importText(page, after);
  expect(await exportText(page)).toBe(after);

  // Changement de projet sans fermer l'éditeur : état conservé.
  await importExample(page);
  await page.getByTestId('view-preview').click();
  await expect(page.getByTestId('preview.toggleChecks')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
