/**
 * Client-side validation aligned with repairs.services.owner_logged_manual_shop.
 */

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function parseOptionalCoordinate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** Backend DecimalField: max_digits=10, decimal_places=7 — round before API submit. */
export function roundCoordinateForApi(raw) {
  const n = parseOptionalCoordinate(raw);
  if (n == null) return null;
  return Math.round(n * 1e6) / 1e6;
}

export function validateManualServiceCenterInput({
  phone,
  email,
  address,
  city,
  countryIso,
  latitude,
  longitude,
}) {
  const p = String(phone ?? '').trim();
  const e = String(email ?? '').trim();
  const addr = String(address ?? '').trim();
  const c = String(city ?? '').trim();
  const country = String(countryIso ?? '').trim().toUpperCase();

  if (!p && !e) {
    return 'Add a phone number or email so we can reach this service center later.';
  }
  if (e && !EMAIL_RE.test(e)) {
    return 'Enter a valid email address.';
  }
  if (p) {
    const digits = p.replace(/\D/g, '');
    if (digits.length < 8) {
      return 'Enter a valid international phone (prefix + national number, e.g. +359888123456).';
    }
  }

  const lat = parseOptionalCoordinate(latitude);
  const lon = parseOptionalCoordinate(longitude);
  if (lat === undefined || lon === undefined) {
    return 'Coordinates must be valid numbers.';
  }
  if ((lat != null) !== (lon != null)) {
    return 'Enter both latitude and longitude, or leave both empty.';
  }

  if (c && !country) {
    return 'Select a country when city is set.';
  }
  if (country && !c) {
    return 'Enter a city when country is set.';
  }
  if (country && country.length !== 2) {
    return 'Select a valid country.';
  }

  const hasAddress = Boolean(addr);
  const hasPlace = Boolean(c && country.length === 2);
  const hasCoords = lat != null && lon != null;

  if (!hasAddress && !hasPlace && !hasCoords) {
    return 'Add a street address, city and country, or map coordinates for this service center.';
  }

  return null;
}
