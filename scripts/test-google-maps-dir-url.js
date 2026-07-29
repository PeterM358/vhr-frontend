#!/usr/bin/env node
/**
 * Google Maps dir URL construction invariants.
 * Mirrors src/utils/googleMapsDirUrl.js (CommonJS inline for zero-deps test).
 * Run: node scripts/test-google-maps-dir-url.js
 */

const assert = require('assert');

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

function collectMapsPoints(route = []) {
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

function buildGoogleMapsSearchUrl(query) {
  const q = normalizeAddress(query);
  if (!q) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodePoint(q)}`;
}

function buildGoogleMapsDirUrl(route = []) {
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

// --- tests ---

const two = buildGoogleMapsDirUrl([
  { address: 'Sofia Center' },
  { address: 'Plovdiv South' },
]);
assert.ok(two.url.includes('maps/dir'));
assert.ok(two.url.includes('origin='));
assert.ok(two.url.includes('destination='));
assert.ok(!two.url.includes('waypoints='), 'two-stop must not emit empty waypoints=');
assert.ok(two.url.includes('%20'), 'spaces must be %20 not +');
assert.ok(!two.url.split('travelmode')[0].includes('+'), 'no quote_plus + before travelmode');

const three = buildGoogleMapsDirUrl([
  { address: 'Sofia' },
  { address: 'Plovdiv' },
  { address: 'Paris' },
]);
assert.ok(three.url.includes('waypoints=Plovdiv'));
assert.ok(!three.url.includes('waypoints=&'));

const skipEmpty = buildGoogleMapsDirUrl([
  { address: '' },
  { address: '  Sofia\n  Depot  ' },
  { address: 'Sofia Depot' },
  { address: 'Paris' },
]);
assert.ok(skipEmpty.url.includes('origin=Sofia%20Depot'));
assert.ok(skipEmpty.url.includes('destination=Paris'));
assert.ok(!skipEmpty.url.includes('waypoints='));

const single = buildGoogleMapsDirUrl([{ address: 'Only stop' }]);
assert.ok(single.url.includes('maps/search'));
assert.equal(single.url, single.fallbackUrl);

const empty = buildGoogleMapsDirUrl([]);
assert.equal(empty.url, '');
assert.equal(empty.fallbackUrl, '');

const coords = buildGoogleMapsDirUrl([
  { latitude: 42.6977, longitude: 23.3219 },
  { address: 'Paris' },
]);
assert.ok(coords.url.includes('origin=42.6977,23.3219'));

const outboundReturn = buildGoogleMapsDirUrl([
  { address: 'Sofia load', role: 'loading' },
  { address: 'Munich unload', role: 'unloading' },
  { address: 'Lyon load', role: 'return_loading' },
  { address: 'Sofia unload', role: 'return_unloading' },
]);
assert.ok(outboundReturn.url.includes('waypoints='));
assert.ok(outboundReturn.fallbackUrl.includes('Sofia%20load'));

console.log('ok — google maps dir url tests passed');
