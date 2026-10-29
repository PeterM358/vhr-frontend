/**
 * Approximate client location from public IP (no API key).
 * Used when GPS is denied/unavailable so discovery can center near the user.
 * Precision is city/region only — never treat as exact GPS.
 */

import { sanitizeUserLocation } from './distance';

const GEOJS_URL = 'https://get.geojs.io/v1/ip/geo.json';
const FETCH_MS = 5000;

/** Country centroids when IP API returns country but no coords (rare). */
const COUNTRY_CENTROIDS = {
  BG: [42.6977, 23.3219],
  PL: [52.2297, 21.0122],
  RO: [44.4268, 26.1025],
  GR: [37.9838, 23.7275],
  DE: [52.52, 13.405],
  TR: [41.0082, 28.9784],
  GB: [51.5074, -0.1278],
  US: [39.8283, -98.5795],
};

function withTimeout(promise, ms = FETCH_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * @returns {Promise<{
 *   coords: [number, number],
 *   city: string|null,
 *   countryCode: string|null,
 *   source: 'ip',
 * }|null>}
 */
export async function fetchApproxGeoFromIp() {
  try {
    const res = await withTimeout(fetch(GEOJS_URL));
    if (!res?.ok) return null;
    const data = await res.json();
    const countryCode = String(data?.country_code || data?.country || '')
      .trim()
      .toUpperCase()
      .slice(0, 2) || null;
    let lat = Number(data?.latitude);
    let lon = Number(data?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      const fallback = countryCode ? COUNTRY_CENTROIDS[countryCode] : null;
      if (!fallback) return null;
      [lat, lon] = fallback;
    }
    const coords = sanitizeUserLocation([lat, lon]);
    if (!coords) return null;
    const city = String(data?.city || data?.region || '').trim() || null;
    return {
      coords,
      city,
      countryCode,
      source: 'ip',
    };
  } catch {
    return null;
  }
}
