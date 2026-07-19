#!/usr/bin/env node
/**
 * Repair detail web path tests (no Jest). Run: npm run test:partner-repair-nav
 */

const assert = require('assert');
const {
  repairDetailWebPath,
  repairRequestDetail,
  partnerRepairDetail,
  partnerRepairs,
  normalizeWebPath,
} = require('../src/navigation/webRoutes');

assert.strictEqual(
  partnerRepairDetail(42),
  '/partner/repairs/42',
  'partnerRepairDetail builds partner detail URL'
);

assert.strictEqual(
  repairDetailWebPath({ repairId: 42, returnTo: 'RepairsList', initialTab: 'ongoing' }),
  '/partner/repairs/42?tab=ongoing',
  'partner detail preserves list tab in query when provided'
);

assert.strictEqual(
  repairDetailWebPath({ repairId: 42, returnTo: 'ShopDashboard' }),
  '/partner/repairs/42',
  'partner dashboard detail uses partner/repairs/:id URL'
);

assert.strictEqual(
  repairDetailWebPath({ repairId: 7, returnTo: 'ShopCalendar' }),
  '/partner/repairs/7',
  'partner calendar detail uses partner/repairs/:id URL'
);

assert.strictEqual(
  repairDetailWebPath({ repairId: 99, returnTo: 'ClientRepairs' }),
  '/dashboard/repair-requests/99',
  'client repair detail uses dashboard repair-requests path'
);

assert.strictEqual(
  repairDetailWebPath({ returnTo: 'ClientRepairs' }),
  '/dashboard/repair-requests',
  'client repair detail without id falls back to list path'
);

assert.strictEqual(
  repairDetailWebPath({ repairId: 55 }),
  '/dashboard/repair-requests/55',
  'client repair detail without returnTo still uses detail path when id present'
);

assert.strictEqual(
  repairRequestDetail(123),
  '/dashboard/repair-requests/123',
  'repairRequestDetail builds canonical client detail URL'
);

assert.strictEqual(
  partnerRepairs(),
  '/partner/repairs',
  'partner repairs list path unchanged'
);

assert.strictEqual(
  normalizeWebPath('/partner/repairs/42'),
  '/partner/repairs/42',
  'normalizeWebPath keeps partner repair detail path'
);

assert.strictEqual(
  normalizeWebPath('/partner/repairs/42/offer'),
  '/partner/repairs/42/offer',
  'normalizeWebPath keeps partner repair offer path'
);

assert.ok(
  !String(repairDetailWebPath({ repairId: 42, returnTo: 'RepairsList' })).includes(
    '/dashboard/repair-requests/'
  ),
  'partner detail never uses client dashboard repair-requests path'
);

console.log('test-partner-repair-navigation: ok');
