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

export const OPTIONAL_WIZARD_STEPS = new Set(['prices', 'photos', 'about', 'preview']);
