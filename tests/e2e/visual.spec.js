// Diff di screenshot dentro la stessa run: la home deve restare identica a se
// stessa dopo un reload e cambiare quando si apre una finestra.
// Le animazioni sono spente via CSS, così il confronto è deterministico anche
// su sistemi operativi diversi (nessuna baseline da mantenere).
const { test, expect } = require('@playwright/test');

const noMotion = { content: '*,*::before,*::after{animation:none !important;transition:none !important}' };

async function still(page) {
  await page.evaluate(() => (document.fonts ? document.fonts.ready : null));
  await page.addStyleTag(noMotion);
  await page.waitForTimeout(150);
  return page.screenshot();
}

test('home is stable across reloads', async ({ page }) => {
  await page.goto('/index.html');
  const first = await still(page);
  await page.reload();
  const second = await still(page);
  expect(first.equals(second)).toBe(true);
});

test('dialog changes the screen', async ({ page }) => {
  await page.goto('/index.html');
  const home = await still(page);
  await page.locator('#set').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const dialog = await still(page);
  expect(home.equals(dialog)).toBe(false);
});
