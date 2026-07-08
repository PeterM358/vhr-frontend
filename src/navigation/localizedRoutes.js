/**
 * Localized public web routes with language-prefixed paths.
 *
 * This module wraps the existing canonical (locale-free) SEO paths defined in
 * `utils/seo/seoPaths` and exposes helpers for switching languages while
 * preserving the logical page (same city/repair/vehicle/service center).
 */

import {
  serviceCentersPath,
  serviceCentersCityPath,
  vehicleServiceCentersPath,
  repairFirstPath,
  serviceCenterProfilePath,
  parsePublicSeoPath,
} from '../utils/seo/seoPaths';

export const SUPPORTED_LANGUAGES = ['bg', 'en', 'de', 'it', 'fr', 'es'];
export const DEFAULT_LANGUAGE = 'en';

const SERVICE_CENTERS_ROOT_SLUG = {
  en: 'service-centers',
  bg: 'avtoservizi',
  de: 'kfz-werkstatt',
  it: 'centri-assistenza',
  fr: 'centres-de-service',
  es: 'centros-de-servicio',
};

const SERVICE_CENTER_PROFILE_PREFIX = {
  en: 'service-center',
  bg: 'avtoserviz',
  de: 'werkstatt',
  it: 'officina',
  fr: 'atelier',
  es: 'taller',
};

const VEHICLE_PREFIX_SLUGS = {
  car: {
    en: 'car-service-centers',
    bg: 'avtoservizi',
    de: 'auto-werkstatt',
    it: 'officine-auto',
    fr: 'garages-auto',
    es: 'talleres-coche',
  },
  truck: {
    en: 'truck-service-centers',
    bg: 'kamionni-servizi',
    de: 'lkw-werkstatt',
    it: 'officine-camion',
    fr: 'garages-poids-lourds',
    es: 'talleres-camion',
  },
  motorcycle: {
    en: 'motorcycle-service-centers',
    bg: 'moto-servizi',
    de: 'motorrad-werkstatt',
    it: 'officine-moto',
    fr: 'garages-moto',
    es: 'talleres-moto',
  },
  bicycle: {
    en: 'bike-service-centers',
    bg: 'veloservizi',
    de: 'fahrrad-werkstatt',
    it: 'officine-bici',
    fr: 'ateliers-velo',
    es: 'talleres-bicicleta',
  },
  ebike: {
    en: 'ebike-service-centers',
    bg: 'ebike-servizi',
    de: 'ebike-werkstatt',
    it: 'officine-ebike',
    fr: 'ateliers-ebike',
    es: 'talleres-ebike',
  },
  scooter: {
    en: 'scooter-service-centers',
    bg: 'skuter-servizi',
    de: 'roller-werkstatt',
    it: 'officine-scooter',
    fr: 'ateliers-scooter',
    es: 'talleres-scooter',
  },
};

function normalizeLang(lang) {
  const value = String(lang || '').trim().toLowerCase();
  return SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

function splitPath(path) {
  const trimmed = String(path || '').split('?')[0].split('#')[0];
  const withoutSlashes = trimmed.replace(/^\//, '').replace(/\/$/, '');
  if (!withoutSlashes) return [];
  return withoutSlashes.split('/').filter(Boolean);
}

function joinSegments(segments) {
  if (!segments?.length) return '/';
  return `/${segments.join('/')}`;
}

export function getCurrentLanguageFromPath(pathname) {
  const segments = splitPath(pathname);
  if (!segments.length) return DEFAULT_LANGUAGE;
  const [first] = segments;
  if (SUPPORTED_LANGUAGES.includes(first)) {
    return first;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Returns the supported language prefix from a pathname, or `null` if the URL
 * does not start with a supported `/{lang}/...` segment.
 */
export function getSupportedLanguagePrefixFromPathname(pathname) {
  const segments = splitPath(pathname);
  if (!segments.length) return null;
  const [first] = segments;
  return SUPPORTED_LANGUAGES.includes(first) ? first : null;
}

export function stripLanguagePrefix(pathname) {
  const segments = splitPath(pathname);
  if (!segments.length) {
    return { lang: DEFAULT_LANGUAGE, segments: [] };
  }
  const [first, ...rest] = segments;
  if (SUPPORTED_LANGUAGES.includes(first)) {
    return { lang: first, segments: rest };
  }
  return { lang: DEFAULT_LANGUAGE, segments };
}

function vehicleCodeFromLocalizedPrefix(lang, prefix) {
  const langNorm = normalizeLang(lang);
  const target = String(prefix || '').trim().toLowerCase();
  for (const [code, perLang] of Object.entries(VEHICLE_PREFIX_SLUGS)) {
    if (perLang[langNorm] === target) {
      return code;
    }
  }
  return null;
}

function localizedPrefixForVehicleCode(lang, code) {
  const langNorm = normalizeLang(lang);
  const entry = VEHICLE_PREFIX_SLUGS[code];
  if (!entry) return null;
  return entry[langNorm] || entry[DEFAULT_LANGUAGE];
}

export function toCanonicalPublicPath(localizedPath) {
  const { lang, segments } = stripLanguagePrefix(localizedPath);
  if (!segments.length) {
    return serviceCentersPath();
  }

  const [first, ...rest] = segments;

  // Legacy BG slugs (pre-avtoservizi rename).
  if (lang === 'bg' && first === 'servizi') {
    return joinSegments(['service-centers', ...rest]);
  }
  if (lang === 'bg' && first === 'serviz') {
    return joinSegments(['service-center', ...rest]);
  }

  if (first === SERVICE_CENTERS_ROOT_SLUG[lang]) {
    return joinSegments(['service-centers', ...rest]);
  }

  const vehicleCode = vehicleCodeFromLocalizedPrefix(lang, first);
  if (vehicleCode) {
    const canonicalPrefix =
      {
        car: 'car-service-centers',
        truck: 'truck-service-centers',
        motorcycle: 'motorcycle-service-centers',
        bicycle: 'bike-service-centers',
        ebike: 'ebike-service-centers',
        scooter: 'scooter-service-centers',
      }[vehicleCode] || first;
    return joinSegments([canonicalPrefix, ...rest]);
  }

  if (first === SERVICE_CENTER_PROFILE_PREFIX[lang]) {
    return joinSegments(['service-center', ...rest]);
  }

  return joinSegments(segments);
}

export function localizeCanonicalPath(canonicalPath, langInput) {
  const lang = normalizeLang(langInput);
  const segments = splitPath(canonicalPath);
  if (!segments.length) {
    const root = SERVICE_CENTERS_ROOT_SLUG[lang] || SERVICE_CENTERS_ROOT_SLUG[DEFAULT_LANGUAGE];
    return `/${lang}/${root}`;
  }

  const [first, ...rest] = segments;

  if (first === 'service-centers') {
    const root = SERVICE_CENTERS_ROOT_SLUG[lang] || SERVICE_CENTERS_ROOT_SLUG[DEFAULT_LANGUAGE];
    return joinSegments([lang, root, ...rest]);
  }

  if (first === 'service-center') {
    const prefix =
      SERVICE_CENTER_PROFILE_PREFIX[lang] || SERVICE_CENTER_PROFILE_PREFIX[DEFAULT_LANGUAGE];
    return joinSegments([lang, prefix, ...rest]);
  }

  const seoParsed = parsePublicSeoPath(segments.join('/'));
  if (seoParsed) {
    if (
      seoParsed.type === 'vehicle_discovery' ||
      seoParsed.type === 'vehicle_city' ||
      seoParsed.type === 'vehicle_repair_city'
    ) {
      const localizedPrefix = localizedPrefixForVehicleCode(lang, seoParsed.vehicleType);
      if (localizedPrefix) {
        return joinSegments([lang, localizedPrefix, ...rest.slice(1)]);
      }
    }

    if (
      seoParsed.type === 'repair_first' ||
      seoParsed.type === 'repair_first_city' ||
      seoParsed.type === 'city'
    ) {
      return joinSegments([lang, ...segments]);
    }
  }

  return joinSegments([lang, ...segments]);
}

export function getLocalizedPath(langInput, routeKey, params = {}) {
  const lang = normalizeLang(langInput);
  let canonical = null;

  switch (routeKey) {
    case 'serviceCenters.root':
      canonical = serviceCentersPath();
      break;
    case 'serviceCenters.city':
      canonical = serviceCentersCityPath(params.citySlug);
      break;
    case 'serviceCenters.vehicle':
      canonical = vehicleServiceCentersPath(params.vehicleType, params.citySlug, params.repairSlug);
      break;
    case 'serviceCenters.repairFirst':
      canonical = repairFirstPath(params.repairSlug, params.citySlug);
      break;
    case 'serviceCenter.profile':
      canonical = serviceCenterProfilePath(params.centerSlug);
      break;
    case 'canonical':
      canonical = params.path || '/';
      break;
    default:
      canonical = params.path || '/';
      break;
  }

  return localizeCanonicalPath(canonical, lang);
}

export function getRouteKeyFromLocalizedPath(pathname) {
  const canonical = toCanonicalPublicPath(pathname);
  const parts = splitPath(canonical);
  if (!parts.length) return null;
  const parsed = parsePublicSeoPath(parts.join('/'));
  if (!parsed) return null;

  switch (parsed.type) {
    case 'discovery_root':
      return 'serviceCenters.root';
    case 'city':
      return 'serviceCenters.city';
    case 'vehicle_discovery':
    case 'vehicle_city':
    case 'vehicle_repair_city':
      return 'serviceCenters.vehicle';
    case 'repair_first':
    case 'repair_first_city':
      return 'serviceCenters.repairFirst';
    case 'service_center_profile':
      return 'serviceCenter.profile';
    default:
      return null;
  }
}

export function switchLanguageInPath(currentPath, targetLang) {
  const str = String(currentPath || '');

  // Preserve query + hash when switching languages (important for tabs like ?tab=offers).
  const hashIndex = str.indexOf('#');
  const hash = hashIndex >= 0 ? str.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? str.slice(0, hashIndex) : str;

  const qIndex = withoutHash.indexOf('?');
  const search = qIndex >= 0 ? withoutHash.slice(qIndex) : '';
  const pathname = qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash;

  const canonical = toCanonicalPublicPath(pathname);
  const localized = localizeCanonicalPath(canonical, targetLang);
  return `${localized}${search}${hash}`;
}

