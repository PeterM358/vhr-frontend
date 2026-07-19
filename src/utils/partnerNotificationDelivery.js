// Partner notification delivery helpers — priority, session dedup, banner eligibility.

export const PRIORITY_CRITICAL = 'critical';
export const PRIORITY_IMPORTANT = 'important';
export const PRIORITY_INFORMATIONAL = 'informational';

const CRITICAL_EVENTS = new Set([
  'new_repair_request',
  'offer_booked',
  'promotion_booked',
  'offer_accepted',
  'booking_accepted',
  'customer_message',
  'repair_chat_message',
  'offer_chat_message',
  'vehicle_arrived',
  'client_arrival_reported',
  'appointment_cancelled',
  'reschedule_proposed',
  'reschedule_counter_proposed',
]);

const IMPORTANT_EVENTS = new Set([
  'arrival_reminder_60',
  'arrival_at_time',
  'arrival_overdue_30',
  'repair_scheduled',
  'reschedule_accepted',
  'reschedule_declined',
  'vehicle_history_access_approved',
  'vehicle_history_access_rejected',
  'vehicle_history_access_blocked',
  'vehicle_history_access_revoked',
  'owner_service_record_confirmation_requested',
  'owner_service_record_confirmation_confirmed',
  'owner_service_record_confirmation_rejected',
  'complaint',
  'review',
  'offer_booking_cancelled',
  'promotion_booking_cancelled',
]);

export function notificationEventKey(item) {
  return String(
    item?.event_key ||
      item?.data?.event_key ||
      item?.data?.notification_id ||
      item?.id ||
      ''
  );
}

export function notificationPriority(item) {
  const explicit = String(item?.data?.priority || item?.priority || '').toLowerCase();
  if (
    explicit === PRIORITY_CRITICAL ||
    explicit === PRIORITY_IMPORTANT ||
    explicit === PRIORITY_INFORMATIONAL
  ) {
    return explicit;
  }
  const et = String(
    item?.data?.event_type ||
      item?.data?.notification_type ||
      item?.event_type ||
      item?.notification_type ||
      ''
  ).toLowerCase();
  if (CRITICAL_EVENTS.has(et)) return PRIORITY_CRITICAL;
  if (IMPORTANT_EVENTS.has(et)) return PRIORITY_IMPORTANT;
  if (et.includes('message') || et.includes('chat')) return PRIORITY_CRITICAL;
  return PRIORITY_IMPORTANT;
}

export function shouldShowPartnerDeliveryBanner(item, { bannersEnabled = true } = {}) {
  if (!bannersEnabled || !item) return false;
  const priority = notificationPriority(item);
  return priority === PRIORITY_CRITICAL || priority === PRIORITY_IMPORTANT;
}

/**
 * Calendar badge gap (V1): header still uses unscheduled_count from shop-calendar.
 * Actionable-only badge (arrival window / overdue / pending reschedule) needs a
 * dedicated backend counter — documented, not silently remapped here.
 */
export function calendarBadgeIsActionableOnly() {
  return false;
}
