/**
 * Web-only path normalization and linking helpers.
 * Maps legacy URLs to canonical user-facing paths.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPathFromState as getPathFromStateDefault,
  getStateFromPath as getStateFromPathDefault,
} from '@react-navigation/native';
import { linkingConfig } from './linkingConfig';
import { syncWebDocumentTitle } from './webDocumentTitle';
import { buildFallbackShopPath } from '../api/seo';
import {
  getNavigationStateFromSeoPath,
  getSeoPathFromNavigationState,
} from '../utils/seo/seoPaths';
import {
  dashboard,
  normalizeWebPath,
  parseServiceRecordQuery,
  vehicleAdd,
  vehicleDetail,
  vehicleServiceRecordNew,
  vehicleSpecs,
  vehicles,
} from './webRoutes';

function findFocusedRoute(state) {
  if (!state?.routes?.length) return null;
  const index = typeof state.index === 'number' ? state.index : state.routes.length - 1;
  let route = state.routes[index];
  while (route?.state?.routes?.length) {
    const nestedIndex =
      typeof route.state.index === 'number' ? route.state.index : route.state.routes.length - 1;
    route = route.state.routes[nestedIndex];
  }
  return route;
}

function buildServiceRecordPathSuffix(params = {}) {
  const query = new URLSearchParams();
  if (params.type != null && params.type !== '') {
    query.set('type', String(params.type));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

function vehicleStackState(tailRoutes) {
  return {
    index: tailRoutes.length,
    routes: [{ name: 'Home' }, ...tailRoutes],
  };
}

/**
 * Absolute path for the focused route (leading "/").
 * React Navigation pushState requires absolute paths — relative paths stack onto the current URL.
 */
export function getCanonicalWebPath(state) {
  const route = findFocusedRoute(state);
  if (!route?.name) return null;

  const params = route.params || {};
  const vehicleId = params.vehicleId;

  switch (route.name) {
    case 'PublicHome':
      return '/';
    case 'Home':
    case 'HomeMain':
      return dashboard();
    case 'ClientVehicles':
      return vehicles();
    case 'CreateVehicle':
      return vehicleAdd();
    case 'VehicleDetail':
      return vehicleId != null ? vehicleDetail(vehicleId) : vehicles();
    case 'VehicleSpecs':
      return vehicleId != null ? vehicleSpecs(vehicleId) : vehicles();
    case 'LogServiceRecord':
      return vehicleId != null
        ? vehicleServiceRecordNew(vehicleId, { type: params.type })
        : vehicles();
    default:
      return null;
  }
}

/** Parse dashboard vehicle paths (and legacy my-vehicles) into navigation state. */
export function getVehicleNavigationStateFromPath(path) {
  const trimmed = String(path || '').replace(/^\//, '').replace(/\/$/, '');
  if (!trimmed) return null;

  const [pathPart, queryPart] = trimmed.split('?');
  const query = parseServiceRecordQuery(queryPart);

  const legacy = pathPart.startsWith('my-vehicles');
  const base = legacy ? 'my-vehicles' : 'dashboard/vehicles';

  if (pathPart === base) {
    return vehicleStackState([{ name: 'ClientVehicles' }]);
  }
  if (pathPart === `${base}/add`) {
    return vehicleStackState([{ name: 'CreateVehicle' }]);
  }

  let match = pathPart.match(new RegExp(`^${base.replace('/', '\\/')}\\/(\\d+)\\/service-record\\/new$`));
  if (match) {
    const id = parseInt(match[1], 10);
    if (!Number.isFinite(id)) return null;
    return vehicleStackState([
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId: id } },
      {
        name: 'LogServiceRecord',
        params: { vehicleId: id, ...query },
      },
    ]);
  }

  match = pathPart.match(new RegExp(`^${base.replace('/', '\\/')}\\/(\\d+)\\/specs$`));
  if (match) {
    const id = parseInt(match[1], 10);
    if (!Number.isFinite(id)) return null;
    return vehicleStackState([
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId: id } },
      { name: 'VehicleSpecs', params: { vehicleId: id } },
    ]);
  }

  match = pathPart.match(new RegExp(`^${base.replace('/', '\\/')}\\/(\\d+)$`));
  if (match) {
    const id = parseInt(match[1], 10);
    if (!Number.isFinite(id)) return null;
    return vehicleStackState([
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId: id } },
    ]);
  }

  return null;
}

/** @deprecated */
export function collapseDuplicateVehiclePath(path) {
  if (!path) return path;
  return normalizeWebPath(path);
}

/** Strip leading slash and normalize legacy path segments before parsing. */
export function normalizeWebLinkingPath(path) {
  if (!path) return '';

  const absolute = normalizeWebPath(path);
  const trimmed = absolute.replace(/^\//, '').replace(/\/$/, '');

  if (!trimmed || trimmed === 'PublicHome') {
    return '';
  }
  if (trimmed === 'AuthLoading') {
    return '';
  }
  if (trimmed === 'ShopMap') {
    return 'service-centers';
  }
  if (trimmed.startsWith('ShopMap/')) {
    return `service-centers${trimmed.slice('ShopMap'.length)}`;
  }
  if (trimmed === 'Home/HomeMain') {
    return 'dashboard';
  }
  if (trimmed.startsWith('Home/HomeMain/')) {
    return `dashboard${trimmed.slice('Home/HomeMain'.length)}`;
  }
  if (trimmed === 'ShopHome/ShopDashboard' || trimmed === 'ShopHome') {
    return 'partner/dashboard';
  }
  if (trimmed.startsWith('ShopHome/')) {
    return 'partner/dashboard';
  }
  if (trimmed === 'ClientVehicles' || trimmed.startsWith('ClientVehicles/')) {
    return trimmed.replace(/^ClientVehicles/, 'dashboard/vehicles');
  }
  if (trimmed === 'CreateVehicle' || trimmed.startsWith('CreateVehicle/')) {
    return 'dashboard/vehicles/add';
  }
  if (trimmed === 'add' || trimmed.startsWith('add/')) {
    return 'dashboard/vehicles/add';
  }
  if (trimmed.startsWith('VehicleDetail/')) {
    return trimmed.replace(/^VehicleDetail/, 'dashboard/vehicles');
  }

  return trimmed;
}

async function hasStoredAuthToken() {
  const token = await AsyncStorage.getItem('@access_token');
  return !!(token && token !== 'null' && token !== 'undefined');
}

function parseShopIdFromSearch(search) {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = params.get('shopId') || params.get('shop_id');
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

function legacyShopDetailNavigationState() {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname || '';
  if (pathname !== '/ShopDetail' && !pathname.startsWith('/ShopDetail/')) {
    return null;
  }
  const shopId = parseShopIdFromSearch(window.location.search);
  if (!shopId) return null;
  return {
    routes: [{ name: 'ShopDetail', params: { shopId } }],
  };
}

/**
 * Replace legacy browser URLs in the address bar (bookmarks, old history).
 */
export async function redirectLegacyWebUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const { pathname, search, hash } = window.location;
  const current = `${pathname}${search}`;
  let target = null;

  const canonical = normalizeWebPath(current);
  if (canonical !== current) {
    target = canonical;
  } else if (pathname === '/PublicHome' || pathname.startsWith('/PublicHome/')) {
    target = '/';
  } else if (pathname === '/ShopMap' || pathname.startsWith('/ShopMap/')) {
    target = pathname.replace(/^\/ShopMap/, '/service-centers');
  } else if (pathname === '/ShopHome/ShopDashboard' || pathname.startsWith('/ShopHome/ShopDashboard/')) {
    target = pathname.replace(/^\/ShopHome\/ShopDashboard/, '/partner/dashboard');
  } else if (pathname === '/ShopHome' || pathname.startsWith('/ShopHome/')) {
    target = '/partner/dashboard';
  } else if (pathname === '/Home/HomeMain' || pathname.startsWith('/Home/HomeMain/')) {
    const authed = await hasStoredAuthToken();
    target = authed
      ? pathname.replace(/^\/Home\/HomeMain/, '/dashboard')
      : '/';
  } else if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const authed = await hasStoredAuthToken();
    if (!authed) {
      target = '/';
    }
  } else if (pathname === '/ClientVehicles' || pathname.startsWith('/ClientVehicles/')) {
    target = pathname.replace(/^\/ClientVehicles/, '/dashboard/vehicles');
  } else if (pathname === '/CreateVehicle' || pathname.startsWith('/CreateVehicle/')) {
    target = '/dashboard/vehicles/add';
  } else if (pathname === '/add' || pathname.startsWith('/add/')) {
    target = '/dashboard/vehicles/add';
  } else if (pathname === '/VehicleDetail' || pathname.startsWith('/VehicleDetail/')) {
    target = pathname.replace(/^\/VehicleDetail/, '/dashboard/vehicles');
  } else if (
    (pathname === '/dashboard/vehicles' || pathname.startsWith('/dashboard/vehicles/')) &&
    !(await hasStoredAuthToken())
  ) {
    target = '/';
  } else if (pathname === '/ShopDetail' || pathname.startsWith('/ShopDetail/')) {
    const shopId = parseShopIdFromSearch(search);
    if (shopId) {
      target = buildFallbackShopPath(shopId);
    } else {
      target = '/service-centers';
    }
  }

  if (target && target !== current) {
    window.history.replaceState(window.history.state, '', `${target}${hash}`);
  }

  syncWebDocumentTitle(target || pathname);
}

export function buildAppLinking(prefixes) {
  const base = {
    prefixes,
    config: linkingConfig,
  };

  if (Platform.OS !== 'web') {
    return base;
  }

  return {
    ...base,
    getStateFromPath(path, options) {
      const legacyShop = legacyShopDetailNavigationState();
      if (legacyShop) {
        return legacyShop;
      }
      const normalized = normalizeWebLinkingPath(path);
      const seoState = getNavigationStateFromSeoPath(normalized);
      if (seoState) {
        return seoState;
      }
      const vehicleState = getVehicleNavigationStateFromPath(normalized);
      if (vehicleState) {
        return vehicleState;
      }
      return getStateFromPathDefault(normalized, linkingConfig);
    },
    getPathFromState(state, options) {
      const seoPath = getSeoPathFromNavigationState(state);
      if (seoPath) {
        return normalizeWebPath(seoPath);
      }
      const canonical = getCanonicalWebPath(state);
      if (canonical != null) {
        return normalizeWebPath(canonical);
      }
      const fallback = getPathFromStateDefault(state, linkingConfig);
      return normalizeWebPath(`/${String(fallback || '').replace(/^\//, '')}`);
    },
  };
}
