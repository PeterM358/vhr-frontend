/**
 * Resolve discovery map center: last-known GPS first (fast), then fresh GPS,
 * then IP approx, else null (caller keeps Sofia).
 */

import { Platform } from 'react-native';
import { sanitizeUserLocation } from './distance';
import { fetchApproxGeoFromIp } from './approxClientGeo';

function withTimeout(promise, ms = 4000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

/**
 * Native: permission + last-known (instant) then short fresh fix.
 * @returns {Promise<{ coords: [number, number]|null, permissionDenied: boolean }>}
 */
async function resolveNativeGps() {
  const Location = await import('expo-location');
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return { coords: null, permissionDenied: true };
  }

  // Prefer last-known so the map can move immediately.
  let position = await Location.getLastKnownPositionAsync({});
  if (!position?.coords) {
    try {
      position = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy?.Balanced ?? 3,
        }),
        4000,
      );
    } catch {
      position = null;
    }
  }

  if (!position?.coords) {
    return { coords: null, permissionDenied: false };
  }
  const coords = sanitizeUserLocation([
    position.coords.latitude,
    position.coords.longitude,
  ]);
  return { coords, permissionDenied: false };
}

/**
 * Web: browser geolocation.
 * @returns {Promise<{ coords: [number, number]|null, permissionDenied: boolean }>}
 */
async function resolveWebGps() {
  const { getWebGeolocation } = await import('./webGeolocation');
  try {
    const { latitude, longitude } = await getWebGeolocation({
      enableHighAccuracy: false,
      timeout: 5000,
      maximumAge: 120000,
    });
    const coords = sanitizeUserLocation([latitude, longitude]);
    return { coords, permissionDenied: false };
  } catch (err) {
    const msg = String(err?.message || '');
    const permissionDenied = /denied|permission/i.test(msg);
    return { coords: null, permissionDenied };
  }
}

/**
 * @param {{ preferGps?: boolean }} [opts]
 * @returns {Promise<{
 *   coords: [number, number]|null,
 *   source: 'gps'|'ip'|null,
 *   city: string|null,
 *   countryCode: string|null,
 *   permissionDenied: boolean,
 * }>}
 */
export async function resolveDiscoveryUserLocation({ preferGps = true } = {}) {
  let permissionDenied = false;

  if (preferGps) {
    const gps =
      Platform.OS === 'web' ? await resolveWebGps() : await resolveNativeGps();
    permissionDenied = Boolean(gps.permissionDenied);
    if (gps.coords) {
      return {
        coords: gps.coords,
        source: 'gps',
        city: null,
        countryCode: null,
        permissionDenied: false,
      };
    }
  }

  const approx = await fetchApproxGeoFromIp();
  if (approx?.coords) {
    return {
      coords: approx.coords,
      source: 'ip',
      city: approx.city,
      countryCode: approx.countryCode,
      permissionDenied,
    };
  }

  return {
    coords: null,
    source: null,
    city: null,
    countryCode: null,
    permissionDenied,
  };
}
