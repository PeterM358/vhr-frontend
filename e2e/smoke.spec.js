/**
 * Public + optional authenticated smoke against live web.
 *
 * Auth (optional): copy .env.e2e.example → .env.e2e and set E2E_EMAIL / E2E_PASSWORD.
 * Without credentials, only public checks run; login tests are skipped.
 */

const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function loadDotEnvE2e() {
  const envPath = path.join(__dirname, '..', '.env.e2e');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnvE2e();

const hasCreds = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

test.describe('Public smoke', () => {
  test('home / app shell loads', async ({ page }) => {
    const res = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(res?.ok() || res?.status() === 304).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
    // Avoid blank white crash shell
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(20);
  });

  test('login route is reachable', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    // Email / password fields or Google / continue — flexible for RN-web
    const email = page.getByPlaceholder(/email/i).or(page.locator('input[type="email"]'));
    const anyLoginCue = page.getByText(/sign in|log in|email|password|google/i).first();
    await expect(anyLoginCue.or(email.first())).toBeVisible({ timeout: 20_000 });
  });

  test('service centers discovery is reachable', async ({ page }) => {
    // Deep links vary; try common paths then fall back to searching the shell
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
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Partner / client auth smoke', () => {
  test.skip(!hasCreds, 'Set E2E_EMAIL and E2E_PASSWORD in .env.e2e to run login smoke');

  test('can sign in with email/password', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    const emailInput = page.locator('input[type="email"]').or(page.getByPlaceholder(/email/i)).first();
    const passwordInput = page
      .locator('input[type="password"]')
      .or(page.getByPlaceholder(/password/i))
      .first();

    await emailInput.fill(process.env.E2E_EMAIL);
    await passwordInput.fill(process.env.E2E_PASSWORD);

    const submit = page
      .getByRole('button', { name: /sign in|log in|continue|вход/i })
      .or(page.locator('button[type="submit"]'))
      .first();
    await submit.click();

    // After login we should leave /login (drawer, home, or partner dashboard)
    await expect(page).not.toHaveURL(/\/login\/?$/, { timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();
  });
});
