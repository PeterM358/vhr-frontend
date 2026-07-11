/**
 * Distance formatting for service center discovery.
 */

/** Distances above this are treated as unavailable (bad GPS / swapped coords). */
export const MAX_PLAUSIBLE_DISCOVERY_DISTANCE_KM = 500;

export function sanitizeUserLocation(coords) {
  if (!Array.isArray(coords) || coords.length < 2) return null;
  let lat = Number(coords[0]);
  let lon = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  // Common Bulgaria data-entry mistake: lon ~23 stored as latitude.
  if (lat >= 20 && lat <= 30 && lon >= 41 && lon <= 45) {
    [lat, lon] = [lon, lat];
  }
  return [lat, lon];
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceAway(distanceKm) {
  if (distanceKm == null || !Number.isFinite(distanceKm)) {
    return null;
  }
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m away`;
  }
  const km = distanceKm < 10 ? distanceKm.toFixed(1) : String(Math.round(distanceKm));
  return `${km} km away`;
}

export function distanceKmFromUser(userLocation, shop) {
  const coords = sanitizeUserLocation(userLocation);
  if (!coords || shop?.latitude == null || shop?.longitude == null) {
    return shop?.distance_km ?? null;
  }
  const lat = parseFloat(shop.latitude);
  const lon = parseFloat(shop.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return shop?.distance_km ?? null;
  }
  const [userLat, userLon] = coords;
  return haversineKm(userLat, userLon, lat, lon);
}

/**
 * Distance for discovery UI — rejects implausible values from bad emulator GPS.
 */
export function discoveryDistanceKm(userLocation, shop) {
  let km = shop?.distance_km ?? null;
  if (km != null && Number.isFinite(km) && km <= MAX_PLAUSIBLE_DISCOVERY_DISTANCE_KM) {
    return km;
  }
  km = distanceKmFromUser(userLocation, shop);
  if (km != null && km > MAX_PLAUSIBLE_DISCOVERY_DISTANCE_KM) {
    return null;
  }
  return km;
}
