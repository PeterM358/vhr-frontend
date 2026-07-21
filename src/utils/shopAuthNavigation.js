import { Platform } from 'react-native';
import { getMyShopProfiles } from '../api/profiles';
import { isPartnerSetupComplete } from './partnerSetupGate';
import { PARTNER_DASHBOARD_PATH, syncWebPath } from '../navigation/authNavigation';
import { partnerOnboarding } from '../navigation/webRoutes';

/**
 * Resolve where a shop user should land after auth.
 *
 * - Registration (`wizardWhenIncomplete: true`) drops brand-new / incomplete
 *   partners straight into the guided wizard (PartnerOnboarding).
 * - Login / app-open land on the dashboard, which shows a compact "Continue
 *   setup" card and routes every Profile entry into the wizard while incomplete.
 * - Publish-ready partners always land on the dashboard.
 *
 * On error we fail safe to the dashboard.
 */
export async function resolveShopEntryRoute({ wizardWhenIncomplete = false } = {}) {
  try {
    const profiles = await getMyShopProfiles();
    const profile = profiles?.[0];
    if (!isPartnerSetupComplete(profile)) {
      if (wizardWhenIncomplete) {
        return {
          name: 'PartnerOnboarding',
          params: profile?.id != null ? { shopId: profile.id } : undefined,
        };
      }
      return { name: 'ShopHome', params: { profileIncomplete: true } };
    }
  } catch (err) {
    console.warn('Could not check shop profile completeness', err);
  }
  return { name: 'ShopHome' };
}

export function buildShopAuthReset(route) {
  if (route.name === 'PartnerOnboarding') {
    if (Platform.OS === 'web') {
      syncWebPath(partnerOnboarding(route.params || {}));
    }
    // Keep the dashboard below the wizard so "Finish later" / back has a home.
    return {
      index: 1,
      routes: [{ name: 'ShopHome' }, { name: 'PartnerOnboarding', params: route.params }],
    };
  }
  if (Platform.OS === 'web') {
    syncWebPath(PARTNER_DASHBOARD_PATH);
  }
  return { index: 0, routes: [{ name: route.name, params: route.params }] };
}
