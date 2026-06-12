import { test, expect } from '@playwright/test';

test('admin : connexion par mot de passe → tableau de bord', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('#u', 'admin@foxugly.com');
  await page.fill('#p', 'admin12345');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible();
});

test('admin : route protégée → redirection vers login', async ({ page }) => {
  await page.goto('/admin/pages');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('admin : magic-link → message de confirmation (anti-énumération)', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('#me', 'admin@foxugly.com');
  await page.getByRole('button', { name: /Recevoir un lien magique/ }).click();
  await expect(page.getByText(/lien de connexion vient d'être envoyé/)).toBeVisible();
});
