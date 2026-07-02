/**
 * Auth-related navigation resets shared by login, logout, and web linking.
 * Web: also syncs the browser path so URL and nav state never diverge.
 */

import { Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';

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
  const { search, hash } = window.location;
  if (window.location.pathname !== pathname) {
    window.history.replaceState(window.history.state, '', `${pathname}${search}${hash}`);
  }
}

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
