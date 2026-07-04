import { Platform } from 'react-native';
import { getMyShopProfiles } from '../api/profiles';
import { isShopProfileEssentialsComplete } from './shopProfileCompleteness';
import { PARTNER_DASHBOARD_PATH, syncWebPath } from '../navigation/authNavigation';

/**
 * After shop login/register, land on the dashboard. Incomplete profiles see a
 * setup banner on ShopHome instead of a profile-only redirect.
 */
export async function resolveShopEntryRoute() {
  try {
    const profiles = await getMyShopProfiles();
    const profile = profiles?.[0];
    if (profile && !isShopProfileEssentialsComplete(profile)) {
      return { name: 'ShopHome', params: { profileIncomplete: true } };
    }
  } catch (err) {
    console.warn('Could not check shop profile completeness', err);
  }
  return { name: 'ShopHome' };
}

export function buildShopAuthReset(route) {
  if (Platform.OS === 'web') {
    syncWebPath(PARTNER_DASHBOARD_PATH);
  }
  return { index: 0, routes: [{ name: route.name, params: route.params }] };
}
