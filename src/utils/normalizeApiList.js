/**
 * Normalize list-shaped API payloads (plain array, paginated, or keyed).
 */

export function describeApiListShape(data) {
  if (Array.isArray(data)) return `array:${data.length}`;
  if (!data || typeof data !== 'object') return typeof data;
  if (Array.isArray(data.results)) return `results:${data.results.length}`;
  if (Array.isArray(data.countries)) return `countries:${data.countries.length}`;
  if (Array.isArray(data.cities)) return `cities:${data.cities.length}`;
  if (Array.isArray(data.data)) return `data:${data.data.length}`;
  return `object:${Object.keys(data).slice(0, 4).join(',')}`;
}

/**
 * @returns {Array|null} Normalized rows, or null when the payload is not list-shaped.
 */
export function normalizeApiListResponse(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return null;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.countries)) return data.countries;
  if (Array.isArray(data.cities)) return data.cities;
  if (Array.isArray(data.data)) return data.data;
  return null;
}
