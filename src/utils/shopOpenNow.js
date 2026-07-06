import { DAY_KEY } from './shopWorkingHours';
import { normalizeWorkingHoursObject } from './shopWorkingHours';

function minutesSinceMidnight(hour, minute = 0) {
  return hour * 60 + minute;
}

function parseTimeParts(value) {
  const text = String(value || '').trim();
  if (!text) return [null, null];
  const [h, m] = text.split(':').map((p) => parseInt(p, 10));
  if (!Number.isFinite(h)) return [null, null];
  return [h, Number.isFinite(m) ? m : 0];
}

export function isShopOpenNow(workingHours, when = new Date()) {
  const src = normalizeWorkingHoursObject(workingHours);
  if (!Object.keys(src).length) return null;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayKey = DAY_KEY[dayNames[when.getDay()]];
  const row = src[dayKey];
  if (!row || typeof row !== 'object') return null;
  if (row.closed) return false;

  const [sh, sm] = parseTimeParts(row.start);
  const [eh, em] = parseTimeParts(row.end);
  if (sh == null || eh == null) return null;

  const current = minutesSinceMidnight(when.getHours(), when.getMinutes());
  const start = minutesSinceMidnight(sh, sm);
  const end = minutesSinceMidnight(eh, em);
  if (end <= start) {
    return current >= start || current < end;
  }
  return current >= start && current < end;
}
