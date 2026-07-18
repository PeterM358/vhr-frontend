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

  const hasShopProfiles = Array.isArray(data.shop_profiles) && data.shop_profiles.length > 0;
  const hasShopMemberships =
    Array.isArray(data.shop_memberships) && data.shop_memberships.length > 0;
  const shopMode = Boolean(data.is_shop) || hasShopProfiles || hasShopMemberships;

  await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
  await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.refresh);
  await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, data.user_id?.toString() || '');
  await AsyncStorage.setItem(STORAGE_KEYS.IS_SHOP, shopMode ? 'true' : 'false');
  await AsyncStorage.setItem(STORAGE_KEYS.IS_CLIENT, data.is_client ? 'true' : 'false');

  if (hasShopProfiles) {
    await AsyncStorage.setItem(STORAGE_KEYS.SHOP_PROFILES, JSON.stringify(data.shop_profiles));
    await AsyncStorage.setItem(
      STORAGE_KEYS.CURRENT_SHOP_ID,
      data.shop_profiles[0].id.toString()
    );
  } else if (hasShopMemberships) {
    await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_PROFILES);
    const shopId = data.shop_memberships[0]?.shop_id ?? data.shop_memberships[0]?.shopId;
    if (shopId != null) {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_SHOP_ID, String(shopId));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SHOP_ID);
    }
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.SHOP_PROFILES);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_SHOP_ID);
  }

  if (hasShopMemberships) {
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
