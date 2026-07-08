# Google Analytics 4 (GA4) — Veversal web

Client-side GA4 for the Expo / React Native Web build. **Disabled by default** on local, beta, and staging unless you explicitly opt in.

Veversal **search analytics** (`src/analytics/searchAnalytics.js`) is a separate internal system — do not merge or replace it with GA4.

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_ANALYTICS` | `false` | Must be exactly `"true"` to send any GA4 data |
| `VITE_GA_MEASUREMENT_ID` | `G-MP75X85E34` | GA4 measurement ID |

Expo only embeds `EXPO_PUBLIC_*` into the browser bundle. Web build scripts (`build:web:staging`, `build:web:production`, `web:local`) run `scripts/with-env.js`, which **copies** `VITE_*` analytics vars to:

- `EXPO_PUBLIC_ENABLE_ANALYTICS`
- `EXPO_PUBLIC_GA_MEASUREMENT_ID`

You may set either naming style in `.env.staging` / `.env.production` / `.env.local`; `with-env.js` keeps them in sync for exports.

### Production vs beta / local

| Environment | `VITE_ENABLE_ANALYTICS` | `VITE_GA_MEASUREMENT_ID` |
|-------------|-------------------------|--------------------------|
| **Production** (`app.veversal.com`) | `true` | `G-MP75X85E34` |
| **Beta / staging** (`beta.veversal.com`) | `false` | `G-MP75X85E34` (ignored when disabled) |
| **Local** | `false` | optional |

No requests are sent to Google when disabled, regardless of hostname or measurement ID.

## VPS deployment (Docker + Nginx)

The Expo web app is a **static export** — there is **no frontend Dockerfile**. GA4 vars are **build-time only**: they are read when `npm run build:web:*` runs, embedded into `dist/_expo/static/js/*`, and served as plain files by Nginx.

### Where to set variables on the server

| File | Purpose |
|------|---------|
| **`/opt/veversal/frontend/.env.staging`** | Beta build — analytics **off** |
| **`/opt/veversal/frontend/.env.production`** | Production build — analytics **on** |
| `/opt/veversal/backend/.env.staging` | Backend + Nginx compose only (`FRONTEND_WEB_ROOT`, API secrets) — **not** GA4 |

Create env files from repo examples (never commit real copies):

```bash
cd /opt/veversal/frontend
cp .env.staging.example .env.staging      # beta server
cp .env.production.example .env.production  # production server (when live)
```

### Beta (current automated deploy)

**Paths**

- Frontend repo: `/opt/veversal/frontend`
- Backend repo + compose: `/opt/veversal/backend`
- Static output: `/opt/veversal/frontend/dist/` → Nginx `/var/www/frontend` (bind mount)

**Nginx mount** is controlled in backend `.env.staging`:

```bash
FRONTEND_WEB_ROOT=/opt/veversal/frontend/dist
```

**Deploy scripts** (backend repo) build with staging env:

| Script | Command |
|--------|---------|
| `deploy/deploy_beta.sh` | `npm run build:web:staging` (full stack) |
| `deploy/deploy_frontend_beta.sh` | `npm run build:web:staging` (frontend only; used by GitHub Actions) |

`build:web:staging` runs `node scripts/with-env.js .env.staging npx expo export --platform web`, which loads **`/opt/veversal/frontend/.env.staging`**.

**Required beta values** in `/opt/veversal/frontend/.env.staging`:

```bash
VITE_ENABLE_ANALYTICS=false
VITE_GA_MEASUREMENT_ID=G-MP75X85E34
```

Deploy scripts fail the build if analytics is enabled on beta.

**After editing `.env.staging`**, redeploy frontend (rebuild + recreate nginx):

```bash
cd /opt/veversal/backend && bash deploy/deploy_frontend_beta.sh
```

### Production (manual until `deploy_production.sh` exists)

Production compose lives in `/opt/veversal/backend` (`docker-compose.production.yml`). When the production VPS is provisioned:

1. Create **`/opt/veversal/frontend/.env.production`**:

   ```bash
   VITE_ENABLE_ANALYTICS=true
   VITE_GA_MEASUREMENT_ID=G-MP75X85E34
   EXPO_PUBLIC_API_BASE_URL=https://api.veversal.com
   EXPO_PUBLIC_WS_BASE_URL=wss://api.veversal.com
   # …OAuth / maps keys from .env.production.example
   ```

2. Build on the production server (or CI with the same env file):

   ```bash
   cd /opt/veversal/frontend
   npm install
   npm run build:web:production
   ```

3. Point Nginx at `dist/` (add `FRONTEND_WEB_ROOT` + frontend volume to production compose/nginx when `app.veversal.com` is wired — mirror staging `docker-compose.staging.yml` nginx mount).

4. Recreate nginx after each frontend rebuild so the volume bind picks up new `dist/`.

### Verify analytics in a build

```bash
# Production bundle should contain the measurement ID and enabled flag
grep -r "G-MP75X85E34" /opt/veversal/frontend/dist/_expo/static/js/ | head -1

# Beta bundle should NOT initialize GA when disabled (no collect requests in Network tab)
```

### Local / CI

```bash
cp .env.production.example .env.production   # VITE_ENABLE_ANALYTICS=true
npm run build:web:production

cp .env.staging.example .env.staging         # VITE_ENABLE_ANALYTICS=false
npm run build:web:staging
```

## Architecture

| Piece | Location |
|-------|----------|
| Service API | `src/services/analytics.js` |
| Initialization | `src/App.js` — `initializeAnalytics()` on mount |
| Page views | `src/navigation/authNavigation.js` — `syncWebPath()` → `trackPageView()` |

### Service API

```javascript
import {
  initializeAnalytics,
  trackPageView,
  trackEvent,
  trackLogin,
  // …other helpers
} from '../services/analytics';

initializeAnalytics(); // once at app root (already wired in App.js)

trackPageView('/en/dashboard'); // optional path; deduped per consecutive call

trackEvent({
  category: 'Booking',
  action: 'confirmed',
  label: 'shop-slug',
  value: 1,
});
```

### Pre-built event helpers

Stub helpers exist in `src/services/analytics.js` with comments showing where to call them:

| Helper | Suggested call site |
|--------|---------------------|
| `trackRequestServiceSubmitted` | `src/screens/ClientRequestRepairScreen.js` — after successful submit |
| `trackSearchPerformed` | `src/screens/ServiceCenterDiscovery.web.js` — on search/filter |
| `trackServiceCenterProfileViewed` | `src/screens/ShopDetailScreen.js` — on profile mount |
| `trackVehicleAdded` | `src/screens/CreateVehicleScreen.js` — after vehicle create |
| `trackUserRegistration` | `src/screens/RegisterScreen.js` — after sign-up |
| `trackLogin` | `src/screens/LoginScreen.js` — after login |
| `trackBookingConfirmed` | Booking confirm flow (e.g. `src/screens/RepairChatScreen.js`) |

Import the helper and call it once per successful user action. Use `label` for slugs, methods, or other non-PII context.

## Package

[`react-ga4`](https://www.npmjs.com/package/react-ga4) — no manual `gtag` snippet in `index.html`.

## Verification

1. Set `VITE_ENABLE_ANALYTICS=true` in `.env.local`.
2. Run `npm run web:local`.
3. Open GA4 **DebugView** or browser Network tab — filter `google-analytics.com` / `collect`.
4. Navigate between routes; each distinct path should emit one page view.

Turn analytics off again before committing local `.env` files.
