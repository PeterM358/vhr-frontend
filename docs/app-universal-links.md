# Universal Links (iOS) + App Links (Android)

Emails and shares must use **https://beta.veversal.com/…** (or production hosts), not `service1001://` — Gmail strips custom schemes.

## Goal

If the user has the Veversal app installed, tapping an https link opens **the app** on that screen. If not installed, the same URL opens in the browser (web SPA).

## What we ship in the repo

| Piece | Role |
|-------|------|
| `app.config.js` → `ios.associatedDomains` | Declares applinks hosts for iOS builds |
| `app.config.js` → `android.intentFilters` (`autoVerify: true`) | Declares https hosts for Android App Links |
| `AppNavigator` linking `prefixes` | Includes those https origins so React Navigation parses the path |
| `public/.well-known/assetlinks.json` | Android Digital Asset Links (package + cert SHA-256) |
| `public/.well-known/apple-app-site-association` | iOS AASA (replace `TEAMID`) |

Custom scheme `service1001://` remains as a legacy/dev fallback only.

## Ops checklist (required for “open in app” to work)

1. **Deploy web** so `https://beta.veversal.com/.well-known/assetlinks.json` and `…/apple-app-site-association` return **200** (not SPA `index.html`). Nginx already prefers real files via `try_files $uri`.
2. **Android:** put the **Play App Signing** (and upload key if needed) SHA-256 fingerprints into `assetlinks.json`. The repo currently lists the **local debug** keystore fingerprint for USB/debug APKs.
3. **iOS:** replace `TEAMID` in `apple-app-site-association` with the Apple Developer Team ID (`ABCDE12345.com.mihailovv.vhrfrontend`).
4. **New native builds** after `app.config.js` changes (EAS preview/production). Config plugins do not apply to an already-installed APK without rebuild.
5. Verify:
   - Android: `adb shell pm get-app-links com.mihailovv.vhrfrontend`
   - iOS: tap a beta https vehicle link from Mail with the app installed

## Why email still uses https

Even with Universal Links, the stored URL must be https. The OS decides app vs browser; the email client never launches `service1001://` reliably.
