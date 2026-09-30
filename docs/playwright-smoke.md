# Playwright multi-role smoke (manual → pro)

**Target:** live web `https://www.veversal.com`.  
**Mode now:** run by hand → read a log file. Daily job later.

## Roles (how we tell users apart)

Credentials live only in **local** `.env.e2e` (gitignored). After login, sessions are saved under `e2e/.auth/` (also gitignored):

| Env keys | Auth file | Playwright project | Spec |
|----------|-----------|--------------------|------|
| `E2E_SHOP_EMAIL` / `E2E_SHOP_PASSWORD` | `e2e/.auth/shop.json` | `partner` | `partner.spec.js` |
| `E2E_CLIENT_EMAIL` / `E2E_CLIENT_PASSWORD` | `e2e/.auth/client.json` | `client` | `client.spec.js` |
| `E2E_ORG_EMAIL` / `E2E_ORG_PASSWORD` | `e2e/.auth/org.json` | `org` | `org.spec.js` |

Missing a role → that role’s tests **skip**; public smoke still runs.

Legacy `E2E_EMAIL` / `E2E_PASSWORD` still map to **shop** if the new keys are empty.

## Layout

```
e2e/
  helpers/env.js      # loads .env.e2e, roles + auth paths
  helpers/auth.js     # loginWithPassword, expectAppShell
  auth.setup.js       # 3 logins → shop/client/org.json
  public.spec.js
  partner.spec.js     # shop
  client.spec.js
  org.spec.js
  reporters/file-log.js
  logs/
  .auth/              # gitignored session dumps
```

## One-time setup

```bash
cd /Users/client/vhr-frontend
npm install
npx playwright install chromium

cp .env.e2e.example .env.e2e
# fill E2E_SHOP_* / E2E_CLIENT_* / E2E_ORG_* (dedicated test accounts)
```

## Run

```bash
npm run test:e2e
npm run test:e2e:headed
npm run test:e2e:ui

npx playwright test --project=public
npx playwright test --project=partner
npx playwright test --project=client
npx playwright test --project=org
```

After a run: `e2e/logs/smoke-….log`, HTML report under `e2e/playwright-report/`.

## What each suite covers (smoke, not full QA)

### Public
Home, login chrome, service-centers discovery.

### Partner (shop)
Dashboard, calendar, notifications, Clients CRM, Invoicing tabs (+ contrast), Promotions + create wizard opens.

### Client
`/dashboard`, vehicles list, notifications/activity.

### Org
Org home, fleet, accounting, org calendar — authenticated shell (soft if entitlement redirects).

## Daily job (later)

Same command in CI / Cursor Automation. Secrets per role — never personal admin passwords.

## Form consistency note

E2E catches broken pages and contrast regressions; shared form chrome (`FloatingCard` / FormSection) is still the product fix for every screen.
