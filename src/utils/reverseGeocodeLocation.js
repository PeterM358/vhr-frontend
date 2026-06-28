/**
 * Reverse geocode coordinates and match to profiles Country/City rows.
 */

import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { getCountries, getCitiesForCountry } from '../api/profiles';

function haversineKm(lat1, lon1, lat2, lon2) {
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

function normalizeCityLabel(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+(city|municipality|oblast|province|region)$/i, '')
    .replace(/\s+/g, ' ');
}

/** Collapse geocoder echoes like "Foo 3 Foo 3" → "Foo 3". */
export function dedupeRepeatedAddressText(text) {
  const t = String(text || '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  const parts = t.split(' ');
  if (parts.length >= 2 && parts.length % 2 === 0) {
    const mid = parts.length / 2;
    const left = parts.slice(0, mid).join(' ');
    const right = parts.slice(mid).join(' ');
    if (left === right) return left;
  }
  const half = Math.floor(t.length / 2);
  if (half > 0) {
    const left = t.slice(0, half).trim();
    const right = t.slice(half).trim();
    if (left && left === right) return left;
  }
  return t;
}

function buildStreetFromGeocode(r) {
  const street = String(r.street || '').trim();
  const number = String(r.streetNumber || '').trim();
  const name = String(r.name || '').trim();
  const lineFromParts = [street, number].filter(Boolean).join(' ').trim();

  if (lineFromParts && name) {
    const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ');
    if (norm(lineFromParts) === norm(name)) return dedupeRepeatedAddressText(lineFromParts);
    if (norm(name).includes(norm(lineFromParts))) return dedupeRepeatedAddressText(name);
    return dedupeRepeatedAddressText(lineFromParts);
  }
  if (lineFromParts) return dedupeRepeatedAddressText(lineFromParts);
  return dedupeRepeatedAddressText(name);
}

async function reverseGeocodeNominatim(latitude, longitude) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
      latitude
    )}&lon=${encodeURIComponent(longitude)}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'VehicleRepairHub/1.0 (shop-profile)' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data?.address || {};
    const countryIso = String(addr.country_code || '').trim().toUpperCase();
    const cityName =
      String(
        addr.city || addr.town || addr.village || addr.municipality || addr.suburb || ''
      ).trim() || '';
    const street = [addr.road, addr.house_number].filter(Boolean).join(' ').trim();
    const postalCode = String(addr.postcode || '').trim();
    if (!countryIso && !cityName && !street && !postalCode) return null;
    return {
      countryIso,
      cityName,
      street: street || dedupeRepeatedAddressText(String(data?.display_name || '').split(',')[0] || ''),
      postalCode,
    };
  } catch (e) {
    console.warn('reverseGeocodeNominatim failed', e);
    return null;
  }
}

function geoFromExpoResult(r) {
  const street = buildStreetFromGeocode(r);
  const cityCandidates = [r.city, r.subregion, r.district, r.region].filter(Boolean);
  const cityName = cityCandidates.map((c) => String(c).trim()).find(Boolean) || '';
  return {
    countryIso: String(r.isoCountryCode || '').trim().toUpperCase(),
    cityName,
    street,
    postalCode: String(r.postalCode || '').trim(),
  };
}

export async function reverseGeocodeLatLon(latitude, longitude) {
  if (Platform.OS === 'web') {
    const web = await reverseGeocodeNominatim(latitude, longitude);
    if (web?.countryIso) return web;
  }

  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (Array.isArray(results) && results.length) {
      const geo = geoFromExpoResult(results[0]);
      if (geo.countryIso) return geo;
    }
  } catch (e) {
    console.warn('reverseGeocodeLatLon expo failed', e);
  }

  return reverseGeocodeNominatim(latitude, longitude);
}

function matchCity(cities, geoCityName, lat, lon) {
  const list = Array.isArray(cities) ? cities : [];
  if (!list.length) return null;

  const normalized = normalizeCityLabel(geoCityName);
  if (normalized) {
    const exact = list.find((c) => normalizeCityLabel(c.name) === normalized);
    if (exact) return exact;
    const partial = list.find((c) => {
      const n = normalizeCityLabel(c.name);
      return n.includes(normalized) || normalized.includes(n);
    });
    if (partial) return partial;
  }

  let best = null;
  let bestDist = Infinity;
  for (const c of list) {
    const clat = c.latitude != null ? Number(c.latitude) : null;
    const clon = c.longitude != null ? Number(c.longitude) : null;
    if (!Number.isFinite(clat) || !Number.isFinite(clon)) continue;
    const d = haversineKm(lat, lon, clat, clon);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  // Prefer nearest DB city with coordinates when geocoder label does not match.
  return bestDist <= 120 ? best : null;
}

/**
 * @returns {{ countryId, cityId, countryIso, cityName, addressHint } | null}
 */
export async function resolveCountryCityFromCoords({
  latitude,
  longitude,
  countries,
  getCitiesForCountry: getCitiesFn = getCitiesForCountry,
}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const geo = await reverseGeocodeLatLon(lat, lon);
  if (!geo?.countryIso) return null;

  let countryRows = Array.isArray(countries) ? countries : [];
  if (!countryRows.length) {
    try {
      const fetched = await getCountries();
      countryRows = Array.isArray(fetched) ? fetched : [];
    } catch (e) {
      console.warn('resolveCountryCityFromCoords: could not load countries', e);
    }
  }

  const country = countryRows.find(
    (c) => String(c.iso2 || '').trim().toUpperCase() === geo.countryIso
  );
  if (!country) {
    return {
      countryId: null,
      cityId: null,
      countryIso: geo.countryIso,
      cityName: geo.cityName || '',
      addressHint: geo.street || '',
      postalCode: geo.postalCode || '',
    };
  }

  const cities = await getCitiesFn(country.id);
  const city = matchCity(cities, geo.cityName, lat, lon);

  return {
    countryId: country.id,
    cityId: city?.id ?? null,
    countryIso: String(country.iso2 || geo.countryIso).trim().toUpperCase(),
    cityName: city?.name || geo.cityName || '',
    addressHint: geo.street || '',
    postalCode: geo.postalCode || '',
    cities,
  };
}
