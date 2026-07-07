/**
 * @file Shared constants for Garage Scenes.
 * @see docs/garage-scenes-architecture.md
 */

/** AsyncStorage key for the user's selected scene slug. */
export const GARAGE_SCENE_STORAGE_KEY = '@veversal/garage_scene_id';

/** Future: when true, soft contextual overrides are ignored. */
export const GARAGE_SCENE_PINNED_STORAGE_KEY = '@veversal/garage_scene_pinned';

export const DEFAULT_SCENE_ID = 'premium-garage';

export const GARAGE_SCENE_TRANSITION_MIN_MS = 400;
export const GARAGE_SCENE_TRANSITION_MAX_MS = 600;
export const GARAGE_SCENE_TRANSITION_DEFAULT_MS = 500;

/**
 * Uniform dark blue color grade applied on every scene (layer 2).
 * Tuned to match existing `#0b1220` web fallback and brand navy tones.
 */
export const GARAGE_SCENE_COLOR_GRADE = {
  color: '#0a1628',
  opacity: 0.42,
};

/** Default blur tuning — per-scene overrides live on registry entries. */
export const GARAGE_SCENE_BLUR_DEFAULTS = {
  nativeRadius: 2,
  webPx: 2,
  webBrightness: 0.68,
};

/**
 * Readability gradient (layer 3) — mirrors ScreenBackground DEFAULT_STOPS.
 * Kept here so scene rendering can share one definition when wired.
 */
export const GARAGE_SCENE_GRADIENT_STOPS = [
  { offset: '0', color: '#000', opacity: '0.65' },
  { offset: '0.5', color: '#000', opacity: '0.45' },
  { offset: '1', color: '#000', opacity: '0.75' },
];

/** @typedef {'ease-in-out' | 'linear'} GarageSceneEasing */

/** @type {GarageSceneEasing} */
export const GARAGE_SCENE_DEFAULT_EASING = 'ease-in-out';
