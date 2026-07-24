import { filterRepairTypesForShop } from './repairTypeShopCompatibility';

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

/**
 * Build deduplicated repair/service types for the add-operation picker.
 * Prefers published price-list rows, then shop-filtered taxonomy, then full catalog.
 */
export function buildOperationTypePickerOptions({
  repairTypes = [],
  serviceMenuItems = [],
  shopProfile = null,
} = {}) {
  const catalog = Array.isArray(repairTypes) ? repairTypes : [];
  const menu = Array.isArray(serviceMenuItems) ? serviceMenuItems : [];
  const shopFilterOpts = {
    businessCategoryKeys: shopBusinessCategoryKeys(shopProfile),
    supportedVehicleTypeIds: toIdArray(shopProfile?.supported_vehicle_types),
  };
  const filteredCatalog = filterRepairTypesForShop(catalog, shopFilterOpts);
  const catalogById = new Map(catalog.map((rt) => [Number(rt.id), rt]));

  const publishedMenu = menu.filter((item) => item?.is_published);
  const menuSource = publishedMenu.length ? publishedMenu : menu;

  const byId = new Map();
  menuSource.forEach((item) => {
    const id = Number(item?.repair_type_id ?? item?.repair_type);
    if (!Number.isFinite(id)) return;
    const fromCatalog = catalogById.get(id);
    byId.set(id, {
      ...(fromCatalog || {}),
      id,
      name: String(item?.repair_type_name || fromCatalog?.name || '').trim(),
      slug: item?.repair_type_slug || fromCatalog?.slug,
      category_slug: fromCatalog?.category_slug,
      category_name: item?.category_name || fromCatalog?.category_name,
      icon: item?.icon_key || item?.repair_type_icon || fromCatalog?.icon,
      fromMenu: true,
    });
  });

  filteredCatalog.forEach((rt) => {
    const id = Number(rt.id);
    if (!byId.has(id)) {
      byId.set(id, { ...rt, fromMenu: false });
    }
  });

  if (!byId.size) {
    catalog.forEach((rt) => {
      const id = Number(rt.id);
      if (Number.isFinite(id)) {
        byId.set(id, { ...rt, fromMenu: false });
      }
    });
  }

  return [...byId.values()]
    .filter((row) => row.id && row.name)
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));
}
