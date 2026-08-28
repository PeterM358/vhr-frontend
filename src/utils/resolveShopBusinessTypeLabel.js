/**
 * Public label for a shop's business type (matches map pin meaning).
 *
 * Prefer linked BusinessCategory; fall back to primary_map_category → category key.
 * Used on discovery cards/panels and the public profile so pin and copy stay aligned.
 */

import {
  getBusinessCategoryByKey,
  getAllBusinessCategories,
} from './seo/businessCategoryCatalog';
import { translateBusinessCategoryLabel } from './translateShopTypeLabels';

/** Backend map_pin → BusinessCategory.key (profiles.business_taxonomy_data). */
const MAP_PIN_TO_BUSINESS_CATEGORY = {
  general_service: 'car_repair',
  tire_center: 'tire_shop',
  road_assistance: 'roadside_assistance',
  car_wash: 'car_wash',
  detailing: 'detailing',
  body_shop: 'body_shop',
  diagnostics: 'auto_electrician',
  locksmith: 'auto_locksmith',
  motorcycle_service: 'car_repair',
  truck_service: 'car_repair',
  ev_charging: 'ev_charging',
  vehicle_inspection: 'vehicle_inspection',
  oil_change: 'car_repair',
  ac_service: 'car_repair',
  ev_service: 'car_repair',
  van_service: 'car_repair',
  paint_shop: 'body_shop',
  glass_repair: 'body_shop',
  battery_shop: 'auto_electrician',
  battery_assistance: 'roadside_assistance',
  towing: 'roadside_assistance',
  emergency_repair: 'roadside_assistance',
  mot_inspection: 'vehicle_inspection',
};

/**
 * @param {string | null | undefined} pinKey
 * @returns {string | null}
 */
export function businessCategoryKeyForMapPin(pinKey) {
  const pin = String(pinKey || '')
    .trim()
    .toLowerCase();
  if (!pin) return null;
  if (getBusinessCategoryByKey(pin)) return pin;
  const mapped = MAP_PIN_TO_BUSINESS_CATEGORY[pin];
  if (mapped) return mapped;
  for (const cat of getAllBusinessCategories()) {
    if (String(cat.mapPinKey || '').toLowerCase() === pin) return cat.key;
  }
  return null;
}

/**
 * Stable BusinessCategory.key for a shop, or null.
 * @param {object | null | undefined} shop
 * @returns {string | null}
 */
export function resolveShopBusinessCategoryKey(shop) {
  if (!shop) return null;
  const fromLinked =
    shop.primary_business_category?.key ||
    shop.primary_business_category_key ||
    shop.business_category_key ||
    null;
  if (fromLinked) return String(fromLinked).trim().toLowerCase() || null;

  const links = Array.isArray(shop.business_categories) ? shop.business_categories : [];
  const primaryLink = links.find((row) => row?.is_primary && (row.category?.key || row.key));
  if (primaryLink) {
    return String(primaryLink.category?.key || primaryLink.key)
      .trim()
      .toLowerCase();
  }

  return businessCategoryKeyForMapPin(shop.primary_map_category);
}

/**
 * Localized business-type label (e.g. "Car wash" / "Автомивка"), or ''.
 * @param {object | null | undefined} shop
 * @param {function} t
 * @returns {string}
 */
export function resolveShopBusinessTypeLabel(shop, t) {
  const key = resolveShopBusinessCategoryKey(shop);
  if (!key) return '';
  const linked = shop?.primary_business_category;
  if (linked && (linked.key === key || !linked.key)) {
    return translateBusinessCategoryLabel(linked, t);
  }
  return translateBusinessCategoryLabel(key, t);
}
