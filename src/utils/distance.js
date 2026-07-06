/**
 * Distance formatting for service center discovery.
 */

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
  if (!userLocation || shop?.latitude == null || shop?.longitude == null) {
    return shop?.distance_km ?? null;
  }
  const lat = parseFloat(shop.latitude);
  const lon = parseFloat(shop.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return shop?.distance_km ?? null;
  }
  const [userLat, userLon] = userLocation;
  return haversineKm(userLat, userLon, lat, lon);
}
