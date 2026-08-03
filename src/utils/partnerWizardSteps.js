/**
 * Partner onboarding wizard step ids in order.
 * Shared by PartnerOnboardingScreen, usePartnerOnboardingData, and Profile hub.
 */
export const WIZARD_STEP_IDS = [
  'business',
  'location',
  'vehicles',
  'services',
  'prices',
  'hours',
  'photos',
  'about',
  'legal',
  'preview',
  'publish',
];

// Keep in sync with backend required_for_publish in profile_completion._SECTIONS.
// prices is required (published ShopServiceMenuItem); photos/about/preview are soft.
export const OPTIONAL_WIZARD_STEPS = new Set(['photos', 'about', 'preview']);
