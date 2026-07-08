import { SCHEDULE_TIME_SLOTS, addCalendarDays, dayStart, applyTimeSlotToDate } from './scheduleSlotPicker';
import { normalizeWorkingHoursObject, parseLunchBreak } from './shopWorkingHours';

const DEFAULT_VISIT_MINUTES = 120;

const WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

function timeToMinutes(value) {
  const [h, m] = String(value || '')
    .split(':')
    .map((part) => parseInt(part, 10));
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

function slotsForHours(start, end, lunchBreak) {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (startMin == null || endMin == null || endMin <= startMin) return [];

  let lunchStartMin = null;
  let lunchEndMin = null;
  if (lunchBreak?.hours > 0) {
    lunchStartMin = timeToMinutes(lunchBreak.start || '12:00');
    if (lunchStartMin != null) {
      lunchEndMin = lunchStartMin + lunchBreak.hours * 60;
    }
  }

  return SCHEDULE_TIME_SLOTS.filter((slot) => {
    const slotMin = timeToMinutes(slot);
    if (slotMin == null || slotMin < startMin || slotMin >= endMin) return false;
    if (lunchStartMin != null && lunchEndMin != null) {
      if (slotMin >= lunchStartMin && slotMin < lunchEndMin) return false;
    }
    return true;
  });
}

function slotsForHoursLegacy(start, end) {
  return slotsForHours(start, end, null);
}

function hoursForDate(workingHours, date) {
  if (!workingHours || typeof workingHours !== 'object') return null;
  const key = WEEKDAY_KEYS[date.getDay()];
  const row = workingHours[key] ?? workingHours[String(WEEKDAY_KEYS.indexOf(key))];
  if (!row || row.closed) return null;
  const start = String(row.start || '').trim();
  const end = String(row.end || '').trim();
  if (!start || !end) return null;
  return { start, end };
}

function formatDayLabel(date, offset, { t, locale } = {}) {
  if (offset === 0) return t ? t('requestService.today') : 'Today';
  if (offset === 1) return t ? t('requestService.tomorrow') : 'Tomorrow';
  const loc = locale || undefined;
  const weekday = date.toLocaleDateString(loc, { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString(loc, { month: 'short' });
  return `${weekday} ${day} ${month}`;
}

/**
 * Next open days with time slots that fit the shop working hours.
 */
export function buildVisitSlotOptions(workingHours, { maxDays = 14, horizon = 21, t, locale } = {}) {
  const labelOpts = { t, locale };
  const options = [];
  const today = dayStart(new Date());
  const lunchBreak = parseLunchBreak(workingHours);

  for (let offset = 0; offset < horizon && options.length < maxDays; offset += 1) {
    const date = addCalendarDays(today, offset);
    const hours = hoursForDate(workingHours, date);
    if (!hours) continue;
    const slots = slotsForHours(hours.start, hours.end, lunchBreak);
    if (!slots.length) continue;
    let hoursLabel = `${hours.start}–${hours.end}`;
    if (lunchBreak.hours > 0) {
      hoursLabel += ` (lunch ${lunchBreak.start})`;
    }
    options.push({
      offset,
      date,
      label: formatDayLabel(date, offset, labelOpts),
      slots,
      hoursLabel,
    });
  }

  if (!options.length) {
    const fallbackSlots = slotsForHoursLegacy('09:00', '18:00');
    for (let offset = 0; offset < 7; offset += 1) {
      const date = addCalendarDays(today, offset);
      options.push({
        offset,
        date,
        label: formatDayLabel(date, offset, labelOpts),
        slots: fallbackSlots,
        hoursLabel: 'Suggested',
      });
    }
  }

  return options;
}

export function formatPreferredVisitNote(dayOption, timeSlot, translateFn) {
  if (!dayOption) return '';
  const dateLabel = dayOption.label;
  if (translateFn) {
    if (!timeSlot) {
      return translateFn('requestService.preferredVisitSummary', { date: dateLabel });
    }
    return translateFn('requestService.preferredVisitSummaryWithTime', {
      date: dateLabel,
      time: timeSlot,
    });
  }
  if (!timeSlot) return `Preferred visit: ${dateLabel} (pending service center confirmation)`;
  return `Preferred visit: ${dateLabel}, ${timeSlot} (pending service center confirmation)`;
}

export function buildPreferredVisitTimes(dayOption, timeSlot) {
  if (!dayOption?.date) return { start: null, end: null };
  const slot = timeSlot || '09:00';
  const start = applyTimeSlotToDate(dayOption.date, slot);
  const end = new Date(start.getTime() + DEFAULT_VISIT_MINUTES * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
