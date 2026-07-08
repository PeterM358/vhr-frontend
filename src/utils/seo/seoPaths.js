/**
 * Locale-free public SEO URL paths for service center discovery and profiles.
 */

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

function normalizePathParts(path) {
  const trimmed = String(path || '').replace(/^\//, '').replace(/\/$/, '');
  if (!trimmed) return [];
  return trimmed.split('/').filter(Boolean).map((part) => part.trim().toLowerCase());
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

  if (parts[0] === 'service-centers') {
    if (parts.length === 1) {
      return { type: 'discovery_root' };
    }
    if (parts.length === 2) {
      if (/^\d+$/.test(parts[1])) {
        return { type: 'legacy_numeric_profile', shopId: parseInt(parts[1], 10) };
      }
      return { type: 'city', citySlug: parts[1] };
    }
    if (parts.length === 4 && parts[2] === 'c') {
      return {
        type: 'legacy_explicit_center',
        citySlug: parts[1],
        centerSlug: parts[3],
      };
    }
    if (parts.length === 3) {
      const [citySlug, segment] = [parts[1], parts[2]];
      if (LEGACY_CITY_VEHICLE_SEGMENTS[segment]) {
        return {
          type: 'legacy_city_vehicle',
          citySlug,
          vehicleType: LEGACY_CITY_VEHICLE_SEGMENTS[segment],
        };
      }
      return {
        type: 'legacy_city_repair',
        citySlug,
        repairSlug: segment,
      };
    }
    if (parts.length === 4 && LEGACY_CITY_VEHICLE_SEGMENTS[parts[2]]) {
      return {
        type: 'legacy_city_vehicle_repair',
        citySlug: parts[1],
        vehicleType: LEGACY_CITY_VEHICLE_SEGMENTS[parts[2]],
        repairSlug: parts[3],
      };
    }
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

  if (
    parsed.type === 'discovery_root' ||
    parsed.type === 'city' ||
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
    if (route.params?.centerSlug) {
      return serviceCenterProfilePath(route.params.centerSlug);
    }
    return null;
  }

  if (route.name === 'ShopMap') {
    const { citySlug, vehicleType, repairType } = route.params || {};
    if (vehicleType && citySlug && repairType) {
      return vehicleServiceCentersPath(vehicleType, citySlug, repairType);
    }
    if (vehicleType && citySlug) {
      return vehicleServiceCentersPath(vehicleType, citySlug);
    }
    if (vehicleType) {
      return vehicleServiceCentersPath(vehicleType);
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
