/**
 * Garage scene registry — single source of truth for background scenes.
 */

import { Platform } from 'react-native';

import { BACKGROUNDS } from '../constants/images';
import { WEB_BACKGROUND_URL } from '../constants/webBackground';

export const GARAGE_SCENE_STORAGE_KEY = '@veversal/garage_scene_id';
export const DEFAULT_SCENE_ID = 'premium_garage';

export const GARAGE_SCENE_TRANSITION_MIN_MS = 400;
export const GARAGE_SCENE_TRANSITION_MAX_MS = 600;
export const GARAGE_SCENE_TRANSITION_DEFAULT_MS = 500;

/** Mirrors ScreenBackground DEFAULT_STOPS — shared by every scene for now. */
const DEFAULT_OVERLAY = [
  { offset: '0', color: '#000', opacity: '0.65' },
  { offset: '0.5', color: '#000', opacity: '0.45' },
  { offset: '1', color: '#000', opacity: '0.75' },
];

const PREMIUM_NATIVE = BACKGROUNDS.default;
const PREMIUM_WEB = { uri: WEB_BACKGROUND_URL };

const PREMIUM_BLUR = { native: 2, web: 2 };
const PREMIUM_BRIGHTNESS = { native: 1, web: 0.68 };

// Add new scene image imports here
// Then register in GARAGE_SCENES

/** @type {import('./garageScenes.types').GarageSceneDefinition[]} */
export const GARAGE_SCENES = [
  {
    id: 'premium_garage',
    label: 'Premium Garage',
    description: 'Classic luxury garage — the default Veversal look.',
    enabled: true,
    nativeImage: PREMIUM_NATIVE,
    webImage: PREMIUM_WEB,
    overlay: DEFAULT_OVERLAY,
    blur: PREMIUM_BLUR,
    brightness: PREMIUM_BRIGHTNESS,
  },
  {
    id: 'modern_service_center',
    label: 'Modern Service Center',
    description: 'Clean, bright workshop floor aesthetic.',
    enabled: false,
    nativeImage: PREMIUM_NATIVE,
    webImage: PREMIUM_WEB,
    overlay: DEFAULT_OVERLAY,
    blur: PREMIUM_BLUR,
    brightness: PREMIUM_BRIGHTNESS,
  },
  {
    id: 'performance_garage',
    label: 'Performance Garage',
    description: 'Motorsport and performance tuning atmosphere.',
    enabled: false,
    nativeImage: PREMIUM_NATIVE,
    webImage: PREMIUM_WEB,
    overlay: DEFAULT_OVERLAY,
    blur: PREMIUM_BLUR,
    brightness: PREMIUM_BRIGHTNESS,
  },
  {
    id: 'night_garage',
    label: 'Night Garage',
    description: 'After-hours ambient garage lighting.',
    enabled: false,
    nativeImage: PREMIUM_NATIVE,
    webImage: PREMIUM_WEB,
    overlay: DEFAULT_OVERLAY,
    blur: PREMIUM_BLUR,
    brightness: PREMIUM_BRIGHTNESS,
  },
  {
    id: 'mountain_adventure',
    label: 'Mountain Adventure',
    description: 'Outdoor adventure and overland spirit.',
    enabled: false,
    nativeImage: PREMIUM_NATIVE,
    webImage: PREMIUM_WEB,
    overlay: DEFAULT_OVERLAY,
    blur: PREMIUM_BLUR,
    brightness: PREMIUM_BRIGHTNESS,
  },
  {
    id: 'bike_workshop',
    label: 'Bike Workshop',
    description: 'Two-wheel service and craft workshop.',
    enabled: false,
    nativeImage: PREMIUM_NATIVE,
    webImage: PREMIUM_WEB,
    overlay: DEFAULT_OVERLAY,
    blur: PREMIUM_BLUR,
    brightness: PREMIUM_BRIGHTNESS,
  },
  {
    id: 'abstract_blue',
    label: 'Abstract Blue',
    description: 'Minimal abstract shapes in brand navy tones.',
    enabled: false,
    nativeImage: PREMIUM_NATIVE,
    webImage: PREMIUM_WEB,
    overlay: DEFAULT_OVERLAY,
    blur: PREMIUM_BLUR,
    brightness: PREMIUM_BRIGHTNESS,
    accentHint: '#1e3a5f',
  },
];

/** @type {Map<string, import('./garageScenes.types').GarageSceneDefinition>} */
const scenesById = new Map(GARAGE_SCENES.map((scene) => [scene.id, scene]));

/**
 * @param {string | null | undefined} id
 * @returns {import('./garageScenes.types').GarageSceneDefinition}
 */
export function getSceneById(id) {
  if (id && scenesById.has(id)) {
    return scenesById.get(id);
  }
  return scenesById.get(DEFAULT_SCENE_ID) ?? GARAGE_SCENES[0];
}

/**
 * @param {string | null | undefined} id
 * @returns {string}
 */
export function resolveSceneId(id) {
  const scene = id && scenesById.has(id) ? scenesById.get(id) : null;
  if (scene?.enabled) {
    return scene.id;
  }
  return DEFAULT_SCENE_ID;
}

/** @returns {import('./garageScenes.types').GarageSceneDefinition[]} */
export function getEnabledScenes() {
  return GARAGE_SCENES.filter((scene) => scene.enabled);
}

/**
 * @param {import('./garageScenes.types').GarageSceneDefinition} scene
 * @returns {number | { uri: string }}
 */
export function getSceneImageSource(scene) {
  if (Platform.OS === 'web') {
    return scene.webImage ?? { uri: WEB_BACKGROUND_URL };
  }
  return scene.nativeImage ?? BACKGROUNDS.default;
}

/**
 * @param {import('./garageScenes.types').GarageSceneDefinition} scene
 * @returns {string}
 */
export function getSceneWebUri(scene) {
  const webImage = scene.webImage ?? PREMIUM_WEB;
  if (typeof webImage === 'object' && webImage?.uri) {
    return webImage.uri;
  }
  return WEB_BACKGROUND_URL;
}

export function clampTransitionDuration(durationMs) {
  const value = durationMs ?? GARAGE_SCENE_TRANSITION_DEFAULT_MS;
  return Math.min(
    GARAGE_SCENE_TRANSITION_MAX_MS,
    Math.max(GARAGE_SCENE_TRANSITION_MIN_MS, value)
  );
}
