import { existsSync } from 'node:fs';
import { chromium, defineConfig, devices, firefox } from '@playwright/test';

// Navigateurs lancés avec une locale UTF-8 disponible dans le conteneur (C.UTF-8) : sinon Chromium remplace
// un nom de fichier téléchargé contenant des accents par « download » (EVO-004).
const launchOptions = { env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } as Record<string, string> };

// Conteneur sans accès au téléchargement des navigateurs (voir DECISIONS.md) : Chromium se rabat sur le
// binaire préinstallé, et le projet Firefox n'est lancé que si Firefox est installé.
const chromiumFallback = '/opt/pw-browsers/chromium';
const chromiumLaunch =
  !existsSync(chromium.executablePath()) && existsSync(chromiumFallback)
    ? { ...launchOptions, executablePath: chromiumFallback }
    : launchOptions;
const withFirefox = existsSync(firefox.executablePath());
if (!withFirefox) console.warn('Playwright : Firefox non installé, tests de fumée limités à Chromium.');

export default defineConfig({
  testDir: 'tests/smoke',
  timeout: 30_000,
  reporter: 'line',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: chromiumLaunch } },
    ...(withFirefox ? [{ name: 'firefox', use: { ...devices['Desktop Firefox'], launchOptions } }] : []),
  ],
});
