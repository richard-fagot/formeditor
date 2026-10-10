import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/smoke',
  timeout: 30_000,
  reporter: 'line',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
});
