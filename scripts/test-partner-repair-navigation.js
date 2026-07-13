#!/usr/bin/env node
/**
 * Repair detail web path tests (no Jest). Run: npm run test:partner-repair-nav
 */

const assert = require('assert');
const { repairDetailWebPath, repairRequestDetail } = require('../src/navigation/webRoutes');

assert.strictEqual(
  repairDetailWebPath({ repairId: 42, returnTo: 'RepairsList' }),
  '/partner/repairs',
  'partner repairs list detail keeps partner/repairs URL'
);

assert.strictEqual(
  repairDetailWebPath({ repairId: 42, returnTo: 'ShopDashboard' }),
  '/partner/repairs',
  'partner dashboard detail keeps partner/repairs URL'
);

assert.strictEqual(
  repairDetailWebPath({ repairId: 7, returnTo: 'ShopCalendar' }),
  '/partner/calendar',
  'partner calendar detail keeps partner/calendar URL'
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

console.log('test-partner-repair-navigation: ok');
