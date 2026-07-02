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
import { linkingScreens } from './linkingConfig';

const linkingConfig = { screens: linkingScreens };

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

  return trimmed;
}

async function hasStoredAuthToken() {
  const token = await AsyncStorage.getItem('@access_token');
  return !!(token && token !== 'null' && token !== 'undefined');
}

/**
 * Replace legacy browser URLs in the address bar (bookmarks, old history).
 * /Home/HomeMain → /dashboard when authed, otherwise /
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
  } else if (pathname === '/Home/HomeMain' || pathname.startsWith('/Home/HomeMain/')) {
    const authed = await hasStoredAuthToken();
    target = authed
      ? pathname.replace(/^\/Home\/HomeMain/, '/dashboard')
      : '/';
  }

  if (target && target !== pathname) {
    window.history.replaceState(window.history.state, '', `${target}${search}${hash}`);
  }
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
      const normalized = normalizeWebLinkingPath(path);
      return getStateFromPathDefault(normalized, {
        ...options,
        ...linkingConfig,
      });
    },
    getPathFromState(state, options) {
      return getPathFromStateDefault(state, {
        ...options,
        ...linkingConfig,
      });
    },
  };
}
