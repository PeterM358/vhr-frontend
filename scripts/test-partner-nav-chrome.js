#!/usr/bin/env node
/**
 * Partner nav chrome + notification routing slice checks (no RN runtime).
 * Mirrors pure helpers from partnerNavChrome / partnerInAppAlert.
 * Run: npm run test:partner-nav-chrome
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

function isCallableFallback(fallback) {
  return typeof fallback === 'function';
}

function safeInvokeFallback(fallback, navigation) {
  if (!isCallableFallback(fallback)) return false;
  fallback(navigation);
  return true;
}

function normalizeReturnToRoute(returnTo) {
  if (typeof returnTo === 'string' && returnTo.trim()) return returnTo.trim();
  return null;
}

function isVehicleHistoryAccessClientEvent(eventType) {
  return String(eventType || '').toLowerCase() === 'vehicle_history_access_requested';
}

function isVehicleHistoryAccessShopEvent(eventType) {
  const t = String(eventType || '').toLowerCase();
  return (
    t === 'vehicle_history_access_approved' ||
    t === 'vehicle_history_access_rejected' ||
    t === 'vehicle_history_access_blocked' ||
    t === 'vehicle_history_access_revoked'
  );
}

const PARTNER_IN_APP_ALERT_EVENTS = new Set(['client_arrival_reported', 'vehicle_arrived']);

function partnerInAppAlertEventType(item) {
  return String(
    item?.data?.event_type ||
      item?.data?.notification_type ||
      item?.event_type ||
      item?.notification_type ||
      ''
  ).toLowerCase();
}

function shouldShowPartnerInAppAlert(item) {
  return PARTNER_IN_APP_ALERT_EVENTS.has(partnerInAppAlertEventType(item));
}

function partnerInAppAlertCopy(item, t) {
  if (!shouldShowPartnerInAppAlert(item)) return null;
  const eventType = partnerInAppAlertEventType(item);
  const titleKey = `partnerDashboard.notifications.templates.${eventType}.title`;
  const bodyKey = `partnerDashboard.notifications.templates.${eventType}.body`;
  const title = t(titleKey, null, null);
  const body = t(bodyKey, null, null);
  return {
    title: title && title !== titleKey ? title : item?.title || 'Vehicle arrival',
    body: body && body !== bodyKey ? body : item?.body || item?.message || '',
  };
}

// --- back fallback hardening ---
assert.strictEqual(isCallableFallback(() => {}), true, 'function is callable');
assert.strictEqual(isCallableFallback({ returnTo: 'ShopCalendar' }), false, 'object not callable');
assert.strictEqual(isCallableFallback(null), false, 'null not callable');

assert.strictEqual(safeInvokeFallback({ oops: true }, {}), false, 'object fallback ignored');
let called = false;
assert.strictEqual(
  safeInvokeFallback(() => {
    called = true;
  }, {}),
  true
);
assert.strictEqual(called, true);

assert.strictEqual(normalizeReturnToRoute('ShopCalendar'), 'ShopCalendar');
assert.strictEqual(normalizeReturnToRoute({ name: 'ShopCalendar' }), null);
assert.strictEqual(normalizeReturnToRoute(''), null);

assert.strictEqual(isVehicleHistoryAccessClientEvent('vehicle_history_access_requested'), true);
assert.strictEqual(isVehicleHistoryAccessShopEvent('vehicle_history_access_approved'), true);
assert.strictEqual(isVehicleHistoryAccessShopEvent('vehicle_arrived'), false);

assert.strictEqual(
  shouldShowPartnerInAppAlert({ data: { event_type: 'client_arrival_reported' } }),
  true
);
assert.strictEqual(shouldShowPartnerInAppAlert({ data: { event_type: 'new_repair_request' } }), false);

const t = (key) => {
  if (key.endsWith('.title')) return 'Arrival reported';
  if (key.endsWith('.body')) return 'Customer reported arrival.';
  return key;
};
const copy = partnerInAppAlertCopy({ data: { event_type: 'client_arrival_reported' } }, t);
assert.strictEqual(copy.title, 'Arrival reported');
assert.strictEqual(partnerInAppAlertCopy({ data: { event_type: 'offer_booked' } }, t), null);

// --- source wiring guards ---
function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

const chromeSrc = read('src/utils/partnerNavChrome.js');
assert.ok(chromeSrc.includes('safeInvokeFallback'), 'partnerNavChrome exports safeInvokeFallback');
assert.ok(chromeSrc.includes('normalizeReturnToRoute'), 'partnerNavChrome exports normalizeReturnToRoute');

const backSrc = read('src/navigation/appNavBarBack.js');
assert.ok(backSrc.includes('safeInvokeFallback'), 'appNavBarBack uses safeInvokeFallback');
assert.ok(backSrc.includes('normalizeReturnToRoute'), 'appNavBarBack normalizes returnTo');

const shopRouting = read('src/utils/shopNotificationRouting.js');
for (const ev of [
  'vehicle_history_access_approved',
  'vehicle_history_access_rejected',
  'vehicle_history_access_blocked',
  'vehicle_history_access_revoked',
]) {
  assert.ok(shopRouting.includes(`'${ev}'`), `shop routing includes ${ev}`);
}

const clientRouting = read('src/utils/clientNotificationRouting.js');
assert.ok(clientRouting.includes('vehicleIdFromNotification'), 'client VHA vehicle id helper');
assert.ok(clientRouting.includes('requestId'), 'client VHA passes requestId');

assert.ok(read('src/components/partner/PartnerAppHeader.js').includes('bell-outline'));
assert.ok(read('src/screens/ShopHomeScreen.js').includes('PartnerAppHeader'));
assert.ok(read('src/screens/ShopHomeScreen.js').includes('partnerInAppAlertCopy'));
assert.ok(read('src/screens/RepairDetailScreen.js').includes('PartnerAppHeader'));
assert.ok(read('src/screens/ShopCalendarScreen.js').includes('PartnerAppHeader'));
assert.ok(read('src/components/shop/RepairsList.js').includes('PartnerAppHeader'));

console.log('partner-nav-chrome checks ok');
