/** Shared shop working-hours helpers (incl. global lunch break). */

export const WEEKDAYS_MON_FIRST = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const DAY_KEY = {
  Monday: 'monday',
  Tuesday: 'tuesday',
  Wednesday: 'wednesday',
  Thursday: 'thursday',
  Friday: 'friday',
  Saturday: 'saturday',
  Sunday: 'sunday',
};

const DAY_ALIASES = new Set([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
]);

export function normalizeWorkingHoursObject(value) {
  if (value == null || value === '') return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  return {};
}

export function parseLunchBreak(workingHours) {
  const src = normalizeWorkingHoursObject(workingHours);
  const row = src.lunch_break;
  if (!row || typeof row !== 'object') {
    return { hours: 0, start: '12:00', duration_hours: 0 };
  }
  const hours = Math.min(3, Math.max(0, Number(row.hours ?? row.duration_hours) || 0));
  const start = String(row.start || row.lunch_start || '12:00').trim() || '12:00';
  return { hours, start, duration_hours: hours };
}

export function attachLunchBreak(workingHours, { hours = 0, start = '12:00' } = {}) {
  const base = { ...normalizeWorkingHoursObject(workingHours) };
  const lunchHours = Math.min(3, Math.max(0, Number(hours) || 0));
  if (lunchHours > 0) {
    base.lunch_break = {
      hours: lunchHours,
      duration_hours: lunchHours,
      start: start || '12:00',
      lunch_start: start || '12:00',
    };
  } else {
    delete base.lunch_break;
  }
  return base;
}

export function isDayHoursKey(key) {
  const k = String(key).trim().toLowerCase();
  if (k === 'lunch_break') return false;
  if (DAY_ALIASES.has(k)) return true;
  return /^weekday[_-]?\d+$/i.test(k);
}

export function formatLunchBreakLabel(lunch) {
  if (!lunch?.hours) return '';
  const start = lunch.start || '12:00';
  const [h, m] = start.split(':').map((p) => parseInt(p, 10));
  const startMin = (Number.isFinite(h) ? h : 12) * 60 + (Number.isFinite(m) ? m : 0);
  const endMin = startMin + lunch.hours * 60;
  const endH = Math.floor(endMin / 60) % 24;
  const endM = endMin % 60;
  const end = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  return `lunch ${start}–${end}`;
}

/** Billable minutes per open day (open–close minus lunch). */
export function availableWorkMinutesForDay(workingHours, dayKey) {
  const src = normalizeWorkingHoursObject(workingHours);
  const row = src[dayKey];
  if (!row || row.closed) return 0;
  const start = String(row.start || '').trim();
  const end = String(row.end || '').trim();
  const [sh, sm] = start.split(':').map((p) => parseInt(p, 10));
  const [eh, em] = end.split(':').map((p) => parseInt(p, 10));
  if (!Number.isFinite(sh) || !Number.isFinite(eh)) return 0;
  let total = eh * 60 + (Number.isFinite(em) ? em : 0) - (sh * 60 + (Number.isFinite(sm) ? sm : 0));
  const lunch = parseLunchBreak(src);
  if (lunch.hours > 0) {
    total -= lunch.hours * 60;
  }
  return Math.max(0, total);
}

export function formatDayHoursWithLunch(dayValue, lunch) {
  if (dayValue == null) return 'Closed';
  if (typeof dayValue === 'string') {
    if (dayValue.toLowerCase().includes('closed')) return 'Closed';
    const lunchLabel = formatLunchBreakLabel(lunch);
    return lunchLabel ? `${dayValue} (${lunchLabel})` : dayValue;
  }
  if (typeof dayValue === 'object') {
    if (dayValue.closed) return 'Closed';
    const start = dayValue.start != null ? String(dayValue.start) : '';
    const end = dayValue.end != null ? String(dayValue.end) : '';
    if (!start && !end) return 'Closed';
    if (!start || !end) return start || end;
    const lunchLabel = formatLunchBreakLabel(lunch);
    return lunchLabel ? `${start} – ${end} (${lunchLabel})` : `${start} – ${end}`;
  }
  return String(dayValue);
}
