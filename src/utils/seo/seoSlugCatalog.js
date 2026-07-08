/**
 * Client-side SEO slug catalogs for disambiguating discovery URL segments.
 * Seeds cover common BG cities, brands, and repair types; hydrated at runtime
 * from cached taxonomy / vehicle makes when available.
 */

import { POPULAR_REPAIR_PICKS } from '../repairTypeSearch';

const SEED_CITY_SLUGS = new Set([
  'sofia',
  'plovdiv',
  'varna',
  'burgas',
  'ruse',
  'stara-zagora',
  'pleven',
  'sliven',
  'dobrich',
  'shumen',
  'pernik',
  'haskovo',
  'yambol',
  'pazardzhik',
  'blagoevgrad',
  'veliko-tarnovo',
  'vratsa',
  'gabrovo',
  'asenovgrad',
  'vidin',
  'kazanlak',
  'kyustendil',
  'montana',
  'dimitrovgrad',
  'targovishte',
  'lovech',
  'silistra',
  'razgrad',
  'smolyan',
  'petrich',
  'sandanski',
  'dupnitsa',
  'gorna-oryahovitsa',
  'karlovo',
  'svishtov',
  'botevgrad',
  'gotse-delchev',
  'peshtera',
  'harmanli',
  'lom',
  'kardzhali',
  'troyan',
  'aytos',
  'bansko',
  'nesebar',
  'pomorie',
  'sozopol',
]);

const SEED_BRAND_SLUGS = new Set([
  'bmw',
  'mercedes-benz',
  'audi',
  'volkswagen',
  'toyota',
  'ford',
  'opel',
  'peugeot',
  'citroen',
  'renault',
  'fiat',
  'dacia',
  'volvo',
  'skoda',
  'seat',
  'hyundai',
  'kia',
  'nissan',
  'mazda',
  'honda',
  'lexus',
  'porsche',
  'land-rover',
  'jaguar',
  'mini',
  'suzuki',
  'mitsubishi',
  'subaru',
  'tesla',
  'ktm',
  'cube',
  'specialized',
  'giant',
  'trek',
  'scott',
  'daf',
  'man',
  'iveco',
]);

const SEED_REPAIR_SLUGS = new Set(
  POPULAR_REPAIR_PICKS.map((pick) => pick.slug).filter(Boolean)
);

const EXTRA_REPAIR_SLUGS = [
  'clutch-repair',
  'timing-belt-replacement',
  'filter-replacement',
  'brake-fluid-change',
  'suspension-repair',
  'tire-repair',
  'battery-check',
  'ac-refill',
  'ac-diagnostics',
];

EXTRA_REPAIR_SLUGS.forEach((slug) => SEED_REPAIR_SLUGS.add(slug));

const runtime = {
  citySlugs: new Set(SEED_CITY_SLUGS),
  brandSlugs: new Set(SEED_BRAND_SLUGS),
  repairSlugs: new Set(SEED_REPAIR_SLUGS),
};

export function slugifyName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

export function registerCitySlug(slug) {
  const normalized = normalizeSlug(slug);
  if (normalized) runtime.citySlugs.add(normalized);
}

export function registerBrandSlug(slug) {
  const normalized = normalizeSlug(slug);
  if (normalized) runtime.brandSlugs.add(normalized);
}

export function registerRepairSlug(slug) {
  const normalized = normalizeSlug(slug);
  if (normalized) runtime.repairSlugs.add(normalized);
}

export function isCitySlug(slug) {
  return runtime.citySlugs.has(normalizeSlug(slug));
}

export function isBrandSlug(slug) {
  return runtime.brandSlugs.has(normalizeSlug(slug));
}

export function isRepairSlug(slug) {
  return runtime.repairSlugs.has(normalizeSlug(slug));
}

/**
 * Classify a single path segment as brand, city, repair, or unknown.
 * Priority: repair (hyphenated service slugs) > brand > city > unknown.
 */
export function classifySegment(slug, { preferBrand = false } = {}) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return 'unknown';

  const repair = isRepairSlug(normalized);
  const brand = isBrandSlug(normalized);
  const city = isCitySlug(normalized);

  if (repair && !city && !brand) return 'repair';
  if (brand && !city) return 'brand';
  if (city && !brand) return 'city';
  if (brand && city) return preferBrand ? 'brand' : 'city';
  if (repair) return 'repair';

  if (normalized.includes('-') && repair) return 'repair';
  if (preferBrand) return 'brand';
  return 'unknown';
}

export function brandIdFromSlug(slug, brands = []) {
  const target = normalizeSlug(slug);
  if (!target) return null;
  const match = brands.find((brand) => slugifyName(brand?.name) === target);
  return match?.id ?? null;
}

export function brandSlugFromId(brandId, brands = []) {
  if (brandId == null) return null;
  const match = brands.find((brand) => String(brand?.id) === String(brandId));
  return match ? slugifyName(match.name) : null;
}

export function hydrateSeoSlugCatalog({ cities = [], repairTypes = [], brands = [] } = {}) {
  cities.forEach((city) => {
    registerCitySlug(city?.slug_en);
    registerCitySlug(city?.slug_bg);
    registerCitySlug(slugifyName(city?.name));
  });

  repairTypes.forEach((type) => {
    registerRepairSlug(type?.slug);
    registerRepairSlug(type?.slug_en);
    registerRepairSlug(type?.slug_bg);
    registerRepairSlug(type?.repair_type_slug);
  });

  brands.forEach((brand) => {
    registerBrandSlug(brand?.slug);
    registerBrandSlug(slugifyName(brand?.name));
  });
}

export function getSeoSlugCatalogSnapshot() {
  return {
    cities: Array.from(runtime.citySlugs).sort(),
    brands: Array.from(runtime.brandSlugs).sort(),
    repairs: Array.from(runtime.repairSlugs).sort(),
  };
}
