/**
 * Normalize REST + WebSocket notification rows to a consistent shape.
 * WebSocket payloads merge `data` keys at the top level; API nests them under `data`.
 */

export function normalizeNotification(item) {
  if (!item || item.id == null) return item;

  const data = { ...(item.data || {}) };
  const topEvent =
    item.event_type || item.notification_type || data.event_type || data.notification_type || '';
  if (topEvent && !data.event_type) data.event_type = topEvent;
  if (topEvent && !data.notification_type) data.notification_type = topEvent;

  if (item.repair_id != null && data.repair_id == null) data.repair_id = item.repair_id;
  if (item.offer_id != null && data.offer_id == null) data.offer_id = item.offer_id;
  if (item.promotion_id != null && data.promotion_id == null) data.promotion_id = item.promotion_id;
  if (item.open_calendar != null && data.open_calendar == null) data.open_calendar = item.open_calendar;
  if (item.client_preferred_start && !data.client_preferred_start) {
    data.client_preferred_start = item.client_preferred_start;
  }
  if (item.is_direct_appointment != null && data.is_direct_appointment == null) {
    data.is_direct_appointment = item.is_direct_appointment;
  }
  if (item.request_targeting_mode && !data.request_targeting_mode) {
    data.request_targeting_mode = item.request_targeting_mode;
  }

  const repair = item.repair ?? data.repair_id ?? null;
  const offer = item.offer ?? data.offer_id ?? null;
  const promotion = item.promotion ?? data.promotion_id ?? null;

  return {
    ...item,
    repair,
    offer,
    promotion,
    data,
  };
}
