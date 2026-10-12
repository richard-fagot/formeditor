import { defineConfig, devices } from '@playwright/test';

// Navigateurs lancés avec une locale UTF-8 disponible dans le conteneur (C.UTF-8) : sinon Chromium remplace
// un nom de fichier téléchargé contenant des accents par « download » (EVO-004).
const launchOptions = { env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } as Record<string, string> };

export default defineConfig({
  testDir: 'tests/smoke',
  timeout: 30_000,
  reporter: 'line',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], launchOptions } },
  ],
});
