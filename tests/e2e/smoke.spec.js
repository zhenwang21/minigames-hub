// Fumo browser: home, sfida del giorno, impostazioni e dialoghi senza errori JS.
const { test, expect } = require('@playwright/test');

test('home, daily challenge and settings', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/index.html');
  await expect(page).toHaveTitle(/Minigames Hub/);
  await expect(page.getByRole('heading', { name: 'Scegli il gioco' })).toBeVisible();
  await expect(page.getByText('Sfida del giorno')).toBeVisible();

  await page.locator('#set').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Statistiche')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByText('Modalità mix').click();
  await expect(page.locator('#start-btn')).toBeVisible();
  expect(errors).toEqual([]);
});
