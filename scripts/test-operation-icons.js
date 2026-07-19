#!/usr/bin/env node
/**
 * Operation icon registry invariants (no Jest).
 * Run: node scripts/test-operation-icons.js
 */

const assert = require('assert');
const glyphs = require('react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');

const {
  SEEDED_OPERATION_ICON_KEYS,
  CATEGORY_ICON_KEYS,
  DEFAULT_OPERATION_VISUAL_PACK,
  GENERIC_SERVICE_ICON_KEY,
  getOperationIcon,
  resolveOperationIconKey,
  resolveRepairTypeIcon,
  setOperationIconVisualAdapter,
  resetOperationIconVisualAdapter,
  _resetUnknownIconWarningsForTests,
} = require('../src/icons/operationIconRegistry');

_resetUnknownIconWarningsForTests();
resetOperationIconVisualAdapter();

// 1. Every seeded op resolves to a non-empty icon glyph
for (const [slug, iconKey] of Object.entries(SEEDED_OPERATION_ICON_KEYS)) {
  const glyph = getOperationIcon({ slug, icon_key: iconKey });
  assert.ok(glyph && String(glyph).trim(), `seeded ${slug} must resolve to a glyph`);
  assert.notStrictEqual(glyph, '?', `seeded ${slug} must not be "?"`);
  assert.notStrictEqual(glyph, 'help-circle', `seeded ${slug} must not be help-circle`);
  assert.notStrictEqual(glyph, 'help-circle-outline', `seeded ${slug} must not be help-circle-outline`);
  assert.ok(
    glyphs[glyph] != null,
    `seeded ${slug} → ${iconKey} → "${glyph}" must be a valid MaterialCommunityIcons name`
  );
  // Coverage: Operations & Pricing seeded ops must not fall through to generic-only resolution
  // when icon_key / slug is present (explicit registry entry).
  assert.strictEqual(
    resolveOperationIconKey({ slug, icon_key: iconKey }),
    iconKey,
    `seeded ${slug} must resolve to its own icon_key`
  );
  assert.notStrictEqual(
    iconKey,
    GENERIC_SERVICE_ICON_KEY,
    `seeded op ${slug} must have a non-fallback icon_key`
  );
}

// Categories also map to valid glyphs
for (const [slug, iconKey] of Object.entries(CATEGORY_ICON_KEYS)) {
  const glyph = getOperationIcon({ category_slug: slug, category_icon_key: iconKey });
  assert.ok(glyphs[glyph] != null, `category ${slug} → "${glyph}" must be valid MCI`);
}

// Default pack glyphs are all valid MCI
for (const [key, glyph] of Object.entries(DEFAULT_OPERATION_VISUAL_PACK)) {
  assert.ok(glyphs[glyph] != null, `visual pack ${key} → "${glyph}" must be valid MCI`);
}

// 2. No question mark for legacy invalid Brake glyph
assert.notStrictEqual(getOperationIcon({ icon: 'brake-disc' }), '?');
assert.strictEqual(resolveOperationIconKey({ icon: 'brake-disc' }), 'brake_service');

// 3. Brake identical on selector (RepairType) + public profile (menu item shape)
const brakeSelector = getOperationIcon({
  slug: 'brake-repair',
  icon_key: 'brake_service',
  name: 'Brake Repair',
});
const brakePublic = getOperationIcon({
  repair_type_slug: 'brake-repair',
  repair_type_icon: 'brake_service',
  icon_key: 'brake_service',
  repair_type_name: 'Спирачки',
});
assert.strictEqual(brakeSelector, brakePublic, 'Brake icon must match selector vs public profile');
assert.strictEqual(brakeSelector, DEFAULT_OPERATION_VISUAL_PACK.brake_service);

// 4. Oil Change identical across selector, repair detail op, public profile
const oilSelector = getOperationIcon({ slug: 'oil-change', icon_key: 'oil_change' });
const oilDetail = getOperationIcon({
  operation_name: 'Oil Change',
  icon_key: 'oil_change',
  repair_type_slug: 'oil-change',
});
const oilPublic = getOperationIcon({
  repair_type_slug: 'oil-change',
  repair_type_icon: 'oil_change',
});
assert.strictEqual(oilSelector, oilDetail);
assert.strictEqual(oilSelector, oilPublic);
assert.strictEqual(oilSelector, DEFAULT_OPERATION_VISUAL_PACK.oil_change);

// 5. Unknown → generic_service
assert.strictEqual(resolveOperationIconKey({ icon_key: 'totally_unknown_xyz' }), GENERIC_SERVICE_ICON_KEY);
assert.strictEqual(getOperationIcon({ icon_key: 'totally_unknown_xyz' }), DEFAULT_OPERATION_VISUAL_PACK[GENERIC_SERVICE_ICON_KEY]);
assert.strictEqual(getOperationIcon(null), DEFAULT_OPERATION_VISUAL_PACK[GENERIC_SERVICE_ICON_KEY]);

// 6. Registry is the only mapping source (compat alias must delegate)
assert.strictEqual(
  resolveRepairTypeIcon({ icon_key: 'brake_service' }),
  getOperationIcon({ icon_key: 'brake_service' }),
  'resolveRepairTypeIcon must be an alias of getOperationIcon'
);
assert.strictEqual(
  resolveRepairTypeIcon({ icon: 'brake-disc', slug: 'brake-repair' }),
  getOperationIcon({ icon_key: 'brake_service' })
);

// 7. Translation / display name changes must not affect icons
const oilEn = getOperationIcon({ slug: 'oil-change', name: 'Oil Change' });
const oilBg = getOperationIcon({ slug: 'oil-change', name: 'Смяна на масло' });
const oilWrongName = getOperationIcon({
  slug: 'oil-change',
  name: 'Brake Repair',
  icon_key: 'oil_change',
});
assert.strictEqual(oilEn, oilBg);
assert.strictEqual(oilEn, oilWrongName);

// 8. Premium adapter is swappable
setOperationIconVisualAdapter((key) => (key === 'brake_service' ? 'premium-brake' : null));
assert.strictEqual(getOperationIcon({ icon_key: 'brake_service' }), 'premium-brake');
// Adapter returning null falls back to default pack
assert.strictEqual(getOperationIcon({ icon_key: 'oil_change' }), DEFAULT_OPERATION_VISUAL_PACK.oil_change);
resetOperationIconVisualAdapter();
assert.strictEqual(getOperationIcon({ icon_key: 'brake_service' }), DEFAULT_OPERATION_VISUAL_PACK.brake_service);

// Fallback chain: category when op icon missing
assert.strictEqual(
  resolveOperationIconKey({ category_icon_key: 'tire_service', slug: 'custom-shop-op' }),
  'tire_service'
);

// Legacy glyph still works pre-seed-backfill
assert.strictEqual(resolveOperationIconKey({ icon: 'oil' }), 'oil_change');
assert.strictEqual(getOperationIcon({ icon: 'oil' }), DEFAULT_OPERATION_VISUAL_PACK.oil_change);

console.log('test-operation-icons: ok');
