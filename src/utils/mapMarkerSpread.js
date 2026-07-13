/** ~9 m per step — separates overlapping shop pins and user location. */
const OFFSET_STEP = 0.00008;

/** Default nearby-first map scope on discovery load. */
export const DEFAULT_NEARBY_RADIUS_KM = 75;

/** Regional fallback when no user/city/shop anchor is available (Sofia, not global). */
export const SOFIA_FALLBACK_COORD = { latitude: 42.6977, longitude: 23.3219 };

/** Avoid Android blank tiles when deltas are tiny or invalid. */
export const MIN_MAP_REGION_DELTA = 0.08;

function nearlySame(aLat, aLon, bLat, bLon) {
  return Math.abs(aLat - bLat) < 0.00025 && Math.abs(aLon - bLon) < 0.00025;
}

export function parseShopCoordinate(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function isValidMapCoordinate(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lon) < 0.0001) return false;
  return true;
}

function normalizeLatLonPair(lat, lon) {
  let nextLat = parseShopCoordinate(lat);
  let nextLon = parseShopCoordinate(lon);
  if (nextLat == null || nextLon == null) return null;
  // Common data-entry mistake for Bulgaria: lon ~23 stored as latitude.
  if (nextLat >= 20 && nextLat <= 30 && nextLon >= 41 && nextLon <= 45) {
    [nextLat, nextLon] = [nextLon, nextLat];
  }
  if (!isValidMapCoordinate(nextLat, nextLon)) return null;
  return { latitude: nextLat, longitude: nextLon };
}

/**
 * Resolve marker / bounds coordinates from a shop row (spread offsets included).
 */
export function shopMapCoordinate(shop) {
  if (!shop) return null;
  return normalizeLatLonPair(
    shop.displayLatitude ?? shop.latitude,
    shop.displayLongitude ?? shop.longitude
  );
}

function clampRegionDelta(value, fallback = MIN_MAP_REGION_DELTA) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < MIN_MAP_REGION_DELTA) return fallback;
  return Math.min(n, 45);
}

export function regionDeltaForRadiusKm(radiusKm, atLatitude = SOFIA_FALLBACK_COORD.latitude) {
  const safeRadius = Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : DEFAULT_NEARBY_RADIUS_KM;
  const diameterKm = safeRadius * 2;
  const latDelta = diameterKm / 111;
  const cosLat = Math.cos((atLatitude * Math.PI) / 180);
  const lonDelta = cosLat > 0.01 ? diameterKm / (111 * cosLat) : latDelta;
  return {
    latitudeDelta: clampRegionDelta(latDelta),
    longitudeDelta: clampRegionDelta(lonDelta),
  };
}

export function resolveDiscoveryMapAnchor(userLocation, matchedCity, shops) {
  if (userLocation && Array.isArray(userLocation)) {
    const coord = normalizeLatLonPair(userLocation[0], userLocation[1]);
    if (coord) return coord;
  }
  if (matchedCity) {
    const coord = shopMapCoordinate(matchedCity);
    if (coord) return coord;
  }
  for (const shop of shops || []) {
    const coord = shopMapCoordinate(shop);
    if (coord) return coord;
  }
  return { ...SOFIA_FALLBACK_COORD };
}

/**
 * Slightly offset markers that sit on top of each other or on the user dot.
 */
export function spreadShopMarkersForMap(shops, userLocation) {
  const placed = [];
  const spread = [];
  for (const shop of shops || []) {
    const base = normalizeLatLonPair(shop.latitude, shop.longitude);
    if (!base) {
      if (__DEV__) {
        console.warn(
          `[map-data] excluded_invalid_marker id=${shop?.list_id || shop?.id} lat=${shop?.latitude} lon=${shop?.longitude}`
        );
      }
      continue;
    }
    let lat = base.latitude;
    let lon = base.longitude;
    let n = 0;
    const collides = () => {
      if (
        userLocation
        && nearlySame(lat, lon, userLocation.latitude, userLocation.longitude)
      ) {
        return true;
      }
      return placed.some((p) => nearlySame(lat, lon, p.lat, p.lon));
    };
    while (collides() && n < 12) {
      n += 1;
      lat = base.latitude + n * OFFSET_STEP;
      lon = base.longitude + n * OFFSET_STEP * 0.65;
    }
    placed.push({ lat, lon });
    spread.push({ ...shop, displayLatitude: lat, displayLongitude: lon });
  }
  return spread;
}

export function regionForMapPoints(points, { userLocation = null } = {}) {
  const coords = points.map(shopMapCoordinate).filter(Boolean);
  if (!coords.length) return null;

  if (userLocation) {
    const userLat = parseShopCoordinate(userLocation.latitude ?? userLocation[0]);
    const userLon = parseShopCoordinate(userLocation.longitude ?? userLocation[1]);
    if (userLat != null && userLon != null) {
      coords.push({ latitude: userLat, longitude: userLon });
    }
  }

  const lats = coords.map((c) => c.latitude);
  const lons = coords.map((c) => c.longitude);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lonSpan = Math.max(...lons) - Math.min(...lons);
  return {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lons) + Math.max(...lons)) / 2,
    latitudeDelta: clampRegionDelta(latSpan + 0.04),
    longitudeDelta: clampRegionDelta(lonSpan + 0.04),
  };
}

/**
 * Nearby-first initial region — centers on user/city/first shop, never fits all markers globally.
 * @param {Array} shops normalized shop rows
 * @param {{ userLocation?: [number, number] | null, matchedCity?: object | null, nearbyRadiusKm?: number }} options
 */
export function buildDiscoveryMapRegion(
  shops,
  { userLocation = null, matchedCity = null, nearbyRadiusKm = DEFAULT_NEARBY_RADIUS_KM } = {}
) {
  const anchor = resolveDiscoveryMapAnchor(userLocation, matchedCity, shops);
  return {
    ...anchor,
    ...regionDeltaForRadiusKm(nearbyRadiusKm, anchor.latitude),
  };
}

/** Map region for a matched discovery city (API row or slug fallback). */
export function resolveCityMapRegion(city, nearbyRadiusKm = DEFAULT_NEARBY_RADIUS_KM) {
  if (!city) return null;
  const coord = shopMapCoordinate(city);
  const slug = String(city.slug_en || city.slug_bg || '').toLowerCase();
  const anchor = coord || (slug === 'sofia' ? { ...SOFIA_FALLBACK_COORD } : null);
  if (!anchor) return null;
  return {
    ...anchor,
    ...regionDeltaForRadiusKm(nearbyRadiusKm, anchor.latitude),
  };
}
