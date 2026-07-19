#!/usr/bin/env node
/**
 * Multi-day occupancy + shop bay slot helpers for shop calendar cards.
 * Run: node scripts/test-shop-calendar-occupancy.js
 */

const assert = require('assert');

function dayStartLocal(value) {
  const d = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function getJobDayBounds(job) {
  if (!job) return null;
  const startIso = job.display_start || job.scheduled_start || job.client_preferred_start;
  if (!startIso) return null;
  const endIso = job.display_end || job.scheduled_end || job.client_preferred_end || startIso;
  const startDay = dayStartLocal(startIso);
  let endDay = dayStartLocal(endIso);
  if (!startDay) return null;
  if (!endDay || endDay < startDay) endDay = startDay;
  return { startIso, endIso, startDay, endDay };
}

function getOccupancyRoleForDay(job, dayDate) {
  const bounds = getJobDayBounds(job);
  if (!bounds || !dayDate) return null;
  const day = dayStartLocal(dayDate);
  if (!day) return null;
  const t = day.getTime();
  const start = bounds.startDay.getTime();
  const end = bounds.endDay.getTime();
  if (t < start || t > end) return null;
  if (start === end) return 'single';
  if (t === start) return 'bring';
  if (t === end) return 'ready';
  return 'stay';
}

/** Mirrors src/utils/shopCalendarJob.js assignShopBayNumbers */
function assignShopBayNumbers(jobs) {
  const intervals = [];
  (jobs || []).forEach((job) => {
    if (job?.id == null) return;
    const bounds = getJobDayBounds(job);
    if (!bounds) return;
    intervals.push({
      id: job.id,
      startMs: bounds.startDay.getTime(),
      endMs: bounds.endDay.getTime(),
      startSort: new Date(bounds.startIso).getTime(),
    });
  });

  intervals.sort((a, b) => a.startSort - b.startSort || Number(a.id) - Number(b.id));

  const assignment = new Map();
  const active = [];

  intervals.forEach((iv) => {
    for (let i = active.length - 1; i >= 0; i -= 1) {
      if (active[i].endMs < iv.startMs) active.splice(i, 1);
    }
    const used = new Set(active.map((a) => a.bay));
    let bay = 1;
    while (used.has(bay)) bay += 1;
    assignment.set(iv.id, bay);
    active.push({ endMs: iv.endMs, bay });
  });

  return assignment;
}

const job = {
  id: 1,
  scheduled_start: new Date(2026, 6, 17, 9, 0).toISOString(),
  scheduled_end: new Date(2026, 6, 19, 16, 0).toISOString(),
};

assert.strictEqual(getOccupancyRoleForDay(job, new Date(2026, 6, 17)), 'bring');
assert.strictEqual(getOccupancyRoleForDay(job, new Date(2026, 6, 18)), 'stay');
assert.strictEqual(getOccupancyRoleForDay(job, new Date(2026, 6, 19)), 'ready');
assert.strictEqual(getOccupancyRoleForDay(job, new Date(2026, 6, 20)), null);

const sameDay = {
  scheduled_start: new Date(2026, 6, 17, 9, 0).toISOString(),
  scheduled_end: new Date(2026, 6, 17, 16, 0).toISOString(),
};
assert.strictEqual(getOccupancyRoleForDay(sameDay, new Date(2026, 6, 17)), 'single');

const nullEnd = {
  scheduled_start: new Date(2026, 6, 17, 9, 0).toISOString(),
  scheduled_end: null,
};
assert.strictEqual(getOccupancyRoleForDay(nullEnd, new Date(2026, 6, 17)), 'single');
assert.strictEqual(getOccupancyRoleForDay(nullEnd, new Date(2026, 6, 18)), null);

// Two overlapping multi-day stays → Bay 1 and Bay 2
const carA = {
  id: 10,
  scheduled_start: new Date(2026, 6, 17, 9, 0).toISOString(), // Fri
  scheduled_end: new Date(2026, 6, 19, 16, 0).toISOString(), // Sun
};
const carB = {
  id: 11,
  scheduled_start: new Date(2026, 6, 18, 10, 0).toISOString(), // Sat
  scheduled_end: new Date(2026, 6, 20, 17, 0).toISOString(), // Mon
};
const overlapBays = assignShopBayNumbers([carA, carB]);
assert.strictEqual(overlapBays.get(10), 1);
assert.strictEqual(overlapBays.get(11), 2);
assert.strictEqual(getOccupancyRoleForDay(carA, new Date(2026, 6, 18)), 'stay');
assert.strictEqual(getOccupancyRoleForDay(carB, new Date(2026, 6, 18)), 'bring');

// Sequential stays recycle Bay 1
const carC = {
  id: 20,
  scheduled_start: new Date(2026, 6, 17, 9, 0).toISOString(),
  scheduled_end: new Date(2026, 6, 18, 12, 0).toISOString(),
};
const carD = {
  id: 21,
  scheduled_start: new Date(2026, 6, 19, 9, 0).toISOString(),
  scheduled_end: new Date(2026, 6, 20, 12, 0).toISOString(),
};
const recycleBays = assignShopBayNumbers([carC, carD]);
assert.strictEqual(recycleBays.get(20), 1);
assert.strictEqual(recycleBays.get(21), 1);

// Stable bay across bring / stay / ready for one job id
assert.strictEqual(overlapBays.get(10), 1);
assert.ok(getOccupancyRoleForDay(carA, new Date(2026, 6, 17)) === 'bring');
assert.ok(getOccupancyRoleForDay(carA, new Date(2026, 6, 18)) === 'stay');
assert.ok(getOccupancyRoleForDay(carA, new Date(2026, 6, 19)) === 'ready');

console.log('test-shop-calendar-occupancy: ok');
