/**
 * Map partner notification API rows to localized title/body/hint strings.
 */

import { notificationEventType, isDirectAppointmentNotification } from './shopNotificationRouting';

const KNOWN_TITLE_PATTERNS = [
  { pattern: /appointment request/i, key: 'appointment_request' },
  { pattern: /new repair request/i, key: 'new_repair_request' },
  { pattern: /vehicle arrived/i, key: 'vehicle_arrived' },
  { pattern: /reschedule/i, key: 'reschedule_proposed' },
  { pattern: /appointment scheduled/i, key: 'repair_scheduled' },
  { pattern: /booking/i, key: 'offer_booked' },
  { pattern: /promotion/i, key: 'promotion_booked' },
  { pattern: /service record/i, key: 'owner_service_record_confirmation_requested' },
];

function resolveTemplateKey(item) {
  const eventType = String(notificationEventType(item) || '').toLowerCase().trim();
  if (eventType) return eventType;

  const title = String(item?.title || '');
  for (const entry of KNOWN_TITLE_PATTERNS) {
    if (entry.pattern.test(title)) return entry.key;
  }
  return null;
}

function templatePrefix() {
  return 'partnerDashboard.notifications.templates';
}

function hintsPrefix() {
  return 'partnerDashboard.notifications.hints';
}

export function translateShopNotificationTitle(item, t) {
  const templateKey = resolveTemplateKey(item);
  if (templateKey) {
    const localized = t(`${templatePrefix()}.${templateKey}.title`, null, null);
    if (localized && localized !== `${templatePrefix()}.${templateKey}.title`) {
      return localized;
    }
  }
  return item?.title || t('partnerDashboard.notifications.defaultTitle');
}

export function translateShopNotificationBody(item, t) {
  const templateKey = resolveTemplateKey(item);
  if (templateKey) {
    const localized = t(`${templatePrefix()}.${templateKey}.body`, null, null);
    if (localized && localized !== `${templatePrefix()}.${templateKey}.body`) {
      return localized;
    }
  }
  return item?.body || '';
}

export function translateShopNotificationHint(item, t) {
  const eventType = notificationEventType(item);

  if (eventType === 'new_repair_request') {
    return isDirectAppointmentNotification(item)
      ? t(`${hintsPrefix()}.new_repair_request_calendar`)
      : t(`${hintsPrefix()}.new_repair_request`);
  }

  const templateKey = resolveTemplateKey(item);
  if (templateKey) {
    const localized = t(`${hintsPrefix()}.${templateKey}`, null, null);
    if (localized && localized !== `${hintsPrefix()}.${templateKey}`) {
      return localized;
    }
  }

  if (item?.repair) {
    return t(`${hintsPrefix()}.open_repair`);
  }
  if (item?.promotion) {
    return t(`${hintsPrefix()}.open_promotion`);
  }
  return null;
}
