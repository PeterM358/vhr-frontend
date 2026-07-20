/**
 * Locale-free public SEO URL paths for service center discovery and profiles.
 */

import { classifySegment } from './seoSlugCatalog';
import {
  categoryKeyForSlug,
  isBusinessCategorySlug,
  localizedCategorySlug,
} from './businessCategoryCatalog';

export const VEHICLE_TYPE_ROUTE_PREFIXES = {
  'car-service-centers': 'car',
  'truck-service-centers': 'truck',
  'motorcycle-service-centers': 'motorcycle',
  'bike-service-centers': 'bicycle',
  'ebike-service-centers': 'ebike',
  'scooter-service-centers': 'scooter',
};

export const LEGACY_CITY_VEHICLE_SEGMENTS = {
  'car-service': 'car',
  'truck-service': 'truck',
  'motorcycle-service': 'motorcycle',
  'bike-service': 'bicycle',
  'ebike-service': 'ebike',
  'scooter-service': 'scooter',
};

const RESERVED_ROOT_SEGMENTS = new Set([
  'sign-in',
  'sign-up',
  'forgot-password',
  'reset-password',
  'dashboard',
  'partner',
  'service-centers',
  'service-center',
  'PublicHome',
  'ShopMap',
  'ShopDetail',
  'en',
  'bg',
  'de',
  'it',
  'fr',
  'es',
]);

export function vehicleRoutePrefixForCode(code) {
  const target = String(code || '').trim().toLowerCase();
  return (
    Object.entries(VEHICLE_TYPE_ROUTE_PREFIXES).find(([, vehicleCode]) => vehicleCode === target)?.[0] || null
  );
}

export function vehicleCodeFromRoutePrefix(prefix) {
  return VEHICLE_TYPE_ROUTE_PREFIXES[String(prefix || '').trim().toLowerCase()] || null;
}

export function serviceCentersPath() {
  return '/service-centers';
}

export function serviceCentersCityPath(citySlug) {
  return `/service-centers/${String(citySlug || '').trim().toLowerCase()}`;
}

export function serviceCentersBrandPath(brandSlug) {
  const brand = String(brandSlug || '').trim().toLowerCase();
  return brand ? `/service-centers/${brand}` : serviceCentersPath();
}

export function serviceCentersDiscoveryPath({ brandSlug, citySlug, repairSlug } = {}) {
  const brand = String(brandSlug || '').trim().toLowerCase();
  const city = String(citySlug || '').trim().toLowerCase();
  const repair = String(repairSlug || '').trim().toLowerCase();

  if (brand && city && repair) {
    return `/service-centers/${brand}/${city}/${repair}`;
  }
  if (brand && city) {
    return `/service-centers/${brand}/${city}`;
  }
  if (brand && repair) {
    return `/service-centers/${brand}/${repair}`;
  }
  if (brand) {
    return serviceCentersBrandPath(brand);
  }
  if (city && repair) {
    return `/service-centers/${city}/${repair}`;
  }
  if (city) {
    return serviceCentersCityPath(city);
  }
  return serviceCentersPath();
}

export function vehicleServiceCentersPath(vehicleCode, citySlug, repairSlug) {
  const prefix = vehicleRoutePrefixForCode(vehicleCode);
  if (!prefix) return serviceCentersPath();
  const city = String(citySlug || '').trim().toLowerCase();
  const repair = String(repairSlug || '').trim().toLowerCase();
  if (city && repair) return `/${prefix}/${city}/${repair}`;
  if (city) return `/${prefix}/${city}`;
  return `/${prefix}`;
}

export function repairFirstPath(repairSlug, citySlug) {
  const repair = String(repairSlug || '').trim().toLowerCase();
  if (!repair) return serviceCentersPath();
  const city = String(citySlug || '').trim().toLowerCase();
  return city ? `/${repair}/${city}` : `/${repair}`;
}

export function serviceCenterProfilePath(slug) {
  return `/service-center/${String(slug || '').trim().toLowerCase()}`;
}

// --- Business category-context URLs -----------------------------------------
// `/{categorySlug}` · `/{categorySlug}/{city}` · `/{categorySlug}/{city}/{shop}`
// The category slug is already localized; the `/{lang}` prefix is added by the
// localizedRoutes layer. Shared builder utility for category-aware links.

export function categoryDiscoveryPath(categorySlug) {
  const category = String(categorySlug || '').trim().toLowerCase();
  return category ? `/${category}` : serviceCentersPath();
}

export function categoryCityPath(categorySlug, citySlug) {
  const category = String(categorySlug || '').trim().toLowerCase();
  const city = String(citySlug || '').trim().toLowerCase();
  if (category && city) return `/${category}/${city}`;
  return categoryDiscoveryPath(category);
}

export function categoryCenterPath(categorySlug, citySlug, centerSlug) {
  const category = String(categorySlug || '').trim().toLowerCase();
  const city = String(citySlug || '').trim().toLowerCase();
  const center = String(centerSlug || '').trim().toLowerCase();
  if (category && city && center) return `/${category}/${city}/${center}`;
  if (center) return serviceCenterProfilePath(center);
  return categoryCityPath(category, city);
}

/** Build a localized category URL segment for a category key. */
export function categorySlugForKey(categoryKey, locale) {
  return localizedCategorySlug(categoryKey, locale);
}

function normalizePathParts(path) {
  const trimmed = String(path || '').replace(/^\//, '').replace(/\/$/, '');
  if (!trimmed) return [];
  return trimmed.split('/').filter(Boolean).map((part) => part.trim().toLowerCase());
}

function parseServiceCentersSegments(parts) {
  if (!parts.length || parts[0] !== 'service-centers') {
    return null;
  }

  if (parts.length === 1) {
    return { type: 'discovery_root' };
  }

  if (parts.length === 2) {
    const segment = parts[1];
    if (/^\d+$/.test(segment)) {
      return { type: 'legacy_numeric_profile', shopId: parseInt(segment, 10) };
    }

    const kind = classifySegment(segment);
    if (kind === 'brand') {
      return { type: 'discovery_brand', brandSlug: segment };
    }
    if (kind === 'repair') {
      return { type: 'discovery_repair', repairSlug: segment };
    }
    return { type: 'city', citySlug: segment };
  }

  if (parts.length === 3) {
    const [first, second] = [parts[1], parts[2]];
    if (LEGACY_CITY_VEHICLE_SEGMENTS[second]) {
      return {
        type: 'legacy_city_vehicle',
        citySlug: first,
        vehicleType: LEGACY_CITY_VEHICLE_SEGMENTS[second],
      };
    }

    const firstKind = classifySegment(first);
    const secondKind = classifySegment(second);

    if (firstKind === 'brand' && secondKind === 'city') {
      return { type: 'discovery_brand_city', brandSlug: first, citySlug: second };
    }
    if (firstKind === 'city' && secondKind === 'brand') {
      return { type: 'discovery_brand_city', brandSlug: second, citySlug: first };
    }
    if (firstKind === 'city' && secondKind === 'repair') {
      return { type: 'legacy_city_repair', citySlug: first, repairSlug: second };
    }
    if (firstKind === 'brand' && secondKind === 'repair') {
      return { type: 'discovery_brand_repair', brandSlug: first, repairSlug: second };
    }

    if (secondKind !== 'repair') {
      return { type: 'discovery_brand_city', brandSlug: first, citySlug: second };
    }
    return null;
  }

  if (parts.length === 4) {
    const [first, second, third] = [parts[1], parts[2], parts[3]];
    if (second === 'c') {
      return {
        type: 'legacy_explicit_center',
        citySlug: first,
        centerSlug: third,
      };
    }
    if (LEGACY_CITY_VEHICLE_SEGMENTS[second]) {
      return {
        type: 'legacy_city_vehicle_repair',
        citySlug: first,
        vehicleType: LEGACY_CITY_VEHICLE_SEGMENTS[second],
        repairSlug: third,
      };
    }
    return { type: 'discovery_brand_city_repair', brandSlug: first, citySlug: second, repairSlug: third };
  }

  return null;
}

/**
 * Parse a normalized web path (no leading slash) into discovery/profile params.
 */
export function parsePublicSeoPath(path) {
  const parts = normalizePathParts(path);
  if (!parts.length) return null;

  if (parts[0] === 'en' || parts[0] === 'bg') {
    const inner = parsePublicSeoPath(parts.slice(1).join('/'));
    if (inner) {
      return { ...inner, legacyLocalePrefix: parts[0] };
    }
    return null;
  }

  const serviceCentersParsed = parseServiceCentersSegments(parts);
  if (serviceCentersParsed) {
    return serviceCentersParsed;
  }
  if (parts[0] === 'service-centers') {
    return null;
  }

  if (parts[0] === 'service-center') {
    if (parts.length !== 2) return null;
    if (/^\d+$/.test(parts[1])) {
      return { type: 'legacy_numeric_profile', shopId: parseInt(parts[1], 10) };
    }
    return { type: 'service_center_profile', centerSlug: parts[1] };
  }

  const vehicleType = vehicleCodeFromRoutePrefix(parts[0]);
  if (vehicleType) {
    if (parts.length === 1) {
      return { type: 'vehicle_discovery', vehicleType };
    }
    if (parts.length === 2) {
      return { type: 'vehicle_city', vehicleType, citySlug: parts[1] };
    }
    if (parts.length === 3) {
      return {
        type: 'vehicle_repair_city',
        vehicleType,
        citySlug: parts[1],
        repairSlug: parts[2],
      };
    }
    return null;
  }

  if (RESERVED_ROOT_SEGMENTS.has(parts[0])) {
    return null;
  }

  // Business category-context pages (primary OR secondary category listing +
  // category-scoped shop profile). Detected across every localized slug.
  if (isBusinessCategorySlug(parts[0])) {
    const categoryKey = categoryKeyForSlug(parts[0]);
    if (parts.length === 1) {
      return { type: 'category_discovery', categorySlug: parts[0], categoryKey };
    }
    if (parts.length === 2) {
      return {
        type: 'category_city',
        categorySlug: parts[0],
        categoryKey,
        citySlug: parts[1],
      };
    }
    if (parts.length === 3) {
      return {
        type: 'category_center',
        categorySlug: parts[0],
        categoryKey,
        citySlug: parts[1],
        centerSlug: parts[2],
      };
    }
    return null;
  }

  if (parts.length === 1) {
    return { type: 'repair_first', repairSlug: parts[0] };
  }
  if (parts.length === 2) {
    return { type: 'repair_first_city', repairSlug: parts[0], citySlug: parts[1] };
  }

  return null;
}

export function buildPathFromSeoParams(params = {}) {
  const { type } = params;
  if (type === 'discovery_root') return serviceCentersPath();
  if (type === 'city' && params.citySlug) return serviceCentersCityPath(params.citySlug);
  if (type === 'discovery_brand' && params.brandSlug) {
    return serviceCentersBrandPath(params.brandSlug);
  }
  if (type === 'discovery_repair' && params.repairSlug) {
    return repairFirstPath(params.repairSlug);
  }
  if (type === 'discovery_brand_city' && params.brandSlug && params.citySlug) {
    return serviceCentersDiscoveryPath({
      brandSlug: params.brandSlug,
      citySlug: params.citySlug,
    });
  }
  if (type === 'discovery_brand_repair' && params.brandSlug && params.repairSlug) {
    return serviceCentersDiscoveryPath({
      brandSlug: params.brandSlug,
      repairSlug: params.repairSlug,
    });
  }
  if (
    type === 'discovery_brand_city_repair'
    && params.brandSlug
    && params.citySlug
    && params.repairSlug
  ) {
    return serviceCentersDiscoveryPath({
      brandSlug: params.brandSlug,
      citySlug: params.citySlug,
      repairSlug: params.repairSlug,
    });
  }
  if (type === 'vehicle_discovery' && params.vehicleType) {
    return vehicleServiceCentersPath(params.vehicleType);
  }
  if (type === 'vehicle_city' && params.vehicleType && params.citySlug) {
    return vehicleServiceCentersPath(params.vehicleType, params.citySlug);
  }
  if (type === 'vehicle_repair_city' && params.vehicleType && params.citySlug && params.repairSlug) {
    return vehicleServiceCentersPath(params.vehicleType, params.citySlug, params.repairSlug);
  }
  if (type === 'repair_first' && params.repairSlug) {
    return repairFirstPath(params.repairSlug);
  }
  if (type === 'repair_first_city' && params.repairSlug && params.citySlug) {
    return repairFirstPath(params.repairSlug, params.citySlug);
  }
  if (type === 'service_center_profile' && params.centerSlug) {
    return serviceCenterProfilePath(params.centerSlug);
  }
  if (type === 'category_discovery' && params.categorySlug) {
    return categoryDiscoveryPath(params.categorySlug);
  }
  if (type === 'category_city' && params.categorySlug && params.citySlug) {
    return categoryCityPath(params.categorySlug, params.citySlug);
  }
  if (
    type === 'category_center'
    && params.categorySlug
    && params.citySlug
    && params.centerSlug
  ) {
    return categoryCenterPath(params.categorySlug, params.citySlug, params.centerSlug);
  }
  return null;
}

export function getLegacyRedirectTarget(path) {
  const parsed = parsePublicSeoPath(path);
  if (!parsed) return null;

  switch (parsed.type) {
    case 'legacy_explicit_center':
      return serviceCenterProfilePath(parsed.centerSlug);
    case 'legacy_city_vehicle':
      return vehicleServiceCentersPath(parsed.vehicleType, parsed.citySlug);
    case 'legacy_city_vehicle_repair':
      return vehicleServiceCentersPath(parsed.vehicleType, parsed.citySlug, parsed.repairSlug);
    case 'legacy_city_repair':
      return repairFirstPath(parsed.repairSlug, parsed.citySlug);
    default:
      if (parsed.legacyLocalePrefix) {
        return buildPathFromSeoParams(parsed) || null;
      }
      return null;
  }
}

function discoveryParamsFromParsed(parsed) {
  if (!parsed) return {};
  return {
    citySlug: parsed.citySlug || null,
    vehicleType: parsed.vehicleType || null,
    repairType: parsed.repairSlug || null,
    brandSlug: parsed.brandSlug || null,
  };
}

export function getNavigationStateFromSeoPath(path) {
  const parsed = parsePublicSeoPath(path);
  if (!parsed) return null;

  const redirect = getLegacyRedirectTarget(path);
  if (redirect) {
    return { redirectPath: redirect };
  }

  if (parsed.type === 'legacy_numeric_profile') {
    return {
      routes: [
        { name: 'ShopMap' },
        { name: 'ShopDetail', params: { shopId: parsed.shopId } },
      ],
      index: 1,
    };
  }

  if (parsed.type === 'service_center_profile') {
    return {
      routes: [
        { name: 'ShopMap' },
        { name: 'ShopDetail', params: { centerSlug: parsed.centerSlug } },
      ],
      index: 1,
    };
  }

  // Category-scoped shop profile → shop detail (category context preserved).
  if (parsed.type === 'category_center') {
    return {
      routes: [
        {
          name: 'ShopMap',
          params: {
            businessCategory: parsed.categoryKey || null,
            businessCategorySlug: parsed.categorySlug || null,
            citySlug: parsed.citySlug || null,
          },
        },
        {
          name: 'ShopDetail',
          params: {
            centerSlug: parsed.centerSlug,
            businessCategory: parsed.categoryKey || null,
            businessCategorySlug: parsed.categorySlug || null,
          },
        },
      ],
      index: 1,
    };
  }

  // Category listing (primary OR secondary) → discovery map with category filter.
  if (parsed.type === 'category_discovery' || parsed.type === 'category_city') {
    return {
      routes: [
        {
          name: 'ShopMap',
          params: {
            businessCategory: parsed.categoryKey || null,
            businessCategorySlug: parsed.categorySlug || null,
            citySlug: parsed.citySlug || null,
          },
        },
      ],
    };
  }

  if (
    parsed.type === 'discovery_root' ||
    parsed.type === 'city' ||
    parsed.type === 'discovery_brand' ||
    parsed.type === 'discovery_repair' ||
    parsed.type === 'discovery_brand_city' ||
    parsed.type === 'discovery_brand_repair' ||
    parsed.type === 'discovery_brand_city_repair' ||
    parsed.type === 'vehicle_discovery' ||
    parsed.type === 'vehicle_city' ||
    parsed.type === 'vehicle_repair_city' ||
    parsed.type === 'repair_first' ||
    parsed.type === 'repair_first_city'
  ) {
    return {
      routes: [{ name: 'ShopMap', params: discoveryParamsFromParsed(parsed) }],
    };
  }

  return null;
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

  if (route.name === 'ShopDetail') {
    const { centerSlug, businessCategorySlug, citySlug } = route.params || {};
    if (centerSlug && businessCategorySlug && citySlug) {
      return categoryCenterPath(businessCategorySlug, citySlug, centerSlug);
    }
    if (centerSlug) {
      return serviceCenterProfilePath(centerSlug);
    }
    return null;
  }

  if (route.name === 'ShopMap') {
    const {
      citySlug, vehicleType, repairType, brandSlug, businessCategorySlug,
    } = route.params || {};
    if (businessCategorySlug) {
      return citySlug
        ? categoryCityPath(businessCategorySlug, citySlug)
        : categoryDiscoveryPath(businessCategorySlug);
    }
    if (vehicleType && citySlug && repairType) {
      return vehicleServiceCentersPath(vehicleType, citySlug, repairType);
    }
    if (vehicleType && citySlug) {
      return vehicleServiceCentersPath(vehicleType, citySlug);
    }
    if (vehicleType) {
      return vehicleServiceCentersPath(vehicleType);
    }
    if (brandSlug) {
      return serviceCentersDiscoveryPath({
        brandSlug,
        citySlug,
        repairSlug: repairType,
      });
    }
    if (repairType && citySlug) {
      return repairFirstPath(repairType, citySlug);
    }
    if (repairType) {
      return repairFirstPath(repairType);
    }
    if (citySlug) {
      return serviceCentersCityPath(citySlug);
    }
    return serviceCentersPath();
  }

  return null;
}

/** @deprecated use serviceCenterProfilePath */
export function buildServiceCenterPath({ centerSlug }) {
  return serviceCenterProfilePath(centerSlug);
}

/** @deprecated use serviceCentersCityPath */
export function buildCityDirectoryPath({ citySlug }) {
  return serviceCentersCityPath(citySlug);
}
