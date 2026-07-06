/**
 * Auth-related navigation resets shared by login, logout, and web linking.
 * Web: also syncs the browser path so URL and nav state never diverge.
 */

import { Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { syncWebDocumentTitle } from './webDocumentTitle';
import { normalizeVehicleWebPath } from './webRoutes';

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
  const normalized = normalizeVehicleWebPath(pathname);
  const { hash } = window.location;
  const target = `${normalized}${hash}`;
  if (`${window.location.pathname}${window.location.search}` !== normalized) {
    window.history.replaceState(window.history.state, '', target);
  }
  syncWebDocumentTitle(normalized.split('?')[0]);
}

export const PARTNER_DASHBOARD_PATH = '/partner/dashboard';

export function resetToClientDashboard(navigation) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [CLIENT_DASHBOARD_ROUTE],
    })
  );
  syncWebPath('/dashboard');
}

export function resetToPublicHome(navigation) {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'PublicHome' }],
    })
  );
  syncWebPath('/');
}

export function resetToSignIn(navigation) {
  navigation.dispatch(
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
