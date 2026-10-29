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
    || cities.find((city) => normalizeDiscoverySearchTerm(city?.slug_bg) === q)
    || cities.find((city) => normalizeDiscoverySearchTerm(city?.name).includes(q))
    || cities.find((city) => normalizeDiscoverySearchTerm(city?.slug_en).includes(q))
    || null
  );
}

/** Quick-pick cities for discovery filters (BG launch). Slugs match City.slug_en. */
export const DISCOVERY_CITY_CHIPS = [
  { slug_en: 'sofia', slug_bg: 'sofiya', nameKey: 'sofia' },
  { slug_en: 'plovdiv', slug_bg: 'plovdiv', nameKey: 'plovdiv' },
  { slug_en: 'varna', slug_bg: 'varna', nameKey: 'varna' },
  { slug_en: 'burgas', slug_bg: 'burgas', nameKey: 'burgas' },
  { slug_en: 'ruse', slug_bg: 'ruse', nameKey: 'ruse' },
  { slug_en: 'stara-zagora', slug_bg: 'stara-zagora', nameKey: 'staraZagora' },
  { slug_en: 'pleven', slug_bg: 'pleven', nameKey: 'pleven' },
  { slug_en: 'veliko-tarnovo', slug_bg: 'veliko-tarnovo', nameKey: 'velikoTarnovo' },
];

export function citySlugFromMatch(city) {
  if (!city) return null;
  return city.slug_en || city.slug_bg || normalizeDiscoverySearchTerm(city.name).replace(/\s+/g, '-');
}
