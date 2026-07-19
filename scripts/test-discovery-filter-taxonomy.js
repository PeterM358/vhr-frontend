#!/usr/bin/env node
/**
 * Discovery filter taxonomy invariants (Service category + Repair type chips).
 * Run: node scripts/test-discovery-filter-taxonomy.js
 *
 * Loads ESM utils via dynamic import with explicit .js paths (Node ESM).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));
}

const en = loadJson('src/i18n/en.json');
const bg = loadJson('src/i18n/bg.json');

function getByPath(obj, keyPath) {
  return String(keyPath || '')
    .split('.')
    .reduce((acc, part) => (acc == null ? undefined : acc[part]), obj);
}

function makeT(catalog) {
  return (key, _vars, fallback) => {
    const hit = getByPath(catalog, key);
    if (hit != null && String(hit).trim()) return String(hit);
    if (fallback !== undefined && fallback !== null) return String(fallback);
    return key;
  };
}

async function importSrc(rel) {
  const abs = path.join(__dirname, '..', rel);
  return import(pathToFileURL(abs).href);
}

async function main() {
  const taxonomy = await importSrc('src/utils/discoveryFilterTaxonomy.js');
  const icons = await importSrc('src/icons/operationIconRegistry.js');

  const {
    humanizeSlug,
    normalizeRepairTypeForFilter,
    buildCategoryFilterOptions,
    chipIconGlyph,
  } = taxonomy;
  const { GENERIC_SERVICE_ICON_KEY, getOperationIcon } = icons;

  const sampleTypes = [
    {
      id: 1,
      slug: 'oil-change',
      name: 'Oil Change',
      name_en: 'Oil Change',
      name_bg: 'Смяна на масло',
      category: 10,
      category_name: 'Maintenance',
      category_slug: 'maintenance',
      icon_key: 'oil_change',
      category_icon_key: 'maintenance',
    },
    {
      id: 2,
      slug: 'brake-repair',
      name: 'Brake Repair',
      name_en: 'Brake Repair',
      name_bg: 'Ремонт на спирачки',
      category: 11,
      category_name: 'Mechanical',
      category_slug: 'mechanical',
      icon_key: 'brake_service',
      category_icon_key: 'mechanical',
    },
    {
      id: 3,
      slug: 'brand-new-untranslated-op',
      name: '',
      name_en: '',
      name_bg: '',
      category: 12,
      category_name: '',
      category_slug: 'mystery-category',
      icon: '',
      icon_key: '',
      category_icon_key: '',
    },
  ];

  const tEn = makeT(en);
  const tBg = makeT(bg);

  // 1. EN non-empty labels
  const catsEn = buildCategoryFilterOptions(sampleTypes, { t: tEn, locale: 'en' });
  const opsEn = sampleTypes
    .map((rt) => normalizeRepairTypeForFilter(rt, { t: tEn, locale: 'en' }))
    .filter(Boolean);
  assert.ok(catsEn.length >= 2, 'EN: categories present');
  catsEn.forEach((c) => {
    assert.ok(String(c.display_name || '').trim(), `EN category ${c.slug} needs display_name`);
    assert.ok(c.icon_key, `EN category ${c.slug} needs icon_key`);
  });
  opsEn.forEach((op) => {
    assert.ok(String(op.display_name || '').trim(), `EN op ${op.slug} needs display_name`);
  });
  assert.strictEqual(opsEn.find((o) => o.slug === 'oil-change').display_name, 'Oil Change');

  // 2. BG non-empty translated labels
  const catsBg = buildCategoryFilterOptions(sampleTypes, { t: tBg, locale: 'bg' });
  const opsBg = sampleTypes
    .map((rt) => normalizeRepairTypeForFilter(rt, { t: tBg, locale: 'bg' }))
    .filter(Boolean);
  assert.strictEqual(opsBg.find((o) => o.slug === 'oil-change').display_name, 'Смяна на масло');
  assert.strictEqual(catsBg.find((c) => c.slug === 'maintenance').display_name, 'Поддръжка');
  assert.strictEqual(catsBg.find((c) => c.slug === 'mechanical').display_name, 'Механика');

  // 3. Fallback: humanized slug when no translation / empty names
  const silentT = (key, _v, fb) => (fb !== undefined ? String(fb) : key);
  const fallbackOp = normalizeRepairTypeForFilter(sampleTypes[2], { t: silentT, locale: 'en' });
  assert.ok(fallbackOp.display_name.trim(), 'fallback op display_name non-empty');
  assert.strictEqual(fallbackOp.display_name, humanizeSlug('brand-new-untranslated-op'));

  const mysteryCats = buildCategoryFilterOptions([sampleTypes[2]], { t: silentT, locale: 'en' });
  assert.strictEqual(mysteryCats[0].display_name, humanizeSlug('mystery-category'));

  // 4. Contract shape
  const oil = opsEn.find((o) => o.slug === 'oil-change');
  ['id', 'slug', 'display_name', 'category_id', 'category_slug', 'icon_key'].forEach((k) => {
    assert.ok(k in oil, `contract missing ${k}`);
  });
  assert.strictEqual(oil.category_id, 10);
  assert.strictEqual(oil.category_slug, 'maintenance');
  assert.strictEqual(oil.icon_key, 'oil_change');

  // 5. Query param identity stays slug
  assert.strictEqual(oil.slug, 'oil-change');
  assert.strictEqual(catsEn.find((c) => c.slug === 'maintenance').slug, 'maintenance');

  // 6. Selected retains label + icon
  const selectedAgain = normalizeRepairTypeForFilter(sampleTypes[0], { t: tEn, locale: 'en' });
  assert.strictEqual(selectedAgain.display_name, oil.display_name);
  assert.strictEqual(selectedAgain.icon_key, oil.icon_key);
  assert.strictEqual(chipIconGlyph(selectedAgain), getOperationIcon(oil));

  // 7. Mobile + desktop same normalizer
  const a = normalizeRepairTypeForFilter(sampleTypes[1], { t: tBg, locale: 'bg' });
  const b = normalizeRepairTypeForFilter(sampleTypes[1], { t: tBg, locale: 'bg' });
  assert.deepStrictEqual(a, b);

  // 8. Generic icon for unknown — never "?"
  const unknownGlyph = chipIconGlyph(fallbackOp);
  assert.ok(unknownGlyph && unknownGlyph !== '?' && unknownGlyph !== 'help-circle');
  assert.strictEqual(fallbackOp.icon_key, GENERIC_SERVICE_ICON_KEY);

  // 9. Compat aliases for panel (display_name is canonical)
  assert.strictEqual(oil.label, oil.display_name);
  assert.strictEqual(oil.name, oil.display_name);
  catsEn.concat(opsEn).forEach((row) => {
    assert.ok(String(row.label || '').trim(), `alias label empty for ${row.slug}`);
  });

  // 10. Categories are groupings only (no op slugs as categories)
  const catSlugs = new Set(catsEn.map((c) => c.slug));
  assert.ok(!catSlugs.has('oil-change'), 'operations must not appear as categories');
  assert.ok(catSlugs.has('maintenance'));

  console.log('test-discovery-filter-taxonomy: OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
