/**
 * Garage scene registry — single source of truth for dashboard backgrounds.
 *
 * Web assets live in `public/backgrounds/garage-scenes/` (URL references).
 * Native bundles the same files from `src/assets/backgrounds/garage-scenes/` via require().
 *
 * ## Add a new scene
 * 1. Add optimized WebP to `public/backgrounds/garage-scenes/<id>.webp`
 * 2. Copy the same file to `src/assets/backgrounds/garage-scenes/<id>.webp`
 * 3. Append an entry below with matching `id`, `webImage.uri`, and `nativeImage`
 * 4. No dashboard or ScreenBackground changes required
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GARAGE_SCENE_STORAGE_KEY = '@veversal/garage_scene_id';
export const GARAGE_SCENES_PUBLIC_BASE = '/backgrounds/garage-scenes';

export const GARAGE_SCENE_TRANSITION_MIN_MS = 400;
export const GARAGE_SCENE_TRANSITION_MAX_MS = 600;
export const GARAGE_SCENE_TRANSITION_DEFAULT_MS = 500;

export const DASHBOARD_BACKGROUND_OVERLAY = [
  { offset: '0', color: '#000', opacity: '0.65' },
  { offset: '0.5', color: '#000', opacity: '0.45' },
  { offset: '1', color: '#000', opacity: '0.75' },
];

export const DASHBOARD_BACKGROUND_BLUR = { native: 2, web: 2 };
export const DASHBOARD_BACKGROUND_BRIGHTNESS = { native: 1, web: 0.68 };

/** @deprecated Use DASHBOARD_BACKGROUND_OVERLAY */
export const DEFAULT_OVERLAY = DASHBOARD_BACKGROUND_OVERLAY;

/**
 * @param {string} filename
 * @returns {{ uri: string }}
 */
function sceneWebImage(filename) {
  return { uri: `${GARAGE_SCENES_PUBLIC_BASE}/${filename}` };
}

/** @type {import('./garageScenes.types').GarageSceneDefinition[]} */
export const GARAGE_SCENES = [
  {
    id: 'premium_garage_evening',
    label: 'Premium Garage Evening',
    description: 'Warm evening light in a premium garage.',
    enabled: true,
    webImage: sceneWebImage('premium_garage_evening.webp'),
    nativeImage: require('../assets/backgrounds/garage-scenes/premium_garage_evening.webp'),
    overlay: DASHBOARD_BACKGROUND_OVERLAY,
    blur: DASHBOARD_BACKGROUND_BLUR,
    brightness: DASHBOARD_BACKGROUND_BRIGHTNESS,
  },
  {
    id: 'premium_garage_morning',
    label: 'Premium Garage Morning',
    description: 'Soft morning light in a premium garage.',
    enabled: true,
    webImage: sceneWebImage('premium_garage_morning.webp'),
    nativeImage: require('../assets/backgrounds/garage-scenes/premium_garage_morning.webp'),
    overlay: DASHBOARD_BACKGROUND_OVERLAY,
    blur: DASHBOARD_BACKGROUND_BLUR,
    brightness: DASHBOARD_BACKGROUND_BRIGHTNESS,
  },
  {
    id: 'performance_garage_night',
    label: 'Performance Garage Night',
    description: 'High-performance garage under night lighting.',
    enabled: true,
    webImage: sceneWebImage('performance_garage_night.webp'),
    nativeImage: require('../assets/backgrounds/garage-scenes/performance_garage_night.webp'),
    overlay: DASHBOARD_BACKGROUND_OVERLAY,
    blur: DASHBOARD_BACKGROUND_BLUR,
    brightness: DASHBOARD_BACKGROUND_BRIGHTNESS,
  },
  {
    id: 'modern_service_center_day',
    label: 'Modern Service Center',
    description: 'Bright, modern service center during the day.',
    enabled: true,
    webImage: sceneWebImage('modern_service_center_day.webp'),
    nativeImage: require('../assets/backgrounds/garage-scenes/modern_service_center_day.webp'),
    overlay: DASHBOARD_BACKGROUND_OVERLAY,
    blur: DASHBOARD_BACKGROUND_BLUR,
    brightness: DASHBOARD_BACKGROUND_BRIGHTNESS,
  },
  {
    id: 'night_city_garage',
    label: 'Night City Garage',
    description: 'Urban garage with city lights at night.',
    enabled: true,
    webImage: sceneWebImage('night_city_garage.webp'),
    nativeImage: require('../assets/backgrounds/garage-scenes/night_city_garage.webp'),
    overlay: DASHBOARD_BACKGROUND_OVERLAY,
    blur: DASHBOARD_BACKGROUND_BLUR,
    brightness: DASHBOARD_BACKGROUND_BRIGHTNESS,
  },
  {
    id: 'bike_garage',
    label: 'Bike Garage',
    description: 'Workshop tuned for bicycles and two-wheelers.',
    enabled: true,
    webImage: sceneWebImage('bike_garage.webp'),
    nativeImage: require('../assets/backgrounds/garage-scenes/bike_garage.webp'),
    overlay: DASHBOARD_BACKGROUND_OVERLAY,
    blur: DASHBOARD_BACKGROUND_BLUR,
    brightness: DASHBOARD_BACKGROUND_BRIGHTNESS,
  },
  {
    id: 'ladies_garage',
    label: 'Ladies Garage',
    description: 'Stylish garage with a refined atmosphere.',
    enabled: true,
    webImage: sceneWebImage('ladies_garage.webp'),
    nativeImage: require('../assets/backgrounds/garage-scenes/ladies_garage.webp'),
    overlay: DASHBOARD_BACKGROUND_OVERLAY,
    blur: DASHBOARD_BACKGROUND_BLUR,
    brightness: DASHBOARD_BACKGROUND_BRIGHTNESS,
  },
];

export const DEFAULT_SCENE_ID = 'premium_garage_evening';

/** @type {Map<string, import('./garageScenes.types').GarageSceneDefinition>} */
const sceneById = new Map(GARAGE_SCENES.map((scene) => [scene.id, scene]));

/**
 * @param {string | null | undefined} path
 * @returns {string}
 */
export function resolvePublicAssetUri(path) {
  if (!path || typeof path !== 'string') {
    return getSceneById(DEFAULT_SCENE_ID).webImage.uri;
  }
  if (Platform.OS === 'web' || !path.startsWith('/')) {
    return path;
  }

  const webOrigin = String(
    process.env.EXPO_PUBLIC_WEB_ORIGIN || process.env.EXPO_PUBLIC_WEB_BASE_URL || ''
  )
    .trim()
    .replace(/\/$/, '');

  return webOrigin ? `${webOrigin}${path}` : path;
}

/**
 * @param {string | null | undefined} id
 * @returns {import('./garageScenes.types').GarageSceneDefinition}
 */
export function getSceneById(id) {
  if (id && sceneById.has(id)) {
    return sceneById.get(id);
  }
  return sceneById.get(DEFAULT_SCENE_ID) ?? GARAGE_SCENES[0];
}

/**
 * @param {string | null | undefined} id
 * @returns {string}
 */
export function resolveSceneId(id) {
  if (id && sceneById.has(id)) {
    return id;
  }
  return DEFAULT_SCENE_ID;
}

/** @returns {import('./garageScenes.types').GarageSceneDefinition[]} */
export function getEnabledScenes() {
  return GARAGE_SCENES.filter((scene) => scene.enabled !== false);
}

/**
 * @param {import('./garageScenes.types').GarageSceneDefinition} scene
 * @returns {number | { uri: string }}
 */
export function getSceneImageSource(scene) {
  if (Platform.OS !== 'web' && scene?.nativeImage != null) {
    return scene.nativeImage;
  }
  return { uri: resolvePublicAssetUri(getSceneWebUri(scene)) };
}

/**
 * @param {import('./garageScenes.types').GarageSceneDefinition} scene
 * @returns {string}
 */
export function getSceneWebUri(scene) {
  const uri = scene?.webImage?.uri;
  if (uri) {
    return uri;
  }
  return getSceneById(DEFAULT_SCENE_ID).webImage.uri;
}

export function clampTransitionDuration(durationMs) {
  const value = durationMs ?? GARAGE_SCENE_TRANSITION_DEFAULT_MS;
  return Math.min(
    GARAGE_SCENE_TRANSITION_MAX_MS,
    Math.max(GARAGE_SCENE_TRANSITION_MIN_MS, value)
  );
}

/**
 * @returns {Promise<string | null>}
 */
export async function loadPersistedSceneId() {
  try {
    let raw = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(GARAGE_SCENE_STORAGE_KEY);
    }
    if (!raw) {
      raw = await AsyncStorage.getItem(GARAGE_SCENE_STORAGE_KEY);
    }
    return raw;
  } catch {
    return null;
  }
}

/**
 * @param {string} id
 */
export async function persistSceneId(id) {
  const resolved = resolveSceneId(id);
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(GARAGE_SCENE_STORAGE_KEY, resolved);
    }
    await AsyncStorage.setItem(GARAGE_SCENE_STORAGE_KEY, resolved);
  } catch {
    // Non-fatal — scene still applies for the current session.
  }
}

/**
 * @param {import('./garageScenes.types').GarageSceneDefinition} scene
 */
export async function preloadGarageScene(scene) {
  if (!scene || Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const uri = resolvePublicAssetUri(getSceneWebUri(scene));
  await new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(undefined);
    img.onerror = () => resolve(undefined);
    img.src = uri;
  });
}
