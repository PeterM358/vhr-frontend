import { getMapPinDefinition } from './pinRegistry';

/**
 * Resolve the single map pin identity for a shop (primary_map_category only).
 * Filters may highlight cards but never change pin category.
 *
 * @param {object | null | undefined} shop
 * @returns {import('./pinRegistry').MapPinDefinition & { key: string }}
 */
export function resolveShopMapPin(shop) {
  return getMapPinDefinition(shop?.primary_map_category);
}

/**
 * @param {object | null | undefined} shop
 * @returns {string}
 */
export function resolveShopMapPinKey(shop) {
  return resolveShopMapPin(shop).key;
}
