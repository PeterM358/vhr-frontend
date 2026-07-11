/**
 * Service center map discovery: dedupe, viewport scope, dev diagnostics.
 */

import { haversineKm, sanitizeUserLocation } from './distance';
import {
  isValidMapCoordinate,
  parseShopCoordinate,
  shopMapCoordinate,
  DEFAULT_NEARBY_RADIUS_KM,
} from './mapMarkerSpread';

export { DEFAULT_NEARBY_RADIUS_KM };

export function shopStableListId(shop) {
  if (shop?.list_id) return String(shop.list_id);
  if (shop?.id != null) return `shop-${shop.id}`;
  return null;
}

/**
 * @returns {{ shops: Array, duplicateIds: string[] }}
 */
export function dedupeShopsByListId(shops) {
  const seen = new Map();
  const duplicateIds = [];
  for (const shop of shops || []) {
    const id = shopStableListId(shop);
    if (!id) continue;
    if (seen.has(id)) {
      duplicateIds.push(id);
      continue;
    }
    seen.set(id, shop);
  }
  return { shops: [...seen.values()], duplicateIds };
}

export function shopHasMappableCoordinates(shop) {
  const coord = shopMapCoordinate(shop);
  return coord != null && isValidMapCoordinate(coord.latitude, coord.longitude);
}

/**
 * Shops whose coordinates fall inside the current map region bounds.
 */
export function filterShopsInMapViewport(shops, region) {
  if (!region || !Array.isArray(shops) || shops.length === 0) return shops || [];
  const lat = parseShopCoordinate(region.latitude);
  const lon = parseShopCoordinate(region.longitude);
  const latDelta = parseShopCoordinate(region.latitudeDelta);
  const lonDelta = parseShopCoordinate(region.longitudeDelta);
  if (
    lat == null
    || lon == null
    || !Number.isFinite(latDelta)
    || !Number.isFinite(lonDelta)
    || latDelta <= 0
    || lonDelta <= 0
  ) {
    return shops;
  }

  const halfLat = latDelta / 2;
  const halfLon = lonDelta / 2;
  const minLat = lat - halfLat;
  const maxLat = lat + halfLat;
  const minLon = lon - halfLon;
  const maxLon = lon + halfLon;

  return shops.filter((shop) => {
    const coord = shopMapCoordinate(shop);
    if (!coord) return false;
    const { latitude, longitude } = coord;
    return (
      latitude >= minLat
      && latitude <= maxLat
      && longitude >= minLon
      && longitude <= maxLon
    );
  });
}

/**
 * Shops within radius of anchor — used for initial nearby scope before viewport settles.
 */
export function filterShopsNearAnchor(shops, anchor, radiusKm = DEFAULT_NEARBY_RADIUS_KM) {
  const coords = sanitizeUserLocation(
    Array.isArray(anchor) ? anchor : anchor ? [anchor.latitude, anchor.longitude] : null
  );
  if (!coords || !Array.isArray(shops) || shops.length === 0) return shops || [];
  const [anchorLat, anchorLon] = coords;
  return shops.filter((shop) => {
    const coord = shopMapCoordinate(shop);
    if (!coord) return false;
    const km = haversineKm(anchorLat, anchorLon, coord.latitude, coord.longitude);
    return Number.isFinite(km) && km <= radiusKm;
  });
}

export function logMapDiscoveryData(payload) {
  if (!__DEV__) return;
  const parts = Object.entries(payload).map(([key, value]) => {
    if (Array.isArray(value)) return `${key}=${JSON.stringify(value)}`;
    return `${key}=${value}`;
  });
  console.log(`[map-data] ${parts.join(' ')}`);
}
