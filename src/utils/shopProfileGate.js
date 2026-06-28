import { Alert } from 'react-native';
import { getMyShopProfiles } from '../api/profiles';
import {
  getShopProfileIncompleteFields,
  isShopProfileEssentialsComplete,
} from './shopProfileCompleteness';

export const SHOP_PROFILE_SECTION_KEYS = [
  'basic',
  'vehicle_types',
  'brands',
  'services',
  'contact',
  'location',
  'working_hours',
  'social',
  'description',
  'public_preview',
  'guarantee',
  'photos',
];

/** Section keys that should start expanded when required fields are missing. */
export function getShopProfileIncompleteSectionKeys(profile, options = {}) {
  const missing = getShopProfileIncompleteFields(profile, options);
  const keys = [];
  if (missing.includes('shop name')) keys.push('basic');
  if (missing.includes('vehicle type')) keys.push('vehicle_types');
  if (
    missing.some((field) =>
      ['map pin', 'address', 'city', 'country'].includes(field)
    )
  ) {
    keys.push('location');
  }
  return keys;
}

/** @deprecated Use getShopProfileIncompleteSectionKeys */
export const getShopProfileSectionsToExpand = getShopProfileIncompleteSectionKeys;

export function getInitialShopProfileExpandedSections(profile, requireSetup, options = {}) {
  const expandKeys = requireSetup ? getShopProfileIncompleteSectionKeys(profile, options) : [];
  if (requireSetup && !expandKeys.includes('public_preview')) {
    expandKeys.push('public_preview');
  }
  if (!requireSetup && profile && getShopProfileIncompleteFields(profile, options).length === 0) {
    if (!expandKeys.includes('public_preview')) expandKeys.push('public_preview');
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
    missingFields: getShopProfileIncompleteFields(profile),
  };
}

export function showShopProfileGateAlert(navigation, missingFields = []) {
  const stillNeeded = missingFields.length
    ? `Still needed: ${missingFields.join(', ')}.`
    : 'Add your shop name, map pin, address, city, country, and at least one vehicle type to start serving jobs.';
  const message = `Complete your shop profile before opening repair requests.\n\n${stillNeeded}`;

  Alert.alert('Complete your profile', message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Complete profile',
      onPress: () => navigation.navigate('ShopProfile', { requireSetup: true }),
    },
  ]);
}

export function gateRepairNavigation(navigation, { isComplete, missingFields }) {
  if (isComplete) return true;
  showShopProfileGateAlert(navigation, missingFields);
  return false;
}
