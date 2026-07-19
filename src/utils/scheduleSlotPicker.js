/**
 * Shared date/time slot picking (same UX as offer booking).
 */

import { Platform } from 'react-native';

export const SCHEDULE_DAY_OFFSETS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: '+2 days', days: 2 },
  { label: '+3 days', days: 3 },
  { label: '+1 week', days: 7 },
];

export const SCHEDULE_TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

export function dayStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addCalendarDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function applyDayOffset(baseDate, dayOffset, timeSource) {
  const day = dayStart(addCalendarDays(new Date(), dayOffset));
  const src = timeSource || baseDate || new Date();
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    src.getHours(),
    src.getMinutes(),
    0,
    0
  );
}

export function applyTimeSlotToDate(baseDate, slot) {
  const [h, m] = String(slot).split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m || 0, 0, 0);
  return d;
}

export function slotToMinutes(slot) {
  const [h, m] = String(slot || '').split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

export function dateToMinutes(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
}

/** First slot strictly after `afterDate` on the same local day; null if none. */
export function firstSlotAfter(afterDate, slots = SCHEDULE_TIME_SLOTS) {
  const min = dateToMinutes(afterDate);
  if (min == null) return slots[0] || null;
  return slots.find((slot) => {
    const mins = slotToMinutes(slot);
    return mins != null && mins > min;
  }) || null;
}

/**
 * Ensure pickup datetime is strictly after bring.
 * Same-day: bump to the next SCHEDULE_TIME_SLOTS after bring when needed.
 * If still not after bring (e.g. bring at last slot), move to next day keeping time.
 */
export function ensurePickupAfterBring(bring, candidate, slots = SCHEDULE_TIME_SLOTS) {
  if (!bring || !candidate || Number.isNaN(bring.getTime()) || Number.isNaN(candidate.getTime())) {
    return candidate;
  }
  if (candidate.getTime() > bring.getTime()) return candidate;
  const sameDay = dayStart(bring).getTime() === dayStart(candidate).getTime();
  if (sameDay) {
    const slot = firstSlotAfter(bring, slots);
    if (slot) {
      const bumped = applyTimeSlotToDate(candidate, slot);
      if (bumped.getTime() > bring.getTime()) return bumped;
    }
    const nextDay = addCalendarDays(dayStart(candidate), 1);
    return mergeDateWithTime(nextDay, candidate);
  }
  // Candidate day is before bring day — snap to bring day + first later slot, else next day.
  const onBringDay = mergeDateWithTime(bring, candidate);
  if (onBringDay.getTime() > bring.getTime()) return onBringDay;
  const slot = firstSlotAfter(bring, slots);
  if (slot) return applyTimeSlotToDate(bring, slot);
  const nextDay = addCalendarDays(dayStart(bring), 1);
  return mergeDateWithTime(nextDay, candidate);
}

export function dayOffsetFromToday(d) {
  if (!d || Number.isNaN(d.getTime())) return null;
  return Math.round((dayStart(d).getTime() - dayStart(new Date()).getTime()) / (24 * 60 * 60 * 1000));
}

export function dayOffsetFromAnchor(anchor, target) {
  if (!anchor || !target || Number.isNaN(anchor.getTime()) || Number.isNaN(target.getTime())) {
    return null;
  }
  return Math.round((dayStart(target).getTime() - dayStart(anchor).getTime()) / (24 * 60 * 60 * 1000));
}

export function formatCustomDateInput(d) {
  if (!d || Number.isNaN(d.getTime())) return '';
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function formatSchedulePreview(date) {
  if (!date || Number.isNaN(date.getTime())) return '—';
  const dd = date.getDate().toString().padStart(2, '0');
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = date.getFullYear();
  const hm = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  return `${dd}.${mm}.${yyyy}, ${hm}`;
}

export function parseDdMmYyyy(str) {
  const m = String(str || '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const year = parseInt(m[3], 10);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

export function mergeDateWithTime(baseDay, timeSource) {
  return new Date(
    baseDay.getFullYear(),
    baseDay.getMonth(),
    baseDay.getDate(),
    timeSource.getHours(),
    timeSource.getMinutes(),
    0,
    0
  );
}

export const isWeb = Platform.OS === 'web';
