/**
 * Playwright — multi-role smoke against live www.veversal.com.
 *
 * .env.e2e roles:
 *   E2E_SHOP_*   → partner / service center
 *   E2E_CLIENT_* → private client garage
 *   E2E_ORG_*    → organization fleet / accounting
 */

const path = require('path');
const fs = require('fs');
const { roles } = require('./e2e/helpers/env');

const logsDir = path.join(__dirname, 'e2e', 'logs');
fs.mkdirSync(logsDir, { recursive: true });
// Ensure auth dir + empty files exist so storageState paths resolve before setup runs
fs.mkdirSync(path.dirname(roles.shop.authFile), { recursive: true });
for (const role of Object.values(roles)) {
  if (!fs.existsSync(role.authFile)) {
    fs.writeFileSync(role.authFile, JSON.stringify({ cookies: [], origins: [] }), 'utf8');
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const logFile = path.join(logsDir, `smoke-${stamp}.log`);

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e/playwright-report', open: 'never' }],
    ['./e2e/reporters/file-log.js', { outputFile: logFile }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'https://www.veversal.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
  },
  outputDir: 'e2e/test-results',
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'public',
      testMatch: /public\.spec\.js/,
      use: { browserName: 'chromium' },
    },
    {
      name: 'partner',
      testMatch: /partner\.spec\.js/,
      dependencies: ['setup'],
      use: {
        browserName: 'chromium',
        storageState: roles.shop.authFile,
      },
    },
    {
      name: 'client',
      testMatch: /client\.spec\.js/,
      dependencies: ['setup'],
      use: {
        browserName: 'chromium',
        storageState: roles.client.authFile,
      },
    },
    {
      name: 'org',
      testMatch: /org\.spec\.js/,
      dependencies: ['setup'],
      use: {
        browserName: 'chromium',
        storageState: roles.org.authFile,
      },
    },
  ],
};
