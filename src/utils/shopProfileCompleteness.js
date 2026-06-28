/**
 * Essentials a new service center must fill before serving jobs.
 * No backend completeness flag — inferred from ShopProfile fields.
 */

import { parseOptionalCoordinate } from './manualServiceCenter';

function hasValidMapPin(profile) {
  const lat = parseOptionalCoordinate(profile?.latitude);
  const lon = parseOptionalCoordinate(profile?.longitude);
  if (lat == null || lon == null) return false;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
  return true;
}

function vehicleTypeIds(profile, options = {}) {
  const fromOptions = options.vehicleTypeIds;
  if (Array.isArray(fromOptions)) {
    return fromOptions.filter((id) => id != null).map((id) => Number(id));
  }
  const fromProfile = profile?.supported_vehicle_types;
  if (Array.isArray(fromProfile)) {
    return fromProfile.filter((id) => id != null).map((id) => Number(id));
  }
  return [];
}

/**
 * @param {object|null} profile
 * @param {{ vehicleTypeIds?: number[] }} [options]
 */
export function getShopProfileIncompleteFields(profile, options = {}) {
  if (!profile) {
    return ['shop name', 'map pin', 'address', 'city', 'country', 'vehicle type'];
  }

  const missing = [];
  if (!String(profile.name || '').trim()) {
    missing.push('shop name');
  }
  if (!hasValidMapPin(profile)) {
    missing.push('map pin');
  }
  if (!String(profile.address || '').trim()) {
    missing.push('address');
  }
  if (!profile.country) {
    missing.push('country');
  }
  if (!profile.city) {
    missing.push('city');
  }
  if (!vehicleTypeIds(profile, options).length) {
    missing.push('vehicle type');
  }
  return missing;
}

export function isShopProfileEssentialsComplete(profile, options = {}) {
  return getShopProfileIncompleteFields(profile, options).length === 0;
}

export function hasShopMapPin(profile) {
  return hasValidMapPin(profile);
}

const ESSENTIAL_FIELD_COUNT = 6;

/**
 * @param {object} [options] - optional profile strength hints
 * @param {number} [options.servicesCount]
 * @param {boolean} [options.hasPhotos]
 * @param {boolean} [options.hasDescription]
 */
export function getShopProfileCompletionPercent(profile, options = {}) {
  const missing = getShopProfileIncompleteFields(profile, options);
  const done = ESSENTIAL_FIELD_COUNT - missing.length;
  return Math.max(0, Math.min(100, Math.round((done / ESSENTIAL_FIELD_COUNT) * 100)));
}

/** Optional polish items (not required to serve jobs). */
export function getShopProfileStrengthHints(profile, options = {}) {
  const hints = [];
  const servicesCount = options.servicesCount ?? 0;
  if (servicesCount > 0) hints.push('repair services listed');
  if (options.hasPhotos) hints.push('photos uploaded');
  if (String(profile?.description || '').trim()) hints.push('shop description');
  if (String(profile?.email || '').trim()) hints.push('contact email');
  return hints;
}
