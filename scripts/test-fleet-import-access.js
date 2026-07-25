#!/usr/bin/env node
/**
 * Fleet import frontend helper invariants.
 * Run: node scripts/test-fleet-import-access.js
 */

const assert = require('assert');

function organizationsWithFleetImportAccess(organizations = []) {
  return organizations.filter((org) => org.manage_fleet);
}

function fleetImportErrorReportUrl(organizationId, batchId, locale = 'en') {
  const qs = locale.startsWith('bg') ? '?locale=bg' : '';
  return `http://example.test/api/organizations/${organizationId}/fleet-import/${batchId}/errors.csv${qs}`;
}

assert.deepStrictEqual(
  organizationsWithFleetImportAccess([
    { id: 1, manage_fleet: true },
    { id: 2, manage_fleet: false },
    { id: 3, manage_fleet: true },
  ]).map((org) => org.id),
  [1, 3],
);

assert.match(
  fleetImportErrorReportUrl(5, 9, 'bg'),
  /\/api\/organizations\/5\/fleet-import\/9\/errors\.csv\?locale=bg$/,
);

console.log('fleet import frontend helpers ok');
