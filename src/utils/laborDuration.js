/**
 * Billable labor duration display and form helpers.
 */

export function formatDurationMinutes(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m <= 0) return '0 min';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

/** Decimal hours input → minutes (e.g. "1.5" → 90). */
export function parseDurationHoursInput(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  if (!text) return null;
  const n = parseFloat(text);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 60);
}

/** Minutes → decimal hours for text inputs (e.g. 90 → "1.5"). */
export function formatDurationHoursInput(minutes) {
  if (minutes == null || minutes === '') return '';
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return '';
  const hours = m / 60;
  if (Number.isInteger(hours)) return String(hours);
  return hours.toFixed(1).replace(/\.0$/, '');
}
