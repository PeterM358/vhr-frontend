import {
  filterRepairTypesForShop,
  isRepairTypeCompatibleWithShop,
} from './repairTypeShopCompatibility.js';

function shopBusinessCategoryKeys(profile) {
  const keys = [];
  const primary = profile?.primary_business_category;
  if (primary?.key) keys.push(primary.key);
  const links = Array.isArray(profile?.business_categories) ? profile.business_categories : [];
  links.forEach((row) => {
    const key = row?.key || row?.category?.key || row?.category_key;
    if (key) keys.push(key);
  });
  return keys;
}

function toIdArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (entry && typeof entry === 'object' ? entry.id : entry))
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
}

function normalizeJobVehicleTypeId(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object') {
    const nested = value.id ?? value.vehicle_type_id ?? value.pk;
    return normalizeJobVehicleTypeId(nested);
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** True when shop profile already constrains catalog (do not fail-open). */
export function shopProfileHasCatalogFilters(profile) {
  if (!profile) return false;
  if (shopBusinessCategoryKeys(profile).length) return true;
  if (toIdArray(profile?.supported_vehicle_types).length) return true;
  if (toIdArray(profile?.available_repairs).length) return true;
  return false;
}

function buildMenuRow(item, fromCatalog) {
  const id = Number(item?.repair_type_id ?? item?.repair_type);
  if (!Number.isFinite(id)) return null;
  return {
    ...(fromCatalog || {}),
    id,
    name: String(item?.repair_type_name || fromCatalog?.name || '').trim(),
    name_bg: fromCatalog?.name_bg || '',
    name_en: fromCatalog?.name_en || item?.repair_type_name || fromCatalog?.name || '',
    slug: item?.repair_type_slug || fromCatalog?.slug,
    category_slug: fromCatalog?.category_slug,
    category_name: item?.category_name || fromCatalog?.category_name,
    icon: item?.icon_key || item?.repair_type_icon || fromCatalog?.icon,
    vehicle_types: fromCatalog?.vehicle_types,
    business_category_keys: fromCatalog?.business_category_keys,
    fromMenu: true,
    fromAvailable: false,
    labor_from: item?.labor_from ?? null,
    labor_to: item?.labor_to ?? null,
  };
}

function buildAvailableRow(raw, fromCatalog) {
  const id = typeof raw === 'object' ? Number(raw?.id) : Number(raw);
  if (!Number.isFinite(id)) return null;
  const name = String(
    (typeof raw === 'object' ? raw?.name : '') || fromCatalog?.name || ''
  ).trim();
  return {
    ...(fromCatalog || {}),
    id,
    name,
    name_bg: fromCatalog?.name_bg || (typeof raw === 'object' ? raw?.name_bg : '') || '',
    name_en:
      fromCatalog?.name_en ||
      (typeof raw === 'object' ? raw?.name_en || raw?.name : '') ||
      fromCatalog?.name ||
      '',
    slug: (typeof raw === 'object' ? raw?.slug : null) || fromCatalog?.slug,
    category_slug: fromCatalog?.category_slug,
    category_name: fromCatalog?.category_name,
    icon: fromCatalog?.icon,
    vehicle_types:
      (typeof raw === 'object' ? raw?.vehicle_types : null) || fromCatalog?.vehicle_types,
    business_category_keys: fromCatalog?.business_category_keys,
    fromMenu: false,
    fromAvailable: true,
  };
}

function sortPickerRows(a, b) {
  if (Boolean(a.fromMenu) !== Boolean(b.fromMenu)) return a.fromMenu ? -1 : 1;
  if (Boolean(a.fromAvailable) !== Boolean(b.fromAvailable)) return a.fromAvailable ? -1 : 1;
  return String(a.name || '').localeCompare(String(b.name || ''));
}

/**
 * Build deduplicated repair/service types for Add operation / Finalize pickers.
 * Prefers published price-list rows, then shop available_repairs, then shop-filtered
 * taxonomy. Does not fail-open to the full catalog when shop filters or job vehicle
 * type are known.
 */
export function buildOperationTypePickerOptions({
  repairTypes = [],
  serviceMenuItems = [],
  shopProfile = null,
  jobVehicleTypeId = null,
} = {}) {
  const catalog = Array.isArray(repairTypes) ? repairTypes : [];
  const menu = Array.isArray(serviceMenuItems) ? serviceMenuItems : [];
  const jobVtId = normalizeJobVehicleTypeId(jobVehicleTypeId);
  const shopFilterOpts = {
    businessCategoryKeys: shopBusinessCategoryKeys(shopProfile),
    supportedVehicleTypeIds: toIdArray(shopProfile?.supported_vehicle_types),
    jobVehicleTypeId: jobVtId,
  };
  const filteredCatalog = filterRepairTypesForShop(catalog, shopFilterOpts);
  const catalogById = new Map(catalog.map((rt) => [Number(rt.id), rt]));
  const filtersActive =
    shopProfileHasCatalogFilters(shopProfile) || jobVtId != null;

  const byId = new Map();

  // Include all price-list rows (published or not) so "+ Add service" appears in
  // Choose service type immediately, with labor_from available for prefill hints —
  // but still respect shop / job vehicle compatibility when filters are known.
  menu.forEach((item) => {
    const fromCatalog = catalogById.get(Number(item?.repair_type_id ?? item?.repair_type));
    const row = buildMenuRow(item, fromCatalog);
    if (!row?.id || !row.name) return;
    if (filtersActive && !isRepairTypeCompatibleWithShop(row, shopFilterOpts)) return;
    byId.set(row.id, row);
  });

  toIdArray(shopProfile?.available_repairs).forEach((id) => {
    if (byId.has(id)) return;
    const fromCatalog = catalogById.get(id);
    const raw =
      Array.isArray(shopProfile?.available_repairs) &&
      shopProfile.available_repairs.find(
        (entry) => Number(entry && typeof entry === 'object' ? entry.id : entry) === id
      );
    const row = buildAvailableRow(raw ?? id, fromCatalog);
    if (!row?.id || !row.name) return;
    if (filtersActive && !isRepairTypeCompatibleWithShop(row, shopFilterOpts)) return;
    byId.set(row.id, row);
  });

  filteredCatalog.forEach((rt) => {
    const id = Number(rt.id);
    if (!byId.has(id)) {
      byId.set(id, { ...rt, fromMenu: false, fromAvailable: false });
    }
  });

  // Fail-open only when we have no shop/job constraints to apply.
  if (!byId.size && !filtersActive) {
    catalog.forEach((rt) => {
      const id = Number(rt.id);
      if (Number.isFinite(id)) {
        byId.set(id, { ...rt, fromMenu: false, fromAvailable: false });
      }
    });
  }

  return [...byId.values()].filter((row) => row.id && row.name).sort(sortPickerRows);
}
