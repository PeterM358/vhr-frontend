/**
 * Auth-related navigation resets shared by login, logout, and web linking.
 * Web: also syncs the browser path so URL and nav state never diverge.
 */

import { Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncWebDocumentTitle } from './webDocumentTitle';
import { normalizeWebPath } from './webRoutes';
import { STORAGE_KEYS } from '../constants/storageKeys';

function getRootNavigation(navigation) {
  let current = navigation;
  while (current.getParent?.()) {
    current = current.getParent();
  }
  return current;
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
  const normalized = normalizeWebPath(pathname);
  const { hash } = window.location;
  const target = `${normalized}${hash}`;
  if (`${window.location.pathname}${window.location.search}` !== normalized) {
    window.history.replaceState(window.history.state, '', target);
  }
  syncWebDocumentTitle(normalized.split('?')[0]);
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
  getRootNavigation(navigation).dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    })
  );
  syncWebPath('/sign-in');
}

/** Push sign-in from landing — keeps back navigation to /. */
export function navigateToSignIn(navigation) {
  const root = getRootNavigation(navigation);
  root.navigate('Login');
  if (Platform.OS === 'web') {
    syncWebPath('/sign-in');
  }
}

export async function storeAuthReturnUrl(path) {
  const normalized = normalizeWebPath(path);
  if (!normalized || normalized === '/sign-in' || normalized === '/sign-up') return;
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
