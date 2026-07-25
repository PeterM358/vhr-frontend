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

function rowNeedsOverrideReason(duplicateStatus, resolution) {
  if (resolution === 'skip') return false;
  return [
    'ambiguous',
    'plate_vin_conflict',
    'invalid_vin',
    'needs_review',
    'foreign_conflict',
    'personal_match',
  ].includes(duplicateStatus);
}

function statusLabel(status, labels) {
  return labels[status] || status;
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

assert.strictEqual(rowNeedsOverrideReason('needs_review', 'create'), true);
assert.strictEqual(rowNeedsOverrideReason('needs_review', 'skip'), false);
assert.strictEqual(rowNeedsOverrideReason('plate_match', 'create'), false);
assert.strictEqual(
  statusLabel('needs_review', { needs_review: 'Chassis/VIN review', ambiguous: 'Ambiguous' }),
  'Chassis/VIN review',
);
assert.notStrictEqual(statusLabel('needs_review', { needs_review: 'Chassis/VIN review' }), 'Duplicate');

console.log('fleet import frontend helpers ok');
