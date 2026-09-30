/**
 * Playwright config — smoke against live www.veversal.com (manual for now).
 *
 * First time on this machine:
 *   npx playwright install chromium
 *
 * Run:
 *   npm run test:e2e
 * Logs land in e2e/logs/
 */

const path = require('path');
const fs = require('fs');

const logsDir = path.join(__dirname, 'e2e', 'logs');
fs.mkdirSync(logsDir, { recursive: true });

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
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
};
