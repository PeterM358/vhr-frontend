import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../constants/storageKeys';

export async function getCurrentShopId() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
  if (raw == null || String(raw).trim() === '') return null;
  return String(raw).trim();
}

export async function shopScopedHeaders(token, extra = {}) {
  const shopId = await getCurrentShopId();
  const headers = {
    Authorization: `Bearer ${token}`,
    ...extra,
  };
  if (shopId) {
    headers['X-Shop-Profile-Id'] = shopId;
  }
  return headers;
}
