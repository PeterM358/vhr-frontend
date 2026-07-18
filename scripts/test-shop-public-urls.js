#!/usr/bin/env node
/**
 * Public service-center URL path invariants (no Jest).
 * Run: node scripts/test-shop-public-urls.js
 *
 * Uses CommonJS webRoutes only (same pattern as test-partner-repair-navigation.js).
 */

const assert = require('assert');
const { serviceCenterProfile, serviceCenterDetail, serviceCenters } = require('../src/navigation/webRoutes');

const PROFILE_FIELD_TO_SECTION = {
  'business name': 'business',
  description: 'business',
  'vehicle type': 'business',
  address: 'contact_location',
  phone: 'contact_location',
  'map pin': 'contact_location',
  city: 'contact_location',
  country: 'contact_location',
  operation: 'operations',
  'operation price': 'operations',
  photos: 'photos',
  'working hours': 'working_hours',
  warranty: 'warranty',
  warehouse: 'warehouse',
  'legal name': 'company',
  'vat number': 'company',
  'invoice address': 'company',
  'google business': 'online_presence',
  facebook: 'online_presence',
  instagram: 'online_presence',
};

assert.strictEqual(
  serviceCenterProfile('peshos-garage-bozhurishte'),
  '/service-center/peshos-garage-bozhurishte',
  'canonical profile path has no city segment'
);
assert.strictEqual(
  serviceCenterDetail(20),
  '/service-center/20',
  'legacy id fallback stays on profile prefix, not discovery'
);
assert.strictEqual(serviceCenters(), '/service-centers');
assert.ok(!serviceCenterDetail(20).startsWith('/service-centers/'));

assert.strictEqual(PROFILE_FIELD_TO_SECTION['business name'], 'business');
assert.strictEqual(PROFILE_FIELD_TO_SECTION['map pin'], 'contact_location');
assert.strictEqual(PROFILE_FIELD_TO_SECTION['operation price'], 'operations');
assert.strictEqual(PROFILE_FIELD_TO_SECTION['working hours'], 'working_hours');
assert.strictEqual(PROFILE_FIELD_TO_SECTION.photos, 'photos');
assert.strictEqual(PROFILE_FIELD_TO_SECTION['legal name'], 'company');
assert.strictEqual(PROFILE_FIELD_TO_SECTION['vat number'], 'company');
assert.strictEqual(PROFILE_FIELD_TO_SECTION['invoice address'], 'company');
assert.strictEqual(PROFILE_FIELD_TO_SECTION.description, 'business');
assert.strictEqual(PROFILE_FIELD_TO_SECTION.phone, 'contact_location');

console.log('test-shop-public-urls: ok');
