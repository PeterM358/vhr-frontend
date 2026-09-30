/**
 * Authenticated shop / service-center smoke (storage: e2e/.auth/shop.json).
 *
 * Requires E2E_SHOP_EMAIL + E2E_SHOP_PASSWORD in .env.e2e.
 */

const { test, expect } = require('@playwright/test');
const { roles } = require('./helpers/env');
const { expectAppShell } = require('./helpers/auth');

test.describe('Partner smoke (shop)', () => {
  test.skip(!roles.shop.hasCreds, 'Set E2E_SHOP_EMAIL and E2E_SHOP_PASSWORD in .env.e2e');

  test('partner dashboard / home after session', async ({ page }) => {
    await page.goto('/partner', { waitUntil: 'domcontentloaded' });
    await expectAppShell(page, { minChars: 40 });
    await expect(page).not.toHaveURL(/\/login\/?$/);
  });

  test('Calendar loads', async ({ page }) => {
    await page.goto('/partner/calendar', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await expectAppShell(page, { minChars: 40 });
    const body = await page.locator('body').innerText();
    expect(
      /calendar|календар|today|днес|week|седмиц|day|ден|month|месец/i.test(body),
    ).toBeTruthy();
  });

  test('Notifications list loads', async ({ page }) => {
    await page.goto('/partner/notifications', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await expectAppShell(page);
    await expect(
      page
        .getByText(/notification|известия|няма известия|no notifications|activity/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('Clients CRM screen loads', async ({ page }) => {
    await page.goto('/partner/clients', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await expectAppShell(page);

    await expect(
      page.getByText(/add client|добави клиент/i).filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      page
        .getByText(/clients in your crm|клиент.*(crm|ваши)|no clients|няма клиенти|vehicle access|достъп до автомобил/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('Invoicing screen loads with readable section tabs', async ({ page }) => {
    await page.goto('/partner/invoicing', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await expectAppShell(page);

    const invoicesTab = page.getByText(/invoices|фактури/i).filter({ visible: true }).first();
    const uninvoicedTab = page.getByText(/uninvoiced|нефактуриран/i).filter({ visible: true }).first();
    await expect(invoicesTab).toBeVisible({ timeout: 20_000 });
    await expect(uninvoicedTab).toBeVisible({ timeout: 20_000 });

    const color = await invoicesTab.evaluate((el) => window.getComputedStyle(el).color);
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color || '');
    if (m) {
      const [, r, g, b] = m.map(Number);
      expect(
        r > 40 || g > 40 || b > 40,
        `Invoicing tab text too dark for dark background: ${color}`,
      ).toBeTruthy();
    }
  });

  test('Promotions list loads', async ({ page }) => {
    await page.goto('/partner/promotions', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });
    await expectAppShell(page);

    await expect(
      page
        .getByText(/create promotion|създай промоция|new promotion|нова промоция/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test('Create promotion wizard opens with readable cards', async ({ page }) => {
    await page.goto('/partner/promotions', { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 20_000 });

    await page
      .getByText(/create promotion|създай промоция|new promotion|нова промоция/i)
      .filter({ visible: true })
      .first()
      .click();

    await expect(
      page
        .getByText(/promotion details|детайли за промоци|basics|основни/i)
        .filter({ visible: true })
        .first(),
    ).toBeVisible({ timeout: 20_000 });

    await expect(
      page.locator('input:not([type="password"])').filter({ visible: true }).first(),
    ).toBeVisible({ timeout: 15_000 });
  });
});
