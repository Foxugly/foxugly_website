import { defineConfig, devices } from '@playwright/test';

/**
 * Tests e2e du site foxugly. Suppose les serveurs dev lancés :
 *   - frontend Angular sur http://localhost:4200 (proxy /api → backend 8001)
 *   - backend Django sur 127.0.0.1:8001
 * Surcharger la cible via E2E_BASE_URL (p.ex. https://foxugly.com pour la prod).
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:4200',
    headless: true,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
