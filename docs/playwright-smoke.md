# Playwright smoke (manual)

**Target:** live web `https://www.veversal.com` (same stack you ship to).  
**Mode now:** run by hand → read a log file. Daily job later.

## What Playwright is (30 seconds)

Playwright launches a real browser (Chromium), opens your site, clicks/types, and asserts what it sees. Think of it as a scripted person on the web — not unit tests of React components.

| Term | Meaning |
|------|---------|
| **spec** | A test file (`e2e/smoke.spec.js`) |
| **page** | One browser tab |
| **locator** | How to find a button/input (`getByText`, `getByRole`, …) |
| **expect** | Assertion — fail the run if not true |
| **headed** | See the browser window (`--headed`) |
| **UI mode** | Interactive runner (`--ui`) |

## One-time setup

```bash
cd /Users/client/vhr-frontend
npm install          # already adds @playwright/test
npx playwright install chromium   # downloads the browser (~once per machine)
```

Optional login smoke:

```bash
cp .env.e2e.example .env.e2e
# edit E2E_EMAIL / E2E_PASSWORD (test account — not your only admin password)
```

## Run (manual)

```bash
npm run test:e2e              # headless, writes e2e/logs/smoke-….log
npm run test:e2e:headed       # watch the browser
npm run test:e2e:ui           # Playwright UI to pick/debug tests
```

After a run:

- **Log:** `e2e/logs/smoke-<timestamp>.log` — pass/fail lines  
- **HTML report:** `e2e/playwright-report/` → `npx playwright show-report e2e/playwright-report`  
- **Failures:** screenshots/video under `e2e/test-results/`

## What the smoke covers today

1. App shell loads on `/`  
2. `/login` is reachable  
3. Service-centers / explore path loads  
4. *(optional)* email/password login leaves `/login`

Expand later: Clients CRM, invoicing tabs contrast, create promotion wizard.

## Daily job (later)

Same command in GitHub Actions / Cursor Automation cron — keep the log artifact. Do not put real passwords in CI secrets until you have a dedicated E2E user.

## Form consistency note

E2E catches broken pages; it does **not** replace shared form chrome (`FloatingCard` / FormSection). Prefer fixing primitives so every screen inherits readable contrast.
