/**
 * Parse and build locale-aware public SEO URL paths.
 */

export const SEO_LOCALES = ['en', 'bg'];

export function normalizeSeoLocale(value, fallback = 'en') {
  const loc = String(value || fallback).trim().toLowerCase();
  return SEO_LOCALES.includes(loc) ? loc : fallback;
}

export function cityDirectorySegment(locale) {
  return normalizeSeoLocale(locale) === 'bg' ? 'servizi' : 'service-centers';
}

export function buildServiceCenterPath({ locale = 'en', citySlug, centerSlug }) {
  const loc = normalizeSeoLocale(locale);
  const segment = cityDirectorySegment(loc);
  return `/${loc}/${segment}/${citySlug}/${centerSlug}`;
}

export function buildCityDirectoryPath({ locale = 'en', citySlug }) {
  const loc = normalizeSeoLocale(locale);
  const segment = cityDirectorySegment(loc);
  return `/${loc}/${segment}/${citySlug}`;
}

export function buildServiceCityPath({ locale = 'en', repairSlug, citySlug }) {
  const loc = normalizeSeoLocale(locale);
  return `/${loc}/${repairSlug}/${citySlug}`;
}

export function buildVehicleServiceCityPath({ locale = 'en', vehicleSlug, repairSlug, citySlug }) {
  const loc = normalizeSeoLocale(locale);
  if (loc === 'bg') {
    return `/${loc}/${repairSlug}-na-${vehicleSlug}/${citySlug}`;
  }
  return `/${loc}/${vehicleSlug}-${repairSlug}/${citySlug}`;
}

const RESERVED_ROOT_SEGMENTS = new Set([
  'sign-in',
  'sign-up',
  'forgot-password',
  'reset-password',
  'dashboard',
  'partner',
  'service-centers',
  'my-vehicles',
]);

/**
 * Parse normalized web path (no leading slash) into SEO navigation params.
 */
export function parsePublicSeoPath(path) {
  const trimmed = String(path || '').replace(/^\//, '').replace(/\/$/, '');
  if (!trimmed) return null;

  const parts = trimmed.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const locale = normalizeSeoLocale(parts[0], '');
  if (!SEO_LOCALES.includes(locale)) return null;

  const segment = parts[1];
  const citySegment = cityDirectorySegment(locale);

  if (segment === citySegment && parts.length === 3) {
    return {
      type: 'city',
      locale,
      citySlug: parts[2],
    };
  }

  if (segment === citySegment && parts.length === 4) {
    return {
      type: 'service_center',
      locale,
      citySlug: parts[2],
      centerSlug: parts[3],
    };
  }

  if (parts.length === 3 && !RESERVED_ROOT_SEGMENTS.has(segment) && segment !== citySegment) {
    const landingSlug = segment;
    const citySlug = parts[2];
    if (locale === 'bg' && landingSlug.includes('-na-')) {
      const splitAt = landingSlug.lastIndexOf('-na-');
      const repairSlug = landingSlug.slice(0, splitAt);
      const vehicleSlug = landingSlug.slice(splitAt + 4);
      if (repairSlug && vehicleSlug) {
        return {
          type: 'vehicle_service_city',
          locale,
          landingSlug,
          repairSlug,
          vehicleSlug,
          citySlug,
        };
      }
    }
    return {
      type: 'landing',
      locale,
      landingSlug,
      citySlug,
    };
  }

  return null;
}

export function buildPathFromSeoParams(params = {}) {
  const { type, locale = 'en', citySlug, centerSlug, repairSlug, vehicleSlug, landingSlug } = params;
  if (type === 'service_center' && citySlug && centerSlug) {
    return buildServiceCenterPath({ locale, citySlug, centerSlug });
  }
  if (type === 'city' && citySlug) {
    return buildCityDirectoryPath({ locale, citySlug });
  }
  if (type === 'vehicle_service_city' && citySlug && repairSlug && vehicleSlug) {
    return buildVehicleServiceCityPath({ locale, vehicleSlug, repairSlug, citySlug });
  }
  if (type === 'landing' && citySlug && (repairSlug || landingSlug)) {
    return buildServiceCityPath({ locale, repairSlug: repairSlug || landingSlug, citySlug });
  }
  return null;
}

export function getNavigationStateFromSeoPath(path) {
  const parsed = parsePublicSeoPath(path);
  if (!parsed) return null;

  if (parsed.type === 'service_center') {
    return {
      routes: [{ name: 'ShopDetail', params: parsed }],
    };
  }

  return {
    routes: [{ name: 'PublicSeoPage', params: parsed }],
  };
}

function findActiveRoute(state) {
  if (!state?.routes?.length) return null;
  const index = typeof state.index === 'number' ? state.index : state.routes.length - 1;
  let route = state.routes[index];
  while (route?.state?.routes?.length) {
    const nestedIndex = typeof route.state.index === 'number' ? route.state.index : route.state.routes.length - 1;
    route = route.state.routes[nestedIndex];
  }
  return route;
}

export function getSeoPathFromNavigationState(state) {
  const route = findActiveRoute(state);
  if (!route) return null;
  if (route.name === 'ShopDetail' && route.params?.citySlug && route.params?.centerSlug) {
    return buildPathFromSeoParams({ type: 'service_center', ...route.params });
  }
  if (route.name === 'PublicSeoPage' && route.params?.type) {
    return buildPathFromSeoParams(route.params);
  }
  return null;
}
