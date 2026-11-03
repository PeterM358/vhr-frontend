# Universal Links (iOS) + App Links (Android)

Emails and shares must use **https://…** on staging/production — Gmail strips custom schemes.

**Practical path (preferred for QA + pre-store):** reminder emails use **Open in the app** → `/open-app.html?to=…`.

- **Android:** intent → installed APK, else Play.
- **iOS:** user must tap again on the bridge (Mail blocks silent `service1001://`). App Store button uses ASC id `6820957515`. **If the listing is not public yet**, another Apple ID cannot install from the store — only TestFlight invitees or **Continue in browser**.

Universal / App Links remain optional polish once public store builds verify cleanly.

## Goal

If the user has the Veversal app installed, tapping an https link opens **the app** on that screen. If not installed, the same URL opens in the browser (web SPA).

## Default staging behaviour

| Setting | Value |
|---------|--------|
| Backend `APP_PUBLIC_BASE_URL` | `https://beta.veversal.com` (staging defaults in `vhr/settings/staging.py`) |
| AASA `appID` | `GR95RKY24P.com.mihailovv.vhrfrontend` (Apple Team VEVERSAL LTD EOOD) |
| Android package | `com.mihailovv.vhrfrontend` |
| `assetlinks.json` fingerprints | EAS/release + local debug keystore |

## What we ship in the repo

| Piece | Role |
|-------|------|
| `app.config.js` → `ios.associatedDomains` | Declares applinks hosts for iOS builds |
| `app.config.js` → `android.intentFilters` (`autoVerify: true`) | Declares https hosts for Android App Links |
| `AppNavigator` linking `prefixes` | Includes those https origins so React Navigation parses the path |
| `public/.well-known/assetlinks.json` | Android Digital Asset Links |
| `public/.well-known/apple-app-site-association` | iOS AASA |

Custom scheme `service1001://` remains as a legacy/dev fallback only.

## Ops checklist

1. **Server `.env.staging`:** `APP_PUBLIC_BASE_URL=https://beta.veversal.com` (and `API_PUBLIC_BASE_URL=https://api-beta.veversal.com`). Then restart api/worker so **new** emails use beta links.
2. **Deploy web** so `https://beta.veversal.com/.well-known/assetlinks.json` and `…/apple-app-site-association` return **200** JSON (not SPA `index.html`).
3. **Installed build** must include associated domains / intent filters (any EAS preview/production/play-internal after those were added in `app.config.js`). No rebuild needed only to pick up AASA/assetlinks **file** changes on the server.
4. **Verify**
   - Android: `adb shell pm get-app-links com.mihailovv.vhrfrontend` → host `beta.veversal.com` should be **verified**
   - iOS: long-press a beta https link in **Mail** / Safari (not always Gmail’s in-app browser)
   - Paste `https://beta.veversal.com/en/oil-change/sofia` into Chrome → should offer / open Veversal

## Gmail caveat

Gmail’s in-app browser often **does not** hand off to App Links. Test with:

- Android: ⋮ → **Open in Chrome** (or copy link → Chrome)
- iOS: open the link in **Mail** or Safari

## Adding a new Android signing cert

After Play App Signing or a new upload key, append its SHA-256 to `public/.well-known/assetlinks.json` and redeploy web.

**Format must be colon-separated uppercase hex** (Google rejects fingerprints without colons → Android always opens the browser):

`FA:C6:17:45:DC:09:…:3B:9C`

```bash
# From an APK/AAB you ship:
$ANDROID_HOME/build-tools/*/apksigner verify --print-certs path/to.apk | grep SHA-256
# Then insert colons every 2 hex chars and uppercase.
```

**Quick phone test (not Gmail):** open Chrome → paste  
`https://beta.veversal.com/en/oil-change/sofia`  
→ should open Veversal app. Gmail’s in-app browser often skips App Links.

## Why email still uses https

Even with Universal Links, the stored URL must be https. The OS decides app vs browser; the email client never launches `service1001://` reliably.
