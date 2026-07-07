/**
 * Shared helpers for authorizing a service center for one vehicle.
 */

import { updateVehicle } from '../api/vehicles';

export function resolveAuthorizeVehicleId(routeParams = {}) {
  const raw = routeParams?.authorizeVehicleId ?? routeParams?.vehicleId;
  if (raw == null || raw === '') return null;
  const id = parseInt(String(raw), 10);
  return Number.isFinite(id) ? id : null;
}

export function getVehicleSharedShops(vehicle) {
  const raw =
    (Array.isArray(vehicle?.shared_with_shops) && vehicle.shared_with_shops) ||
    (Array.isArray(vehicle?.shared_with) && vehicle.shared_with) ||
    [];
  return [...raw];
}

export function normalizeAuthorizedShopIds(vehicle) {
  return getVehicleSharedShops(vehicle)
    .map((center) => Number(center?.id ?? center))
    .filter(Number.isFinite);
}

export function isShopAuthorizedForVehicle(vehicle, shopId) {
  if (!vehicle || shopId == null) return false;
  return normalizeAuthorizedShopIds(vehicle).includes(Number(shopId));
}

export function buildSharedShopIdsAfterToggle(vehicle, shopId, shouldAuthorize) {
  const currentIds = normalizeAuthorizedShopIds(vehicle);
  const sid = Number(shopId);
  if (!Number.isFinite(sid)) return currentIds;
  if (shouldAuthorize) {
    return currentIds.includes(sid) ? currentIds : [...currentIds, sid];
  }
  return currentIds.filter((id) => id !== sid);
}

export function formatVehicleAuthorizeLabel(vehicle) {
  if (!vehicle) return 'your vehicle';
  const plate = vehicle.license_plate || '—';
  const name = [vehicle.make_name, vehicle.model_name].filter(Boolean).join(' ') || 'Vehicle';
  return `${plate} · ${name}`;
}

/** Trailing numeric segment in SEO slugs, e.g. peshos-garaje-sofia-634 → 634 */
export function extractShopIdFromSlug(slug) {
  if (slug == null || slug === '') return null;
  const match = /-(\d+)$/.exec(String(slug).trim());
  if (!match) return null;
  const id = parseInt(match[1], 10);
  return Number.isFinite(id) ? id : null;
}

export function resolveShopIdForAuthorization({ shop, resolvedShopId, centerSlug } = {}) {
  if (shop?.id != null) {
    const id = Number(shop.id);
    if (Number.isFinite(id)) return id;
  }
  if (resolvedShopId != null) {
    const id = Number(resolvedShopId);
    if (Number.isFinite(id)) return id;
  }
  const slug = centerSlug || shop?.public_slug || shop?.slug;
  return extractShopIdFromSlug(slug);
}

export async function authorizeVehicleForShop(vehicle, shopId, shouldAuthorize, token) {
  const updatedIds = buildSharedShopIdsAfterToggle(vehicle, shopId, shouldAuthorize);
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log('[authorizeVehicleForShop]', {
      vehicleId: vehicle?.id,
      shopId,
      shouldAuthorize,
      shared_with_shops_ids: updatedIds,
    });
  }
  return updateVehicle(vehicle.id, { shared_with_shops_ids: updatedIds }, token);
}
