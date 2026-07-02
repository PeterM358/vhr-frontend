# Veversal web deployment (Expo / React Native Web)

Static web builds for **beta** (`beta.veversal.com`) and **production** (`app.veversal.com`).  
The web app talks to the Django API on a separate subdomain.

| Environment | Web URL | API URL |
|-------------|---------|---------|
| Local | `http://localhost:8081` (dev server) | `http://localhost:8000` |
| Staging / beta | `https://beta.veversal.com` | `https://api-beta.veversal.com` |
| Production | `https://app.veversal.com` | `https://api.veversal.com` |

---

## Prerequisites

```bash
cd vhr-frontend
npm install
```

---

## Environment files

Copy the example for your target (never commit real secrets):

```bash
cp .env.local.example .env.local        # local dev
cp .env.staging.example .env.staging    # beta build
cp .env.production.example .env.production
```

### Required variables

| Variable | Local example | Staging example |
|----------|---------------|-----------------|
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:8000` | `https://api-beta.veversal.com` |
| `EXPO_PUBLIC_WS_BASE_URL` | `ws://localhost:8000` | `wss://api-beta.veversal.com` |

`EXPO_PUBLIC_*` values are **embedded at build time** into the JavaScript bundle.  
Changing them on the server after build has no effect — rebuild and redeploy.

Optional (OAuth / maps):

- `EXPO_PUBLIC_GOOGLE_CLIENT_ID` — Web OAuth client for browser login
- `GOOGLE_MAPS_API_KEY` — native maps; web uses Leaflet/OSM
- `EXPO_PUBLIC_DEV_LAN_HOST` — LAN IP for physical devices in local native dev

Config is read from `src/env.js` and re-exported by `src/api/config.js`.

---

## Run local web (development)

1. Start the Django API locally (`http://localhost:8000`).
2. Configure frontend:

   ```bash
   cp .env.local.example .env.local
   ```

3. Start Expo web:

   ```bash
   npm run web
   # or, explicitly loading .env.local:
   npm run web:local
   ```

4. Open the URL Expo prints (usually `http://localhost:8081`).

Expo dev server also loads `.env.local` automatically when present.

---

## Build for beta (staging)

```bash
cp .env.staging.example .env.staging
# Edit .env.staging — set EXPO_PUBLIC_API_BASE_URL and OAuth client IDs

npm run build:web:staging
```

Equivalent manual command:

```bash
node scripts/with-env.js .env.staging npx expo export --platform web
```

### Build output

| Item | Value |
|------|-------|
| **Output folder** | `dist/` |
| **Entry file** | `dist/index.html` |
| **Assets** | `dist/_expo/`, `dist/assets/` |

The `dist/` folder is gitignored. Copy its **entire contents** to the server.

---

## Build for production

```bash
cp .env.production.example .env.production
npm run build:web:production
```

---

## Deploy to staging server

### 1. Build on your machine or CI

```bash
npm run build:web:staging
```

### 2. Copy to server

```bash
rsync -avz --delete dist/ user@staging-server:/var/www/veversal-beta/
```

Or archive:

```bash
tar -czf veversal-beta-web.tar.gz -C dist .
scp veversal-beta-web.tar.gz user@staging-server:/tmp/
# on server: mkdir -p /var/www/veversal-beta && tar -xzf /tmp/veversal-beta-web.tar.gz -C /var/www/veversal-beta
```

### 3. Nginx — serve static web (`beta.veversal.com`)

The API stays on `api-beta.veversal.com` (backend compose/nginx).  
The **frontend** is static files only:

```nginx
server {
    listen 80;
    server_name beta.veversal.com;

    root /var/www/veversal-beta;
    index index.html;

    # SPA — React Navigation client-side routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Long-cache hashed assets from Expo export
    location /_expo/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

Add TLS (Certbot or load balancer) when ready.

### 4. Backend CORS

Ensure Django staging allows the web origin (already in backend `.env.staging`):

```
CORS_ALLOWED_ORIGINS=https://beta.veversal.com
CSRF_TRUSTED_ORIGINS=https://beta.veversal.com
FRONTEND_URL=https://beta.veversal.com
```

---

## npm scripts reference

| Script | Purpose |
|--------|---------|
| `npm run web` | Dev server (`expo start --web`) |
| `npm run web:local` | Dev server with `.env.local` |
| `npm run build:web` | Export web using current shell env |
| `npm run build:web:local` | Export with `.env.local` |
| `npm run build:web:staging` | **Beta static build** → `dist/` |
| `npm run build:web:production` | Production static build → `dist/` |

Underlying command:

```bash
npx expo export --platform web
```

Default output directory: **`dist/`** (override with `--output-dir`).

---

## Verify API URL in a build

After building, search the bundle (sanity check):

```bash
grep -r "api-beta.veversal.com" dist/_expo/static/js/ | head -1
```

In dev, check the browser console for:

```
[Veversal] API → https://api-beta.veversal.com
```

---

## Expo web compatibility notes

| Area | Status / note |
|------|----------------|
| **Core app** | Works — React Navigation + react-native-web |
| **Maps** | Web uses Leaflet (`*.web.js` screens); native uses Google Maps |
| **Push / FCM** | Limited on web; `firebase/messaging` in `App.js` may log warnings in browser |
| **Deep links** | `service1001://` scheme is mobile; password-reset emails should use `https://beta.veversal.com/...` |
| **Google login** | Requires a **Web** OAuth client ID in Google Cloud, authorized for `beta.veversal.com` |
| **File uploads** | Web uses blob URLs / pickers; test document flows on beta |
| **WebSockets** | Notifications WS must be reachable at `wss://api-beta.veversal.com`; Nginx must pass `Upgrade` headers on API host |
| **Output mode** | `web.output: "single"` in `app.config.js` — one `index.html` SPA (required for client-side routing) |

---

## Troubleshooting

**API calls still go to localhost after deploy**  
→ Rebuild with `npm run build:web:staging` and confirm `.env.staging` has `EXPO_PUBLIC_API_BASE_URL`.

**404 on refresh** (e.g. `/login`)  
→ Nginx must use `try_files ... /index.html` (SPA fallback).

**CORS errors**  
→ Fix backend `CORS_ALLOWED_ORIGINS`, not the frontend bundle.

**WebSocket fails on beta**  
→ Check API Nginx `Upgrade` / `Connection` headers and `wss://` URL.

---

## What is not in scope yet

- App Store / Google Play release
- CI/CD pipelines
- EAS hosted web builds (using local `expo export` for now)
