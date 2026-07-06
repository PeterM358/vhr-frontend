/**
 * Client-side discovery search helpers (used with backend search param).
 */

export function normalizeDiscoverySearchTerm(term) {
  return String(term || '').trim().toLowerCase();
}

export function shopMatchesSearchTerm(shop, term) {
  const q = normalizeDiscoverySearchTerm(term);
  if (!q) return true;

  const haystack = [
    shop?.name,
    shop?.address,
    shop?.city_name,
    shop?.seo_city,
    ...(shop?.brand_names || []),
    ...(shop?.observed_repair_type_names || []),
    ...(shop?.available_repair_names || []),
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return haystack.some((value) => value.includes(q));
}

export function findExactCityMatch(cities, term) {
  const q = normalizeDiscoverySearchTerm(term);
  if (!q || !Array.isArray(cities)) return null;
  return (
    cities.find((city) => normalizeDiscoverySearchTerm(city?.name) === q)
    || cities.find((city) => normalizeDiscoverySearchTerm(city?.slug_en) === q)
    || null
  );
}

export function citySlugFromMatch(city) {
  if (!city) return null;
  return city.slug_en || city.slug_bg || normalizeDiscoverySearchTerm(city.name).replace(/\s+/g, '-');
}
