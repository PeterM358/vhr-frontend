/**
 * Business category catalog — single frontend source of truth for the public
 * discovery taxonomy (BusinessCategory). Mirrors the backend seed in
 * `profiles/business_taxonomy_data.py` and `docs/seo-url-research.md`
 * (FINAL RECOMMENDED URL ROOTS).
 *
 * Used to build/parse category-context SEO URLs
 * (`/{lang}/{categorySlug}/{citySlug}/{shopSlug}`) and to render the map-pin
 * preview from a category's `mapPinKey`.
 *
 * The static seed guarantees URLs resolve before the backend taxonomy API has
 * hydrated; `hydrateBusinessCategoryCatalog()` refreshes it from
 * `GET /api/public/seo/business-taxonomy/` so new categories work without a
 * frontend release.
 */

export const BUSINESS_CATEGORY_LOCALES = ['bg', 'en', 'de', 'it', 'fr', 'es'];
const DEFAULT_CATALOG_LOCALE = 'en';

/**
 * Seed categories: key, mapPinKey, per-locale slugs, BG+EN names.
 * Slugs are permanent canonical URL roots — keep in lockstep with the backend.
 */
const SEED_CATEGORIES = [
  {
    key: 'car_repair',
    mapPinKey: 'general_service',
    icon: 'wrench',
    names: { en: 'Car repair', bg: 'Автосервиз' },
    slugs: {
      bg: 'avtoservizi', en: 'car-repair', de: 'autowerkstatt',
      fr: 'garage-automobile', it: 'officina-meccanica', es: 'talleres-mecanicos',
    },
  },
  {
    key: 'tire_shop',
    mapPinKey: 'tire_center',
    icon: 'tire',
    names: { en: 'Tyre shop', bg: 'Сервиз за гуми' },
    slugs: {
      bg: 'gumi-servizi', en: 'tyre-shop', de: 'reifenservice',
      fr: 'pneus', it: 'gommista', es: 'neumaticos',
    },
  },
  {
    key: 'roadside_assistance',
    mapPinKey: 'road_assistance',
    icon: 'car-emergency',
    names: { en: 'Roadside assistance', bg: 'Пътна помощ' },
    slugs: {
      bg: 'patna-pomosht', en: 'roadside-assistance', de: 'pannenhilfe',
      fr: 'depannage-auto', it: 'soccorso-stradale', es: 'asistencia-carretera',
    },
  },
  {
    key: 'car_wash',
    mapPinKey: 'car_wash',
    icon: 'car-wash',
    names: { en: 'Car wash', bg: 'Автомивка' },
    slugs: {
      bg: 'avtomivki', en: 'car-wash', de: 'waschanlage',
      fr: 'lavage-auto', it: 'autolavaggio', es: 'lavado-coches',
    },
  },
  {
    key: 'detailing',
    mapPinKey: 'detailing',
    icon: 'spray-bottle',
    names: { en: 'Car detailing', bg: 'Авто детайлинг' },
    slugs: {
      bg: 'avtodetailing', en: 'car-detailing', de: 'autoaufbereitung',
      fr: 'detailing-auto', it: 'detailing-auto', es: 'detailing',
    },
  },
  {
    key: 'body_shop',
    mapPinKey: 'body_shop',
    icon: 'hammer-wrench',
    names: { en: 'Body shop', bg: 'Автотенекеджийство' },
    slugs: {
      bg: 'avtotenekedzhiya', en: 'body-shop', de: 'karosserie',
      fr: 'carrosserie', it: 'carrozzeria', es: 'chapa-y-pintura',
    },
  },
  {
    key: 'auto_electrician',
    mapPinKey: 'diagnostics',
    icon: 'stethoscope',
    names: { en: 'Auto electrician', bg: 'Авто електро' },
    slugs: {
      bg: 'avtoelektro', en: 'auto-electrician', de: 'autoelektrik',
      fr: 'electricite-automobile', it: 'elettrauto', es: 'electricidad-automovil',
    },
  },
  {
    key: 'auto_locksmith',
    mapPinKey: 'locksmith',
    icon: 'key-variant',
    names: { en: 'Car locksmith', bg: 'Автоключар' },
    slugs: {
      bg: 'avtokluchar', en: 'car-locksmith', de: 'autoschluesseldienst',
      fr: 'serrurier-automobile', it: 'chiavi-auto', es: 'cerrajero-coches',
    },
  },
  {
    key: 'motorcycle_repair',
    mapPinKey: 'motorcycle_service',
    icon: 'motorbike',
    names: { en: 'Motorcycle repair', bg: 'Мотосервиз' },
    slugs: {
      bg: 'motoservizi', en: 'motorcycle-repair', de: 'motorradwerkstatt',
      fr: 'garage-moto', it: 'officina-moto', es: 'taller-motos',
    },
  },
  {
    key: 'truck_repair',
    mapPinKey: 'truck_service',
    icon: 'truck',
    names: { en: 'Truck repair', bg: 'Сервиз за камиони' },
    slugs: {
      bg: 'kamionni-servizi', en: 'truck-repair', de: 'lkw-werkstatt',
      fr: 'garage-poids-lourds', it: 'officina-camion', es: 'taller-camiones',
    },
  },
  {
    key: 'ev_charging',
    mapPinKey: 'ev_charging',
    icon: 'ev-station',
    names: { en: 'EV charging', bg: 'Зарядна станция' },
    slugs: {
      bg: 'zaryadni-stantsii', en: 'ev-charging', de: 'ladestation',
      fr: 'bornes-recharge', it: 'colonnine-ricarica', es: 'puntos-recarga',
    },
  },
  {
    key: 'vehicle_inspection',
    mapPinKey: 'vehicle_inspection',
    icon: 'clipboard-check-outline',
    names: { en: 'Vehicle inspection', bg: 'Технически преглед' },
    slugs: {
      bg: 'tehnicheski-pregled', en: 'vehicle-inspection', de: 'hauptuntersuchung',
      fr: 'controle-technique', it: 'revisione-auto', es: 'itv',
    },
  },
];

function normalizeSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeLocale(locale) {
  const value = String(locale || '').trim().toLowerCase();
  return BUSINESS_CATEGORY_LOCALES.includes(value) ? value : DEFAULT_CATALOG_LOCALE;
}

function buildRegistry(categories) {
  const byKey = new Map();
  const slugToKey = new Map();
  for (const cat of categories) {
    if (!cat?.key) continue;
    byKey.set(cat.key, cat);
    for (const locale of BUSINESS_CATEGORY_LOCALES) {
      const slug = normalizeSlug(cat.slugs?.[locale] || cat.slugs?.en);
      if (slug) slugToKey.set(slug, cat.key);
    }
  }
  return { categories, byKey, slugToKey };
}

let registry = buildRegistry(SEED_CATEGORIES);

/** Replace the runtime catalog with backend taxonomy data (idempotent). */
export function hydrateBusinessCategoryCatalog(businessCategories) {
  if (!Array.isArray(businessCategories) || !businessCategories.length) return;
  const merged = new Map(SEED_CATEGORIES.map((c) => [c.key, { ...c }]));
  for (const raw of businessCategories) {
    if (!raw?.key) continue;
    const slugs = {};
    for (const locale of BUSINESS_CATEGORY_LOCALES) {
      const slug = normalizeSlug(raw[`slug_${locale}`]);
      if (slug) slugs[locale] = slug;
    }
    const existing = merged.get(raw.key) || {};
    merged.set(raw.key, {
      key: raw.key,
      mapPinKey: raw.map_pin_key || existing.mapPinKey || 'general_service',
      icon: raw.icon || existing.icon || 'wrench',
      names: {
        en: raw.name_en || existing.names?.en || raw.name || raw.key,
        bg: raw.name_bg || existing.names?.bg || '',
      },
      slugs: { ...(existing.slugs || {}), ...slugs },
    });
  }
  registry = buildRegistry(Array.from(merged.values()));
}

/** All catalog categories (seed + hydrated), in insertion order. */
export function getAllBusinessCategories() {
  return registry.categories.slice();
}

export function getBusinessCategoryByKey(key) {
  return registry.byKey.get(String(key || '').trim()) || null;
}

/** Localized slug for a category key, falling back to EN then the key. */
export function localizedCategorySlug(key, locale) {
  const cat = getBusinessCategoryByKey(key);
  if (!cat) return null;
  const loc = normalizeLocale(locale);
  return normalizeSlug(cat.slugs?.[loc] || cat.slugs?.en) || null;
}

/** Category key for any localized slug (matches across all locales). */
export function categoryKeyForSlug(slug) {
  return registry.slugToKey.get(normalizeSlug(slug)) || null;
}

export function isBusinessCategorySlug(slug) {
  return registry.slugToKey.has(normalizeSlug(slug));
}

/** Map-pin registry key that a category drives (for the pin preview). */
export function mapPinKeyForCategoryKey(key) {
  return getBusinessCategoryByKey(key)?.mapPinKey || 'general_service';
}
