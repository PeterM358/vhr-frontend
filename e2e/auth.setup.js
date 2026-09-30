/**
 * Role logins → e2e/.auth/{shop,client,org}.json
 *
 * Keys in .env.e2e:
 *   E2E_SHOP_EMAIL / E2E_SHOP_PASSWORD
 *   E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD
 *   E2E_ORG_EMAIL / E2E_ORG_PASSWORD
 */

const { test } = require('@playwright/test');
const fs = require('fs');
const { AUTH_DIR, roles } = require('./helpers/env');
const { loginWithPassword, writeEmptyAuth } = require('./helpers/auth');

test.describe('auth setup', () => {
  test.beforeAll(() => {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  });

  test('authenticate shop (service center)', async ({ page }) => {
    const role = roles.shop;
    if (!role.hasCreds) {
      writeEmptyAuth(role.authFile);
      test.skip(true, 'Set E2E_SHOP_EMAIL / E2E_SHOP_PASSWORD in .env.e2e');
      return;
    }
    await loginWithPassword(page, role);
    await page.context().storageState({ path: role.authFile });
  });

  test('authenticate client (vehicle owner)', async ({ page }) => {
    const role = roles.client;
    if (!role.hasCreds) {
      writeEmptyAuth(role.authFile);
      test.skip(true, 'Set E2E_CLIENT_EMAIL / E2E_CLIENT_PASSWORD in .env.e2e');
      return;
    }
    await loginWithPassword(page, role);
    await page.context().storageState({ path: role.authFile });
  });

  test('authenticate org (fleet / accounting)', async ({ page }) => {
    const role = roles.org;
    if (!role.hasCreds) {
      writeEmptyAuth(role.authFile);
      test.skip(true, 'Set E2E_ORG_EMAIL / E2E_ORG_PASSWORD in .env.e2e');
      return;
    }
    await loginWithPassword(page, role);
    await page.context().storageState({ path: role.authFile });
  });
});
