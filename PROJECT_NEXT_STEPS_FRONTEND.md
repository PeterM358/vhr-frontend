# Frontend Next Steps (Minimal + Safe)

## Completed
- [x] Guest entry route moved to `PublicHome` via `AuthLoadingScreen`.
- [x] Native shop map guest request fixed to avoid `Authorization: Bearer null`.
- [x] Guest access to `/api/profiles/shops/` validated as working with backend AllowAny.

## Immediate (FCM Stabilization)
- [ ] Consolidate FCM token registration into one shared post-login helper used by all login methods.
- [ ] Ensure helper runs after token persistence and role/profile data are available.
- [ ] Add success/failure logging around `POST /api/profiles/update-firebase-token/` response body.
- [ ] Remove duplicate/overlapping FCM token send attempts where possible.

## Immediate (Public Flow Hardening)
- [ ] Align `ShopMapScreen.web.js` auth header behavior with native (omit Authorization when no token).
- [ ] Verify `PublicHome -> ShopMap -> ShopDetail` works on native and web as guest.
- [ ] Verify guest cannot access private actions (create repair, create vehicle, profile management).

## Short-Term Validation
- [ ] Test login -> FCM token save for client account.
- [ ] Test login -> FCM token save for shop account (with `shop_profile_id`).
- [ ] Confirm WebSocket notifications still connect only when authenticated.

## Cleanup Later (Non-Blocking)
- [ ] Re-check `OfferChatScreen` usage and remove only if confirmed dead.
- [ ] Reduce notification/FCM wiring duplication across `App.js`, `AuthManager`, and auth API layer.