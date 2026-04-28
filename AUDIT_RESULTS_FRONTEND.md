# Frontend Audit Results (Post Guest-Browsing Fixes)

## Scope Reviewed
- `src/navigation/AppNavigator.js`
- `src/screens/AuthLoadingScreen.js`
- `src/screens/ShopMapScreen.native.js`
- `src/screens/ShopMapScreen.web.js`
- `src/context/AuthManager.js`
- `src/context/AuthContext.js`
- `src/context/WebSocketManager.js`
- `src/notifications/firebaseMessaging.js`
- `src/api/auth.js`
- `src/api/notifications.js`
- `src/api/config.js`
- `src/env.js`
- `src/App.js`

## 1) Current Auth Entry Flow
- App starts in `AuthLoading` (`AppNavigator` initial route).
- `AuthLoadingScreen` checks `@access_token` and `@is_shop` in AsyncStorage.
- Routing behavior is now:
  - token + `@is_shop === 'true'` -> `ShopHome`
  - token + otherwise -> `Home`
  - no token -> `PublicHome`
- Password reset deep link is preserved via linking config:
  - `service1001://reset-password/:uid/:token` -> `PasswordConfirmReset`

## 2) Current Guest/Public Browsing Flow
- `PublicHome` is available for unauthenticated users and can navigate to `ShopMap`, `Login`, `Register`.
- Native map flow (`ShopMapScreen.native.js`) now sends Authorization header only when token exists:
  - avoids `Authorization: Bearer null`
  - supports guest calls to `/api/profiles/shops/`
- Web map flow (`ShopMapScreen.web.js`) still always sends:
  - `Authorization: Bearer ${token}`
  - if token is null/invalid, this may still create avoidable auth failures in browser flow.

## 3) What Uses WebSocket
- `WebSocketProvider` (`src/context/WebSocketManager.js`) opens:
  - `${WS_BASE_URL}/ws/notifications/?token=${authToken}`
- Active consumers of WS notification state:
  - `src/components/shop/NotificationsList.js`
  - `src/components/client/NotificationsList.js`
  - `src/screens/HomeScreen.js` (badge counts)
  - `src/screens/ShopHomeScreen.js` (badge count)
- WS is auth-only: no token -> no socket connection.

## 4) What Uses Firebase/FCM
- Native FCM helper:
  - `src/notifications/firebaseMessaging.js` (`requestPermission`, listeners, `getToken`).
- Backend token registration endpoint usage:
  - `sendFirebaseTokenToBackend()` in `src/api/notifications.js`
  - targets `POST /api/profiles/update-firebase-token/`
- FCM registration is attempted from:
  - `src/api/auth.js` after login
  - `src/context/AuthManager.js` on app bootstrap when token already exists
- `src/App.js` also imports web messaging (`firebase/messaging`) for foreground handling; this is separate from `@react-native-firebase/messaging`.

## 5) Likely Cause of Current FCM Token Issue After Login
- FCM registration flow is fragmented across multiple places (login path + app bootstrap path), making behavior inconsistent by login method and app lifecycle.
- `AuthManager` FCM effect runs only on initial mount (`[]` dependency), so it does not act as a reliable "after every successful login" hook.
- Platform inconsistency: native uses `@react-native-firebase/messaging`, while `App.js` also uses web `firebase/messaging`; mixed approach can lead to confusion and silent misses.
- Web map/auth style inconsistency still exists (`Bearer null` risk on web) and indicates similar header/token hygiene gaps across flows.

## 6) Smallest Safe Frontend Next Steps
- Keep current guest browsing/auth entry logic unchanged (already correct for current goal).
- Centralize FCM token registration into one post-auth path (single utility call used by both email/password and Google login).
- Make FCM send idempotent and guarded:
  - only call when both `access_token` and `fcmToken` exist
  - include `shop_profile_id` only when present.
- Align token header behavior in web map screen with native (send Authorization only when token exists).
- Add lightweight logging around FCM registration response status and body to confirm success/failure reason quickly.

## 7) Frontend Check for Public Shop Detail Usage
- Files checked for shop list/detail usage:
  - `src/screens/ShopMapScreen.native.js`
  - `src/screens/ShopMapScreen.web.js`
  - `src/screens/ShopDetailScreen.js`
  - `src/api/shops.js`
  - `src/api/vehicles.js`
  - `src/navigation/AppNavigator.js`
- `GET /api/profiles/shops/<id>/` is used as public-style detail retrieval (`getShopById` in `src/api/shops.js`), opened from map pins to `ShopDetail`.
- No frontend code depends on update behavior at `/api/profiles/shops/<id>/`; updates use separate authenticated endpoints (e.g., vehicle/share and shop image endpoints).