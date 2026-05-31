import { test, expect } from '@playwright/test';

test('formulaire de contact : envoi → confirmation', async ({ page }) => {
  await page.goto('/contact');
  await page.fill('#cf-name', 'E2E Test');
  await page.fill('#cf-email', 'e2e@example.com');
  await page.fill('#cf-message', 'Message de test automatisé (e2e).');
  await page.getByRole('button', { name: /Envoyer le message/ }).click();
  await expect(page.getByText('Message envoyé')).toBeVisible();
});
