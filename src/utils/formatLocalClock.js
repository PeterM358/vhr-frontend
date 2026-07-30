/**
 * Format ISO datetime clock in the viewer's local timezone.
 * Avoid String.slice(11,16) which shows UTC hours from ...Z payloads.
 */

export function formatLocalClock(iso, locale) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString(locale || undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch (_) {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

/**
 * Build local wall-clock Date from date (YYYY-MM-DD) + time (HH:MM[:SS]).
 * Avoids Date.parse ISO ambiguity (UTC vs local).
 */
export function localDateTimeFromParts(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [y, m, day] = String(dateStr).split('-').map(Number);
  const clock = String(timeStr).slice(0, 8);
  const [hh, mm, ss] = clock.split(':').map((p) => Number(p) || 0);
  if (![y, m, day].every(Number.isFinite)) return null;
  const d = new Date(y, m - 1, day, hh, mm, ss || 0, 0);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
