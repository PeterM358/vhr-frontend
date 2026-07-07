/**
 * Chooses a dashboard background from the user's garage composition.
 *
 * Rules:
 * - Cars only → random from `cars/`
 * - Bikes / e-bikes only → random from `bikes/`
 * - Truck / van only → random from `trucks/`
 * - Mixed garage → random among categories the user actually has
 * - No vehicles → `default/`
 */

import {
  categoriesFromVehicles,
  MIXED_GARAGE_CATEGORIES,
} from './vehicleCategories';
import {
  FALLBACK_BACKGROUND,
  getBackgroundsForCategory,
  poolForCategories,
} from './backgroundRegistry';

/**
 * @param {Array<{ vehicle_type_code?: string }>} vehicles
 * @returns {import('./vehicleCategories').BackgroundCategory[]}
 */
export function resolveEligibleCategories(vehicles) {
  const categories = categoriesFromVehicles(vehicles);

  if (categories.length === 1 && categories[0] === 'default') {
    return ['default'];
  }

  const garageCategories = categories.filter((c) => c !== 'default');
  if (garageCategories.length === 0) {
    return ['default'];
  }

  if (garageCategories.length === 1) {
    return garageCategories;
  }

  return garageCategories.filter((c) => MIXED_GARAGE_CATEGORIES.includes(c));
}

/**
 * Deterministic-ish pick for a given day seed (stable within a calendar day).
 * @param {import('./backgroundRegistry').DashboardBackgroundDefinition[]} pool
 * @param {string} seed
 */
export function pickFromPool(pool, seed) {
  const entries = pool.length > 0 ? pool : [FALLBACK_BACKGROUND];
  if (entries.length === 1) {
    return entries[0];
  }

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }

  return entries[hash % entries.length];
}

/**
 * @param {Array<{ vehicle_type_code?: string }>} vehicles
 * @param {string} [seed] — defaults to today's local date (YYYY-MM-DD)
 * @returns {import('./backgroundRegistry').DashboardBackgroundDefinition}
 */
export function resolveDashboardBackground(vehicles, seed) {
  const dateSeed =
    seed ??
    new Date().toLocaleDateString('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

  const eligibleCategories = resolveEligibleCategories(vehicles);
  const pool = poolForCategories(eligibleCategories);

  if (pool.length === 0) {
    return FALLBACK_BACKGROUND;
  }

  if (eligibleCategories.length === 1) {
    const singlePool = getBackgroundsForCategory(eligibleCategories[0]);
    return pickFromPool(singlePool.length > 0 ? singlePool : pool, dateSeed);
  }

  return pickFromPool(pool, dateSeed);
}

/**
 * @param {string | null | undefined} storedBackgroundId
 * @param {import('./vehicleCategories').BackgroundCategory[]} eligibleCategories
 * @returns {boolean}
 */
export function isStoredBackgroundValid(storedBackgroundId, eligibleCategories) {
  if (!storedBackgroundId) return false;

  const pool = poolForCategories(eligibleCategories);
  return pool.some((entry) => entry.id === storedBackgroundId);
}
