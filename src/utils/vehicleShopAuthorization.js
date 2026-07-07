/**
 * Shared helpers for authorizing a service center for one vehicle.
 */

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
