/**
 * Filter RepairTypes for a shop by BusinessCategory + VehicleType.
 *
 * Backend exposes `business_category_keys` on each RepairType. When missing
 * (older API), fall back to the same slug / ServiceCategory map used by
 * profiles.services.repair_type_business_categories.
 */

const SERVICE_CATEGORY_TO_BUSINESS_KEYS = {
  maintenance: ['car_repair'],
  mechanical: ['car_repair'],
  'electrical-diagnostics': ['car_repair', 'auto_electrician'],
  'tires-wheels': ['tire_shop'],
  'bodywork-paint': ['body_shop'],
  'air-conditioning': ['car_repair'],
  'battery-charging': ['car_repair', 'auto_electrician', 'ev_charging'],
  'cleaning-detailing': ['detailing', 'car_wash'],
  'insurance-documents': ['car_repair', 'roadside_assistance'],
  'inspections-legal': ['vehicle_inspection', 'car_repair'],
  'accessories-installation': ['car_repair'],
  other: ['car_repair'],
};

const REPAIR_SLUG_TO_BUSINESS_KEYS = {
  'tire-change': ['tire_shop'],
  'wheel-alignment': ['tire_shop'],
  'tire-repair': ['tire_shop'],
  'tire-storage': ['tire_shop'],
  'paint-repair': ['body_shop'],
  'dent-repair': ['body_shop'],
  'windshield-repair': ['body_shop'],
  'interior-cleaning': ['detailing', 'car_wash'],
  'exterior-detailing': ['detailing'],
  'engine-bay-cleaning': ['detailing', 'car_repair'],
  'road-assistance': ['roadside_assistance'],
  'technical-inspection': ['vehicle_inspection'],
  'taxi-certification': ['vehicle_inspection'],
  'tachograph-inspection': ['vehicle_inspection', 'car_repair'],
  'charging-system-check': ['ev_charging', 'car_repair', 'auto_electrician'],
};

const DEFAULT_BUSINESS_KEYS = ['car_repair'];

function toIdSet(value) {
  const set = new Set();
  (Array.isArray(value) ? value : []).forEach((entry) => {
    const id = entry && typeof entry === 'object' ? entry.id : entry;
    const n = Number(id);
    if (Number.isFinite(n)) set.add(n);
  });
  return set;
}

function toKeySet(value) {
  const set = new Set();
  (Array.isArray(value) ? value : []).forEach((entry) => {
    if (entry == null) return;
    if (typeof entry === 'object') {
      const key = entry.key || entry.category_key;
      if (key) set.add(String(key).toLowerCase());
      return;
    }
    const s = String(entry).trim().toLowerCase();
    if (s) set.add(s);
  });
  return set;
}

/** Resolve BusinessCategory keys that may offer this RepairType. */
export function businessCategoryKeysForRepairType(rt) {
  if (!rt) return DEFAULT_BUSINESS_KEYS;
  if (Array.isArray(rt.business_category_keys) && rt.business_category_keys.length) {
    return rt.business_category_keys.map((k) => String(k).toLowerCase());
  }
  const slug = String(rt.slug || rt.repair_type_slug || '').toLowerCase();
  if (slug && REPAIR_SLUG_TO_BUSINESS_KEYS[slug]) {
    return REPAIR_SLUG_TO_BUSINESS_KEYS[slug];
  }
  const catSlug = String(rt.category_slug || '').toLowerCase();
  if (catSlug && SERVICE_CATEGORY_TO_BUSINESS_KEYS[catSlug]) {
    return SERVICE_CATEGORY_TO_BUSINESS_KEYS[catSlug];
  }
  return DEFAULT_BUSINESS_KEYS;
}

export function repairTypeMatchesVehicleTypes(rt, supportedVehicleTypeIds) {
  const supported = toIdSet(supportedVehicleTypeIds);
  const compat = toIdSet(rt?.vehicle_types);
  if (!compat.size) return true; // empty = applies to all
  if (!supported.size) return true; // shop hasn't chosen vehicles yet
  for (const id of compat) {
    if (supported.has(id)) return true;
  }
  return false;
}

export function repairTypeMatchesBusinessCategories(rt, shopBusinessCategoryKeys) {
  const shopKeys = toKeySet(shopBusinessCategoryKeys);
  if (!shopKeys.size) return true; // no business type yet — don't gate
  const allowed = businessCategoryKeysForRepairType(rt);
  return allowed.some((key) => shopKeys.has(String(key).toLowerCase()));
}

/**
 * True when a RepairType is eligible for the shop's business categories
 * and supported vehicle types.
 */
export function isRepairTypeCompatibleWithShop(
  rt,
  { businessCategoryKeys, supportedVehicleTypeIds } = {}
) {
  return (
    repairTypeMatchesBusinessCategories(rt, businessCategoryKeys) &&
    repairTypeMatchesVehicleTypes(rt, supportedVehicleTypeIds)
  );
}

export function filterRepairTypesForShop(repairTypes, options = {}) {
  return (Array.isArray(repairTypes) ? repairTypes : []).filter((rt) =>
    isRepairTypeCompatibleWithShop(rt, options)
  );
}
