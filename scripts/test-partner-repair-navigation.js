#!/usr/bin/env node
/**
 * Partner repair detail web path tests (no Jest). Run: npm run test:partner-repair-nav
 */

const assert = require('assert');
const { repairDetailWebPath } = require('../src/navigation/webRoutes');

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

console.log('test-partner-repair-navigation: ok');
