/**
 * Authenticated private-client smoke (storage: e2e/.auth/client.json).
 *
 * Requires E2E_CLIENT_EMAIL + E2E_CLIENT_PASSWORD in .env.e2e.
 */

const { test, expect } = require('@playwright/test');
const { roles } = require('./helpers/env');
const { expectAppShell, waitForAppReady } = require('./helpers/auth');

test.describe('Client smoke', () => {
  test.skip(!roles.client.hasCreds, 'Set E2E_CLIENT_EMAIL and E2E_CLIENT_PASSWORD in .env.e2e');

  test('dashboard / garage loads', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await waitForAppReady(page);
    await expectAppShell(page, { minChars: 40 });
  });

  test('vehicles list loads', async ({ page }) => {
    await page.goto('/dashboard/vehicles', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await waitForAppReady(page);
    await expectAppShell(page);

    const body = await page.locator('body').innerText();
    expect(
      /vehicle|автомобил|garage|гараж|add vehicle|добав|my cars|коли|no vehicles|няма/i.test(body),
    ).toBeTruthy();
  });

  test('notifications / activity loads', async ({ page }) => {
    await page.goto('/dashboard/notifications', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await waitForAppReady(page);
    await expectAppShell(page);

    await expect(
      page
        .getByText(/notification|известия|activity|активност|no notifications|няма/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
