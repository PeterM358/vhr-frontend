#!/usr/bin/env node
/**
 * Pickup slot + multi-day calendar occupancy helpers (no Jest / no RN).
 * Mirrors scheduleSlotPicker.js ensurePickupAfterBring + calendar multi-day grouping.
 * Run: node scripts/test-pickup-calendar-ux.js
 */

const assert = require('assert');

const TIME_SLOTS = [
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

function dayStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addCalendarDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function slotToMinutes(slot) {
  const [h, m] = String(slot || '').split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

function dateToMinutes(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function applyTimeSlotToDate(baseDate, slot) {
  const [h, m] = String(slot).split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m || 0, 0, 0);
  return d;
}

function mergeDateWithTime(baseDay, timeSource) {
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

function firstSlotAfter(afterDate, slots = TIME_SLOTS) {
  const min = dateToMinutes(afterDate);
  return (
    slots.find((slot) => {
      const mins = slotToMinutes(slot);
      return mins != null && mins > min;
    }) || null
  );
}

function ensurePickupAfterBring(bring, candidate, slots = TIME_SLOTS) {
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
  const onBringDay = mergeDateWithTime(bring, candidate);
  if (onBringDay.getTime() > bring.getTime()) return onBringDay;
  const slot = firstSlotAfter(bring, slots);
  if (slot) return applyTimeSlotToDate(bring, slot);
  const nextDay = addCalendarDays(dayStart(bring), 1);
  return mergeDateWithTime(nextDay, candidate);
}

function dayOffsetFromAnchor(anchor, target) {
  return Math.round((dayStart(target).getTime() - dayStart(anchor).getTime()) / (24 * 60 * 60 * 1000));
}

function groupByDay(items, rangeStart, dayCount = 7) {
  const buckets = Array.from({ length: dayCount }, (_, i) => {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    return { date: d, items: [] };
  });
  (items || []).forEach((item) => {
    const startIso = item.display_start || item.scheduled_start;
    if (!startIso) return;
    const startDay = dayStart(new Date(startIso));
    const endIso = item.display_end || item.scheduled_end;
    let endDay = endIso ? dayStart(new Date(endIso)) : startDay;
    if (endDay < startDay) endDay = startDay;
    buckets.forEach((bucket) => {
      const bucketDay = dayStart(bucket.date);
      if (bucketDay >= startDay && bucketDay <= endDay) {
        bucket.items.push(item);
      }
    });
  });
  return buckets;
}

const bring = new Date(2026, 6, 17, 14, 0, 0, 0);
assert.strictEqual(firstSlotAfter(bring), '15:00');
assert.ok(slotToMinutes('14:00') <= dateToMinutes(bring));
assert.ok(slotToMinutes('15:00') > dateToMinutes(bring));

const tooEarly = applyTimeSlotToDate(bring, '10:00');
const bumped = ensurePickupAfterBring(bring, tooEarly);
assert.strictEqual(bumped.getHours(), 15);
assert.ok(bumped.getTime() > bring.getTime());

const nextDayMorning = new Date(2026, 6, 18, 9, 0, 0, 0);
assert.strictEqual(ensurePickupAfterBring(bring, nextDayMorning).getTime(), nextDayMorning.getTime());

// Late bring with same-day pickup earlier → bump to next day keeping time.
const lateBring = new Date(2026, 6, 17, 17, 0, 0, 0);
const latePickup = new Date(2026, 6, 17, 16, 0, 0, 0);
const nextDayPickup = ensurePickupAfterBring(lateBring, latePickup);
assert.strictEqual(nextDayPickup.getDate(), 18);
assert.strictEqual(nextDayPickup.getHours(), 16);
assert.ok(nextDayPickup.getTime() > lateBring.getTime());

// Moving come-in later must bump same-day pickup.
const comeInMoved = new Date(2026, 6, 17, 12, 0, 0, 0);
const existingPickup = new Date(2026, 6, 17, 11, 0, 0, 0);
const afterComeInMove = ensurePickupAfterBring(comeInMoved, existingPickup);
assert.strictEqual(afterComeInMove.getHours(), 13);
assert.strictEqual(dayOffsetFromAnchor(comeInMoved, afterComeInMove), 0);

const rangeStart = new Date(2026, 6, 17);
const job = {
  id: 1,
  scheduled_start: new Date(2026, 6, 17, 9, 0).toISOString(),
  scheduled_end: new Date(2026, 6, 19, 16, 0).toISOString(),
};
const buckets = groupByDay([job], rangeStart, 5);
assert.strictEqual(buckets[0].items.length, 1, 'bring day');
assert.strictEqual(buckets[1].items.length, 1, 'middle day');
assert.strictEqual(buckets[2].items.length, 1, 'ready day');
assert.strictEqual(buckets[3].items.length, 0, 'after ready');

function dayStartLocal(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getOccupancyRoleForDay(job, dayDate) {
  const startIso = job.display_start || job.scheduled_start;
  const endIso = job.display_end || job.scheduled_end || startIso;
  const start = dayStartLocal(startIso).getTime();
  const end = dayStartLocal(endIso).getTime();
  const day = dayStartLocal(dayDate).getTime();
  if (day < start || day > end) return null;
  if (start === end) return 'single';
  if (day === start) return 'bring';
  if (day === end) return 'ready';
  return 'stay';
}

assert.strictEqual(getOccupancyRoleForDay(job, buckets[0].date), 'bring');
assert.strictEqual(getOccupancyRoleForDay(job, buckets[1].date), 'stay');
assert.strictEqual(getOccupancyRoleForDay(job, buckets[2].date), 'ready');

// Re-opening an existing custom pickup must not require retyping the date string.
function confirmPickupWithOptionalCustomStr(workingDate, webCustomBringDateStr, pickupCustomDateActive) {
  let next = workingDate;
  if (pickupCustomDateActive) {
    const raw = String(webCustomBringDateStr || '').trim();
    if (!raw) {
      next = workingDate;
    }
  }
  return next;
}
const existingCustomPickup = new Date(2026, 6, 20, 11, 0, 0, 0);
assert.strictEqual(
  confirmPickupWithOptionalCustomStr(existingCustomPickup, '', true).getTime(),
  existingCustomPickup.getTime(),
  'empty custom date string keeps workingDate'
);

console.log('test-pickup-calendar-ux: ok');
