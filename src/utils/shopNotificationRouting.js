/**
 * Shop bell notifications → screen routing by event type.
 */

export function notificationEventType(item) {
  return String(
    item?.data?.event_type ||
      item?.data?.notification_type ||
      item?.event_type ||
      item?.notification_type ||
      ''
  ).toLowerCase();
}

function repairIdFrom(item) {
  const id = item?.repair ?? item?.data?.repair_id ?? item?.repair_id ?? null;
  return id != null ? Number(id) : null;
}

function offerIdFrom(item) {
  const id = item?.offer ?? item?.data?.offer_id ?? null;
  return id != null ? Number(id) : null;
}

function promotionIdFrom(item) {
  const id = item?.promotion ?? item?.data?.promotion_id ?? null;
  return id != null ? Number(id) : null;
}

function preferredStartFrom(item) {
  return (
    item?.data?.client_preferred_start ||
    item?.data?.scheduled_start ||
    item?.data?.proposed_start ||
    item?.client_preferred_start ||
    null
  );
}

/** Direct appointment request (client picked this shop + preferred slot). */
export function isDirectAppointmentNotification(item) {
  const eventType = notificationEventType(item);
  if (eventType !== 'new_repair_request') return false;
  if (item?.data?.is_direct_appointment === true) return true;
  const title = String(item?.title || '').toLowerCase();
  if (title.includes('appointment request')) return true;
  if (
    item?.data?.request_targeting_mode === 'selected_centers' &&
    preferredStartFrom(item)
  ) {
    return true;
  }
  return false;
}

export function isCalendarNotification(item) {
  const eventType = notificationEventType(item);
  if (eventType === 'new_repair_request') {
    return isDirectAppointmentNotification(item);
  }
  return new Set([
    'repair_scheduled',
    'reschedule_proposed',
    'reschedule_counter_proposed',
    'reschedule_accepted',
    'reschedule_declined',
    'appointment_cancelled',
  ]).has(eventType);
}

function calendarParams(item, repairId) {
  return {
    focusRepairId: repairId || undefined,
    focusDate: preferredStartFrom(item) || undefined,
    returnTo: 'ShopDashboard',
    backLabel: 'Home',
  };
}

/**
 * Resolve navigation target for a shop notification.
 * Returns { route, params } or null.
 */
export function resolveShopNotificationTarget(item) {
  if (!item) return null;

  const eventType = notificationEventType(item);
  const repairId = repairIdFrom(item);
  const promotionId = promotionIdFrom(item);

  switch (eventType) {
    case 'promotion_booked':
    case 'promotion_booking_cancelled':
      if (promotionId) {
        return { route: 'PromotionDetail', params: { promotionId } };
      }
      break;

    case 'offer_booked':
    case 'offer_booking_cancelled':
      if (repairId) {
        return { route: 'RepairDetail', params: { repairId } };
      }
      break;

    case 'new_repair_request':
      if (isDirectAppointmentNotification(item)) {
        return {
          route: 'ShopCalendar',
          params: calendarParams(item, repairId),
          nested: true,
        };
      }
      if (repairId) {
        return { route: 'RepairDetail', params: { repairId } };
      }
      break;

    case 'repair_scheduled':
    case 'reschedule_proposed':
    case 'reschedule_counter_proposed':
    case 'reschedule_accepted':
    case 'reschedule_declined':
    case 'appointment_cancelled':
      return {
        route: 'ShopCalendar',
        params: calendarParams(item, repairId),
        nested: true,
      };

    case 'vehicle_arrived':
    case 'client_arrival_reported':
    case 'direct_request_declined':
    case 'owner_service_record_confirmation_requested':
    case 'owner_service_record_confirmation_confirmed':
    case 'owner_service_record_confirmation_rejected':
      if (repairId) {
        return { route: 'RepairDetail', params: { repairId } };
      }
      break;

    default:
      break;
  }

  if (promotionId) {
    return { route: 'PromotionDetail', params: { promotionId } };
  }
  if (repairId) {
    return { route: 'RepairDetail', params: { repairId } };
  }

  const offerId = offerIdFrom(item);
  if (offerId && repairId) {
    return { route: 'RepairDetail', params: { repairId } };
  }

  return null;
}

export function navigateShopNotification(navigation, item) {
  const target = resolveShopNotificationTarget(item);
  if (!target) return false;

  if (target.nested) {
    navigation.navigate('ShopHome', {
      screen: target.route,
      params: target.params,
    });
    return true;
  }

  navigation.navigate(target.route, target.params);
  return true;
}

export function notificationActionHint(item) {
  const eventType = notificationEventType(item);

  switch (eventType) {
    case 'promotion_booked':
    case 'promotion_booking_cancelled':
      return 'Tap to open promotion';
    case 'offer_booked':
      return 'Tap to open booked repair';
    case 'offer_booking_cancelled':
      return 'Tap to open repair';
    case 'new_repair_request':
      return isDirectAppointmentNotification(item)
        ? 'Tap to confirm on calendar'
        : 'Tap to review request';
    case 'repair_scheduled':
      return 'Tap to view on calendar';
    case 'reschedule_proposed':
    case 'reschedule_counter_proposed':
      return 'Tap to review on calendar';
    case 'reschedule_accepted':
    case 'reschedule_declined':
    case 'appointment_cancelled':
      return 'Tap to open calendar';
    case 'vehicle_arrived':
    case 'client_arrival_reported':
      return 'Tap to open repair';
    case 'owner_service_record_confirmation_requested':
      return 'Tap to confirm service record';
    default:
      break;
  }

  if (isCalendarNotification(item)) {
    return 'Tap to open calendar';
  }
  if (repairIdFrom(item)) {
    return 'Tap to open repair';
  }
  if (promotionIdFrom(item)) {
    return 'Tap to open promotion';
  }
  return null;
}

const BOOKING_EVENT_TYPES = new Set([
  'promotion_booked',
  'promotion_booking_cancelled',
  'repair_scheduled',
  'reschedule_proposed',
  'reschedule_counter_proposed',
  'reschedule_accepted',
  'reschedule_declined',
  'appointment_cancelled',
]);

const OFFER_EVENT_TYPES = new Set(['offer_booked', 'offer_booking_cancelled']);

const REPAIR_EVENT_TYPES = new Set([
  'new_repair_request',
  'vehicle_arrived',
  'client_arrival_reported',
  'direct_request_declined',
  'owner_service_record_confirmation_requested',
  'owner_service_record_confirmation_confirmed',
  'owner_service_record_confirmation_rejected',
]);

/** Inbox tab filter for partner notifications. */
export function shopNotificationCategory(item) {
  const eventType = notificationEventType(item);
  if (OFFER_EVENT_TYPES.has(eventType)) return 'offers';
  if (BOOKING_EVENT_TYPES.has(eventType)) return 'bookings';
  if (REPAIR_EVENT_TYPES.has(eventType)) return 'repairs';
  if (item?.offer != null) return 'offers';
  if (item?.promotion != null) return 'bookings';
  if (item?.repair != null) return 'repairs';
  return 'alerts';
}

/** @deprecated use isCalendarNotification */
export function shouldOpenShopCalendar(item) {
  return isCalendarNotification(item);
}
