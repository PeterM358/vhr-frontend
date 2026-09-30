/**
 * Authenticated organization smoke (storage: e2e/.auth/org.json).
 *
 * Requires E2E_ORG_EMAIL + E2E_ORG_PASSWORD in .env.e2e.
 * Soft assertions: if a route redirects away (no org entitlement), we still
 * require authenticated shell (not bounced to /login).
 */

const { test, expect } = require('@playwright/test');
const { roles } = require('./helpers/env');
const { expectAppShell } = require('./helpers/auth');

test.describe('Org smoke', () => {
  test.skip(!roles.org.hasCreds, 'Set E2E_ORG_EMAIL and E2E_ORG_PASSWORD in .env.e2e');

  test('org home stays authenticated', async ({ page }) => {
    await page.goto('/partner/organization', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await expectAppShell(page, { minChars: 40 });
  });

  test('fleet surface loads or redirects without crash', async ({ page }) => {
    await page.goto('/partner/organization/fleet', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await expectAppShell(page, { minChars: 40 });
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(40);
  });

  test('accounting surface loads or redirects without crash', async ({ page }) => {
    await page.goto('/partner/organization/accounting', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await expectAppShell(page, { minChars: 40 });
    const body = await page.locator('body').innerText();
    // Prefer seeing accounting chrome when entitled; otherwise any non-crash shell is OK
    expect(
      /accounting|счетовод|ledger|главна книга|fleet|автопарк|organization|организац|dashboard|табло/i.test(
        body,
      ),
    ).toBeTruthy();
  });

  test('org calendar loads or redirects without crash', async ({ page }) => {
    await page.goto('/partner/organization/calendar', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await expectAppShell(page, { minChars: 40 });
  });
});
