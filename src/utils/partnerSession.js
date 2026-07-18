/**
 * Partner/shop session helpers — persist and restore shop mode reliably.
 * Prefer stored @is_shop, but also treat linked shop profiles/memberships as partner.
 *
 * Dual-role choice: if the user owns/belongs to a shop (profiles or memberships),
 * treat the session as partner. Refresh of /dashboard or /{lang}/dashboard must keep
 * the partner shell — do not fall back to client Home while shop links exist.
 * Explicit client mode for dual-role users is a future toggle; for now shop wins.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

function parseStoredJson(raw) {
  if (raw == null || raw === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Normalize AsyncStorage boolean flags (`true` / `"true"` / JSON true). */
export function parseStoredBoolean(raw) {
  if (raw == null) return false;
  const value = String(raw).trim().toLowerCase();
  return value === 'true' || value === '"true"';
}

function firstShopIdFromStored(profilesRaw, membershipsRaw) {
  const profiles = parseStoredJson(profilesRaw);
  if (Array.isArray(profiles) && profiles.length > 0 && profiles[0]?.id != null) {
    return String(profiles[0].id);
  }
  const memberships = parseStoredJson(membershipsRaw);
  if (Array.isArray(memberships) && memberships.length > 0) {
    const shopId = memberships[0]?.shop_id ?? memberships[0]?.shopId ?? memberships[0]?.id;
    if (shopId != null) return String(shopId);
  }
  return null;
}

/**
 * Whether the stored session should open the partner (shop) shell.
 * Rehydrates @is_shop / @current_shop_id when profiles or memberships are present.
 */
export async function resolveIsPartnerSession() {
  const pairs = await AsyncStorage.multiGet([
    STORAGE_KEYS.IS_SHOP,
    STORAGE_KEYS.SHOP_PROFILES,
    STORAGE_KEYS.SHOP_MEMBERSHIPS,
    STORAGE_KEYS.CURRENT_SHOP_ID,
  ]);
  const byKey = Object.fromEntries(pairs);
  const isShopRaw = byKey[STORAGE_KEYS.IS_SHOP];
  const profilesRaw = byKey[STORAGE_KEYS.SHOP_PROFILES];
  const membershipsRaw = byKey[STORAGE_KEYS.SHOP_MEMBERSHIPS];
  const currentShopId = byKey[STORAGE_KEYS.CURRENT_SHOP_ID];

  const flagged = parseStoredBoolean(isShopRaw);
  const shopIdFromLinks = firstShopIdFromStored(profilesRaw, membershipsRaw);
  const hasShopLinks = Boolean(shopIdFromLinks);
  const isPartner = flagged || hasShopLinks;

  if (!isPartner) {
    return false;
  }

  const writes = [];
  if (!flagged) {
    writes.push([STORAGE_KEYS.IS_SHOP, 'true']);
  }
  if ((!currentShopId || String(currentShopId).trim() === '') && shopIdFromLinks) {
    writes.push([STORAGE_KEYS.CURRENT_SHOP_ID, shopIdFromLinks]);
  }
  if (writes.length) {
    await AsyncStorage.multiSet(writes);
  }
  return true;
}

export async function readStoredIsShop() {
  return resolveIsPartnerSession();
}
