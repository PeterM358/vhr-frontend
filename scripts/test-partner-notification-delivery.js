/**
 * Partner notification delivery helpers — pure unit checks (no RN).
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

// Mirror partnerNotificationDelivery.js
const CRITICAL_EVENTS = new Set([
  'new_repair_request',
  'offer_booked',
  'vehicle_arrived',
  'client_arrival_reported',
]);
const IMPORTANT_EVENTS = new Set([
  'arrival_reminder_60',
  'vehicle_history_access_approved',
]);

function notificationPriority(item) {
  const explicit = String(item?.data?.priority || '').toLowerCase();
  if (explicit) return explicit;
  const et = String(item?.data?.event_type || '').toLowerCase();
  if (CRITICAL_EVENTS.has(et)) return 'critical';
  if (IMPORTANT_EVENTS.has(et)) return 'important';
  return 'important';
}

function shouldShowPartnerDeliveryBanner(item) {
  const p = notificationPriority(item);
  return p === 'critical' || p === 'important';
}

function notificationEventKey(item) {
  return String(item?.event_key || item?.data?.event_key || item?.id || '');
}

assert.strictEqual(notificationPriority({ data: { event_type: 'new_repair_request' } }), 'critical');
assert.ok(shouldShowPartnerDeliveryBanner({ data: { event_type: 'offer_booked' } }));
assert.strictEqual(notificationEventKey({ event_key: 'repair:1:x', id: 9 }), 'repair:1:x');

const dedup = read('src/notifications/notificationDedup.js');
assert.ok(dedup.includes('seenEventKeys'));
assert.ok(dedup.includes('bannerSeenKeys'));

const banner = read('src/components/partner/PartnerInAppBanner.js');
assert.ok(banner.includes('PartnerInAppBannerHost'));
assert.ok(banner.includes('markBannerSeen'));

const settings = read('src/components/shop/ShopNotificationSettingsSection.js');
assert.ok(settings.includes('push_enabled'));
assert.ok(settings.includes('quiet_hours_mode'));

const delivery = read('src/utils/partnerNotificationDelivery.js');
assert.ok(delivery.includes('calendarBadgeIsActionableOnly'));
assert.ok(delivery.includes('return false'));

const app = read('src/App.js');
assert.ok(app.includes('PartnerInAppBannerHost'));

console.log('test-partner-notification-delivery: ok');
