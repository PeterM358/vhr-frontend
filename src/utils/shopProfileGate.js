import { Alert } from 'react-native';
import { getMyShopProfiles } from '../api/profiles';
import {
  getShopProfileGateIncompleteFields,
  getShopProfileIncompleteFields,
  isShopProfileEssentialsComplete,
  SHOP_PROFILE_BUILD_SECTIONS,
} from './shopProfileCompleteness';
import { openPartnerCenter } from './partnerSetupGate';

export const SHOP_PROFILE_SECTION_KEYS = [
  ...SHOP_PROFILE_BUILD_SECTIONS,
  'vehicle_types',
  'brands',
  'basic',
  'contact',
  'location',
  'services',
  'social',
  'description',
  'guarantee',
  'invoice',
];

/** Section keys that should start expanded when required fields are missing. */
export function getShopProfileIncompleteSectionKeys(profile, options = {}) {
  const missing = getShopProfileIncompleteFields(profile, options);
  const keys = [];
  if (missing.includes('business name') || missing.includes('description')) {
    keys.push('business');
  }
  if (
    missing.some((field) =>
      ['map pin', 'address', 'city', 'country', 'phone'].includes(field)
    )
  ) {
    keys.push('contact_location');
  }
  if (missing.includes('operation') || missing.includes('operation price')) {
    keys.push('operations');
  }
  if (missing.includes('photos')) keys.push('photos');
  if (missing.includes('working hours')) keys.push('working_hours');
  if (
    missing.includes('legal name') ||
    missing.includes('vat number') ||
    missing.includes('invoice address')
  ) {
    keys.push('company');
  }
  return keys;
}

/** @deprecated Use getShopProfileIncompleteSectionKeys */
export const getShopProfileSectionsToExpand = getShopProfileIncompleteSectionKeys;

export function getInitialShopProfileExpandedSections(profile, requireSetup, options = {}) {
  const expandKeys = requireSetup ? getShopProfileIncompleteSectionKeys(profile, options) : [];
  if (!expandKeys.includes('public_preview')) {
    expandKeys.push('public_preview');
  }
  return Object.fromEntries(
    SHOP_PROFILE_SECTION_KEYS.map((key) => [key, expandKeys.includes(key)])
  );
}

export async function fetchShopProfileCompleteness() {
  const profiles = await getMyShopProfiles();
  const profile = profiles?.[0] ?? null;
  return {
    profile,
    isComplete: isShopProfileEssentialsComplete(profile),
    missingFields: getShopProfileGateIncompleteFields(profile),
  };
}

export function showShopProfileGateAlert(navigation, missingFields = []) {
  const stillNeeded = missingFields.length
    ? `Still needed: ${missingFields.join(', ')}.`
    : 'Add your business name, map pin, address, city, country, and at least one vehicle type to start serving jobs.';
  const message = `Complete your shop profile before opening repair requests.\n\n${stillNeeded}`;

  Alert.alert('Complete your profile', message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Complete profile',
      // Essentials missing => not publish-ready => guided wizard.
      onPress: () => openPartnerCenter(navigation, null),
    },
  ]);
}

export function gateRepairNavigation(navigation, { isComplete, missingFields }) {
  if (isComplete) return true;
  showShopProfileGateAlert(navigation, missingFields);
  return false;
}
