/**
 * Service centers map — web uses push navigation for correct browser history;
 * native keeps drawer reset behavior.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resetFromClientDrawer } from './drawerNavigation';
import { syncWebPath } from './authNavigation';
import { serviceCenters } from './webRoutes';
import {
  navigateToServiceCenterProfile as navigateToServiceCenterProfileWeb,
  navigateToServiceCenterDetail as navigateToServiceCenterDetailWeb,
} from './webNavigation';

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

function resolvePublicSlug(shopOrSlug, params = {}) {
  if (typeof shopOrSlug === 'string') {
    return shopOrSlug.trim().toLowerCase();
  }
  if (shopOrSlug && typeof shopOrSlug === 'object') {
    return shopOrSlug.public_slug || shopOrSlug.slug || null;
  }
  return params.public_slug || params.slug || null;
}

/** Open the service centers map from any entry point. */
export function openServiceCenters(navigation, params) {
  const root = getRootNavigation(navigation);
  if (Platform.OS === 'web') {
    root.navigate('ShopMap', params);
    syncWebPath(serviceCenters());
    requestAnimationFrame(() => syncWebPath(serviceCenters()));
    return;
  }
  resetFromClientDrawer(navigation, 'ShopMap', params);
}

/** Open a public service center profile by canonical slug. */
export function navigateToServiceCenterProfile(navigation, shopOrSlug, params = {}) {
  const slug = resolvePublicSlug(shopOrSlug, params);
  if (Platform.OS === 'web' && slug) {
    navigateToServiceCenterProfileWeb(navigation, slug, params);
    return;
  }
  const shopId = typeof shopOrSlug === 'object' ? shopOrSlug?.id : params.shopId;
  navigation.navigate('ShopDetail', { centerSlug: slug, shopId, ...params });
}

/** @deprecated prefer navigateToServiceCenterProfile(slug) */
export function navigateToServiceCenterDetail(navigation, shopOrId, params = {}) {
  if (typeof shopOrId === 'object') {
    navigateToServiceCenterProfile(navigation, shopOrId, params);
    return;
  }
  const slug = resolvePublicSlug(null, params);
  if (slug) {
    navigateToServiceCenterProfile(navigation, slug, { shopId: shopOrId, ...params });
    return;
  }
  if (Platform.OS === 'web') {
    navigateToServiceCenterDetailWeb(navigation, shopOrId, params);
    return;
  }
  navigation.navigate('ShopDetail', { shopId: shopOrId, ...params });
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
