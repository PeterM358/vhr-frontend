/**
 * Maps backend `vehicle_type_code` values to dashboard background folders.
 * Add new codes here when backend introduces types; new image folders need no code change.
 */

/** @typedef {'cars' | 'bikes' | 'trucks' | 'default'} BackgroundCategory */

/** @type {Record<string, BackgroundCategory>} */
export const VEHICLE_TYPE_TO_CATEGORY = {
  car: 'cars',
  bicycle: 'bikes',
  ebike: 'bikes',
  'e-bike': 'bikes',
  motorcycle: 'bikes',
  scooter: 'bikes',
  truck: 'trucks',
  van: 'trucks',
  trailer: 'trucks',
  agricultural: 'trucks',
  construction: 'trucks',
};

/** Categories considered when the garage has mixed vehicle types. */
export const MIXED_GARAGE_CATEGORIES = ['cars', 'bikes', 'trucks'];

/**
 * @param {string | null | undefined} rawCode
 * @returns {BackgroundCategory | null}
 */
export function vehicleTypeCodeToCategory(rawCode) {
  const code = String(rawCode || '')
    .trim()
    .toLowerCase();
  if (!code) return null;
  return VEHICLE_TYPE_TO_CATEGORY[code] ?? null;
}

/**
 * Derive unique background categories present in the user's garage.
 * @param {Array<{ vehicle_type_code?: string }>} vehicles
 * @returns {BackgroundCategory[]}
 */
export function categoriesFromVehicles(vehicles) {
  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return ['default'];
  }

  const seen = new Set();
  for (const vehicle of vehicles) {
    const category = vehicleTypeCodeToCategory(vehicle?.vehicle_type_code);
    if (category && category !== 'default') {
      seen.add(category);
    }
  }

  if (seen.size === 0) {
    return ['default'];
  }

  return [...seen];
}
