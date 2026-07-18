/**
 * Auth-related navigation resets shared by login, logout, and web linking.
 * Web: also syncs the browser path so URL and nav state never diverge.
 */

import { Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncWebDocumentTitle } from './webDocumentTitle';
import { normalizeWebPath, serviceCenters } from './webRoutes';
import { getSupportedLanguagePrefixFromPathname, localizeCanonicalPath } from './localizedRoutes';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  STORAGE_KEY_LOCALE,
  SUPPORTED_LOCALES,
  getLocale,
  syncLocaleFromWebPathname,
} from '../i18n';
import { trackPageView } from '../services/analytics';

function getRootNavigation(navigation) {
  let current = navigation;
  while (current.getParent?.()) {
    current = current.getParent();
  }
  return current;
}

/** Routes that are safe to return to without auth when leaving Login/Register. */
const PUBLIC_ESCAPE_ROUTE_NAMES = new Set([
  'ShopMap',
  'PublicHome',
  'ShopDetail',
  'PartnerShopMap',
]);

const AUTH_STACK_ROUTE_NAMES = new Set([
  'Login',
  'Register',
  'PasswordRequestReset',
  'PasswordResetConfirm',
  'AuthLoading',
]);

function getPreviousRootRoute(navigation) {
  const root = getRootNavigation(navigation);
  const state = root.getState?.();
  if (!state?.routes?.length || state.index == null || state.index <= 0) {
    return null;
  }
  return state.routes[state.index - 1] || null;
}

/**
 * Decide how Login/Register should escape back to public browse.
 * @returns {{ kind: 'back' | 'map' | 'home', previousName: string | null }}
 */
export function resolveAuthPublicEscape(navigation) {
  const previous = getPreviousRootRoute(navigation);
  const previousName = previous?.name || null;
  if (previousName && PUBLIC_ESCAPE_ROUTE_NAMES.has(previousName)) {
    return { kind: previousName === 'PublicHome' ? 'home' : 'map', previousName };
  }
  if (previousName && !AUTH_STACK_ROUTE_NAMES.has(previousName)) {
    return { kind: 'back', previousName };
  }
  return { kind: 'map', previousName };
}

/**
 * Leave Login/Register without trapping the user.
 * Prefer goBack when history has a public (or non-auth) screen; else open the map.
 */
export function leaveAuthToPublic(navigation, { forceMap = false } = {}) {
  clearAuthReturnUrl().catch(() => {});
  const root = getRootNavigation(navigation);
  if (!forceMap) {
    const escape = resolveAuthPublicEscape(navigation);
    if (escape.previousName && root.canGoBack?.()) {
      if (
        PUBLIC_ESCAPE_ROUTE_NAMES.has(escape.previousName)
        || !AUTH_STACK_ROUTE_NAMES.has(escape.previousName)
      ) {
        root.goBack();
        return;
      }
    }
  }

  root.navigate('ShopMap');
  if (Platform.OS === 'web') {
    syncWebPath(serviceCenters());
    requestAnimationFrame(() => syncWebPath(serviceCenters()));
  }
}

export const CLIENT_DASHBOARD_ROUTE = {
  name: 'Home',
  state: {
    routes: [{ name: 'HomeMain' }],
    index: 0,
  },
};

export function syncWebPath(pathname) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }
  const canonical = normalizeWebPath(pathname);

  // Split query from path; localizedRoutes.localizeCanonicalPath expects a path only.
  const canonicalStr = String(canonical || '/');
  const qIndex = canonicalStr.indexOf('?');
  const canonicalPath = qIndex >= 0 ? canonicalStr.slice(0, qIndex) : canonicalStr;
  const queryPart = qIndex >= 0 ? canonicalStr.slice(qIndex) : '';

  // URL prefix wins; otherwise we only redirect/prefix if there is a persisted locale
  // or the target is the auth login route.
  const urlLangPrefix = getSupportedLanguagePrefixFromPathname(window.location.pathname || '/');
  const isLoginRoute = canonicalPath === '/login' || canonicalPath === '/sign-in';

  let shouldPrefix = Boolean(urlLangPrefix);
  let langToUse = urlLangPrefix || null;

  if (!urlLangPrefix && canonicalPath !== '/' && !isLoginRoute) {
    // Redirect only when we have a persisted locale (requirement: saved language redirects).
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY_LOCALE);
      if (stored && SUPPORTED_LOCALES.includes(stored)) {
        shouldPrefix = true;
        langToUse = stored;
      }
    } catch {
      // ignore storage errors
    }
  }

  if (!urlLangPrefix && isLoginRoute) {
    // Always prefix `/login` based on the resolved i18n locale (saved/detected/built-in).
    shouldPrefix = true;
    langToUse = getLocale();
  }

  const localizedPath =
    canonicalPath === '/' || !shouldPrefix ? canonicalPath : localizeCanonicalPath(canonicalPath, langToUse);

  const { hash } = window.location;
  const target = `${localizedPath}${queryPart}${hash}`;

  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== target) {
    window.history.replaceState(window.history.state, '', target);
  }

  // If the URL prefix changed, make i18n match it (fixes `/en/dashboard` showing BG).
  syncLocaleFromWebPathname();

  syncWebDocumentTitle(target);
  trackPageView(target);
}

/** Let React commit AuthContext updates before post-login navigation resets. */
export function waitForAuthContextCommit() {
  return new Promise((resolve) => {
    queueMicrotask(() => {
      queueMicrotask(resolve);
    });
  });
}

export const PARTNER_DASHBOARD_PATH = '/partner/dashboard';

export function resetToClientDashboard(navigation) {
  getRootNavigation(navigation).dispatch(
    CommonActions.reset({
      index: 0,
      routes: [CLIENT_DASHBOARD_ROUTE],
    })
  );
  syncWebPath('/dashboard');
}

export function resetToPublicHome(navigation) {
  getRootNavigation(navigation).dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'PublicHome' }],
    })
  );
  syncWebPath('/');
}

export function resetToSignIn(navigation) {
  const root = getRootNavigation(navigation);
  if (Platform.OS === 'web' && typeof root.replace === 'function') {
    // Replace to avoid "back" bouncing through intermediate redirect states.
    root.replace('Login');
  } else {
    root.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  }
  syncWebPath('/login');
}

/**
 * Push sign-in while preserving history so public map/home remain reachable via back.
 * On web, stores the current public path as post-login return when available.
 */
export async function navigateToSignIn(navigation) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const currentPath = `${window.location.pathname || ''}${window.location.search || ''}`;
    await storeAuthReturnUrl(currentPath);
  }
  const root = getRootNavigation(navigation);
  root.navigate('Login');
  if (Platform.OS === 'web') {
    syncWebPath('/login');
    requestAnimationFrame(() => syncWebPath('/login'));
  }
}

export async function storeAuthReturnUrl(path) {
  const normalized = normalizeWebPath(path);
  if (!normalized || normalized === '/login' || normalized === '/sign-in' || normalized === '/sign-up') return;
  await AsyncStorage.setItem(STORAGE_KEYS.AUTH_RETURN_URL, normalized);
}

export async function consumeAuthReturnUrl() {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_RETURN_URL);
  await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_RETURN_URL);
  if (!stored || stored === 'null' || stored === 'undefined') return null;
  return normalizeWebPath(stored);
}

export async function clearAuthReturnUrl() {
  await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_RETURN_URL);
}
