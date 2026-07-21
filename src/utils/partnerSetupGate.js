/**
 * Single source of truth for the "is this partner still in guided setup?" gate.
 *
 * While a shop is NOT publish-ready the guided Wizard (PartnerOnboarding) owns
 * the profile experience: every "open my center / profile" intent is routed
 * into the wizard, resuming from the first incomplete required step. Once the
 * backend reports `profile_completion.ready_to_publish` (no required fields
 * missing) the wizard disappears and Profile becomes normal management
 * (ShopProfileScreen).
 *
 * Prefer the backend-computed `profile_completion` (authoritative, shared with
 * web + card + wizard). Fall back to the client-side essentials gate only when
 * the completion summary is not present on the profile payload.
 */

import { Platform } from 'react-native';

import { isShopProfileEssentialsComplete } from './shopProfileCompleteness';
import {
  navigateToPartnerOnboarding,
  navigateToPartnerProfile,
} from '../navigation/webNavigation';

export function getProfileCompletion(profile) {
  if (!profile || typeof profile !== 'object') return null;
  return profile.profile_completion || null;
}

/**
 * True once the shop is publish-ready (all required sections complete).
 * A null / brand-new profile is never complete → stays in the wizard.
 */
export function isPartnerSetupComplete(profile) {
  if (!profile) return false;
  const completion = getProfileCompletion(profile);
  if (completion && typeof completion.ready_to_publish === 'boolean') {
    return completion.ready_to_publish;
  }
  return isShopProfileEssentialsComplete(profile);
}

/** Backend section key the wizard should resume on (first incomplete required). */
export function partnerSetupResumeStep(profile) {
  const completion = getProfileCompletion(profile);
  return completion?.current_step || null;
}

/** Required, still-missing field keys (publish-blocking, ordered). */
export function partnerSetupMissing(profile) {
  const completion = getProfileCompletion(profile);
  if (completion && Array.isArray(completion.required_missing)) {
    return completion.required_missing;
  }
  if (completion && Array.isArray(completion.missing)) {
    return completion.missing;
  }
  return [];
}

/** Completion percent (0-100) for compact readiness UI. */
export function partnerSetupPercent(profile) {
  const completion = getProfileCompletion(profile);
  if (completion && typeof completion.percent === 'number') {
    return completion.percent;
  }
  return isPartnerSetupComplete(profile) ? 100 : 0;
}

/**
 * Which screen an "open my center / profile" intent should land on.
 * Returns 'PartnerOnboarding' while incomplete, 'ShopProfile' once ready.
 */
export function partnerCenterTargetScreen(profile) {
  return isPartnerSetupComplete(profile) ? 'ShopProfile' : 'PartnerOnboarding';
}

/**
 * Navigate to the correct center experience for the current completion state.
 * Handles web (canonical URLs) + native. Returns the resolved screen name.
 */
export function openPartnerCenter(navigation, profile, params = {}) {
  if (isPartnerSetupComplete(profile)) {
    if (Platform.OS === 'web') {
      navigateToPartnerProfile(navigation, params);
    } else {
      navigation.navigate('ShopProfile', params);
    }
    return 'ShopProfile';
  }

  const onboardingParams = { ...params };
  delete onboardingParams.requireSetup;
  if (profile?.id != null && onboardingParams.shopId == null) {
    onboardingParams.shopId = profile.id;
  }
  if (Platform.OS === 'web') {
    navigateToPartnerOnboarding(navigation, onboardingParams);
  } else {
    navigation.navigate('PartnerOnboarding', onboardingParams);
  }
  return 'PartnerOnboarding';
}
