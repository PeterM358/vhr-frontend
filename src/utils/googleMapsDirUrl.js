/**
 * Robust Google Maps directions / search URLs (api=1).
 *
 * Avoids empty waypoints=, quote_plus-style "+", and blank stops — those
 * commonly trigger consent.google.com "400 That's an error" on mobile EU.
 */

const MAX_WAYPOINTS = 9;

function normalizeAddress(value) {
  return String(value || '')
    .split(/\s+/)
    .join(' ')
    .trim();
}

function isLatLngToken(value) {
  const parts = String(value || '').split(',');
  if (parts.length !== 2) return false;
  const lat = Number(parts[0].trim());
  const lng = Number(parts[1].trim());
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function encodePoint(value) {
  if (isLatLngToken(value)) {
    const [lat, lng] = String(value).split(',');
    return `${lat.trim()},${lng.trim()}`;
  }
  return encodeURIComponent(value);
}

/**
 * Collect ordered stop tokens from route-like objects.
 * Prefers lat,lng; falls back to address text; skips empties; dedupes consecutive.
 */
export function collectMapsPoints(route = []) {
  const points = [];
  for (const step of route || []) {
    const lat = step?.latitude;
    const lng = step?.longitude;
    if (lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      points.push(`${Number(lat)},${Number(lng)}`);
      continue;
    }
    const address = normalizeAddress(step?.address);
    if (address) points.push(address);
  }
  const deduped = [];
  for (const point of points) {
    if (!deduped.length || deduped[deduped.length - 1] !== point) {
      deduped.push(point);
    }
  }
  return deduped;
}

export function buildGoogleMapsSearchUrl(query) {
  const q = normalizeAddress(query);
  if (!q) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodePoint(q)}`;
}

/**
 * Build a directions URL for ordered stops.
 * @returns {{ url: string, fallbackUrl: string }}
 */
export function buildGoogleMapsDirUrl(route = []) {
  let points = collectMapsPoints(route);
  const fallbackUrl = points.length ? buildGoogleMapsSearchUrl(points[0]) : '';

  if (!points.length) {
    return { url: '', fallbackUrl: '' };
  }
  if (points.length === 1) {
    const url = buildGoogleMapsSearchUrl(points[0]);
    return { url, fallbackUrl: url };
  }

  if (points.length > MAX_WAYPOINTS + 2) {
    const mid = points.slice(1, -1).slice(0, MAX_WAYPOINTS);
    points = [points[0], ...mid, points[points.length - 1]];
  }

  const origin = encodePoint(points[0]);
  const destination = encodePoint(points[points.length - 1]);
  if (!origin || !destination) {
    return { url: fallbackUrl, fallbackUrl };
  }

  let url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${origin}&destination=${destination}&travelmode=driving`;

  if (points.length > 2) {
    const waypoints = points
      .slice(1, -1)
      .filter(Boolean)
      .map(encodePoint)
      .join('|');
    if (waypoints) {
      url += `&waypoints=${waypoints}`;
    }
  }

  return { url, fallbackUrl };
}

/** Convenience: primary URL only (empty string if none). */
export function googleMapsDirUrl(route = []) {
  return buildGoogleMapsDirUrl(route).url;
}
