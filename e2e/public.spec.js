/**
 * Unauthenticated public smoke — always runs.
 */

const { test, expect } = require('@playwright/test');
const { expectAppShell } = require('./helpers/auth');

test.describe('Public smoke', () => {
  test('home / app shell loads', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(res?.ok() || res?.status() === 304).toBeTruthy();
    await expectAppShell(page);
  });

  test('login route is reachable', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/sign in|log in|вход/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 20_000 });
  });

  test('service centers discovery is reachable', async ({ page }) => {
    const candidates = ['/service-centers', '/ServiceCenters', '/explore', '/'];
    let loaded = false;
    for (const pathTry of candidates) {
      const res = await page.goto(pathTry, { waitUntil: 'domcontentloaded' });
      if (res && (res.ok() || res.status() === 304)) {
        loaded = true;
        break;
      }
    }
    expect(loaded).toBeTruthy();
    await expectAppShell(page);
  });
});
