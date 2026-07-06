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

/** Collapse duplicated my-vehicles segments produced by stacked sibling routes. */
export function collapseDuplicateVehiclePath(path) {
  if (!path) return path;
  const normalized = String(path).replace(/^\//, '');
  if (normalized.includes('my-vehicles/my-vehicles')) {
    return normalized.replace(/my-vehicles\/my-vehicles/g, 'my-vehicles');
  }
  return normalized;
}

/** Strip leading slash and normalize legacy path segments before parsing. */
export function normalizeWebLinkingPath(path) {
  if (!path) return '';

  const trimmed = String(path).replace(/^\//, '').replace(/\/$/, '');

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
    return trimmed.replace(/^ClientVehicles/, 'my-vehicles');
  }
  if (trimmed === 'CreateVehicle' || trimmed.startsWith('CreateVehicle/')) {
    return 'my-vehicles/add';
  }
  if (trimmed.startsWith('my-vehicles/my-vehicles/')) {
    return trimmed.replace(/^my-vehicles\/my-vehicles/, 'my-vehicles');
  }
  if (trimmed.startsWith('VehicleDetail/')) {
    return trimmed.replace(/^VehicleDetail/, 'my-vehicles');
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
  let target = null;

  if (pathname === '/PublicHome' || pathname.startsWith('/PublicHome/')) {
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
    target = pathname.replace(/^\/ClientVehicles/, '/my-vehicles');
  } else if (pathname === '/CreateVehicle' || pathname.startsWith('/CreateVehicle/')) {
    target = '/my-vehicles/add';
  } else if (pathname.startsWith('/my-vehicles/my-vehicles/')) {
    target = pathname.replace(/^\/my-vehicles\/my-vehicles/, '/my-vehicles');
  } else if (pathname === '/VehicleDetail' || pathname.startsWith('/VehicleDetail/')) {
    target = pathname.replace(/^\/VehicleDetail/, '/my-vehicles');
  } else if (
    (pathname === '/my-vehicles' || pathname.startsWith('/my-vehicles/')) &&
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

  if (target && target !== `${pathname}${search}`) {
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
      return getStateFromPathDefault(normalized, {
        ...options,
        ...linkingConfig,
      });
    },
    getPathFromState(state, options) {
      const seoPath = getSeoPathFromNavigationState(state);
      if (seoPath) {
        return seoPath.replace(/^\//, '');
      }
      const path = collapseDuplicateVehiclePath(
        getPathFromStateDefault(state, {
          ...options,
          ...linkingConfig,
        })
      );
      return path;
    },
  };
}
