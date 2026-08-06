#!/usr/bin/env node
/**
 * Ensure React Navigation linking paths are unique (no duplicate URL patterns).
 * Run: node scripts/test-linking-patterns.js
 */

const assert = require('assert');
const { linkingScreens } = require('../src/navigation/linkingConfig');

function joinPath(prefix, segment) {
  const left = String(prefix || '').replace(/\/+$/, '');
  const right = String(segment || '').replace(/^\/+/, '');
  if (!left) return right;
  if (!right) return left;
  return `${left}/${right}`;
}

function collectPatterns(screens, prefix = '', lineage = []) {
  const rows = [];
  for (const [screenName, config] of Object.entries(screens)) {
    const nextLineage = [...lineage, screenName];
    let pathSegment = '';
    let nested = null;

    if (typeof config === 'string') {
      pathSegment = config;
    } else if (config && typeof config === 'object') {
      pathSegment = config.path ?? '';
      nested = config.screens || null;
    }

    const pattern = joinPath(prefix, pathSegment);
    rows.push({
      pattern,
      screen: screenName,
      route: nextLineage.join(' > '),
    });

    if (nested) {
      rows.push(...collectPatterns(nested, pattern, nextLineage));
    }
  }
  return rows;
}

const patterns = collectPatterns(linkingScreens);
const byPattern = new Map();

for (const row of patterns) {
  if (!row.pattern) continue;
  const list = byPattern.get(row.pattern) || [];
  list.push(row);
  byPattern.set(row.pattern, list);
}

const duplicates = [...byPattern.entries()].filter(([pattern, rows]) => {
  if (rows.length <= 1) return false;
  const roots = new Set(rows.map((row) => row.route.split(' > ')[0]));
  return roots.size > 1;
});

if (duplicates.length) {
  console.error('Duplicate linking patterns found:');
  for (const [pattern, rows] of duplicates) {
    console.error(`  ${pattern}`);
    for (const row of rows) {
      console.error(`    - ${row.route}`);
    }
  }
  process.exit(1);
}

const orgNetwork = patterns.find((row) => row.route === 'OrgHome > OrgNetwork');
const shopNetwork = patterns.find((row) => row.screen === 'NetworkOrganization');
const orgFleet = patterns.find((row) => row.route === 'OrgHome > OrgFleet');
const legacyFleet = patterns.find((row) => row.screen === 'FleetDashboard');

assert.ok(orgNetwork, 'OrgHome > OrgNetwork must exist');
assert.strictEqual(orgNetwork.pattern, 'partner/organization/network');
assert.ok(shopNetwork, 'NetworkOrganization must exist');
assert.strictEqual(shopNetwork.pattern, 'partner/business-network');
assert.ok(orgFleet, 'OrgHome > OrgFleet must exist');
assert.strictEqual(orgFleet.pattern, 'partner/organization/fleet');
assert.ok(legacyFleet, 'FleetDashboard must exist');
assert.strictEqual(legacyFleet.pattern, 'partner/fleet');

const shopWarehouse = patterns.find((row) => row.screen === 'ShopWarehouse');
const shopInvoicing = patterns.find((row) => row.screen === 'ShopInvoicing');
assert.ok(shopWarehouse, 'ShopWarehouse must exist as stack linking route');
assert.strictEqual(shopWarehouse.pattern, 'partner/warehouse');
assert.ok(shopInvoicing, 'ShopInvoicing must exist');
assert.strictEqual(shopInvoicing.pattern, 'partner/invoicing');
// Must not nest warehouse under ShopHome (collided with root Stack.Screen name).
assert.ok(
  !patterns.some((row) => row.route === 'ShopHome > ShopWarehouse'),
  'ShopWarehouse must not be nested under ShopHome drawer linking'
);

console.log(`linking patterns ok (${patterns.length} routes, no duplicates)`);
