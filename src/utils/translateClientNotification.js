/**
 * Map API notification rows to localized title/body/hint strings.
 */

import { isVehicleReminderNotification, notificationEventType } from './clientNotificationRouting';

const KNOWN_TITLE_PATTERNS = [
  { pattern: /appointment scheduled/i, key: 'repair_scheduled' },
  { pattern: /ready for pickup/i, key: 'repair_ready_for_pickup' },
  { pattern: /reschedule/i, key: 'reschedule_proposed' },
  { pattern: /new offer/i, key: 'offer_received' },
  { pattern: /offer (accepted|declined)/i, key: 'offer_status' },
  { pattern: /repair (completed|finished)/i, key: 'repair_completed' },
  { pattern: /booking confirmed/i, key: 'booking_confirmed' },
  { pattern: /invoice/i, key: 'document_ready' },
  { pattern: /vehicle checked in/i, key: 'vehicle_arrived' },
  { pattern: /car ready for pickup/i, key: 'repair_ready_for_pickup' },
];

/** English backend labels → reminders.types.* keys */
const EN_REMINDER_LABEL_TO_TYPE = {
  insurance: 'insurance',
  'technical inspection': 'technical_inspection',
  'technical inspection (due date only)': 'technical_inspection',
  'road tax': 'road_tax',
  vignette: 'vignette',
  'oil change': 'oil_service',
  'oil service': 'oil_service',
  'tire change': 'tire_change',
  'battery check': 'battery_check',
  'suspension service': 'suspension_service',
  'brake check': 'brake_check',
  'custom reminder': 'custom',
  reminder: 'custom',
};

function resolveTemplateKey(item) {
  const eventType = String(notificationEventType(item) || '').toLowerCase().trim();
  if (eventType) {
    if (eventType === 'vehicle_reminder_email_fallback') {
      // Same copy family as overdue / due-soon depending on window.
      const window = String(item?.data?.window || '');
      return window.startsWith('overdue') ? 'vehicle_reminder_overdue' : 'vehicle_reminder_due_soon';
    }
    return eventType;
  }

  const title = String(item?.title || '');
  for (const entry of KNOWN_TITLE_PATTERNS) {
    if (entry.pattern.test(title)) return entry.key;
  }
  return null;
}

function reminderMeta(item) {
  const data = item?.data || {};
  const window = String(data.window || '');
  let days = data.days != null ? String(data.days) : null;
  if (!days && window.startsWith('d') && /^\d+$/.test(window.slice(1))) {
    days = window.slice(1);
  }

  const plate =
    String(data.plate || '').trim() ||
    (String(item?.body || '').match(/^([^:]+):/) || [])[1]?.trim() ||
    '';

  const reminderType = String(data.reminder_type || '').trim();
  let label = String(data.reminder_label || '').trim();

  if (!label) {
    const title = String(item?.title || '');
    const overdue = title.match(/^(.+?)\s+is overdue$/i);
    const dueSoon = title.match(/^(.+?)\s+due in\s+(\d+)\s+days$/i);
    if (overdue) label = overdue[1].trim();
    else if (dueSoon) {
      label = dueSoon[1].trim();
      if (!days) days = dueSoon[2];
    }
  }

  return { plate, label, days, reminderType, window };
}

function localizeReminderLabel(meta, t) {
  const typeKey = meta.reminderType || EN_REMINDER_LABEL_TO_TYPE[String(meta.label || '').toLowerCase()];
  if (typeKey) {
    const localized = t(`reminders.types.${typeKey}`, null, null);
    if (localized && localized !== `reminders.types.${typeKey}`) return localized;
  }
  return meta.label || t('reminders.types.custom');
}

function vehicleArrivedParams(item) {
  const data = item?.data || {};
  let shop = String(data.shop_name || '').trim();
  let plate = String(data.plate || '').trim();
  const body = String(item?.body || '');
  const match = body.match(/^(.+?)\s+confirmed\s+(.+?)\s+has arrived for service\.?$/i);
  if (match) {
    if (!shop) shop = match[1].trim();
    if (!plate) plate = match[2].trim();
  }
  return { shop, plate };
}

function localizedTemplate(item, t, field) {
  const templateKey = resolveTemplateKey(item);
  if (!templateKey) return null;

  const path = `notifications.templates.${templateKey}.${field}`;
  let params = null;

  if (isVehicleReminderNotification(item) || templateKey.startsWith('vehicle_reminder_')) {
    const meta = reminderMeta(item);
    params = {
      plate: meta.plate || t('repairs.vehicleFallback'),
      label: localizeReminderLabel(meta, t),
      days: meta.days || '',
    };
  } else if (templateKey === 'vehicle_arrived') {
    const arrived = vehicleArrivedParams(item);
    params = {
      shop: arrived.shop || t('repairs.list.serviceCenterFallback'),
      plate: arrived.plate || t('repairs.vehicleFallback'),
    };
  }

  const localized = t(path, params, null);
  if (localized && localized !== path) return localized;
  return null;
}

export function translateNotificationTitle(item, t) {
  return localizedTemplate(item, t, 'title') || item?.title || t('notifications.defaultTitle');
}

export function translateNotificationBody(item, t) {
  return localizedTemplate(item, t, 'body') || item?.body || '';
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
  if (templateKey === 'vehicle_arrived') {
    return t('notifications.hints.open_repair');
  }
  if (
    templateKey === 'vehicle_reminder_overdue' ||
    templateKey === 'vehicle_reminder_due_soon' ||
    isVehicleReminderNotification(item)
  ) {
    return t('notifications.hints.vehicle_reminder');
  }
  if (item?.repair) {
    return t('notifications.hints.open_repair');
  }
  return null;
}
