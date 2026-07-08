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

### Enable on production

In `.env.production` on the build machine:

```bash
VITE_ENABLE_ANALYTICS=true
VITE_GA_MEASUREMENT_ID=G-MP75X85E34
```

Then rebuild and deploy:

```bash
npm run build:web:production
```

### Keep disabled (recommended for beta / local)

```bash
VITE_ENABLE_ANALYTICS=false
```

No requests are sent to Google when disabled, regardless of hostname.

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
