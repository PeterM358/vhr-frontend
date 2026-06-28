/** ~9 m per step — separates overlapping shop pins and user location. */
const OFFSET_STEP = 0.00008;

function nearlySame(aLat, aLon, bLat, bLon) {
  return Math.abs(aLat - bLat) < 0.00025 && Math.abs(aLon - bLon) < 0.00025;
}

/**
 * Slightly offset markers that sit on top of each other or on the user dot.
 */
export function spreadShopMarkersForMap(shops, userLocation) {
  const placed = [];
  return shops.map((shop) => {
    let lat = shop.latitude;
    let lon = shop.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return shop;
    }
    let n = 0;
    const collides = () => {
      if (
        userLocation &&
        nearlySame(lat, lon, userLocation.latitude, userLocation.longitude)
      ) {
        return true;
      }
      return placed.some((p) => nearlySame(lat, lon, p.lat, p.lon));
    };
    while (collides() && n < 12) {
      n += 1;
      lat = shop.latitude + n * OFFSET_STEP;
      lon = shop.longitude + n * OFFSET_STEP * 0.65;
    }
    placed.push({ lat, lon });
    return { ...shop, displayLatitude: lat, displayLongitude: lon };
  });
}

export function regionForMapPoints(points) {
  if (!points.length) return null;
  const lats = points.map((p) => p.latitude);
  const lons = points.map((p) => p.longitude);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lonSpan = Math.max(...lons) - Math.min(...lons);
  return {
    latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
    longitude: (Math.min(...lons) + Math.max(...lons)) / 2,
    latitudeDelta: Math.max(0.025, latSpan + 0.015),
    longitudeDelta: Math.max(0.025, lonSpan + 0.015),
  };
}
