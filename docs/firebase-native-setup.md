# Firebase native setup (Veversal mobile)

Native push uses **FCM via `@react-native-firebase/messaging`** — not Expo Push Service. This document covers identifier alignment, local config files, verification, physical-device testing, and beta deployment planning.

## Official Firebase project: `veversal-app`

All client configs and the backend Admin SDK must use **`veversal-app`**. The legacy project **`service-1001-beta`** must not appear in local configs.

## Identifiers (source of truth)

| Platform | Identifier | Firebase project |
|----------|------------|------------------|
| Android package | `com.mihailovv.vhrfrontend` | `veversal-app` |
| iOS bundle ID | `com.mihailovv.vhrfrontend` | `veversal-app` |
| Backend Admin SDK | — | `veversal-app` (`firebase_service.json`) |
| GCM sender ID (iOS) | — | Must match Android `project_number` (`499708431703`) |

Expo `app.config.js`, Gradle `applicationId`, Xcode `PRODUCT_BUNDLE_IDENTIFIER`, and Firebase client configs must all match these values.

## Config files: locations and duplicates

| File | Expected path | Duplicates |
|------|---------------|------------|
| Backend Admin SDK | `/Users/client/vhr/firebase_service.json` | None in repo (gitignored) |
| Android client | `/Users/client/vhr-frontend/android/app/google-services.json` | None — do not add root-level copies |
| iOS client | `/Users/client/vhr-frontend/GoogleService-Info.plist` | None — single plist at repo root |

`npm run verify:firebase-config` fails if multiple plist references appear in `project.pbxproj` or if `project_id` values diverge.

## Config files: gitignored vs server secrets

### Local client config (download per developer / CI secret store)

These are **Firebase client** configs. They contain API keys scoped to the app bundle/package. They are **gitignored** and must be placed locally:

| File | Path | Gitignored |
|------|------|------------|
| Android | `android/app/google-services.json` | Yes |
| iOS | `GoogleService-Info.plist` (repo root) | Yes |

### Server credentials (never in frontend repo)

| File | Location | Notes |
|------|----------|-------|
| `firebase_service.json` | Backend repo only | Firebase Admin service account — **never** commit to frontend |
| APNs `.p8` key | Apple Developer / EAS credentials | **never** in frontend git |
| `.env` / `.env.local` | Local only | API URLs, OAuth secrets |
| Keystores / `.mobileprovision` | Local / EAS | Signing only |

`npm run verify:firebase-config` scans tracked frontend files for `.p8`, service accounts, keystores, and profiles.

## Download configs from Firebase Console

### Android `google-services.json`

1. [Firebase Console](https://console.firebase.google.com/) → project **veversal-app**
2. Project settings → **Your apps** → Android app `com.mihailovv.vhrfrontend`
3. Download `google-services.json` → `android/app/google-services.json`
4. Verify `project_id` = `veversal-app`, `package_name` = `com.mihailovv.vhrfrontend`

### iOS `GoogleService-Info.plist`

1. Same project **veversal-app** → iOS app `com.mihailovv.vhrfrontend`
2. Download **GoogleService-Info.plist**
3. Place at: `/Users/client/vhr-frontend/GoogleService-Info.plist`
4. Verify `BUNDLE_ID` = `com.mihailovv.vhrfrontend`, `PROJECT_ID` = `veversal-app`, `GCM_SENDER_ID` = Android `project_number`
5. Ensure plist is in **vhrfrontend** target **Copy Bundle Resources** exactly once (bare workflow), or re-run `npx expo prebuild --platform ios`

### Backend `firebase_service.json`

1. Firebase Console → **veversal-app** → Project settings → **Service accounts**
2. Generate new private key → save as `/Users/client/vhr/firebase_service.json` (gitignored)
3. Verify `project_id` = `veversal-app`
4. **Never** copy this file into the frontend repo

Do **not** copy configs from another bundle ID or fabricate values.

## app.config.js behavior

- `ios.bundleIdentifier`: `com.mihailovv.vhrfrontend`
- `android.package`: `com.mihailovv.vhrfrontend`
- `ios.googleServicesFile`: set to `./GoogleService-Info.plist` **only when the file exists locally**
- `android.googleServicesFile`: `./android/app/google-services.json` when present
- `extra.firebaseMessagingEnabled`: `{ ios: true/false, android: true/false }` reflects whether each plist/json exists

## Verification

```bash
cd /Users/client/vhr-frontend
npm run verify:firebase-config
```

Checks (offline, no secrets printed):

- Expo ↔ Gradle ↔ google-services Android alignment
- Expo ↔ Xcode ↔ plist iOS alignment
- `project_id` = `veversal-app` across google-services, plist, and backend
- No legacy `service-1001-beta` project IDs
- iOS `GCM_SENDER_ID` matches Android `project_number`
- `app.config.js` plist path when file present
- Xcode `project.pbxproj` includes plist exactly once (when present)
- Google Services Gradle plugin
- No debug `applicationIdSuffix`
- No tracked `.p8`, service accounts, or keystores in frontend git

## Android notes

- Google Services plugin: `android/build.gradle` classpath + `android/app/build.gradle` apply plugin
- `@react-native-firebase/app` and `@react-native-firebase/messaging` in `package.json`
- Notification channels (`default`, `urgent`) are created at runtime in `firebaseMessaging.js` — no native rebuild needed for channel changes
- No `applicationIdSuffix` on debug builds — Poco device uses the same package as release
- `android/app/debug.keystore` is gitignored (standard debug signing)
- **New native Android build required** after changing `google-services.json` or Firebase native deps

## Physical Android test plan (Poco)

Use a non-production test account.

### LAN environment (physical device)

Physical devices cannot reach `127.0.0.1`, `localhost`, or `10.0.2.2`. Use your Mac's LAN IP.

Detect LAN IP:

```bash
ipconfig getifaddr en0   # Wi‑Fi (common)
# or: System Settings → Network → Wi‑Fi → Details → IP address
```

Suggested `.env.local` values (show diff before applying — do not overwrite silently):

```bash
EXPO_PUBLIC_DEV_LAN_HOST=<MAC_LAN_IP>
EXPO_PUBLIC_API_BASE_URL=http://<MAC_LAN_IP>:8001
EXPO_PUBLIC_WS_BASE_URL=ws://<MAC_LAN_IP>:8001
EXPO_PUBLIC_WS_ENABLED=true
EXPO_PUBLIC_DEV_API_PORT=8001
```

Start backend bound to all interfaces:

```bash
cd /Users/client/vhr
daphne -b 0.0.0.0 -p 8001 vhr.asgi:application
```

### adb and device build

```bash
adb devices                    # expect physical device: device (not unauthorized)
npx expo run:android --device  # pick Poco when prompted; rebuild after google-services change
```

### Manual test sequence

1. Enable **Developer options** + **USB debugging** on Poco; connect USB; authorize Mac.
2. Verify `adb devices` lists the phone as `device`.
3. Rebuild/install: `npx expo run:android --device` (required after `google-services.json` → `veversal-app`).
4. Set `.env.local` LAN URLs (see above); restart Metro if needed.
5. Start Redis (if required) and Daphne on `0.0.0.0:8001`.
6. Open app on Poco; log in with a **test** user.
7. Confirm FCM token registered (Django admin `DeviceToken` or logs — never paste full token in chat).
8. Background the app.
9. Send one direct test push:
   ```bash
   cd /Users/client/vhr
   .venv/bin/python manage.py send_test_notification \
     --user-id <TEST_USER_ID> \
     --event-type test_direct_notification
   ```
10. Confirm **exactly one** system notification on the device.
11. Tap notification; verify in-app routing.
12. Force-stop the app; repeat step 9; confirm cold-start delivery.
13. Trigger a **marketplace broadcast** repair request; confirm **no FCM push** (digest policy — WS/inbox only).

## Backend test notification command

```bash
cd /Users/client/vhr
.venv/bin/python manage.py send_test_notification \
  --user-id <id> \
  --event-type test_direct_notification
```

- Requires `DEBUG=True` unless `--confirm-production`
- Creates one `Notification` row with `delivery_policy=immediate`
- Dispatches WebSocket + FCM to **one** user only
- Never prints device tokens in stdout/stderr

## EAS build profiles

From `eas.json`:

| Profile | Use | Firebase notes |
|---------|-----|----------------|
| `development` | Dev client, internal distribution | Upload google-services.json + GoogleService-Info.plist via EAS secrets or local files at build time |
| `preview` | Internal APK/IPA | Same client configs required |
| `production` | Store builds | Same; production APNs entitlements needed for iOS push |

EAS project ID: `cde03e84-e27d-4ec0-9712-519a847ceb2d` (owner: `mihailovv`).

Profile support:

- **A.** Local dev build: `npx expo run:android` / `npx expo run:ios` with local plist/json
- **B.** EAS development Android (physical): `eas build --profile development --platform android`
- **C.** Internal Android APK: `eas build --profile preview --platform android`
- **D.** Google Play AAB: configure `production` with `buildType: app-bundle` when ready
- **E.** iOS dev / TestFlight: `eas build --profile development|preview|production --platform ios` (requires Apple credentials + APNs)

Do not run paid EAS builds without explicit approval.

## Beta server deployment plan (`veversal-app` credential)

| Item | Beta plan |
|------|-----------|
| When | After local physical-device push succeeds with `veversal-app` |
| Backend credential | Copy `firebase_service.json` (`project_id=veversal-app`) to `/opt/veversal/backend/firebase_service.json` on beta server — **not** via git |
| Client configs | EAS secrets / CI injection for `google-services.json` and `GoogleService-Info.plist` — never commit |
| Deploy | One successful `deploy-beta.yml` run (or `bash deploy/deploy_beta.sh` on server) |
| Rollback | Restore previous `firebase_service.json` backup on server; redeploy; old tokens may need re-registration if project changed |
| Never on server in git | `firebase_service.json`, `DJANGO_SECRET_KEY`, DB passwords, email app passwords, APNs `.p8` |
| Never in frontend | Admin SDK JSON, OAuth client secret, full FCM tokens in logs |

## Native FCM architecture (unchanged)

- Entry: `index.js` → `registerBackgroundMessageHandler()`
- Module: `src/notifications/firebaseMessaging.js` (`@react-native-firebase/messaging`)
- Token sync: `src/notifications/pushDeviceSync.js` → backend `POST /api/profiles/update-firebase-token/`
- Web uses separate `firebase/messaging` path in `App.js` — native and web are intentionally split

**Decision:** Stay on native FCM; do not migrate to Expo Push Service.

## iOS / APNs follow-up checklist

Config alignment alone does not enable iOS push. Still required:

- [ ] Apple Developer Program membership
- [ ] App ID registered for `com.mihailovv.vhrfrontend`
- [ ] **Push Notifications** capability enabled on the App ID
- [ ] APNs authentication key (`.p8`) created in Apple Developer
- [ ] Key ID and Team ID recorded
- [ ] Upload APNs key to Firebase Console → **veversal-app** → Cloud Messaging → Apple app configuration
- [ ] Configure signing in EAS / Xcode for the aligned bundle ID
- [ ] Physical iPhone (simulator does not receive remote push)
- [ ] New native build after plist + APNs setup
- [ ] Update `vhrfrontend.entitlements` `aps-environment` to `production` for App Store / TestFlight builds

Do not commit `.p8` files to the frontend repository.

## Native rebuild required?

| Change | Rebuild? |
|--------|----------|
| Xcode bundle ID alignment | **Yes** — new iOS build |
| Add GoogleService-Info.plist + Xcode resource | **Yes** — new iOS build |
| Android google-services.json project change (`veversal-app`) | **Yes** — new Android build |
| JS-only notification logic | No |
| Android notification channels (runtime) | No |
