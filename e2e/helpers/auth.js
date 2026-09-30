const { expect } = require('@playwright/test');

/**
 * Email/password login on /login (RN-web Paper fields).
 */
async function loginWithPassword(page, { email, password } = {}) {
  if (!email || !password) {
    throw new Error('email and password are required for login');
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 20_000 });

  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);

  const submit = page
    .getByRole('button', { name: /sign in|log in|continue|вход/i })
    .first();
  await submit.click();

  await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 45_000 });
  await expect(page.locator('body')).toBeVisible();
}

/**
 * Soft check that page body has meaningful content (not a blank crash).
 */
async function expectAppShell(page, { minChars = 20 } = {}) {
  await expect(page.locator('body')).toBeVisible();
  const text = await page.locator('body').innerText();
  expect(text.length).toBeGreaterThan(minChars);
}

/**
 * Wait out the branded boot spinner (RN-web ActivityIndicator / progressbar).
 */
async function waitForAppReady(page, { timeout = 30_000 } = {}) {
  const spinner = page.getByRole('progressbar');
  try {
    await spinner.first().waitFor({ state: 'visible', timeout: 3_000 });
  } catch {
    // no spinner appeared — already ready
    return;
  }
  await spinner.first().waitFor({ state: 'hidden', timeout });
}

/**
 * Persist empty storage so dependent projects can still start when a role is missing.
 */
function writeEmptyAuth(authFile) {
  const fs = require('fs');
  const path = require('path');
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(authFile, JSON.stringify({ cookies: [], origins: [] }), 'utf8');
}

module.exports = { loginWithPassword, expectAppShell, waitForAppReady, writeEmptyAuth };
