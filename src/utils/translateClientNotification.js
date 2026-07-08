/**
 * Map API notification rows to localized title/body/hint strings.
 */

import { notificationEventType } from './clientNotificationRouting';

const KNOWN_TITLE_PATTERNS = [
  { pattern: /appointment scheduled/i, key: 'repair_scheduled' },
  { pattern: /ready for pickup/i, key: 'repair_ready_for_pickup' },
  { pattern: /reschedule/i, key: 'reschedule_proposed' },
  { pattern: /new offer/i, key: 'offer_received' },
  { pattern: /offer (accepted|declined)/i, key: 'offer_status' },
  { pattern: /repair (completed|finished)/i, key: 'repair_completed' },
  { pattern: /booking confirmed/i, key: 'booking_confirmed' },
  { pattern: /invoice/i, key: 'document_ready' },
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

export function translateNotificationTitle(item, t) {
  const templateKey = resolveTemplateKey(item);
  if (templateKey) {
    const localized = t(`notifications.templates.${templateKey}.title`, null, null);
    if (localized && localized !== `notifications.templates.${templateKey}.title`) {
      return localized;
    }
  }
  return item?.title || t('notifications.defaultTitle');
}

export function translateNotificationBody(item, t) {
  const templateKey = resolveTemplateKey(item);
  if (templateKey) {
    const localized = t(`notifications.templates.${templateKey}.body`, null, null);
    if (localized && localized !== `notifications.templates.${templateKey}.body`) {
      return localized;
    }
  }
  return item?.body || '';
}

export function translateNotificationHint(item, t) {
  const templateKey = resolveTemplateKey(item);
  if (templateKey) {
    const localized = t(`notifications.hints.${templateKey}`, null, null);
    if (localized && localized !== `notifications.hints.${templateKey}`) {
      return localized;
    }
  }
  if (templateKey === 'reschedule_proposed') {
    return t('notifications.hints.reschedule_proposed');
  }
  if (templateKey === 'repair_scheduled') {
    return t('notifications.hints.repair_scheduled');
  }
  if (templateKey === 'repair_ready_for_pickup') {
    return t('notifications.hints.repair_ready_for_pickup');
  }
  if (item?.repair) {
    return t('notifications.hints.open_repair');
  }
  return null;
}
