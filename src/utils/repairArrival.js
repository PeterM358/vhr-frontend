/** Client-side helpers for scheduled vs in-shop repair phases. */

export function normalizeRepairStatus(status) {
  const s = String(status || '').trim().toLowerCase();
  return s === 'cancelled' ? 'canceled' : s;
}

export function isTerminalRepairStatus(status) {
  const s = normalizeRepairStatus(status);
  return s === 'done' || s === 'canceled';
}

/** Vehicle confirmed physically at the service center. */
export function isVehicleAtShop(repair) {
  if (!repair) return false;
  if (repair.vehicle_arrived_at) return true;
  // Legacy rows: ongoing with no future appointment treated as in-shop.
  const status = normalizeRepairStatus(repair.status);
  if (status !== 'ongoing') return false;
  if (!repair.scheduled_start) return true;
  return new Date(repair.scheduled_start) <= new Date();
}

/** Booked/scheduled visit that has not checked in yet. */
export function isUpcomingAppointment(repair) {
  if (!repair?.scheduled_start || repair.vehicle_arrived_at) return false;
  if (repair.pending_reschedule_proposal) return false;
  if (isTerminalRepairStatus(repair.status)) return false;
  if (isVehicleAtShop(repair)) return false;
  return true;
}

export function clientReportedArrival(repair) {
  return Boolean(repair?.client_arrival_reported_at) && !repair?.vehicle_arrived_at;
}

function formatSlotRange(startIso, endIso) {
  if (!startIso) return null;
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const datePart = start.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  if (!end) return datePart;
  const endTime = end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${datePart} – ${endTime}`;
}

/** Visit line for repair detail — prefers confirmed schedule over stale pending notes. */
export function getVisitDisplayText(repair) {
  if (!repair) return null;
  if (repair.scheduled_start) {
    const slot = formatSlotRange(repair.scheduled_start, repair.scheduled_end);
    return slot ? `Scheduled visit: ${slot}` : null;
  }
  const notes = String(repair.availability_notes || '').trim();
  if (notes) return notes;
  if (repair.client_preferred_start) {
    const slot = formatSlotRange(repair.client_preferred_start, repair.client_preferred_end);
    return slot ? `Preferred visit: ${slot} (pending shop confirmation)` : null;
  }
  return null;
}

export function canCancelAppointment(repair) {
  if (!repair?.scheduled_start || repair.vehicle_arrived_at) return false;
  if (isTerminalRepairStatus(repair.status)) return false;
  if (repair.pending_reschedule_proposal) return false;
  return normalizeRepairStatus(repair.status) === 'open' || normalizeRepairStatus(repair.status) === 'ongoing';
}
