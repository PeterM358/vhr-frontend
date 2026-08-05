/**
 * Shared month-occupancy calendar math (base shell).
 * Domain adapters (fleet WorkOrder, shop Repair) stay outside this file.
 * @see vhr/docs/unified-occupancy-board-vision.md
 */

export function currentMonthIso(date = new Date()) {
  const d = date instanceof Date ? date : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(monthIso, delta) {
  const [y, m] = String(monthIso).split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function daysInMonth(monthIso) {
  const [y, m] = String(monthIso).split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => i + 1);
}

export function isoDay(monthIso, day) {
  const [y, m] = String(monthIso).split('-');
  return `${y}-${m}-${String(day).padStart(2, '0')}`;
}

export function dayOverlapsSpan(dayIso, span) {
  const start = span?.start || span?.scheduled_date;
  const end = span?.end || span?.scheduled_end_date || start;
  if (!start) return false;
  return dayIso >= start && dayIso <= (end || start);
}

export function spanDurationDays(span) {
  const start = span?.start || span?.scheduled_date;
  const end = span?.end || span?.scheduled_end_date || start;
  if (!start) return 1;
  const a = new Date(`${start}T12:00:00`);
  const b = new Date(`${(end || start)}T12:00:00`);
  const diff = Math.round((b - a) / 86400000);
  return Math.max(1, diff + 1);
}

/** Shift YYYY-MM-DD by delta days (calendar). */
export function addDaysIso(iso, deltaDays) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + Number(deltaDays || 0));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function clampRange(startIso, endIso) {
  if (!startIso) return { start: endIso, end: endIso };
  if (!endIso) return { start: startIso, end: startIso };
  if (startIso <= endIso) return { start: startIso, end: endIso };
  return { start: endIso, end: startIso };
}

export function defaultStatusColor(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'done' || s === 'completed' || s === 'ready') return '#94A3B8';
  // Repair uses `ongoing`; WorkOrder / board spans may use `in_progress`.
  if (s === 'in_progress' || s === 'in-progress' || s === 'ongoing') return '#0EA5E9';
  if (s === 'assigned' || s === 'confirmed') return '#6366F1';
  return '#F59E0B';
}
