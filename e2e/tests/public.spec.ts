import { test, expect } from '@playwright/test';

test('accueil : rendu piloté par l’API (hero + highlight + formulaire contact)', async ({ page }) => {
  await page.goto('/accueil');
  await expect(page).toHaveTitle(/foxugly/);
  // Le highlight vert du hero vient de content.highlight.
  await expect(page.locator('.hero .hl')).toContainText('agiles pour de vrai');
  // La section #contact rend le formulaire (block_type contact_form).
  await expect(page.locator('#contact .form-card')).toBeVisible();
});

test('navigation entre pages /:slug', async ({ page }) => {
  await page.goto('/accueil');
  await page.getByRole('link', { name: 'Agilité' }).first().click();
  await expect(page).toHaveURL(/\/agilite/);
  await expect(page.locator('.page-hero h1')).toBeVisible();
});
