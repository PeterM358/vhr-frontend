#!/usr/bin/env node
/**
 * Finalize / Add-operation type picker filter invariants.
 * Run: node scripts/test-operation-type-picker-options.js
 */
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

async function importSrc(rel) {
  const abs = path.join(__dirname, '..', rel);
  return import(pathToFileURL(abs).href);
}

async function main() {
  const {
    buildOperationTypePickerOptions,
    shopProfileHasCatalogFilters,
  } = await importSrc('src/utils/operationTypePickerOptions.js');
  const {
    filterRepairTypesForShop,
    repairTypeMatchesJobVehicle,
  } = await importSrc('src/utils/repairTypeShopCompatibility.js');

  const CAR = 1;
  const BIKE = 2;

  const catalog = [
    {
      id: 10,
      name: 'Oil Change',
      vehicle_types: [CAR, BIKE],
      business_category_keys: ['car_repair'],
      category_slug: 'maintenance',
      category_name: 'Maintenance',
    },
    {
      id: 20,
      name: 'Chain & Belt Service',
      vehicle_types: [BIKE],
      business_category_keys: ['car_repair'],
      category_slug: 'mechanical',
      category_name: 'Mechanical',
      slug: 'chain-belt-service',
    },
    {
      id: 30,
      name: 'Bike Accessories',
      vehicle_types: [BIKE],
      business_category_keys: ['car_repair'],
      category_slug: 'accessories-installation',
      category_name: 'Accessories',
      slug: 'bike-accessories-installation',
    },
    {
      id: 40,
      name: 'Brake Repair',
      vehicle_types: [CAR],
      business_category_keys: ['car_repair'],
      category_slug: 'mechanical',
      category_name: 'Mechanical',
    },
    {
      id: 50,
      name: 'Tire Change',
      vehicle_types: [CAR, BIKE],
      business_category_keys: ['tire_shop'],
      category_slug: 'tires-wheels',
      category_name: 'Tires',
    },
  ];

  const carShop = {
    primary_business_category: { key: 'car_repair' },
    supported_vehicle_types: [CAR],
    available_repairs: [10, 40],
  };

  assert.strictEqual(shopProfileHasCatalogFilters(carShop), true);
  assert.strictEqual(shopProfileHasCatalogFilters({}), false);

  assert.strictEqual(repairTypeMatchesJobVehicle(catalog[1], CAR), false);
  assert.strictEqual(repairTypeMatchesJobVehicle(catalog[0], CAR), true);
  assert.strictEqual(repairTypeMatchesJobVehicle({ vehicle_types: [] }, CAR), true);

  const shopFiltered = filterRepairTypesForShop(catalog, {
    businessCategoryKeys: ['car_repair'],
    supportedVehicleTypeIds: [CAR],
  });
  assert.ok(shopFiltered.every((rt) => rt.id !== 20 && rt.id !== 30));
  assert.ok(shopFiltered.some((rt) => rt.id === 10));
  assert.ok(shopFiltered.some((rt) => rt.id === 40));
  assert.ok(!shopFiltered.some((rt) => rt.id === 50));

  const carJobOptions = buildOperationTypePickerOptions({
    repairTypes: catalog,
    serviceMenuItems: [{ repair_type_id: 20, repair_type_name: 'Chain & Belt Service' }],
    shopProfile: {
      primary_business_category: { key: 'car_repair' },
      supported_vehicle_types: [CAR, BIKE],
    },
    jobVehicleTypeId: CAR,
  });
  const carJobIds = carJobOptions.map((r) => r.id);
  assert.ok(!carJobIds.includes(20), 'bike-only menu row must drop on car job');
  assert.ok(!carJobIds.includes(30), 'bike-only catalog row must drop on car job');
  assert.ok(carJobIds.includes(10));
  assert.ok(carJobIds.includes(40));

  const noFailOpen = buildOperationTypePickerOptions({
    repairTypes: catalog,
    serviceMenuItems: [],
    shopProfile: {
      primary_business_category: { key: 'tire_shop' },
      supported_vehicle_types: [CAR],
    },
    jobVehicleTypeId: CAR,
  });
  assert.deepStrictEqual(
    noFailOpen.map((r) => r.id).sort(),
    [50],
    'known shop profile must not fail-open to full catalog'
  );

  const legacyFailOpen = buildOperationTypePickerOptions({
    repairTypes: catalog,
    serviceMenuItems: [],
    shopProfile: null,
    jobVehicleTypeId: null,
  });
  assert.strictEqual(legacyFailOpen.length, catalog.length);

  console.log('test-operation-type-picker-options: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
