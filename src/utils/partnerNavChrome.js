/**
 * Pure helpers for partner header chrome + back fallbacks (testable without RN).
 */

export function isCallableFallback(fallback) {
  return typeof fallback === 'function';
}

/** Never invoke non-functions (route params / options often land here by mistake). */
export function safeInvokeFallback(fallback, navigation) {
  if (!isCallableFallback(fallback)) return false;
  fallback(navigation);
  return true;
}

export function normalizeReturnToRoute(returnTo) {
  if (typeof returnTo === 'string' && returnTo.trim()) return returnTo.trim();
  return null;
}

export function isVehicleHistoryAccessClientEvent(eventType) {
  return String(eventType || '').toLowerCase() === 'vehicle_history_access_requested';
}

export function isVehicleHistoryAccessShopEvent(eventType) {
  const t = String(eventType || '').toLowerCase();
  return (
    t === 'vehicle_history_access_approved' ||
    t === 'vehicle_history_access_rejected' ||
    t === 'vehicle_history_access_blocked' ||
    t === 'vehicle_history_access_revoked'
  );
}

/** In-app alert event types we surface lightly on the partner dashboard. */
export const PARTNER_IN_APP_ALERT_EVENTS = new Set([
  'client_arrival_reported',
  'vehicle_arrived',
]);

export function partnerInAppAlertEventType(item) {
  return String(
    item?.data?.event_type ||
      item?.data?.notification_type ||
      item?.event_type ||
      item?.notification_type ||
      ''
  ).toLowerCase();
}

export function shouldShowPartnerInAppAlert(item) {
  return PARTNER_IN_APP_ALERT_EVENTS.has(partnerInAppAlertEventType(item));
}
