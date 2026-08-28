# Mobile QA workflow (Android)

Goal: test on a physical phone **without rebuilding an APK for every JS tweak**.

## Two modes

| Mode | Backend | When to use | Rebuild APK? |
|------|---------|-------------|--------------|
| **local** | Your Mac (`192.168.x.x:8001`) | Same Wi‑Fi, Django/Daphne running locally | Only after native/icon changes |
| **staging** | `https://api-beta.veversal.com` | Beta data, real users/shops | Only after native/icon changes |

Env files:

- `.env.local` — secrets + keys (never commit). LAN API for local mode.
- `.env.staging` — beta API/WS URLs only. OAuth/maps can stay empty; `with-mobile-env.js staging` fills them from `.env.local`.

## Daily JS work (no APK rebuild)

1. Install a **development build** once (EAS `development` profile or `expo run:android` with dev client).
2. Phone and Mac on same Wi‑Fi (local) or use staging mode (beta API).

```bash
# Local backend on Mac
npm run start:mobile:local

# OR beta API (no local Django needed)
npm run start:mobile:staging
```

3. Open the dev client on the phone → loads JS from Metro. Edit code → reload.

Rebuild dev client only when: native modules, `google-services.json`, app icons, AndroidManifest.

## Standalone APK (share / offline install)

When you need a release-style APK (no Metro), e.g. hand to a tester:

```bash
# Beta API + secrets from .env.local
npm run android:beta:apk

# USB install + copy to Download/
npm run android:beta:install
```

APK path: `android/app/build/outputs/apk/release/app-release.apk`

## EAS cloud (optional)

Preview profile should use the same beta URLs as `.env.staging`. Set `GOOGLE_SERVICES_JSON_BASE64` on EAS (preview/production) — see `docs/firebase-native-setup.md`.

```bash
eas build --profile preview --platform android
```

## Common mistake

`./gradlew assembleRelease` **without** `with-mobile-env.js staging` bakes `.env.local` LAN IP into the APK → empty app on phone. Always use `npm run android:beta:apk` for beta testing.
