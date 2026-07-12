import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

export function resolvePasswordResetParams(route) {
  const params = route?.params || {};
  let { uid, token } = params;

  if ((!uid || !token) && Platform.OS === 'web' && typeof window !== 'undefined') {
    const match = window.location.pathname.match(/reset-password\/([^/]+)\/([^/]+)/);
    if (match) {
      uid = decodeURIComponent(match[1]);
      token = decodeURIComponent(match[2]);
    }
  }

  return { uid, token };
}

export async function applyAuthSession(data, identifier, authContext) {
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = authContext;

  setAuthToken(data.access);
  setIsAuthenticated(true);
  setUserEmailOrPhone(identifier);

  await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
  await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
  await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, data.user_id?.toString() || '');
  await AsyncStorage.setItem(STORAGE_KEYS.IS_SHOP, data.is_shop ? 'true' : 'false');
  await AsyncStorage.setItem(STORAGE_KEYS.IS_CLIENT, data.is_client ? 'true' : 'false');

  if (data.shop_profiles && data.shop_profiles.length > 0) {
    await AsyncStorage.setItem(STORAGE_KEYS.SHOP_PROFILES, JSON.stringify(data.shop_profiles));
    await AsyncStorage.setItem(
      STORAGE_KEYS.CURRENT_SHOP_ID,
      data.shop_profiles[0].id.toString()
    );
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_PROFILES);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SHOP_ID);
  }

  if (data.shop_memberships && data.shop_memberships.length > 0) {
    await AsyncStorage.setItem(
      STORAGE_KEYS.SHOP_MEMBERSHIPS,
      JSON.stringify(data.shop_memberships)
    );
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_MEMBERSHIPS);
  }
}

export function authDisplayIdentifier(data) {
  if (data.email && String(data.email).trim()) {
    return String(data.email).trim();
  }
  if (data.phone && String(data.phone).trim()) {
    return String(data.phone).trim();
  }
  return '';
}
