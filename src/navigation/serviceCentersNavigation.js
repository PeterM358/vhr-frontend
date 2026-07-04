/**
 * Service centers map — web uses push navigation for correct browser history;
 * native keeps drawer reset behavior.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetFromClientDrawer } from './drawerNavigation';
import { syncWebPath } from './authNavigation';

function getRootNavigation(navigation) {
  let current = navigation;
  while (current.getParent?.()) {
    current = current.getParent();
  }
  return current;
}

async function hasStoredAuthToken() {
  const token = await AsyncStorage.getItem('@access_token');
  return !!(token && token !== 'null' && token !== 'undefined');
}

/** Open the service centers map from any entry point. */
export function openServiceCenters(navigation, params) {
  const root = getRootNavigation(navigation);
  if (Platform.OS === 'web') {
    root.navigate('ShopMap', params);
    return;
  }
  resetFromClientDrawer(navigation, 'ShopMap', params);
}

/** Back from service centers — respects browser history on web. */
export async function goBackFromServiceCenters(navigation) {
  if (navigation.canGoBack?.()) {
    navigation.goBack();
    return;
  }

  const authed = await hasStoredAuthToken();
  const root = getRootNavigation(navigation);
  if (authed) {
    root.navigate('Home', { screen: 'HomeMain' });
    if (Platform.OS === 'web') {
      syncWebPath('/dashboard');
    }
  } else {
    root.navigate('PublicHome');
    if (Platform.OS === 'web') {
      syncWebPath('/');
    }
  }
}
