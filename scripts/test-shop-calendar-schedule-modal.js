#!/usr/bin/env node
/**
 * Schedule-modal auto-open / session-dismiss helpers.
 * Run: node scripts/test-shop-calendar-schedule-modal.js
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const srcPath = path.join(__dirname, '../src/utils/shopCalendarScheduleModal.js');
const src = fs.readFileSync(srcPath, 'utf8');
const wrapped = src
  .replace(/export function/g, 'function')
  .replace(/export \{[^}]+\};?/g, '');
const context = {
  module: { exports: {} },
  exports: {},
  console,
};
vm.runInNewContext(
  `${wrapped}\nmodule.exports = {\n  scheduleModalStatusKey,\n  shouldAutoOpenScheduleModal,\n  canAutoOpenFocusedRepair,\n  sameCalendarDay,\n};\n`,
  context
);
const {
  scheduleModalStatusKey,
  shouldAutoOpenScheduleModal,
  canAutoOpenFocusedRepair,
  sameCalendarDay,
} = context.module.exports;

const requestJob = {
  id: 42,
  schedule_confirmed: false,
  scheduled_start: null,
  client_preferred_start: '2026-07-23T07:00:00.000Z',
};

assert.strictEqual(shouldAutoOpenScheduleModal(requestJob), true);
assert.ok(scheduleModalStatusKey(requestJob).startsWith('42|'));

const dismissed = new Map();
const statusKey = scheduleModalStatusKey(requestJob);
dismissed.set(42, statusKey);

assert.strictEqual(
  canAutoOpenFocusedRepair({
    focusRepairId: 42,
    job: requestJob,
    sessionDismissedMap: dismissed,
    alreadyOpenedKey: null,
    allowAutoOpen: true,
  }),
  false,
  'session dismiss blocks re-open'
);

assert.strictEqual(
  canAutoOpenFocusedRepair({
    focusRepairId: 42,
    job: requestJob,
    sessionDismissedMap: new Map(),
    alreadyOpenedKey: null,
    allowAutoOpen: false,
  }),
  false,
  'default policy: no auto-open'
);

assert.strictEqual(
  canAutoOpenFocusedRepair({
    focusRepairId: 42,
    job: requestJob,
    sessionDismissedMap: new Map(),
    alreadyOpenedKey: null,
    allowAutoOpen: true,
  }),
  true,
  'optional one-shot allowed when not dismissed'
);

const booked = { ...requestJob, schedule_confirmed: true, scheduled_start: '2026-07-23T07:00:00.000Z' };
assert.strictEqual(shouldAutoOpenScheduleModal(booked), false);

const d1 = new Date(2026, 6, 23, 10, 0, 0);
const d2 = new Date(2026, 6, 23, 18, 30, 0);
assert.strictEqual(sameCalendarDay(d1, d2), true);
assert.strictEqual(sameCalendarDay(d1, new Date(2026, 6, 24)), false);

const screen = fs.readFileSync(path.join(__dirname, '../src/screens/ShopCalendarScreen.js'), 'utf8');
assert.ok(
  !screen.includes('open once when focus/job list resolves'),
  'legacy auto-open effect should be removed'
);
assert.ok(
  !screen.includes('route.params?.focusRepairId, calendar.scheduled, calendar.unscheduled'),
  'focusRepairId no longer tied to calendar list for auto-open'
);
assert.ok(screen.includes('sessionDismissedFocusRef'), 'session dismiss ref present');
assert.ok(screen.includes('unscheduledBanner'), 'soft unscheduled banner present');
assert.ok(screen.includes('loadCalendarRef'), 'stable poll via loadCalendarRef');
assert.ok(
  screen.includes('navigation.setParams({ focusRepairId: undefined, focusDate: undefined })'),
  'clears sticky deep-link params'
);

console.log('test-shop-calendar-schedule-modal: ok');
