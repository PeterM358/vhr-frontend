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
  d.setHours(h, m, 0, 0);
  return d;
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
