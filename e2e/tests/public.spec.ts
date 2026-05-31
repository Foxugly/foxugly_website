import { test, expect } from '@playwright/test';

test('accueil : rendu piloté par l’API (hero + highlight + cartes flottantes)', async ({ page }) => {
  await page.goto('/accueil');
  await expect(page).toHaveTitle(/foxugly/);
  // Le highlight vert du hero vient de content.highlight.
  await expect(page.locator('.hero .hl')).toContainText('agiles pour de vrai');
  // Les cartes flottantes (content.cards) sont rendues.
  await expect(page.locator('.hero .float-card').first()).toBeVisible();
});

test('page /contact : formulaire + coordonnées', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.locator('.form-card')).toBeVisible();          // formulaire
  await expect(page.locator('.contact-info-grid')).toBeVisible();  // coordonnées (réglages)
});

test('navigation entre pages /:slug', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('link', { name: 'Agilité' }).first().click();
  await expect(page).toHaveURL(/\/agilite/);
  await expect(page.locator('.page-hero h1')).toBeVisible();
});
